import type { TemplateDefinition } from '../types';
import { saudagarContent } from './defaultContent';
import Saudagar from './Saudagar';
import { saudagarSections } from './schema';

/** Saudagar — company profile eksportir kopi, kakao, rempah & kelapa dengan hero tiga foto lengkung, tab spesifikasi komoditas, kalender panen, dan formulir penawaran ke WhatsApp (demo: PT Saudagar Hasil Bumi, Makassar, fiktif). */
export const saudagar: TemplateDefinition = {
  code: 'saudagar',
  name: 'Saudagar',
  sections: saudagarSections,
  defaultContent: saudagarContent,
  Component: Saudagar,
};
