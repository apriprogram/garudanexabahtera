// @vitest-environment node
// Jalankan: npx vitest run src/content/panduan
// Token data di isi artikel ({{harga_template_rentang}}, {{template:slug}}, …): harga & nama template dari data, tidak
// pernah ditulis di Markdown.
import { describe, expect, it } from 'vitest';
import { FIXTURE_TEMPLATES } from '../../../lib/__tests__/preloadFixture';
import { placeholderProblems, placeholderTokens, resolvePlaceholders } from '../placeholders';

const CTX = { templates: FIXTURE_TEMPLATES, priceDate: '2026-10-23' };
const EMPTY = { templates: [], priceDate: '2026-10-23' };

describe('resolvePlaceholders', () => {
  it('harga, jumlah, tanggal dan nama template dari data', () => {
    expect(resolvePlaceholders('Harga {{harga_template_rentang}} per {{tanggal_harga}}.', CTX)).toBe('Harga Rp990.000–Rp1.790.000 per 23 Oktober 2026.');
    expect(resolvePlaceholders('Mulai {{harga_template_min}}, {{jumlah_template}} template.', CTX)).toBe('Mulai Rp990.000, 5 template.');
    expect(resolvePlaceholders('[{{template:aura-studio}}](/template/aura-studio) {{harga:aura-studio}}', CTX)).toBe(
      '[Aura Studio](/template/aura-studio) Rp1.390.000',
    );
  });

  it('tanpa data: teks cadangan dari token, atau cadangan bawaan; nama dari slug', () => {
    expect(resolvePlaceholders('{{harga_template_rentang|tertera di katalog}}', EMPTY)).toBe('tertera di katalog');
    expect(resolvePlaceholders('{{harga_template_min}}', EMPTY)).toBe('sesuai harga di halaman Harga');
    expect(resolvePlaceholders('{{harga:aura-studio|lihat halamannya}}', EMPTY)).toBe('lihat halamannya');
    expect(resolvePlaceholders('{{template:aura-studio}}', EMPTY)).toBe('Aura Studio');
    expect(resolvePlaceholders('{{jumlah_template}}', EMPTY)).toBe('beberapa');
  });

  it('harga template yang tidak valid diabaikan', () => {
    const templates = [{ ...FIXTURE_TEMPLATES[0], price: 0 }, FIXTURE_TEMPLATES[3]];
    expect(resolvePlaceholders('{{harga_template_rentang}}', { ...CTX, templates })).toBe('Rp1.390.000');
    expect(resolvePlaceholders('{{harga:corporate-nexa|x}}', { ...CTX, templates })).toBe('x');
  });
});

describe('placeholderProblems', () => {
  it('menolak nama asing, argumen yang salah, dan kurung kurawal yatim', () => {
    expect(placeholderProblems('{{harga_template_min}} {{template:finova}} {{tanggal_harga}}')).toEqual([]);
    expect(placeholderProblems('{{harga_paket}}')).toEqual(['token tidak dikenal: {{harga_paket}}']);
    expect(placeholderProblems('{{template}}')).toEqual(['argumen token salah: {{template}}']);
    expect(placeholderProblems('{{tanggal_harga:x}}')).toEqual(['argumen token salah: {{tanggal_harga:x}}']);
    expect(placeholderProblems('harga {{ Rp1 }}')).toHaveLength(1);
    expect(placeholderTokens('{{harga:finova|lihat}}')).toEqual([{ raw: '{{harga:finova|lihat}}', name: 'harga', argument: 'finova', fallback: 'lihat' }]);
  });
});
