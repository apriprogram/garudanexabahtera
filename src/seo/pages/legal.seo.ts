// Tiga dokumen legal (/syarat-ketentuan, /kebijakan-privasi, /kebijakan-pengembalian-dana): "{Judul} | Garuda Nexa" dan
// ringkasan satu kalimat (docs/platform/SEO-PLAN.md Lampiran A). lastmod = LEGAL_UPDATED_AT (tanggal "Terakhir
// diperbarui" yang terlihat di halaman). JSON-LD: WebPage + BreadcrumbList (Beranda › {Judul}, sama dengan di halaman).
import { LEGAL_LABELS, LEGAL_PATHS, LEGAL_UPDATED_AT, type LegalPageKey } from '../../lib/legal';
import { TITLE_SUFFIX } from '../defaults';
import { breadcrumb, webPage } from '../jsonld';
import { pageHead } from '../page';
import { HUB_PATHS } from '../paths';
import type { PageSeo, SitemapEntry } from '../types';

/** Ringkasan satu kalimat per dokumen (diambil dari intro halamannya). */
export const LEGAL_DESCRIPTIONS: Record<LegalPageKey, string> = {
  terms:
    'Ketentuan penggunaan garudanexa.com, pembelian template website, dan permintaan jasa website atau aplikasi mobile custom dari PT Garuda Nexa Bahtera.',
  privacy:
    'Data pribadi yang kami kumpulkan di garudanexa.com, untuk apa dipakai, kepada siapa dibagikan, dan hak Anda sesuai UU Pelindungan Data Pribadi.',
  refund: 'Kapan dana pembelian template website di Garuda Nexa dikembalikan, berapa jumlahnya, ke mana, dan berapa lama prosesnya.',
};

const KEYS = Object.keys(LEGAL_PATHS) as LegalPageKey[];
const keyOf = (pathname: string): LegalPageKey | undefined => KEYS.find((key) => LEGAL_PATHS[key] === pathname);

const seo: PageSeo & { updated: string } = {
  updated: LEGAL_UPDATED_AT,
  match: (pathname) => keyOf(pathname) !== undefined,
  head: (pathname, data) => {
    const key = keyOf(pathname);
    if (!key) return null;
    const path = LEGAL_PATHS[key];
    const title = LEGAL_LABELS[key];
    return pageHead(data, {
      path,
      title: `${title}${TITLE_SUFFIX}`,
      description: LEGAL_DESCRIPTIONS[key],
      ogImage: 'default',
      jsonLd: [
        webPage({ path, name: title, description: LEGAL_DESCRIPTIONS[key], dateModified: LEGAL_UPDATED_AT }),
        breadcrumb([
          { name: 'Beranda', path: HUB_PATHS.home },
          { name: title, path },
        ]),
      ],
    });
  },
  routes: (): SitemapEntry[] => KEYS.map((key) => ({ path: LEGAL_PATHS[key], lastmod: LEGAL_UPDATED_AT })),
};

export default seo;
