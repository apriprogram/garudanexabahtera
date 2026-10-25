// Kepala halaman situs pembeli (docs/platform/SITE-POSTS-SEO-SPEC.md §5). Aturannya SAMA PERSIS dengan backend/site.php
// (dibuktikan tes paritas). Menggantikan applySiteHead (siteHead.ts).
//
// KERANGKA: tipe & tanda tangan sudah final (dipakai CustomerSite/SitePreview); isi fungsi ditulis agen render server.
import type { SiteContent } from './types';
import type { SiteRoute } from './siteRoutes';
import type { SitePostPublic, SiteSeoPublic } from '../types/sitePosts';

export interface SiteHeadInput {
  /** Domain tersimpan (template_sites.domain); null = host utama (pratinjau /situs/:id): tanpa canonical, robots noindex */
  domain: string | null;
  templateCode: string;
  /** Konten tersimpan apa adanya (null = bawaan template) */
  content: SiteContent | null;
  /** null = belum dimuat / tidak ada baris site_seo (semua bawaan) */
  seo: SiteSeoPublic | null;
  route: SiteRoute;
  /** Rute tulisan: tulisannya (null = tidak ditemukan) */
  post?: SitePostPublic | null;
  /** Rute daftar: jumlah tulisan terbit jenis itu */
  listCount?: number;
}

export interface SiteHead {
  title: string;
  description: string;
  /** 'index,follow' | 'noindex,follow' */
  robots: string;
  /** https://{domain}{path}; null di host utama */
  canonical: string | null;
  siteName: string;
  ogType: 'website' | 'article';
  /** URL absolut (atau path bila domain null); null = tanpa gambar */
  ogImage: string | null;
  twitterCard: 'summary' | 'summary_large_image';
  /** Path/URL logo untuk <link rel="icon">; null = biarkan */
  icon: string | null;
  /** Objek JSON-LD (@context + @graph) */
  jsonLd: Record<string, unknown>;
}

export function buildSiteHead(input: SiteHeadInput): SiteHead {
  void input;
  throw new Error('buildSiteHead: belum diimplementasikan');
}

/** Terapkan ke DOM: ubah/buat tag bertanda data-site-seo, <title>, ikon. Aman dipanggil berulang. */
export function applySiteSeoHead(input: SiteHeadInput): void {
  void input;
}
