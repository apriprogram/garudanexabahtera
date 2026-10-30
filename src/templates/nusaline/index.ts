import type { TemplateDefinition } from '../types';
import Nusaline from './Nusaline';
import { nusalineContent } from './defaultContent';
import { nusalineSections } from './schema';

/** Nusaline — website PO bus antarkota / bus malam "night line": hero foto jalan tol malam dengan kartu cari jadwal dan papan keberangkatan mini, tabel jadwal bersaringan dengan tombol Pesan ke WhatsApp, kelas dengan denah kursi SVG, film perjalanan semalam yang digerakkan gulir, rute & titik naik, fasilitas kabin, cara pesan, testimoni, FAQ, dan kontak (demo: Nusaline, PO bus fiktif di Jakarta Timur). */
export const nusaline: TemplateDefinition = {
  code: 'nusaline',
  name: 'Nusaline',
  sections: nusalineSections,
  defaultContent: nusalineContent,
  Component: Nusaline,
};
