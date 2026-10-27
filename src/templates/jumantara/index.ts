import type { TemplateDefinition } from '../types';
import Jumantara from './Jumantara';
import { jumantaraContent } from './defaultContent';
import { jumantaraSections } from './schema';

/** Jumantara — website SMA negeri dengan hero slider berbilah progres, layanan cepat, berita, pengumuman, agenda, dan SPMB (demo: SMA Negeri 1 Purbolinggo, isi fiktif). */
export const jumantara: TemplateDefinition = {
  code: 'jumantara',
  name: 'Jumantara',
  sections: jumantaraSections,
  defaultContent: jumantaraContent,
  Component: Jumantara,
  features: { posts: true },
};
