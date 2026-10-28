import type { TemplateDefinition } from '../types';
import { medicareContent } from './defaultContent';
import MediCareGeneral from './MediCareGeneral';
import { medicareSections } from './schema';

/** MediCare General — website rumah sakit umum dengan strip IGD merah & kontrol ukuran teks, hero foto rumah sakit + tiga ubin aksi, pendaftaran online 3 langkah ke WhatsApp, jadwal dokter tersaring, poliklinik, pita IGD, rawat inap, dan asuransi/BPJS (demo: RS MediCare General, Semarang, fiktif). */
export const medicareGeneral: TemplateDefinition = {
  code: 'medicare-general',
  name: 'MediCare General',
  sections: medicareSections,
  defaultContent: medicareContent,
  Component: MediCareGeneral,
};
