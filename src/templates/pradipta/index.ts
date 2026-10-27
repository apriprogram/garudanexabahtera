import type { TemplateDefinition } from '../types';
import Pradipta from './Pradipta';
import { pradiptaContent } from './defaultContent';
import { pradiptaSections } from './schema';

/** Pradipta — landing page SMA negeri "Simple sky": hero slider foto + thumbnail, SPMB, berita, pengumuman, agenda (demo: SMA Negeri 1 Purbolinggo, data fiktif). */
export const pradipta: TemplateDefinition = {
  code: 'pradipta',
  name: 'Pradipta',
  sections: pradiptaSections,
  defaultContent: pradiptaContent,
  Component: Pradipta,
  features: { posts: true },
};
