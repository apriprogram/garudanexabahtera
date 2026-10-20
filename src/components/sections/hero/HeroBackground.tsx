import React, { useEffect, useRef } from 'react';

const SPACING = 26; // jarak antartitik (px)
const REACH = 190; // radius pengaruh kursor (px)
const BRAND = [33, 31, 254]; // #211FFE
const NEUTRAL = [152, 160, 175]; // neutral-400 #98A0AF

/**
 * Latar hero interaktif (port HeroBackground BELAJAR CPNS): medan titik yang tertarik dan menyala biru brand
 * di sekitar kursor, plus cahaya lembut yang mengikuti kursor. Tanpa kursor (layar sentuh/diam) cahaya berkelana
 * pelan sehingga latar tetap hidup. Berhenti saat tidak terlihat, ±30 fps di HP, statis bila reduced motion.
 */
export const HeroBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    let w = 0;
    let h = 0;
    let dots: number[] = [];
    let raf = 0;
    let visible = true;
    let hasPointer = false;
    let lastMove = 0;
    let lastDraw = 0;
    const pointer = { x: -9999, y: -9999 }; // target
    const cur = { x: -9999, y: -9999 }; // posisi cahaya (di-lerp)
    const t0 = performance.now();

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(${NEUTRAL.join(',')},0.45)`;
      for (let i = 0; i < dots.length; i += 2) {
        ctx.beginPath();
        ctx.arc(dots[i], dots[i + 1], 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const offX = Math.floor((w % SPACING) / 2);
      const offY = Math.floor((h % SPACING) / 2);
      for (let y = offY; y <= h; y += SPACING) for (let x = offX; x <= w; x += SPACING) dots.push(x, y);
      if (reduced) drawStatic();
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      // Layar sempit (HP): cukup ±30 fps, hemat baterai, gerak tetap halus
      if (w < 640 && now - lastDraw < 32) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastDraw = now;
      // Diam (tanpa kursor > 2,5 detik): cahaya berkelana di jalur Lissajous
      const idle = !hasPointer || now - lastMove > 2500;
      let tx = pointer.x;
      let ty = pointer.y;
      if (idle) {
        const t = (now - t0) / 1000;
        tx = w * (0.5 + 0.32 * Math.sin(t * 0.23));
        ty = h * (0.45 + 0.28 * Math.sin(t * 0.31 + 1.3));
      }
      if (cur.x < -1000) {
        cur.x = tx;
        cur.y = ty;
      }
      cur.x += (tx - cur.x) * 0.1;
      cur.y += (ty - cur.y) * 0.1;

      ctx.clearRect(0, 0, w, h);

      // Cahaya lembut
      const glow = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 360);
      glow.addColorStop(0, 'rgba(33,31,254,0.10)');
      glow.addColorStop(0.5, 'rgba(33,31,254,0.04)');
      glow.addColorStop(1, 'rgba(33,31,254,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Titik-titik
      const r2 = REACH * REACH;
      for (let i = 0; i < dots.length; i += 2) {
        const x = dots[i];
        const y = dots[i + 1];
        const dx = cur.x - x;
        const dy = cur.y - y;
        const d2 = dx * dx + dy * dy;
        let f = 0;
        if (d2 < r2) {
          f = 1 - Math.sqrt(d2) / REACH;
          f *= f;
        }
        const px = x + dx * f * 0.14; // tertarik ke kursor
        const py = y + dy * f * 0.14;
        const rad = 1.1 + f * 1.9;
        const a = 0.42 + f * 0.58;
        const c0 = NEUTRAL[0] + (BRAND[0] - NEUTRAL[0]) * f;
        const c1 = NEUTRAL[1] + (BRAND[1] - NEUTRAL[1]) * f;
        const c2 = NEUTRAL[2] + (BRAND[2] - NEUTRAL[2]) * f;
        ctx.fillStyle = `rgba(${c0 | 0},${c1 | 0},${c2 | 0},${a})`;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible && !reduced) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Di luar area hero: kembali berkelana
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lastMove = 0;
        return;
      }
      pointer.x = x;
      pointer.y = y;
      hasPointer = true;
      lastMove = performance.now();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting) && !document.hidden;
      if (visible) kick();
    });
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) kick();
    };
    const ro = new ResizeObserver(resize);

    resize();
    ro.observe(canvas);
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    // Didengar di window agar titik tetap bereaksi saat kursor di atas teks/visual hero
    window.addEventListener('pointermove', onMove, { passive: true });
    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <canvas
        ref={canvasRef}
        className="block h-full w-full [mask-image:radial-gradient(85%_80%_at_50%_45%,#000_30%,transparent_100%)]"
      />
      {/* Pudar di atas (area navbar) dan di bawah (menyatu dengan strip layanan) */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-canvas via-canvas/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
};

export default HeroBackground;
