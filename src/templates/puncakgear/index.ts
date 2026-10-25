import type { TemplateDefinition } from '../types';
import PuncakGear from './PuncakGear';
import { puncakContent } from './defaultContent';
import { puncakSections } from './schema';

/** PuncakGear — toko perlengkapan mendaki dengan panduan per gunung dan sewa alat (demo: Tapak Rimba Outdoor, fiktif). */
export const puncakgear: TemplateDefinition = {
  code: 'puncakgear',
  name: 'PuncakGear',
  sections: puncakSections,
  defaultContent: puncakContent,
  Component: PuncakGear,
};
