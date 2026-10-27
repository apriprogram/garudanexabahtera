import type { TemplateDefinition } from '../types';
import { veloraContent } from './defaultContent';
import { veloraSections } from './schema';
import Velora from './Velora';

/** Velora — company profile berbahasa Inggris untuk grup otomotif & perusahaan besar internasional (demo: Velora Motor Group, Zurich, fiktif). */
export const velora: TemplateDefinition = {
  code: 'velora',
  name: 'Velora',
  sections: veloraSections,
  defaultContent: veloraContent,
  Component: Velora,
};
