import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  FileCog,
  FolderKanban,
  FolderOpen,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  PanelTop,
  Settings2,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Angka notifikasi di kanan menu (dihitung useAdminNavBadges dari admin_dashboard_summary). */
export type AdminNavBadgeKey = 'approval' | 'domain' | 'customNew';

export interface AdminNavChild {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Aktif hanya bila path persis sama (dipakai anak yang path-nya sama dengan induknya). */
  end?: boolean;
  adminOnly?: boolean;
  badge?: AdminNavBadgeKey;
}

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  group: string;
  adminOnly?: boolean;
  end?: boolean;
  /** Angka di induk = jumlah angka anak-anaknya (tampil saat submenu tertutup / sidebar diciutkan). */
  children?: AdminNavChild[];
}

/** Sidebar admin (SPEC §9): Utama · Produk · Custom · Konten · Sistem. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutGrid, group: 'Utama', end: true },
  {
    label: 'Pesanan Template',
    path: '/admin/pesanan-template',
    icon: ShoppingBag,
    group: 'Produk',
    children: [
      // Path Order Masuk = path induk, jadi harus `end` agar tidak ikut aktif di halaman anak lain
      { label: 'Order Masuk', path: '/admin/pesanan-template', icon: Inbox, end: true, badge: 'approval' },
      { label: 'Input Domain', path: '/admin/pesanan-template/input-domain', icon: Globe, badge: 'domain' },
      { label: 'Kelola Template', path: '/admin/pesanan-template/kelola-template', icon: LayoutTemplate },
      { label: 'Template Aktif', path: '/admin/pesanan-template/template-aktif', icon: BadgeCheck },
    ],
  },
  {
    label: 'Proyek Custom',
    path: '/admin/proyek',
    icon: FolderKanban,
    group: 'Custom',
    children: [
      // Tanpa `end`: workspace & editor dokumen (/admin/proyek/12/...) tetap menyorot Dashboard proyek
      { label: 'Dashboard proyek', path: '/admin/proyek', icon: LayoutDashboard },
      { label: 'Project Clients', path: '/admin/project-clients', icon: BriefcaseBusiness, badge: 'customNew' },
      { label: 'Klien', path: '/admin/klien', icon: Building2 },
      { label: 'Pengaturan dokumen', path: '/admin/proyek/pengaturan', icon: FileCog, adminOnly: true },
    ],
  },
  { label: 'Pengaturan website', path: '/admin/settings', icon: Settings2, group: 'Konten' },
  { label: 'Kelola navbar', path: '/admin/navbar-manager', icon: PanelTop, group: 'Konten', adminOnly: true },
  { label: 'Dokumen', path: '/admin/documents', icon: FolderOpen, group: 'Konten' },
  { label: 'Changelog', path: '/admin/changelog', icon: History, group: 'Konten', adminOnly: true },
  { label: 'Pengguna', path: '/admin/users', icon: Users, group: 'Sistem', adminOnly: true },
];

/** Halaman yang tidak ada di sidebar tetapi perlu label breadcrumb. */
const EXTRA_PAGES: Record<string, string> = {
  '/admin/profile': 'Profil saya',
  '/admin/help': 'Catatan perubahan',
  '/admin/services': 'Layanan',
  '/admin/product-manager': 'Kelola produk',
};

/** Halaman ber-id di bawah item sidebar: induk breadcrumb = item `parent`, label sendiri. */
const DYNAMIC_PAGES: { pattern: RegExp; parent: string; label: string }[] = [
  { pattern: /^\/admin\/proyek\/\d+\/dokumen\/\d+$/, parent: '/admin/proyek', label: 'Editor dokumen' },
  { pattern: /^\/admin\/proyek\/\d+$/, parent: '/admin/proyek', label: 'Workspace proyek' },
];

/** Buang garis miring di akhir (`/admin/users/` → `/admin/users`) agar pencocokan path konsisten. */
const normalizePath = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname);

export const isNavActive = (pathname: string, item: { path: string; end?: boolean }) => {
  const path = normalizePath(pathname);
  return item.end ? path === item.path : path === item.path || path.startsWith(`${item.path}/`);
};

/** Item induk aktif bila path-nya cocok atau salah satu anaknya cocok (anak Custom punya path di luar /admin/proyek). */
export const isNavItemActive = (pathname: string, item: AdminNavItem) =>
  isNavActive(pathname, item) || (item.children?.some((c) => isNavActive(pathname, c)) ?? false);

const bySpecificity = (a: { path: string }, b: { path: string }) => b.path.length - a.path.length;

/** Item sidebar yang aktif: kecocokan paling spesifik (path terpanjang). */
export const getActiveNavItem = (pathname: string, items: AdminNavItem[] = ADMIN_NAV): AdminNavItem | undefined =>
  items.filter((i) => isNavItemActive(pathname, i)).sort(bySpecificity)[0];

/**
 * Anak menu yang aktif: kecocokan paling spesifik, jadi /admin/proyek/pengaturan hanya menyorot "Pengaturan dokumen",
 * bukan juga "Dashboard proyek" (anak `end` hanya cocok persis, mis. Order Masuk).
 */
export const getActiveChild = (pathname: string, item: AdminNavItem): AdminNavChild | undefined =>
  item.children?.filter((c) => isNavActive(pathname, c)).sort(bySpecificity)[0];

/** Entri menu dengan path persis ini; anak didahulukan karena labelnya lebih spesifik (Dashboard proyek). */
const findNavEntry = (path: string): { path: string; label: string } | undefined =>
  ADMIN_NAV.flatMap((i) => i.children ?? []).find((c) => c.path === path) ?? ADMIN_NAV.find((i) => i.path === path);

/** Label breadcrumb untuk path admin: induk (bila ada) + halaman saat ini. */
export function getAdminCrumbs(pathname: string): { parent?: { path: string; label: string }; label: string } {
  const path = normalizePath(pathname);
  if (EXTRA_PAGES[path]) return { label: EXTRA_PAGES[path] };
  const dynamic = DYNAMIC_PAGES.find((p) => p.pattern.test(path));
  if (dynamic) return { parent: findNavEntry(dynamic.parent), label: dynamic.label };
  const item = getActiveNavItem(path) ?? ADMIN_NAV[0];
  const child = getActiveChild(path, item);
  return child ? { parent: item, label: child.label } : { label: item.label };
}
