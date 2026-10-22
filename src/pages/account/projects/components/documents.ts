// Rendering a customer document: DocDetail → DocModel (engine) with the signature images downloaded from pd_file
// (private, token-protected) as object URLs, and the PDF / DOCX export of a document (lazy pdfmake / docx).
import { useEffect, useState } from 'react';
import { downloadPdFile, pdMyDocument } from '../../../../features/project-docs/api';
import { buildModel, exportDocx, exportPdf, type DocModel } from '../../../../features/project-docs/engine';
import type { DocDetail } from '../../../../features/project-docs/types';

export type ExportFormat = 'pdf' | 'docx';

/** Signature references (`pdfile:sig:<id>`) of a model, unique. */
export const signatureRefs = (model: DocModel): string[] =>
  Array.from(new Set(model.signatures.map((s) => s.image_ref).filter((r): r is string => Boolean(r))));

/** The model with `image_src` filled from downloaded images (ref → object URL). */
export function withSignatureImages(model: DocModel, sources: Record<string, string>): DocModel {
  if (!model.signatures.some((s) => s.image_ref && sources[s.image_ref])) return model;
  return { ...model, signatures: model.signatures.map((s) => (s.image_ref && sources[s.image_ref] ? { ...s, image_src: sources[s.image_ref] } : s)) };
}

/** Downloads images; a missing one leaves its slot without a picture (the document stays readable). */
async function loadImages(refs: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    refs.map(async (ref) => {
      try {
        return [ref, await downloadPdFile(ref)] as const;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null));
}

const release = (sources: Record<string, string>) => Object.values(sources).forEach((url) => URL.revokeObjectURL(url));

/** Object URLs of the given signature references; revoked when the set changes or the page closes. */
export function useSignatureImages(refs: string[]): Record<string, string> {
  const [sources, setSources] = useState<Record<string, string>>({});
  const key = [...refs].sort().join('|');

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    loadImages(key.split('|')).then((loaded) => {
      if (active) setSources(loaded);
      else release(loaded);
    });
    return () => {
      active = false;
    };
  }, [key]);

  useEffect(() => () => release(sources), [sources]);

  return key ? sources : {};
}

/** Exports a model as PDF or DOCX named after the document number (signature images loaded when not given). */
export async function exportModel(model: DocModel, format: ExportFormat, sources?: Record<string, string>): Promise<void> {
  const own = sources ? null : await loadImages(signatureRefs(model));
  try {
    const full = withSignatureImages(model, sources ?? own ?? {});
    await (format === 'pdf' ? exportPdf(full, model.meta.number) : exportDocx(full, model.meta.number));
  } finally {
    if (own) release(own);
  }
}

export const modelOf = (doc: DocDetail): DocModel => buildModel(doc.doc_type, doc.content, doc.merge);

/** Loads a document of an own project (invoice / receipt lists) and exports it. */
export async function exportMyDocument(id: number, format: ExportFormat): Promise<void> {
  const { document: doc } = await pdMyDocument({ id });
  await exportModel(modelOf(doc), format);
}
