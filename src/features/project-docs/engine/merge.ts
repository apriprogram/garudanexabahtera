// Merge fields in section bodies, titles and table cells (spec §4.1), resolved at render time from MergeData plus the
// derived fields of mergeView.ts.
//
//   {{client.name}}        value; unknown OR empty → "[…]" and listed in `missing` (an empty name in a contract is as
//                          much a gap as an unknown one, so the editor warns about both)
//   {{client.npwp|-}}      fallback text when unknown or empty, never listed (optional data)
//   {{invoice.notes|}}     empty fallback: optional text that may disappear
// Block directives (`{{#jadwal}}` on a line of its own) are handled by buildModel, not here.
import type { MergeData } from '../types';
import { mergeView } from './mergeView';

/** What an unknown merge field renders as. */
export const MISSING_FIELD = '[…]';

const FIELD = /\{\{\s*([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*(?:\|([^{}]*))?\}\}/g;

/**
 * Value of a dotted path (`client.name`, `milestones.0.title`) as display text, or undefined when the path does not
 * exist or is not a string/number/boolean. Only own properties are followed (no `__proto__`, `constructor`).
 */
export function lookupMerge(data: unknown, path: string): string | undefined {
  let cur: unknown = data;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, key)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur === 'string') return cur;
  if (typeof cur === 'number') return Number.isFinite(cur) ? String(cur) : undefined;
  if (typeof cur === 'boolean') return cur ? 'Ya' : 'Tidak';
  return undefined;
}

/**
 * Resolves every merge field of `text` against an already built view (mergeView), appending unresolved paths to
 * `missing` (once each, in order). Used by buildModel so the view is built once per document.
 */
export function resolveWithView(text: string, view: unknown, missing: string[]): string {
  return String(text ?? '').replace(FIELD, (_match, path: string, fallback: string | undefined) => {
    const value = lookupMerge(view, path);
    if (value !== undefined && value.trim() !== '') return value;
    if (fallback !== undefined) return fallback.trim();
    if (!missing.includes(path)) missing.push(path);
    return MISSING_FIELD;
  });
}

/** Replaces every `{{path}}` / `{{path|fallback}}`; unresolved fields become "[…]" and are listed in `missing`. */
export function resolveMerge(text: string, data: MergeData): { text: string; missing: string[] } {
  const missing: string[] = [];
  return { text: resolveWithView(text, mergeView(data), missing), missing };
}
