import type { TemplateDefinition } from '../types';
import Lajur from './Lajur';
import { lajurContent } from './defaultContent';
import { lajurSections } from './schema';

/** Lajur — website PO sewa bus pariwisata "bold livery": hero foto jalan selebar layar dengan bilah minta penawaran + rekomendasi armada, armada bertab dengan gambar bus SVG dan denah kursi, kalkulator rombongan, film sehari perjalanan yang diputar oleh gulir, tujuan favorit, harga termasuk, cara sewa, testimoni, galeri, FAQ, dan kontak garasi; semua permintaan menyusun pesan WhatsApp (demo: Lajur Trans Wisata, Semarang, fiktif). */
export const lajur: TemplateDefinition = {
  code: 'lajur',
  name: 'Lajur',
  sections: lajurSections,
  defaultContent: lajurContent,
  Component: Lajur,
};
