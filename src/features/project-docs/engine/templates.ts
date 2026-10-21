// Default document content per type (spec §6 "Templates").
// PLACEHOLDER (foundation): a minimal two-section template so the rest of the app can create, edit and export
// documents. The engine owner replaces defaultContent and SECTION_HINTS with the full Indonesian templates; keep the
// signatures stable.
import type { DocContent, DocType, MergeData } from '../types';
import { DOC_TYPES } from './docTypes';

/** Professional Indonesian template for a new document of `type`; merge fields stay `{{...}}` (resolved at render). */
export function defaultContent(type: DocType, data: MergeData): DocContent {
  const service = (data.project.service_label || 'Website').toUpperCase();
  return {
    title: type === 'pks' ? `PERJANJIAN KERJA SAMA PEMBUATAN ${service}` : DOC_TYPES[type].label,
    sections: [
      {
        id: 'pendahuluan',
        title: 'Pendahuluan',
        body: 'Dokumen ini disusun untuk proyek **{{project.name}}** antara {{company.name}} dan {{client.name}}.',
      },
      { id: 'isi', title: 'Isi dokumen', body: '' },
    ],
  };
}

const PLACEHOLDER_HINTS: Record<string, string> = {
  pendahuluan: 'Ringkas tujuan dokumen ini dalam satu atau dua kalimat.',
  isi: 'Tulis isi dokumen. Pakai baris kosong untuk paragraf baru, "- " untuk butir, dan **teks** untuk huruf tebal.',
};

/** Editor help per section id, per document type. */
export const SECTION_HINTS: Record<DocType, Record<string, string>> = Object.fromEntries(
  (Object.keys(DOC_TYPES) as DocType[]).map((type) => [type, PLACEHOLDER_HINTS]),
) as Record<DocType, Record<string, string>>;
