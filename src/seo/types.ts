// Kontrak SEO antar-paket (docs/platform/SEO-PLAN.md §4). DIBEKUKAN: perubahan hanya lewat SEO lead.
// Setiap halaman publik baru punya `*.seo.ts` (default export `PageSeo`) di foldernya; src/seo/routes.ts
// mengumpulkannya. Data datang dari API saat prerender (WP2) atau dari cache klien (SeoManager, WP3).
import type { Template } from '../types/platform';

export interface SeoData {
  settings: Record<string, unknown>;
  navbar: unknown;
  templates: Template[];
  projects: unknown[];
  templateBySlug: Record<string, Template>;
  builtAt: string;
}

export interface SeoHead {
  title: string;
  description: string;
  canonical: string | null;
  robots: 'index,follow' | 'noindex,follow';
  ogType: 'website' | 'product' | 'article';
  ogImage: string;
  ogImageAlt: string;
  jsonLd: object[];
  preloadImage?: string;
}

export interface SitemapEntry {
  path: string;
  lastmod: string;
  images?: string[];
}

export interface PageSeo {
  match(pathname: string): boolean;
  head(pathname: string, data: SeoData): SeoHead | null;
  routes?(data: SeoData): SitemapEntry[];
}
