// Data kepala halaman jasa custom (judul, pengantar, jenis layanan, FAQ): bagian kecil dari src/content/services.ts yang
// dibutuhkan *.seo.ts. Modul *.seo.ts dimuat eager di bundel awal (src/seo/routes.ts), jadi isi halaman yang panjang
// tetap di services.ts dan hanya ikut chunk halaman jasa. Modul murni (tanpa React).
import { COMPANY_FACTS } from '../lib/companyFacts';
import { HUB_PATHS } from '../seo/paths';
import { MOBILE_SERVICE_FAQ_IDS, WEB_SERVICE_FAQ_IDS, type FaqId } from './faq';

export type ServiceKey = 'website' | 'mobile';

export interface ServiceMeta {
  key: ServiceKey;
  path: string;
  /** Label remah roti. */
  crumb: string;
  h1: string;
  /** Kalimat pembuka (langsung menjawab: apa, untuk siapa, bagaimana biaya ditentukan). */
  lead: string;
  faqIds: readonly FaqId[];
  /** Untuk JSON-LD Service. */
  serviceType: string;
  serviceName: string;
}

const { legalName, name } = COMPANY_FACTS;

export const WEB_SERVICE_META: ServiceMeta = {
  key: 'website',
  path: HUB_PATHS.webService,
  crumb: 'Jasa pembuatan website',
  h1: 'Jasa pembuatan website custom untuk bisnis & instansi',
  lead: `${name} (${legalName}) membuat website custom untuk perusahaan, UMKM, sekolah, pesantren, dan instansi di seluruh Indonesia. Kami mulai dari konsultasi gratis, lalu mengirim penawaran tertulis berisi lingkup, biaya, dan jadwal sebelum pengerjaan dimulai, dan mendampingi Anda dari desain sampai rilis.`,
  faqIds: WEB_SERVICE_FAQ_IDS,
  serviceType: 'Jasa pembuatan website',
  serviceName: 'Jasa pembuatan website custom',
};

export const MOBILE_SERVICE_META: ServiceMeta = {
  key: 'mobile',
  path: HUB_PATHS.mobileService,
  crumb: 'Jasa pembuatan aplikasi mobile',
  h1: 'Jasa pembuatan aplikasi Android & iOS custom',
  lead: `${name} (${legalName}) membuat aplikasi mobile Android dan iOS yang mengikuti alur bisnis Anda, dari aplikasi kasir dan absensi sampai aplikasi untuk sekolah dan pesantren. Biaya dan jadwal disampaikan lewat penawaran tertulis setelah konsultasi gratis, dan kami membantu sampai aplikasi rilis di Play Store dan App Store.`,
  faqIds: MOBILE_SERVICE_FAQ_IDS,
  serviceType: 'Jasa pembuatan aplikasi mobile',
  serviceName: 'Jasa pembuatan aplikasi Android & iOS custom',
};
