// /jasa-pembuatan-website (Lampiran A): Service + BreadcrumbList + FAQPage, tanpa harga.
import { WEB_SERVICE } from '../../../content/services';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { serviceSeo } from './serviceSeo';

export default serviceSeo(WEB_SERVICE, {
  title: `Jasa Pembuatan Website Company Profile${TITLE_SUFFIX}`,
  description:
    'Jasa pembuatan website custom untuk perusahaan, sekolah, instansi & UMKM. Konsultasi gratis, penawaran jelas sebelum mulai, didampingi sampai rilis.',
  ogImage: 'jasa-website',
  ogImageAlt: 'Garuda Nexa: jasa pembuatan website custom untuk bisnis dan instansi',
});
