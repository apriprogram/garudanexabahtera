import type { TemplateDefinition } from '../types';
import NusaNiaga from './NusaNiaga';
import { nusaniagaContent } from './defaultContent';
import { nusaniagaSections } from './schema';

/** NusaNiaga — company profile importir & distributor bahan baku industri dan mesin (demo: PT Arunika Niaga Internasional, Cikarang, fiktif). */
export const nusaniaga: TemplateDefinition = {
  code: 'nusaniaga',
  name: 'NusaNiaga',
  sections: nusaniagaSections,
  defaultContent: nusaniagaContent,
  Component: NusaNiaga,
};
