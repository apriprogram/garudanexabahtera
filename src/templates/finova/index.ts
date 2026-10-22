import type { TemplateDefinition } from '../types';
import Finova from './Finova';
import { finovaContent } from './defaultContent';
import { finovaSections } from './schema';

/** Finova — fintech, koperasi, aplikasi pembayaran, konsultan keuangan, SaaS (brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md §3). */
export const finova: TemplateDefinition = {
  code: 'finova',
  name: 'Finova',
  sections: finovaSections,
  defaultContent: finovaContent,
  Component: Finova,
};
