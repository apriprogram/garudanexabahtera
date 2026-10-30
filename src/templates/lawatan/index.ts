import type { TemplateDefinition } from '../types';
import Lawatan from './Lawatan';
import { lawatanContent } from './defaultContent';
import { lawatanSections } from './schema';

/** Lawatan — website tour & travel rombongan "postcard journal": hero foto pemandangan selebar layar dengan panel kartu pos
 * dan chip jenis trip, paket wisata bersaringan dengan perangko harga dan itinerary per hari, film itinerary yang diputar
 * saat digulir (rute + bus + rel kartu pos), yang termasuk, hitung & rancang trip (estimasi + pesan WhatsApp), testimoni,
 * galeri mosaik, tanya jawab, dan kontak (demo: Lawatan Tour & Travel, Yogyakarta, fiktif). */
export const lawatan: TemplateDefinition = {
  code: 'lawatan',
  name: 'Lawatan',
  sections: lawatanSections,
  defaultContent: lawatanContent,
  Component: Lawatan,
};
