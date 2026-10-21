// Public API of the document engine (docs/platform/PROJECT-DOCS-SPEC.md §6). Other code imports ONLY from this file.
//
// Real (foundation, unit-tested in ../__tests__/engine-core.test.ts): DOC_TYPES, STAGES, resolveMerge, calcInvoice,
// terbilang, formatRupiahDoc, tanggalPanjang, hari, romawi.
// Placeholders the engine owner replaces behind the same signatures: defaultContent, SECTION_HINTS, buildModel,
// DocumentPreview, exportPdf, exportDocx.
export { DOC_TYPES, STAGES, type DocTypeInfo } from './docTypes';
export { defaultContent, SECTION_HINTS } from './templates';
export { resolveMerge, MISSING_FIELD } from './merge';
export { buildModel } from './buildModel';
export { calcInvoice } from './invoice';
export { terbilang, formatRupiahDoc, tanggalPanjang, hari, romawi } from './format';
export { DocumentPreview } from './DocumentPreview';
export { exportPdf } from './exportPdf';
export { exportDocx } from './exportDocx';
export type { Block, BlockAlign, DocModel, SignatureSlot, TextRun } from './model';
