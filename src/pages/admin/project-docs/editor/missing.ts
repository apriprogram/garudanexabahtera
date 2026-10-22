// Where the data behind an unresolved merge field is filled in (editor warnings, spec §4.1 "Unknown fields").

export interface MissingGroup {
  /** e.g. "Pengaturan dokumen" */
  label: string;
  /** admin path that fixes the data, null when it is filled inside this document */
  to: string | null;
  fields: string[];
}

/** Project fields that live in the Project Clients form (name, description, start/end date and what derives from them). */
const PROJECT_CLIENTS_FIELD = /^project\.(name|description|start_date|end_date|duration)/;

export function groupMissing(missing: string[], projectId: number): MissingGroup[] {
  const groups = new Map<string, MissingGroup>();
  const add = (key: string, label: string, to: string | null, field: string) => {
    const g = groups.get(key) ?? { label, to, fields: [] };
    if (!g.fields.includes(field)) g.fields.push(field);
    groups.set(key, g);
  };
  for (const field of missing) {
    if (field.startsWith('company')) add('company', 'Pengaturan dokumen', '/admin/proyek/pengaturan', field);
    else if (field.startsWith('client')) add('client', 'Data klien', '/admin/klien', field);
    else if (field.startsWith('milestones')) add('milestones', 'Tab Jadwal', `/admin/proyek/${projectId}?tab=jadwal`, field);
    else if (PROJECT_CLIENTS_FIELD.test(field)) add('project-clients', 'Data proyek (Project Clients)',`/admin/project-clients?edit=${projectId}`, field);
    else if (field.startsWith('project')) add('project', 'Ringkasan proyek', `/admin/proyek/${projectId}`, field);
    else if (field.startsWith('invoice') || field.startsWith('payment')) add('invoice', 'Rincian invoice', null, field);
    else add('other', 'Isi dokumen', null, field);
  }
  return [...groups.values()];
}
