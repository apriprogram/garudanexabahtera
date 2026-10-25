import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../index';
import { POST_TEMPLATE_CODES, templateHasPosts } from '../postTemplates';

describe('POST_TEMPLATE_CODES', () => {
  it('sama dengan template berfitur posts di registri', () => {
    const fromRegistry = Object.values(TEMPLATES)
      .filter((def) => def.features?.posts === true)
      .map((def) => def.code)
      .sort();
    expect([...POST_TEMPLATE_CODES].sort()).toEqual(fromRegistry);
  });

  it('templateHasPosts menolak kode kosong dan template tanpa fitur', () => {
    expect(templateHasPosts('madani')).toBe(true);
    expect(templateHasPosts('corporate-nexa')).toBe(false);
    expect(templateHasPosts('')).toBe(false);
    expect(templateHasPosts(null)).toBe(false);
  });
});
