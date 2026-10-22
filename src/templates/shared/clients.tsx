// Logo klien/mitra untuk strip "Dipercaya oleh" (section `clients`). Logo SVG demo berwarna tinta; unggahan pembeli
// (berwarna) dibuat abu-abu agar strip tetap tenang. Tanpa logo → nama ditulis sebagai wordmark.
import { useState } from 'react';
import { safeImage } from './utils';

export function ClientLogo({
  name,
  logo,
  className = 'h-7',
  tone = 'muted',
}: {
  name: string;
  logo: string;
  /** Tinggi logo (lebar mengikuti rasio, maks. 180px) */
  className?: string;
  /** muted (default): abu-abu 55% → penuh saat disorot · plain: warna asli */
  tone?: 'muted' | 'plain';
}) {
  const url = safeImage(logo);
  const [broken, setBroken] = useState<string | null>(null);
  const muted = tone === 'muted' ? 'opacity-55 grayscale transition-opacity duration-300 hover:opacity-90' : '';
  if (url && broken !== url) {
    return (
      <img
        src={url}
        alt={name || 'Logo klien'}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(url)}
        className={`w-auto max-w-[180px] shrink-0 object-contain ${muted} ${className}`}
      />
    );
  }
  if (!name) return null;
  return <span className={`whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em] text-fg ${tone === 'muted' ? 'opacity-60' : ''}`}>{name}</span>;
}
