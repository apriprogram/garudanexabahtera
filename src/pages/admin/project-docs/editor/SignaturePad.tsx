// Kanvas tanda tangan (mouse, pena, sentuh) untuk tanda tangan elektronik Pihak Pertama (spec §0 "E-signature").
// Hasilnya PNG transparan (data URL) yang dikirim ke pd_document_sign; ukurannya jauh di bawah batas 300 KB.
import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from 'react';
import { Eraser } from 'lucide-react';
import { Button, ConfirmDialog, cn } from '../../../../components/admin/ui';

export interface SignaturePadHandle {
  /** PNG data URL of the drawing, null when empty */
  toDataUrl: () => string | null;
  clear: () => void;
}

/** Logical canvas size (CSS px); the bitmap is scaled by devicePixelRatio for sharp lines. */
const WIDTH = 560;
const HEIGHT = 200;
/** Ink of the signature: dark navy so it reads as a pen signature on white paper (no theme dependency). */
const INK = 'rgb(18, 22, 32)';

export function SignaturePad({ onChange, ref, className }: { onChange?: (empty: boolean) => void; ref?: Ref<SignaturePadHandle>; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = INK;
  }, []);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  };

  const markDrawn = () => {
    if (empty) {
      setEmpty(false);
      onChange?.(false);
    }
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Titik tunggal (ketukan) tetap terlihat
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    markDrawn();
  };

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, WIDTH, HEIGHT);
    setEmpty(true);
    onChange?.(true);
  };

  useImperativeHandle(ref, () => ({
    toDataUrl: () => (empty || !canvasRef.current ? null : canvasRef.current.toDataURL('image/png')),
    clear,
  }));

  return (
    <div className={cn('min-w-0', className)}>
      <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-adm-line-strong">
        <canvas
          ref={canvasRef}
          className="block aspect-[14/5] w-full cursor-crosshair touch-none"
          aria-label="Area tanda tangan. Gambar tanda tangan dengan mouse, pena, atau jari."
          role="img"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
        {/* Garis dasar tanda tangan */}
        <span className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-dashed border-mist" aria-hidden />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-mist-500" aria-hidden>
            Tanda tangan di sini
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="ghost" icon={<Eraser />} onClick={() => setConfirmClear(true)} disabled={empty}>
          Hapus
        </Button>
      </div>
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
        tone="danger"
        title="Hapus gambar tanda tangan?"
        description="Coretan di kanvas dihapus dan kamu perlu menggambar tanda tangan lagi."
        confirmText="Ya, hapus"
      />
    </div>
  );
}
