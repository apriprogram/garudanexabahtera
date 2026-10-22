// /pesan-custom: formulir kebutuhan website / aplikasi mobile custom (docs/platform/SEO-PLAN.md Lampiran A).
// Varian ?layanan=website|mobile memakai kepala yang sama dengan canonical tanpa query. Tanpa angka harga (design.md).
import { TITLE_SUFFIX } from '../defaults';
import { webPage } from '../jsonld';
import { pageHead, staticPage } from '../page';
import { HUB_PATHS } from '../paths';

/** Tanggal terakhir isi /pesan-custom berubah (CustomOrder.tsx, custom-order/). Ubah setiap kali isinya diubah. */
export const CUSTOM_ORDER_UPDATED = '2026-10-22';

export const CUSTOM_ORDER_TITLE = `Pesan Website / Aplikasi Mobile Custom${TITLE_SUFFIX}`;
export const CUSTOM_ORDER_DESCRIPTION =
  'Ceritakan kebutuhan website atau aplikasi Android/iOS Anda. Konsultasi gratis, lalu kami kirim penawaran harga dan jadwal sesuai cakupan proyek.';

export default staticPage({
  path: HUB_PATHS.customOrder,
  updated: CUSTOM_ORDER_UPDATED,
  head: (data) =>
    pageHead(data, {
      path: HUB_PATHS.customOrder,
      title: CUSTOM_ORDER_TITLE,
      description: CUSTOM_ORDER_DESCRIPTION,
      ogImage: 'jasa-website',
      ogImageAlt: 'Garuda Nexa: pesan website atau aplikasi mobile custom, konsultasi gratis',
      jsonLd: [
        webPage({
          path: HUB_PATHS.customOrder,
          name: 'Pesan Website / Aplikasi Mobile Custom',
          description: CUSTOM_ORDER_DESCRIPTION,
          dateModified: CUSTOM_ORDER_UPDATED,
        }),
      ],
    }),
});
