import type { TemplateDefinition } from '../types';
import Nawasena from './Nawasena';
import { nawasenaContent } from './defaultContent';
import { nawasenaSections } from './schema';

/** Nawasena — landing page SMA negeri "Elegant navy": hero slider foto latar + strip pengumuman, statistik, berita, agenda, dan SPMB (demo: nama SMA Negeri 1 Purbolinggo sebagai contoh, isi fiktif). */
export const nawasena: TemplateDefinition = {
  code: 'nawasena',
  name: 'Nawasena',
  sections: nawasenaSections,
  defaultContent: nawasenaContent,
  Component: Nawasena,
  features: { posts: true },
};
