// Menu & breadcrumb panel akun pembeli (/akun/*), gaya panel admin (src/components/admin/nav.ts): sidebar bergrup
// Utama · Layanan · Akun · Lainnya, topbar dengan breadcrumb "Akun › … › halaman ini".
import {
  FileText,
  FolderKanban,
  Globe,
  LayoutGrid,
  LayoutTemplate,
  ReceiptText,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface AccountNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
  /** Item aktif untuk path ini */
  match: (pathname: string) => boolean;
}

const clean = (p: string) => p.replace(/\/+$/, '') || '/';
/** Halaman nota (/akun/pesanan/:no/nota[/:renewal]) masuk menu Nota, bukan Pesanan saya. */
const isInvoicePage = (p: string) => /^\/akun\/pesanan\/[^/]+\/nota(\/|$)/.test(p);

export const ACCOUNT_NAV: AccountNavItem[] = [
  { label: 'Beranda', to: '/akun', icon: LayoutGrid, group: 'Utama', match: (p) => clean(p) === '/akun' },
  {
    label: 'Pesanan saya',
    to: '/akun/pesanan',
    icon: ReceiptText,
    group: 'Layanan',
    match: (p) => clean(p).startsWith('/akun/pesanan') && !isInvoicePage(clean(p)),
  },
  { label: 'Situs saya', to: '/akun/situs', icon: Globe, group: 'Layanan', match: (p) => clean(p).startsWith('/akun/situs') },
  // Dokumen proyek custom (PROJECT-DOCS-SPEC §7)
  { label: 'Proyek saya', to: '/akun/proyek', icon: FolderKanban, group: 'Layanan', match: (p) => clean(p).startsWith('/akun/proyek') },
  { label: 'Nota', to: '/akun/nota', icon: FileText, group: 'Akun', match: (p) => clean(p) === '/akun/nota' || isInvoicePage(clean(p)) },
  { label: 'Profil', to: '/akun/profil', icon: UserRound, group: 'Akun', match: (p) => clean(p) === '/akun/profil' },
  { label: 'Lihat Template', to: '/#templates', icon: LayoutTemplate, group: 'Lainnya', match: () => false },
];

export const ACCOUNT_NAV_GROUPS = [...new Set(ACCOUNT_NAV.map((item) => item.group))];

export interface Crumb {
  label: string;
  /** null = halaman ini (tanpa tautan) */
  to: string | null;
}

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Breadcrumb setelah "Akun" untuk path ini; elemen terakhir = halaman yang sedang dibuka. Contoh:
 * /akun/pesanan/GN-1/nota/GNR-2 → Pesanan saya › GN-1 › Nota GNR-2.
 */
export function accountCrumbs(pathname: string): Crumb[] {
  const parts = clean(pathname).split('/').filter(Boolean).slice(1).map(safeDecode); // tanpa "akun"
  const [section, id, sub, subId] = parts;
  switch (section) {
    case undefined:
      return [{ label: 'Beranda', to: null }];
    case 'pesanan': {
      if (!id) return [{ label: 'Pesanan saya', to: null }];
      const orderTo = `/akun/pesanan/${encodeURIComponent(id)}`;
      if (sub === 'nota') {
        return [
          { label: 'Nota', to: '/akun/nota' },
          { label: id, to: orderTo },
          { label: subId ? `Nota ${subId}` : 'Nota pembelian', to: null },
        ];
      }
      return [
        { label: 'Pesanan saya', to: '/akun/pesanan' },
        { label: id, to: null },
      ];
    }
    case 'situs': {
      if (!id) return [{ label: 'Situs saya', to: null }];
      const siteTo = `/akun/situs/${encodeURIComponent(id)}`;
      // Berita & pengumuman dan SEO situs (docs/platform/SITE-POSTS-SEO-SPEC.md §8)
      if (sub === 'berita') {
        return [
          { label: 'Situs saya', to: '/akun/situs' },
          { label: 'Kelola situs', to: siteTo },
          { label: 'Berita & Pengumuman', to: subId ? `${siteTo}/berita` : null },
          ...(subId ? [{ label: subId === 'baru' ? 'Tulisan baru' : 'Edit tulisan', to: null }] : []),
        ];
      }
      if (sub === 'seo') {
        return [
          { label: 'Situs saya', to: '/akun/situs' },
          { label: 'Kelola situs', to: siteTo },
          { label: 'SEO situs', to: null },
        ];
      }
      return [{ label: 'Situs saya', to: '/akun/situs' }, { label: 'Kelola situs', to: null }];
    }
    case 'proyek':
      if (!id) return [{ label: 'Proyek saya', to: null }];
      if (sub === 'dokumen') {
        return [
          { label: 'Proyek saya', to: '/akun/proyek' },
          { label: 'Detail proyek', to: `/akun/proyek/${encodeURIComponent(id)}` },
          { label: 'Dokumen', to: null },
        ];
      }
      return [{ label: 'Proyek saya', to: '/akun/proyek' }, { label: 'Detail proyek', to: null }];
    case 'nota':
      return [{ label: 'Nota', to: null }];
    case 'profil':
      return [{ label: 'Profil', to: null }];
    default:
      return [{ label: 'Akun saya', to: null }];
  }
}
