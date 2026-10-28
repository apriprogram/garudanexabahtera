import type { TemplateDefinition } from '../types';
import SpecialistPlus from './SpecialistPlus';
import { specialistplusContent } from './defaultContent';
import { specialistplusSections } from './schema';

/** SpecialistPlus — website pusat klinik spesialis & laboratorium dengan hero konsol data di atas foto ruang pencitraan, tab klinik + jadwal dokter, tabel perbandingan paket MCU, permintaan hasil lab yang menyusun pesan WhatsApp, kartu spesifikasi alat, dan batang waktu hasil (demo: SpecialistPlus Medical Center, Medan, fiktif). */
export const specialistplus: TemplateDefinition = {
  code: 'specialistplus',
  name: 'SpecialistPlus',
  sections: specialistplusSections,
  defaultContent: specialistplusContent,
  Component: SpecialistPlus,
};
