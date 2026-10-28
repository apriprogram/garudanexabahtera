import type { TemplateDefinition } from '../types';
import MomKid from './MomKid';
import { momkidContent } from './defaultContent';
import { momkidSections } from './schema';

/** MomKid Hospital — website rumah sakit ibu & anak bernuansa pastel hangat: hero foto latar ibu & bayi dengan tepi bergelombang dan chip mengapung, perjalanan bertahap, paket persalinan dengan pilihan kamar, jadwal imunisasi interaktif (ringkasan), jadwal dokter anak, klinik laktasi, tur kamar bersalin, artikel parenting, dan formulir pendaftaran ke WhatsApp (demo: RSIA MomKid, Tangerang Selatan, fiktif). */
export const momkid: TemplateDefinition = {
  code: 'momkid',
  name: 'MomKid Hospital',
  sections: momkidSections,
  defaultContent: momkidContent,
  Component: MomKid,
};
