// Render server untuk prerender saat deploy (docs/platform/SEO-PLAN.md §5.2 langkah 3). Dibangun oleh
// scripts/prerender.mjs sebagai bundel SSR (vite build --ssr) dan hanya dijalankan di Node mesin deploy; tidak pernah
// ikut ke public_html.
//
// render(url, preload) mengisi cache data dengan respons API halaman itu (primePreload), lalu merender aplikasi yang
// sama dengan main.tsx (StrictMode → router → SeoManager + App). prerenderToNodeStream menunggu semua React.lazy /
// Suspense selesai, jadi HTML berisi halaman utuh, bukan spinner. Di Node tidak ada window: SiteHostGate memakai
// hostname kosong → isMainHost('') = true → aplikasi utama, sama seperti di garudanexa.com.
/* eslint-disable react-refresh/only-export-components -- entri server untuk prerender di Node, tidak pernah dimuat HMR */
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
// StaticRouter dari react-router lewat react-router-dom (v7 mengekspor ulang react-router), specifier yang sama dengan
// App: satu instance konteks router juga saat modul tidak dibundel (tes Vitest).
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { primePreload, resetPreload, type PreloadData } from './lib/preload';
import { SeoManager } from './seo/SeoManager';

import * as seoRoutes from './seo/routes';
import type { PageSeo } from './seo/types';

// Untuk scripts/prerender.mjs (Node): kontrak SEO (§4) dan data/alamat yang dibutuhkan skrip
export { getHead, getIndexableRoutes, normalizePathname } from './seo/routes';
export { renderHeadTags } from './seo/head';
export { notFoundHead } from './seo/defaults';
export { CATEGORY_SLUGS, HUB_PATHS, LEGAL_PATHS, SITE_ORIGIN } from './seo/paths';
export { CATEGORY_LIST } from './content/categories';
export { getTemplatePricing } from './hooks/useSiteSettings';
export { COMPANY_FACTS } from './lib/companyFacts';
export { listArticles } from './content/panduan';
export { faqForLlms } from './content/faq';
export { isPresentableProject, presentableProjects } from './components/sections/projects/presentable';
export { PRELOAD_ELEMENT_ID, PRELOAD_URLS, seoDataFromApi, type PreloadData } from './lib/preload';

/**
 * Semua modul *.seo.ts (src/seo/routes.ts → SEO_MODULES), untuk memprerender rute noindex yang tetap publik (routes()
 * sebuah modul boleh mengembalikannya; sitemap tetap hanya memakai getIndexableRoutes). Kosong bila tidak diekspor.
 */
export function seoModules(): readonly { id: string; seo: PageSeo }[] {
  const modules = (seoRoutes as unknown as Record<string, unknown>).SEO_MODULES;
  return Array.isArray(modules) ? (modules as { id: string; seo: PageSeo }[]) : [];
}

export interface RenderResult {
  html: string;
  /** Error saat render (komponen yang melempar). React menggantinya dengan fallback, jadi prerender harus gagal. */
  errors: unknown[];
}

// Stream Node (Readable) dibaca sebagai async iterable; potongannya Buffer (= Uint8Array) atau string
const readStream = async (stream: AsyncIterable<unknown>): Promise<string> => {
  const decoder = new TextDecoder();
  let html = '';
  for await (const chunk of stream) {
    html += typeof chunk === 'string' ? chunk : decoder.decode(chunk as Uint8Array, { stream: true });
  }
  return html + decoder.decode();
};

/** HTML isi <div id="root"> untuk `url` dengan data `preload`. */
export async function render(url: string, preload: PreloadData): Promise<RenderResult> {
  resetPreload();
  primePreload(preload);
  const errors: unknown[] = [];
  try {
    const { prelude } = await prerenderToNodeStream(
      <StrictMode>
        <StaticRouter location={url}>
          <SeoManager />
          <App />
        </StaticRouter>
      </StrictMode>,
      {
        // Tanpa ini React 19.2 memecah batas Suspense yang besar (> 12.800 byte) menjadi fallback + skrip $RC yang
        // baru menukar isinya saat JavaScript jalan. HTML statis harus berisi halaman utuh di tempatnya.
        progressiveChunkSize: Number.POSITIVE_INFINITY,
        onError(error) {
          errors.push(error);
        },
      },
    );
    return { html: await readStream(prelude as unknown as AsyncIterable<unknown>), errors };
  } finally {
    resetPreload();
  }
}
