import type { TemplateDefinition } from '../types';
import Bestari from './Bestari';
import { bestariContent } from './defaultContent';
import { bestariSections } from './schema';

/** Bestari — website sekolah dasar dengan hero slider, PPDB, berita, pengumuman, guru, dan testimoni (demo: SD Bestari Cendekia, Yogyakarta, fiktif). */
export const bestari: TemplateDefinition = {
  code: 'bestari',
  name: 'Bestari',
  sections: bestariSections,
  defaultContent: bestariContent,
  Component: Bestari,
};
