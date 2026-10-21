// Merge fields `{{path}}` in section bodies and titles (spec §4.1), resolved from MergeData at render time.
import type { MergeData } from '../types';

/** What an unknown merge field renders as. */
export const MISSING_FIELD = '[…]';

const FIELD = /\{\{\s*([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*\}\}/g;

/**
 * Value of a dotted path (`client.name`, `milestones.0.title`) as display text, or undefined when the path does not
 * exist or is not a string/number/boolean. Only own properties are followed (no `__proto__`, `constructor`).
 */
export function lookupMerge(data: MergeData, path: string): string | undefined {
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

/** Replaces every `{{path}}`; unknown fields become "[…]" and are listed once each in `missing` (in order). */
export function resolveMerge(text: string, data: MergeData): { text: string; missing: string[] } {
  const missing: string[] = [];
  const out = String(text ?? '').replace(FIELD, (_match, path: string) => {
    const value = lookupMerge(data, path);
    if (value !== undefined) return value;
    if (!missing.includes(path)) missing.push(path);
    return MISSING_FIELD;
  });
  return { text: out, missing };
}
