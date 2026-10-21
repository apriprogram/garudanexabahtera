// Document helpers of the admin pages: the MergeData a new document's template starts from, signature images for
// preview/export and the export of a stored document (docs/platform/PROJECT-DOCS-SPEC.md §4.3, §6).
import { downloadPdFile, pdDocumentGet } from '../../../../features/project-docs/api';
import {
  DOC_TYPES,
  buildModel,
  defaultContent,
  exportDocx,
  exportPdf,
  formatRupiahDoc,
  hari,
  tanggalPanjang,
  terbilang,
  type DocModel,
} from '../../../../features/project-docs/engine';
import {
  SERVICE_LABEL,
  type CompanySettings,
  type DocContent,
  type DocType,
  type MergeData,
  type PdSettings,
  type ProjectDetail,
} from '../../../../features/project-docs/types';
import { dayCount, todayIso } from './format';

export type ExportFormat = 'pdf' | 'docx';

const EMPTY_COMPANY: CompanySettings = {
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  npwp: '',
  signatory_name: '',
  signatory_title: '',
  bank_accounts: [],
};

/**
 * MergeData built from a project (before a document exists): what defaultContent() needs to pick its wording
 * (service type, client company vs person, maintenance). Templates keep every value as a merge field, so the real
 * data is filled by the backend's merge at render time.
 */
export function seedMergeData(project: ProjectDetail, settings: PdSettings | null, type: DocType): MergeData {
  const value = Number(project.value) || 0;
  const date = todayIso();
  const client = project.client;
  return {
    company: settings?.company ?? EMPTY_COMPANY,
    client: {
      type: client?.type ?? 'perusahaan',
      name: client?.name ?? project.client_name ?? '',
      pic_name: client?.pic_name ?? '',
      pic_title: client?.pic_title ?? '',
      email: client?.email ?? project.client_email ?? '',
      phone: client?.phone ?? project.client_phone ?? '',
      address: client?.address ?? '',
      city: client?.city ?? '',
      npwp: client?.npwp ?? '',
    },
    project: {
      id: project.id,
      code: project.code ?? '',
      name: project.name,
      service_type: project.service_type,
      service_label: project.service_label || SERVICE_LABEL[project.service_type] || '',
      description: project.description ?? '',
      scope_summary: project.scope_summary ?? '',
      value,
      value_rupiah: formatRupiahDoc(value),
      value_terbilang: terbilang(value),
      start_date: project.start_date ?? '',
      end_date: project.end_date ?? '',
      duration_days: dayCount(project.start_date, project.end_date),
      payment_terms: project.payment_terms,
      has_maintenance: project.has_maintenance,
      maintenance_fee: Number(project.maintenance_fee) || 0,
      maintenance_period: project.maintenance_period ?? '',
      maintenance_start: project.maintenance_start ?? '',
      maintenance_end: project.maintenance_end ?? '',
    },
    milestones: project.milestones.map((m) => ({
      title: m.title,
      description: m.description ?? '',
      start_date: m.start_date ?? '',
      due_date: m.due_date ?? '',
      weight: m.weight,
      progress: m.progress,
      status: m.status,
    })),
    document: { number: '', type, title: DOC_TYPES[type].label, date, date_long: tanggalPanjang(date), day: hari(date), version: 1, status: 'draft' },
    signatures: [],
  };
}

/** Template content of a new document of `type` for `project`. */
export const templateFor = (type: DocType, project: ProjectDetail, settings: PdSettings | null): DocContent =>
  defaultContent(type, seedMergeData(project, settings, type), { sla_defaults: settings?.sla_defaults });

/** Unique signature references (`pdfile:sig:<id>`) of a model. */
export const signatureRefs = (model: DocModel): string[] =>
  Array.from(new Set(model.signatures.map((s) => s.image_ref).filter((r): r is string => !!r)));

/** The model with `image_src` set from downloaded signature images (ref → object URL). */
export function withSignatureImages(model: DocModel, sources: Record<string, string>): DocModel {
  if (!model.signatures.some((s) => s.image_ref && sources[s.image_ref])) return model;
  return { ...model, signatures: model.signatures.map((s) => (s.image_ref && sources[s.image_ref] ? { ...s, image_src: sources[s.image_ref] } : s)) };
}

/** Downloads the signature images of a model; the caller revokes the URLs (see release). */
export async function loadSignatureImages(model: DocModel): Promise<Record<string, string>> {
  const entries = await Promise.all(
    signatureRefs(model).map(async (ref) => {
      try {
        return [ref, await downloadPdFile(ref)] as const;
      } catch {
        // A missing image leaves the slot unsigned-looking; the document itself still exports
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null));
}

export const releaseImages = (sources: Record<string, string>) => Object.values(sources).forEach((url) => URL.revokeObjectURL(url));

/** Exports a model (signature images included) as PDF or DOCX named after the document number. */
export async function exportModel(model: DocModel, format: ExportFormat): Promise<void> {
  const sources = await loadSignatureImages(model);
  try {
    const full = withSignatureImages(model, sources);
    await (format === 'pdf' ? exportPdf(full, model.meta.number) : exportDocx(full, model.meta.number));
  } finally {
    releaseImages(sources);
  }
}

/** Loads a stored document and exports it (document lists without an open editor). */
export async function exportDocumentById(id: number, format: ExportFormat): Promise<void> {
  const { document: doc } = await pdDocumentGet({ id });
  await exportModel(buildModel(doc.doc_type, doc.content, doc.merge), format);
}
