import React, { useEffect, useRef } from 'react';
import { startGaruda } from './garudaEngine';

/**
 * Latar hero gaya Prompt AI: tiga burung Garuda dari karakter ASCII yang terbang sinematik (formasi, berputar, acak),
 * menjauh-mendekat, sesekali menukik sampai seukuran layar lalu keluar dan kembali, dengan partikel kilau dan bulu
 * (garudaEngine.ts, garudaFlight.ts, garudaSprites.ts). Dekoratif (aria-hidden), dimuat lazy oleh HeroPrompt hanya saat
 * gaya ini aktif dan animasinya dihidupkan admin. Di HTML prerender hanya kanvas kosong; animasi mulai setelah hidrasi.
 */
const GarudaAscii: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    return canvas ? startGaruda(canvas) : undefined;
  }, []);

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <canvas ref={canvasRef} data-garuda-ascii className="block h-full w-full" />
    </div>
  );
};

export default GarudaAscii;
