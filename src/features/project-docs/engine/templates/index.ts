// Default document content per type (spec §6 "Templates"): professional Indonesian templates whose project, client
// and company data are merge fields (`{{client.name}}`) and directives (`{{#termin}}`) filled at render time. Every
// section stays editable in the document editor.
import type { DocContent, DocType, MergeData, ServiceType } from '../../types';
import { bast } from './bast';
import { brd } from './brd';
import { invoice } from './invoice';
import { mou } from './mou';
import { pks } from './pks';
import { proposal } from './proposal';
import { receipt } from './receipt';
import type { TemplateInput, TemplateOptions } from './shared';
import { sla } from './sla';
import { timeline } from './timeline';
import { uat } from './uat';

export { SECTION_HINTS } from './hints';
export type { TemplateOptions } from './shared';

const TEMPLATES: Record<DocType, (input: TemplateInput) => DocContent> = {
  brd,
  mou,
  proposal,
  pks,
  timeline,
  uat,
  bast,
  invoice,
  receipt,
  sla,
};

const SERVICES: ServiceType[] = ['website', 'mobile_app', 'ui_ux', 'other'];

/**
 * Professional Indonesian template for a new document of `type`. Only the wording that depends on the kind of
 * project is decided here (client company vs private person, service type, maintenance); every value stays a merge
 * field. `options.sla_defaults` (settings `pd_sla_defaults`, a whole PdSettings object fits) fills the SLA service
 * hours, uptime and priority table; the seeded defaults are used without it.
 */
export function defaultContent(type: DocType, data: MergeData, options: TemplateOptions = {}): DocContent {
  const serviceType = data?.project?.service_type;
  const input: TemplateInput = {
    data,
    service: SERVICES.includes(serviceType) ? serviceType : 'other',
    person: data?.client?.type === 'perorangan',
    options: options ?? {},
  };
  return TEMPLATES[type](input);
}
