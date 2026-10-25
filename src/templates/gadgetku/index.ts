import type { TemplateDefinition } from '../types';
import GadgetKu from './GadgetKu';
import { gadgetkuContent } from './defaultContent';
import { gadgetkuSections } from './schema';

/** GadgetKu.id — toko online aksesoris HP dengan pencarian per tipe HP, bundling, dan custom casing (demo fiktif). */
export const gadgetku: TemplateDefinition = {
  code: 'gadgetku',
  name: 'GadgetKu.id',
  sections: gadgetkuSections,
  defaultContent: gadgetkuContent,
  Component: GadgetKu,
};
