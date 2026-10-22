// Canvas helpers of the signature pad (spec §0 "E-signature", §5 validation "signature data URL must be
// data:image/png;base64, decodes, ≤ 300 KB"). Pure functions around a 2D context, so the pad component stays small
// and the export rules (trim to the ink, transparent PNG, size limit) are testable without a real browser.

/** Backend limit of the decoded PNG (PD_SIGNATURE_MAX_BYTES in backend/modules/project_docs/files.php). */
export const SIGNATURE_MAX_BYTES = 300 * 1024;

/**
 * Logical drawing space of the pad (14:5). Points are stored in these units, so a stroke keeps its place when the
 * canvas is resized (rotation, responsive width) and the bitmap is redrawn at the new size × devicePixelRatio.
 */
export const PAD_WIDTH = 700;
export const PAD_HEIGHT = 250;

/** Base pen width in logical units (≈ 2.4 CSS px on a 560 px wide pad). */
const PEN = 3;
/** Ink: dark navy, reads as a pen signature on white paper in both themes. */
export const SIGNATURE_INK = 'rgb(18, 22, 32)';
/** Script-like fonts for the typed signature preview (system fonts, no download). */
export const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", "URW Chancery L", cursive';

/** One sampled pointer position; `w` scales the pen (pen pressure), 1 for mouse and touch. */
export interface StrokePoint {
  x: number;
  y: number;
  w: number;
}
export type Stroke = StrokePoint[];

/** Decoded size in bytes of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const payload = comma < 0 ? '' : dataUrl.slice(comma + 1);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

/** Pen width factor of a pointer event: pressure for pens, constant for mouse and touch (they report 0 / 0.5). */
export const penWidth = (pointerType: string, pressure: number) =>
  pointerType === 'pen' && pressure > 0 ? 0.55 + Math.min(1, pressure) * 0.9 : 1;

/**
 * Draws strokes with quadratic curves through the midpoints (smooth lines from sparse samples). The context must
 * already carry the transform from logical units to bitmap pixels.
 */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = SIGNATURE_INK;
  ctx.fillStyle = SIGNATURE_INK;
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      // A tap is a dot
      const [p] = stroke;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (PEN * p.w) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    for (let i = 1; i < stroke.length; i++) drawSegment(ctx, stroke, i, i === stroke.length - 1);
  }
}

/**
 * Draws the piece of `stroke` that ends at point `i` (used live while drawing and when replaying): from the midpoint
 * before the previous point, curving through it, to the midpoint before point `i`. `closing` also joins the last
 * half segment straight to point `i` (end of a stroke).
 */
export function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, i: number, closing = false): void {
  const a = stroke[i - 2];
  const b = stroke[i - 1];
  const c = stroke[i];
  if (!b || !c) return;
  const start = a ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : b;
  const end = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
  ctx.lineWidth = PEN * ((b.w + c.w) / 2);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(b.x, b.y, end.x, end.y);
  if (closing) ctx.lineTo(c.x, c.y);
  ctx.stroke();
}

/** Bounding box of the ink (logical units, pen width included), null when there is none. */
export function strokeBounds(strokes: Stroke[]): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const p of stroke) {
      const r = (PEN * p.w) / 2;
      minX = Math.min(minX, p.x - r);
      minY = Math.min(minY, p.y - r);
      maxX = Math.max(maxX, p.x + r);
      maxY = Math.max(maxY, p.y + r);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

const createCanvas = () => document.createElement('canvas');

/**
 * Renders on a new canvas at decreasing scales until the PNG fits SIGNATURE_MAX_BYTES; null when the browser has
 * no 2D canvas or the image never fits (practically impossible for a signature).
 */
function fitPng(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, scale: number) => void, startScale: number): string | null {
  let scale = startScale;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = createCanvas();
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paint(ctx, scale);
    const url = canvas.toDataURL('image/png');
    if (!url.startsWith('data:image/png;base64,')) return null;
    if (dataUrlBytes(url) <= SIGNATURE_MAX_BYTES) return url;
    scale *= 0.7;
  }
  return null;
}

/** Margin around the trimmed ink (logical units). */
const TRIM_PAD = 12;

/**
 * Drawing → transparent PNG data URL trimmed to the ink, at 2× the logical size (sharp in PDF/DOCX), ≤ 300 KB.
 * Null when nothing is drawn or the browser cannot export.
 */
export function exportDrawing(strokes: Stroke[]): string | null {
  const box = strokeBounds(strokes);
  if (!box) return null;
  const width = box.width + TRIM_PAD * 2;
  const height = box.height + TRIM_PAD * 2;
  return fitPng(
    width,
    height,
    (ctx, scale) => {
      ctx.setTransform(scale, 0, 0, scale, (TRIM_PAD - box.x) * scale, (TRIM_PAD - box.y) * scale);
      drawStrokes(ctx, strokes);
    },
    2,
  );
}

/** Font size of the typed signature (px at scale 1). */
const TYPED_SIZE = 56;

/** Typed name → transparent PNG data URL in a script-like font (preview of the typed signature), ≤ 300 KB. */
export function renderTypedSignature(name: string): string | null {
  const text = name.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const font = `${TYPED_SIZE}px ${SCRIPT_FONT}`;
  // Measure first (a throwaway context), then draw at the measured width
  const probe = createCanvas().getContext('2d');
  if (!probe) return null;
  probe.font = font;
  const textWidth = probe.measureText(text).width || text.length * TYPED_SIZE * 0.5;
  const width = Math.min(2400, textWidth + 48);
  const height = TYPED_SIZE * 1.8;
  return fitPng(
    width,
    height,
    (ctx) => {
      ctx.font = font;
      ctx.fillStyle = SIGNATURE_INK;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 24, height / 2, width - 48);
    },
    2,
  );
}
