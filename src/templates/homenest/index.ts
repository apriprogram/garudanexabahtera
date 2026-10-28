import type { TemplateDefinition } from '../types';
import HomeNest from './HomeNest';
import { homenestContent } from './defaultContent';
import { homenestSections } from './schema';

/** HomeNest — katalog & penjualan rumah "quiet luxury": hero foto rumah selebar layar dengan panel cari rumah, daftar rumah bersaringan lokasi/tipe/harga, tur virtual per ruang, simulasi KPR, profil developer, fasilitas kawasan, dan agen + formulir jadwal kunjungan ke WhatsApp (demo: HomeNest oleh PT Sarang Hunian Lestari, fiktif). */
export const homenest: TemplateDefinition = {
  code: 'homenest',
  name: 'HomeNest',
  sections: homenestSections,
  defaultContent: homenestContent,
  Component: HomeNest,
};
