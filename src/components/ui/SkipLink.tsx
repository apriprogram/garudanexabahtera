import React from 'react';

interface SkipLinkProps {
  /** id elemen konten utama (tanpa #). Bila tidak ada di halaman, <main> pertama yang dipakai. */
  target?: string;
  children?: React.ReactNode;
}

/**
 * "Lewati ke konten": tautan pertama di urutan Tab, tersembunyi sampai difokus keyboard (WCAG 2.4.1).
 * Klik/Enter memindahkan fokus ke konten utama (diberi tabindex -1 bila perlu) tanpa mengubah hash URL,
 * jadi juga aman di beranda yang memakai hash untuk section.
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ target = 'konten', children = 'Lewati ke konten' }) => {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(target) ?? document.querySelector<HTMLElement>('main');
    if (!el) return;
    event.preventDefault();
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'start' });
  };

  return (
    <a
      href={`#${target}`}
      onClick={onClick}
      data-focus-trap-ignore
      // Gaya tombol primer kecil ditulis langsung: .btn (position: relative, padding) bertabrakan dengan sr-only/not-sr-only
      className="sr-only focus:not-sr-only focus:fixed focus:left-[max(1rem,env(safe-area-inset-left))] focus:top-3 focus:z-[60] focus:inline-flex focus:h-10 focus:items-center focus:whitespace-nowrap focus:rounded-full focus:bg-primary focus:px-4 focus:text-[13px] focus:font-semibold focus:text-white hover:bg-primary-hover"
    >
      {children}
    </a>
  );
};

export default SkipLink;
