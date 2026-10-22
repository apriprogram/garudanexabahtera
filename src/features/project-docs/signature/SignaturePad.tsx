// Reusable electronic signature pad (docs/platform/PROJECT-DOCS-SPEC.md §0 "E-signature", §5 SignatureInput):
// draw with mouse, touch or pen on a canvas (bitmap × devicePixelRatio, strokes kept in logical units so a resize
// redraws them), or type a name shown in a script-like font; clear; preview of the image that goes on the document.
//
// The pad reports a SignatureValue on every change (null = nothing usable yet):
//   draw → input {method:'draw', data_url}  transparent PNG trimmed to the ink, ≤ 300 KB (backend limit)
//   type → input {method:'type', typed_name} the server renders the stored image from the name; `preview` is the
//          local script-font rendering of the same name
// Consent, signer name and title belong to the form around the pad (customer approve dialog, admin SignModal).
// `variant` picks the token set: 'account' = public/account tokens, 'admin' = adm-* tokens (paper stays white).
import { useId, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { Eraser, Keyboard, PenLine } from 'lucide-react';
import { cn, FOCUS_INSET } from '../../../components/admin/ui/cn';
import { buttonClass, controlClass } from '../../../components/admin/ui/styles';
import type { SignatureInput, SignatureMethod } from '../types';
import {
  PAD_HEIGHT,
  PAD_WIDTH,
  SCRIPT_FONT,
  drawSegment,
  drawStrokes,
  exportDrawing,
  penWidth,
  renderTypedSignature,
  type Stroke,
} from './signatureImage';

export interface SignatureValue {
  /** what pd_my_document_decide / pd_document_sign expect in `signature` */
  input: SignatureInput;
  /** PNG data URL of what the signature looks like; null when the browser cannot render the typed preview */
  preview: string | null;
}

export interface SignaturePadHandle {
  /** removes the drawing (the typed name stays) and reports null while drawing */
  clear: () => void;
}

export type SignaturePadVariant = 'account' | 'admin';

/** Longest typed name the backends accept (pd_signature_input). */
export const TYPED_NAME_MAX = 80;

const STYLE = {
  account: {
    group: 'inline-flex rounded-full bg-alt p-1 ring-1 ring-inset ring-line',
    option:
      'relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-muted transition-colors after:absolute after:-inset-x-0.5 after:-inset-y-1 hover:text-fg aria-checked:bg-surface aria-checked:text-fg aria-checked:ring-1 aria-checked:ring-inset aria-checked:ring-line-strong',
    paper: 'bg-surface ring-line-strong',
    input: 'input-site',
    clear: 'btn btn-ghost btn-sm',
    hint: 'text-xs text-subtle',
    error: 'error-site',
    previewLabel: 'text-xs font-medium text-muted',
    previewBox: 'bg-surface ring-line',
  },
  admin: {
    group: 'inline-flex rounded-xl bg-adm-ghost p-1',
    option: cn(
      'relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-adm-muted transition-colors hover:text-adm-fg max-sm:h-8 max-sm:text-xs max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1.5 aria-checked:bg-adm-raised aria-checked:text-adm-fg aria-checked:ring-1 aria-checked:ring-inset aria-checked:ring-adm-line',
      FOCUS_INSET,
    ),
    // Paper is white in both admin themes: a signature is dark ink on paper
    paper: 'bg-white ring-adm-line-strong',
    input: controlClass('md'),
    clear: buttonClass({ variant: 'ghost', size: 'sm' }),
    hint: 'text-xs text-adm-muted',
    error: 'mt-1.5 text-xs font-medium text-adm-danger-fg',
    previewLabel: 'text-xs font-medium text-adm-muted',
    previewBox: 'bg-white ring-adm-line',
  },
} as const;

const METHODS: { value: SignatureMethod; label: string; icon: typeof PenLine }[] = [
  { value: 'draw', label: 'Gambar', icon: PenLine },
  { value: 'type', label: 'Ketik nama', icon: Keyboard },
];

/** 2D context of the pad with the logical → bitmap transform of the canvas' current size. */
function scaledContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;
  const scale = canvas.width / PAD_WIDTH;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

interface SignaturePadProps {
  onChange: (value: SignatureValue | null) => void;
  variant?: SignaturePadVariant;
  /** name the "Ketik nama" option starts with (e.g. the signer's name) */
  defaultName?: string;
  disabled?: boolean;
  /** validation message of the surrounding form, shown under the pad */
  error?: string;
  ref?: Ref<SignaturePadHandle>;
  className?: string;
}

export function SignaturePad({ onChange, variant = 'account', defaultName = '', disabled = false, error, ref, className }: SignaturePadProps) {
  const style = STYLE[variant];
  const uid = useId();
  const typedId = `${uid}-typed`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const [method, setMethod] = useState<SignatureMethod>('draw');
  const [typed, setTyped] = useState(defaultName.slice(0, TYPED_NAME_MAX));
  const [hasInk, setHasInk] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef<number | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Computes the value of `m` from the current drawing / typed name and reports it. */
  const report = (m: SignatureMethod, name: string) => {
    if (m === 'draw') {
      const url = strokes.current.length ? exportDrawing(strokes.current) : null;
      setExportFailed(strokes.current.length > 0 && !url);
      setPreview(url);
      onChange(url ? { input: { method: 'draw', data_url: url }, preview: url } : null);
      return;
    }
    const clean = name.trim().replace(/\s+/g, ' ');
    setExportFailed(false);
    if (!clean) {
      setPreview(null);
      onChange(null);
      return;
    }
    const url = renderTypedSignature(clean);
    setPreview(url);
    onChange({ input: { method: 'type', typed_name: clean }, preview: url });
  };

  // Bitmap = displayed size × devicePixelRatio; redraw the strokes whenever the displayed size changes
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || method !== 'draw') return;
    const resize = () => {
      const ratio = Math.min(3, window.devicePixelRatio || 1);
      const cssWidth = canvas.clientWidth || PAD_WIDTH;
      const width = Math.max(1, Math.round(cssWidth * ratio));
      const height = Math.max(1, Math.round(((cssWidth * PAD_HEIGHT) / PAD_WIDTH) * ratio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = scaledContext(canvas);
      if (ctx) drawStrokes(ctx, strokes.current);
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [method]);

  const pointOf = (e: PointerEvent<HTMLCanvasElement> | globalThis.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || PAD_WIDTH;
    const h = rect.height || PAD_HEIGHT;
    return { x: ((e.clientX - rect.left) / w) * PAD_WIDTH, y: ((e.clientY - rect.top) / h) * PAD_HEIGHT, w: penWidth(e.pointerType, e.pressure) };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = e.pointerId;
    const stroke: Stroke = [pointOf(e, e.currentTarget)];
    strokes.current = [...strokes.current, stroke];
    const ctx = scaledContext(e.currentTarget);
    if (ctx) drawStrokes(ctx, [stroke]);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== e.pointerId) return;
    const canvas = e.currentTarget;
    const stroke = strokes.current[strokes.current.length - 1];
    const ctx = scaledContext(canvas);
    // Coalesced events: every sample the pointer produced since the last frame (smoother fast strokes)
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [e.nativeEvent]) {
      stroke.push(pointOf(sample, canvas));
      if (ctx) drawSegment(ctx, stroke, stroke.length - 1);
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current !== e.pointerId) return;
    drawing.current = null;
    const stroke = strokes.current[strokes.current.length - 1];
    const ctx = scaledContext(e.currentTarget);
    if (ctx && stroke.length > 1) drawSegment(ctx, stroke, stroke.length - 1, true);
    setHasInk(true);
    report('draw', typed);
  };

  const clear = () => {
    strokes.current = [];
    drawing.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    if (method === 'draw') report('draw', typed);
  };

  useImperativeHandle(ref, () => ({ clear }));

  const choose = (next: SignatureMethod) => {
    if (next === method || disabled) return;
    setMethod(next);
    report(next, typed);
  };

  // Radio group keys: arrows / Home / End move and select
  const onOptionKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = METHODS.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % METHODS.length
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index - 1 + METHODS.length) % METHODS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    optionRefs.current[next]?.focus();
    choose(METHODS[next].value);
  };

  const message = error || (exportFailed ? 'Tanda tangan tidak bisa diproses. Gambar ulang atau pilih Ketik nama.' : '');
  const describedBy = [hintId, message ? errorId : ''].filter(Boolean).join(' ');
  const typedClean = typed.trim();

  return (
    <div className={cn('min-w-0', className)}>
      <div role="radiogroup" aria-label="Cara tanda tangan" className={style.group}>
        {METHODS.map((m, i) => {
          const active = m.value === method;
          return (
            <button
              key={m.value}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              disabled={disabled}
              onClick={() => choose(m.value)}
              onKeyDown={(e) => onOptionKey(e, i)}
              className={cn(style.option, 'disabled:pointer-events-none disabled:opacity-50')}
            >
              <m.icon className="h-4 w-4" aria-hidden />
              {m.label}
            </button>
          );
        })}
      </div>

      {method === 'draw' ? (
        <div className="mt-3">
          <div className={cn('relative overflow-hidden rounded-xl ring-1 ring-inset', style.paper, message && 'ring-danger')}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Area tanda tangan. Gambar tanda tangan dengan mouse, pena, atau jari."
              aria-describedby={describedBy}
              className={cn('block aspect-[14/5] w-full touch-none select-none', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onLostPointerCapture={onPointerEnd}
            />
            {/* Garis dasar tanda tangan (selalu di atas kertas putih, jadi token terang) */}
            <span className="pointer-events-none absolute inset-x-[8%] bottom-[22%] border-b border-dashed border-line-strong" aria-hidden />
            {!hasInk && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-subtle" aria-hidden>
                Tanda tangan di sini
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <p id={hintId} className={cn('pt-1.5', style.hint)}>
              Gunakan mouse, pena, atau jari. Tidak bisa menggambar? Pilih Ketik nama.
            </p>
            <button type="button" className={cn(style.clear, 'shrink-0')} onClick={clear} disabled={disabled || !hasInk}>
              <Eraser className="h-4 w-4" aria-hidden />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor={typedId} className="sr-only">
            Nama untuk tanda tangan
          </label>
          <input
            id={typedId}
            className={style.input}
            value={typed}
            maxLength={TYPED_NAME_MAX}
            autoComplete="name"
            placeholder="Ketik nama lengkap Anda"
            disabled={disabled}
            aria-invalid={message ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setTyped(e.target.value);
              report('type', e.target.value);
            }}
          />
          <p id={hintId} className={cn('mt-1.5', style.hint)}>
            Nama ini dibubuhkan sebagai tanda tangan elektronik Anda.
          </p>
        </div>
      )}

      {message && (
        <p id={errorId} className={style.error}>
          {message}
        </p>
      )}

      {/* Pratinjau: gambar yang dibubuhkan pada dokumen */}
      <div className="mt-3">
        <p className={style.previewLabel}>Pratinjau tanda tangan</p>
        <div className={cn('mt-1.5 flex h-20 items-center justify-center overflow-hidden rounded-xl px-4 ring-1 ring-inset', style.previewBox)}>
          {preview ? (
            <img src={preview} alt="Pratinjau tanda tangan" className="max-h-16 max-w-full object-contain" />
          ) : method === 'type' && typedClean ? (
            <span className="truncate text-[28px] leading-none text-fg" style={{ fontFamily: SCRIPT_FONT }}>
              {typedClean}
            </span>
          ) : (
            <span className="text-xs text-subtle">Belum ada tanda tangan</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignaturePad;
