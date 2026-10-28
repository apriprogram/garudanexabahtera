import type { TemplateDefinition } from '../types';
import SmashHall from './SmashHall';
import { smashhallContent } from './defaultContent';
import { smashhallSections } from './schema';

/** SmashHall — website GOR & klub badminton: hero foto dengan strip ketersediaan 8 lapangan, tabel lapangan × jam yang menyusun booking WhatsApp, member bulanan, latihan & pelatih, akademi, kejuaraan, toko perlengkapan, dan formulir booking (demo: GOR SmashHall, Bandung, fiktif). */
export const smashhall: TemplateDefinition = {
  code: 'smashhall',
  name: 'SmashHall',
  sections: smashhallSections,
  defaultContent: smashhallContent,
  Component: SmashHall,
};
