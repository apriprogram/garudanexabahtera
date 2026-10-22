// /jasa-pembuatan-aplikasi-mobile (Lampiran A): Service + BreadcrumbList + FAQPage, tanpa harga.
import { MOBILE_SERVICE } from '../../../content/services';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { serviceSeo } from './serviceSeo';

export default serviceSeo(MOBILE_SERVICE, {
  title: `Jasa Pembuatan Aplikasi Android & iOS${TITLE_SUFFIX}`,
  description:
    'Jasa pembuatan aplikasi mobile Android & iOS sesuai alur bisnis Anda: kasir, absensi, manajemen sekolah & lainnya. Konsultasi gratis via WhatsApp.',
  ogImage: 'jasa-aplikasi',
  ogImageAlt: 'Garuda Nexa: jasa pembuatan aplikasi Android dan iOS custom',
});
