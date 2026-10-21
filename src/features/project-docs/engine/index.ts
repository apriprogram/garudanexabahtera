// Public API of the document engine (docs/platform/PROJECT-DOCS-SPEC.md §6). Other code imports ONLY from this file.
//
//   defaultContent(type, data, options?)  Indonesian template; merge fields `{{client.name}}`, directives `{{#termin}}`
//   buildModel(type, content, data)       → DocModel (kop, title, blocks, signature slots, e-Meterai, missing fields)
//   DocumentPreview / exportPdf / exportDocx render the same DocModel (pdfmake and docx are lazy-loaded chunks)
// Markup, merge fields and directives are documented in markup.ts, merge.ts / mergeView.ts and autoBlocks.ts.
export { DOC_TYPES, STAGES, type DocTypeInfo } from './docTypes';
export { defaultContent, SECTION_HINTS, type TemplateOptions } from './templates';
export { resolveMerge, MISSING_FIELD } from './merge';
export { buildModel } from './buildModel';
export { calcInvoice } from './invoice';
export { terbilang, formatRupiahDoc, tanggalPanjang, hari, romawi } from './format';
export { DocumentPreview } from './DocumentPreview';
export { exportPdf } from './exportPdf';
export { exportDocx } from './exportDocx';
export type { Block, BlockAlign, DocModel, SignatureSlot, TextRun } from './model';
