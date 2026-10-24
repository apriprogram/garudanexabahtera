import type { TemplateDefinition } from '../types';
import Serenity from './Serenity';
import { serenityContent } from './defaultContent';
import { serenitySections } from './schema';

/** Serenity — studio yoga, pilates, dan kelas kebugaran yang tenang (demo: Aruna Yoga, fiktif). */
export const serenity: TemplateDefinition = {
  code: 'serenity',
  name: 'Serenity',
  sections: serenitySections,
  defaultContent: serenityContent,
  Component: Serenity,
};
