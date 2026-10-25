import type { TemplateDefinition } from '../types';
import Madani from './Madani';
import { madaniContent } from './defaultContent';
import { madaniSections } from './schema';

/** Madani — website sekolah Islam SMA/MA dengan PPDB (demo: SMA IT Nurul Azka, Bogor, fiktif). */
export const madani: TemplateDefinition = {
  code: 'madani',
  name: 'Madani',
  sections: madaniSections,
  defaultContent: madaniContent,
  Component: Madani,
  features: { posts: true },
};
