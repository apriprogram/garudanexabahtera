// /harga (STUB WP1, noindex sampai WP6 mengisi halamannya). Angka harga hanya dari data template, tidak ditulis di sini.
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.pricing,
  head: () =>
    stubHead({
      title: `Harga Template Website & Jasa Website${TITLE_SUFFIX}`,
      description:
        'Harga template website Garuda Nexa sudah termasuk domain, hosting & SSL tahun pertama. Website dan aplikasi custom lewat penawaran setelah konsultasi gratis.',
    }),
};

export default seo;
