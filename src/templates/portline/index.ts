import type { TemplateDefinition } from '../types';
import Portline from './Portline';
import { portlineContent } from './defaultContent';
import { portlineSections } from './schema';

/** Portline — company profile berbahasa Inggris untuk grup pelayaran & logistik (demo: Portline Group, Rotterdam, fiktif). */
export const portline: TemplateDefinition = {
  code: 'portline',
  name: 'Portline',
  sections: portlineSections,
  defaultContent: portlineContent,
  Component: Portline,
};
