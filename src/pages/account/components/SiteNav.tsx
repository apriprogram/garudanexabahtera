// Navigasi pil per situs di panel akun (docs/platform/SITE-POSTS-SEO-SPEC.md §8): Konten · Berita & Pengumuman · SEO.
// "Berita & Pengumuman" hanya untuk template berfitur tulisan (TemplateDefinition.features.posts). Tampil di SiteEditor
// (di bawah kartu Situs Anda) dan di bagian atas halaman Berita & Pengumuman / SEO. Tautannya biasa (<Link>), jadi ikut
// dicegat useLeaveGuard bila ada perubahan yang belum disimpan. Di HP ikon disembunyikan supaya ketiga pil muat di layar
// 390 px; layar yang lebih sempit bisa menggeser baris pil ke samping.
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutTemplate, Newspaper, Search } from 'lucide-react';
import { siteLinks } from '../posts/siteLinks';

interface SiteNavProps {
  siteId: number;
  /** Tampilkan pil Berita & Pengumuman (hasPostsFeature di posts/siteLinks.ts) */
  posts: boolean;
  /**
   * Baris pil keluar sampai tepi layar HP (margin negatif seukuran gutter halaman, px-5), supaya pil terakhir tidak
   * terpotong padding saat digeser. Matikan bila wadahnya berpadding lain (mis. panel kiri SiteEditor).
   */
  bleed?: boolean;
  className?: string;
}

export function SiteNav({ siteId, posts, bleed = false, className = '' }: SiteNavProps) {
  const { pathname } = useLocation();
  const links = siteLinks(siteId);
  const items: { to: string; label: string; icon: ReactNode; exact: boolean }[] = [
    { to: links.content, label: 'Konten', icon: <LayoutTemplate className="h-4 w-4 max-sm:hidden" aria-hidden />, exact: true },
    ...(posts ? [{ to: links.posts, label: 'Berita & Pengumuman', icon: <Newspaper className="h-4 w-4 max-sm:hidden" aria-hidden />, exact: false }] : []),
    { to: links.seo, label: 'SEO', icon: <Search className="h-4 w-4 max-sm:hidden" aria-hidden />, exact: false },
  ];

  return (
    <nav aria-label="Menu situs" className={`no-scrollbar overflow-x-auto ${bleed ? '-mx-5 px-5 sm:mx-0 sm:px-0' : ''} ${className}`}>
      <ul className="flex w-max gap-2 py-1">
        {items.map((item) => {
          // Halaman itu sendiri = "page"; halaman di bawahnya (mis. editor satu berita) = "true"
          const current = pathname === item.to ? 'page' : !item.exact && pathname.startsWith(`${item.to}/`) ? 'true' : undefined;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={current}
                className={`relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors after:absolute after:inset-x-0 after:-inset-y-1 max-sm:h-9 max-sm:px-3.5 max-sm:text-[13px] ${
                  current ? 'bg-primary text-white ring-primary hover:bg-primary-hover' : 'bg-surface text-muted ring-line hover:text-fg hover:ring-line-strong'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
