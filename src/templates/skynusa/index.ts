import type { TemplateDefinition } from '../types';
import SkyNusa from './SkyNusa';
import { skynusaContent } from './defaultContent';
import { skynusaSections } from './schema';

/** SkyNusa — toko drone untuk foto, videografi wedding, dan pemetaan lahan (demo: SkyNusa, Jakarta, fiktif). */
export const skynusa: TemplateDefinition = {
  code: 'skynusa',
  name: 'SkyNusa',
  sections: skynusaSections,
  defaultContent: skynusaContent,
  Component: SkyNusa,
};
