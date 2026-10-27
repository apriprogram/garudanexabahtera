// Data situs di luar konten CMS (docs/platform/SITE-POSTS-SEO-SPEC.md §7): rute halaman (beranda, daftar, tulisan),
// awalan path situs, dan tulisan berita/pengumuman dari tabel site_posts. Disediakan SiteRenderer (CustomerSite di domain
// pembeli, SitePreview di /situs/:id); demo dan pratinjau CMS memakai nilai bawaan: beranda, tanpa tulisan.
// `postsEnabled` = fitur berbayar Berita & Pengumuman aktif (docs/platform/SITE-ADDONS-SPEC.md §6): tidak aktif = berita
// biasa dari konten CMS (tulisan tidak dipakai); aktif = section berita & pengumuman profesional (shared/posts/pro).
//
// Template TIDAK boleh membaca useLocation/useParams (tes dan pratinjau CMS merender tanpa Router): rute, path, dan
// navigasi hanya lewat konteks ini.
import { createContext, useContext } from 'react';
import type { SiteRoute } from '../siteRoutes';
import type { SitePostKind, SitePostPublic, SitePostSummary } from '../../types/sitePosts';

/**
 * Tulisan terbit per jenis. null = tidak dipakai/gagal dimuat dan [] = belum ada tulisan (template memakai daftar dari
 * konten CMS); undefined = masih dimuat di situs live berfitur tulisan (section beranda jenis itu kosong dulu, bukan item
 * CMS/demo yang lalu berganti).
 */
export type SitePostsByKind = Record<SitePostKind, SitePostSummary[] | null | undefined>;

export interface SiteData {
  route: SiteRoute;
  /**
   * Fitur Berita & Pengumuman aktif untuk situs ini (template mampu + `site.addons.posts`; demo `?fitur=berita`).
   * false = berita biasa: tulisan tidak diminta/dipakai, section dari item CMS, halaman /berita… tidak ada.
   */
  postsEnabled: boolean;
  /**
   * Alamat situs pembeli tanpa garis miring di akhir ("https://sekolah.sch.id"), dasar URL kanonis untuk tombol bagikan
   * tulisan. Tidak ada (demo, domain tidak sah) = tanpa tombol bagikan.
   */
  siteOrigin?: string | null;
  /** Awalan path situs: '' di domain pembeli, '/situs/12' di pratinjau host utama */
  basePath: string;
  posts: SitePostsByKind;
  /** Rute tulisan: tulisannya; null = tidak ditemukan; undefined = belum dimuat / bukan rute tulisan */
  post?: SitePostPublic | null;
  /** Rute daftar: jumlah tulisan terbit jenis itu (bisa > posts.length); tidak diisi = posts.length */
  total?: number;
  /** Daftar/tulisan gagal dimuat (bukan 404): pesan + coba lagi */
  error?: { message: string; retry: () => void } | null;
  /**
   * Pindah halaman di dalam situs tanpa memuat ulang (path relatif akar situs, mis. "/berita/x" atau "/#kontak").
   * Tidak ada = tautan biasa (browser memuat halaman baru).
   */
  navigate?: (path: string) => void;
  /**
   * Halaman ini dibuka lagi lewat tombol kembali/maju browser setelah pindah halaman di dalam situs: posisi gulirnya
   * dipulihkan (useSiteNavigate), jadi hash ("/#kontak") tidak digulir ulang oleh TemplateShell.
   */
  historyPop?: boolean;
}

export const SITE_DATA_DEFAULT: SiteData = {
  route: { kind: 'home' },
  postsEnabled: false,
  basePath: '',
  posts: { berita: null, pengumuman: null },
  post: undefined,
};

export const SiteDataContext = createContext<SiteData>(SITE_DATA_DEFAULT);

export const useSiteData = (): SiteData => useContext(SiteDataContext);

/**
 * Path relatif akar situs → href: siteHref('', '/berita/x') = "/berita/x"; siteHref('/situs/12', '/') = "/situs/12";
 * siteHref('/situs/12', '/#kontak') = "/situs/12/#kontak".
 */
export function siteHref(basePath: string, path: string): string {
  const base = basePath.replace(/\/+$/, '');
  const target = path.startsWith('/') ? path : `/${path}`;
  if (!base) return target;
  return target === '/' ? base : `${base}${target}`;
}
