// Rute aplikasi host utama (docs/platform/SEO-PLAN.md §2): akun pembeli, checkout /pesan/{slug}, masuk/daftar, login staf,
// panel admin, pratinjau situs /situs/{id}. Semuanya noindex,follow, tanpa canonical/JSON-LD, tidak masuk sitemap, dan
// kepalanya tidak bergantung pada data (SeoManager menerapkannya tanpa menunggu API).
// Judul di sini sama dengan judul yang dipasang halamannya sendiri (payment.ts, authForm.ts), sehingga urutan effect tidak
// mengubah judul tab; halaman yang memuat data (mis. nama template) tetap boleh menggantinya sesudahnya.
import { TITLE_SUFFIX } from '../defaults';
import { pageHead } from '../page';
import { isAppPath } from '../paths';
import type { PageSeo } from '../types';

const TITLES: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^\/akun\/pesanan\/([^/]+)$/, (m) => `Pesanan ${decodeURIComponent(m[1])}`],
  [/^\/akun\/situs\/[^/]+$/, () => 'Kelola konten situs'],
  [/^\/akun\/proyek\/[^/]+\/dokumen\/[^/]+$/, () => 'Dokumen proyek'],
  [/^\/akun\/proyek\/[^/]+$/, () => 'Detail proyek'],
  [/^\/akun\/proyek$/, () => 'Proyek saya'],
  [/^\/akun(\/.*)?$/, () => 'Akun saya'],
  [/^\/pesan\/[^/]+/, () => 'Pesan template'],
  [/^\/masuk(\/.*)?$/, () => 'Masuk'],
  [/^\/daftar(\/.*)?$/, () => 'Daftar'],
  [/^\/(login|auth)(\/.*)?$/, () => 'Masuk panel admin'],
  [/^\/admin(\/.*)?$/, () => 'Panel Admin'],
  [/^\/situs\/[^/]+/, () => 'Pratinjau situs'],
];

export function appTitle(pathname: string): string {
  for (const [pattern, title] of TITLES) {
    const match = pathname.match(pattern);
    if (match) {
      try {
        return `${title(match)}${TITLE_SUFFIX}`;
      } catch {
        break; // decodeURIComponent gagal (path rusak)
      }
    }
  }
  return 'Garuda Nexa';
}

const seo: PageSeo = {
  match: (pathname) => isAppPath(pathname),
  head: (pathname, data) =>
    pageHead(data, {
      path: pathname,
      robots: 'noindex,follow',
      title: appTitle(pathname),
      description: 'Halaman akun dan pemesanan Garuda Nexa.',
    }),
};

export default seo;
