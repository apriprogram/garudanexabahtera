import type { TemplateDefinition } from '../types';
import SparringPadel from './SparringPadel';
import { sparringContent } from './defaultContent';
import { sparringSections } from './schema';

/** Sparring Padel — landing page lapangan padel "Night court energy": hero foto latar dengan garis lapangan neon dan bilah Booking cepat ke WhatsApp, jadwal & harga per jam bertab, lapangan indoor/outdoor, cari lawan main per level, turnamen, sewa & coaching, komunitas (demo: Sparring Padel, Kemang, Jakarta Selatan, fiktif). */
export const sparringPadel: TemplateDefinition = {
  code: 'sparring-padel',
  name: 'Sparring Padel',
  sections: sparringSections,
  defaultContent: sparringContent,
  Component: SparringPadel,
};
