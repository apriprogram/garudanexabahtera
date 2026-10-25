import type { TemplateDefinition } from '../types';
import TaniMakmur from './TaniMakmur';
import { taniContent } from './defaultContent';
import { taniSections } from './schema';

/** TaniMakmur — toko online pertanian: benih, pupuk, pestisida organik, alat tani, paket per tanaman (demo fiktif). */
export const tanimakmur: TemplateDefinition = {
  code: 'tanimakmur',
  name: 'TaniMakmur',
  sections: taniSections,
  defaultContent: taniContent,
  Component: TaniMakmur,
};
