import type { TemplateDefinition } from '../types';
import AuraStudio from './AuraStudio';
import { auraStudioContent } from './defaultContent';
import { auraStudioSections } from './schema';

/** Aura Studio — klinik kecantikan, salon, nail art, spa, barbershop (brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md §2). */
export const auraStudio: TemplateDefinition = {
  code: 'aura-studio',
  name: 'Aura Studio',
  sections: auraStudioSections,
  defaultContent: auraStudioContent,
  Component: AuraStudio,
};
