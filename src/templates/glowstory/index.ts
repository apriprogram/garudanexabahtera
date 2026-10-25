import type { TemplateDefinition } from '../types';
import GlowStory from './GlowStory';
import { glowstoryContent } from './defaultContent';
import { glowstorySections } from './schema';

/** GlowStory — toko online kecantikan: skincare, makeup, perawatan tubuh dari brand lokal (demo: Seruni Beauty, fiktif). */
export const glowstory: TemplateDefinition = {
  code: 'glowstory',
  name: 'GlowStory',
  sections: glowstorySections,
  defaultContent: glowstoryContent,
  Component: GlowStory,
};
