import type { TemplateDefinition } from '../types';
import Altura from './Altura';
import { alturaContent } from './defaultContent';
import { alturaSections } from './schema';

/** Altura — company profile berbahasa Inggris untuk developer & investasi properti global (demo: Altura Developments, Singapura, fiktif). */
export const altura: TemplateDefinition = {
  code: 'altura',
  name: 'Altura',
  sections: alturaSections,
  defaultContent: alturaContent,
  Component: Altura,
};
