import type { TemplateDefinition } from '../types';
import Pesiar from './Pesiar';
import { pesiarContent } from './defaultContent';
import { pesiarSections } from './schema';

/** Pesiar — private tour Bali & sewa mobil dengan sopir + antar-jemput bandara "island editorial": hero foto Bali selebar layar (judul tengah, dua tombol, bilah kaca), tur sehari, rancang tur sendiri (perkiraan jam & harga per mobil → WhatsApp), film peta Bali yang bergerak saat digulir, antar-jemput bandara (tabel harga + formulir → WhatsApp), mobil & sopir, sudah/belum termasuk, cerita tamu, tanya jawab, dan kontak (demo: Pesiar Bali, fiktif). */
export const pesiar: TemplateDefinition = {
  code: 'pesiar',
  name: 'Pesiar',
  sections: pesiarSections,
  defaultContent: pesiarContent,
  Component: Pesiar,
};
