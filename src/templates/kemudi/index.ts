import type { TemplateDefinition } from '../types';
import Kemudi from './Kemudi';
import { kemudiContent } from './defaultContent';
import { kemudiSections } from './schema';

/** Kemudi — rental mobil lepas kunci & dengan sopir "clean dashboard": hero foto udara selebar layar dengan kartu pesan (layanan, mobil, jadwal, perkiraan harga → WhatsApp), armada bersaringan kelas dengan ilustrasi SVG per kelas, film proses yang diputar dengan menggulir, tabel harga, syarat sewa, antar-jemput dengan peta kota abstrak, cara sewa, ulasan, tanya jawab, dan garasi + peta (demo: Kemudi Rent Car, fiktif). */
export const kemudi: TemplateDefinition = {
  code: 'kemudi',
  name: 'Kemudi',
  sections: kemudiSections,
  defaultContent: kemudiContent,
  Component: Kemudi,
};
