// Tautan ke halaman lain di situs yang sama (beranda, /berita, /berita/{slug}, "/#kontak"): <a href> biasa yang bisa
// dirayapi Google, dengan awalan basePath (pratinjau /situs/:id). Klik kiri tanpa tombol pengubah → navigate dari
// SiteDataContext (tanpa memuat ulang halaman) bila tersedia; Ctrl/Cmd+klik, klik tengah, dan tab baru tetap biasa.
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { siteHref, useSiteData } from './siteData';

export function SiteLink({
  path,
  onNavigate,
  onClick,
  children,
  ...rest
}: {
  /** Path relatif akar situs, mis. "/berita/juara-olimpiade" atau "/#kontak" */
  path: string;
  /** Dipanggil saat diklik (mis. menutup menu HP) */
  onNavigate?: () => void;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'>) {
  const { basePath, navigate } = useSiteData();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    onNavigate?.();
    if (e.defaultPrevented || !navigate || rest.target) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(path);
  };
  return (
    <a {...rest} href={siteHref(basePath, path)} onClick={handleClick}>
      {children}
    </a>
  );
}
