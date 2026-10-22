// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo
// llms.txt & llms-full.txt (docs/platform/SEO-PLAN.md §5.4 langkah 3, Lampiran C): diawali "# Garuda Nexa", harga dan
// daftar template dari data (bukan teks tetap), fakta dari COMPANY_FACTS (field null tidak ditulis), hanya tautan ke
// halaman `index`, dan setiap blok bertanggal.
import { describe, expect, it } from 'vitest';
import { buildLlmsFullTxt, buildLlmsTxt, factFaqs, formatDateId, priceRange } from '../../scripts/seo/llms.mjs';
import { COMPANY_FACTS } from '../../src/lib/companyFacts';
import { getIndexableRoutes } from '../../src/seo/routes';
import { DATA, TEMPLATES, seoData } from '../../src/seo/__tests__/fixtures';

const entries = getIndexableRoutes(DATA);
const input = { facts: COMPANY_FACTS, templates: DATA.templates, entries, data: DATA, origin: 'https://garudanexa.com', builtAt: '2026-10-23T05:00:00.000Z' };

describe('llms.txt', () => {
  const txt = buildLlmsTxt(input);

  it('format llmstxt.org: H1 merek, ringkasan blockquote, bagian H2 berisi tautan Markdown', () => {
    expect(txt.startsWith('# Garuda Nexa\n> Garuda Nexa (PT Garuda Nexa Bahtera, Indonesia) menjual template website siap pakai')).toBe(true);
    expect(txt).toContain('## Template website');
    expect(txt).toMatch(/^- \[Aura Studio\]\(https:\/\/garudanexa\.com\/template\/aura-studio\): template Kecantikan & Klinik, Rp1\.390\.000\./m);
    expect(txt).toContain('[Informasi lengkap](https://garudanexa.com/llms-full.txt)');
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('harga dari data dengan tanggal, sudah termasuk dari COMPANY_FACTS, kontak resmi', () => {
    expect(txt).toContain('- Harga template: Rp990.000–Rp1.790.000 (per 23 Oktober 2026)');
    expect(txt).toContain('Diperbarui 23 Oktober 2026.');
    expect(txt).toContain('- Sudah termasuk: template website + setup awal, domain tahun pertama, hosting tahun pertama, dan sertifikat SSL (HTTPS) tahun pertama');
    expect(txt).toContain(`WhatsApp ${COMPANY_FACTS.whatsappDisplay}, ${COMPANY_FACTS.email}`);
    expect(txt).toContain('Midtrans');
    // harga berubah di DB → llms.txt ikut berubah
    const repriced = buildLlmsTxt({ ...input, templates: TEMPLATES.map((t) => ({ ...t, price: t.price + 100000 })) });
    expect(repriced).toContain('Rp1.090.000–Rp1.890.000');
  });

  it('field null (alamat, tahun ke-2, waktu aktif) tidak ditulis, tanpa placeholder', () => {
    expect(COMPANY_FACTS.address).toBeNull();
    expect(COMPANY_FACTS.templatePackage.renewalCost).toBeNull();
    expect(txt).not.toMatch(/tahun ke-2|Alamat|PEMILIK|\{|null|undefined/);
  });

  it('hanya menautkan halaman index: halaman stub (/template, /harga, /tentang) belum disebut', () => {
    const links = [...txt.matchAll(/\]\((https:\/\/garudanexa\.com[^)]*)\)/g)].map((m) => m[1]);
    for (const link of links.filter((l) => !l.endsWith('/llms-full.txt'))) {
      const path = link.replace('https://garudanexa.com', '') || '/';
      expect(entries.map((e) => e.path), link).toContain(path);
    }
    expect(txt).not.toContain('https://garudanexa.com/harga)');
    expect(txt).toContain('[Kebijakan Pengembalian Dana](https://garudanexa.com/kebijakan-pengembalian-dana)');
    // begitu halaman jadi index, tautannya ikut muncul
    const withPricing = buildLlmsTxt({ ...input, entries: [...entries, { path: '/harga', lastmod: '2026-11-10' }] });
    expect(withPricing).toContain('- [Harga](https://garudanexa.com/harga)');
  });
});

describe('llms-full.txt', () => {
  const full = buildLlmsFullTxt(input);

  it('blok berurutan dan bertanggal: fakta, template, jasa, tanya jawab, kebijakan', () => {
    const order = ['## Fakta perusahaan', '## Template website', '## Jasa custom', '## Tanya jawab', '## Kebijakan'].map((h) => full.indexOf(h));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(full.match(/^Diperbarui /gm)?.length).toBeGreaterThanOrEqual(5);
    expect(full).toContain('## Template website\nDiperbarui 23 Oktober 2026.');
  });

  it('per template: halaman, kategori, harga, ringkasan, fitur, CMS, demo fiktif, deskripsi', () => {
    const block = full.slice(full.indexOf('### Arena Club'), full.indexOf('### Aura Studio'));
    expect(block).toContain('- Halaman: https://garudanexa.com/template/arena-club');
    expect(block).toContain('- Kategori: Olahraga & Komunitas');
    expect(block).toContain('- Harga: Rp1.290.000 (per 23 Oktober 2026), sudah termasuk');
    expect(block).toContain('- Fitur: Tombol pesan lapangan langsung ke WhatsApp');
    expect(block).toContain('- Demo: https://garudanexa.com/demo/arena-club (konten demo fiktif)');
    expect(block).toContain('Arena Club dirancang untuk klub dan tempat olahraga.');
    const withCms = buildLlmsFullTxt({ ...input, cmsSections: { 'arena-club': ['Hero', 'Membership'] } });
    expect(withCms).toContain('- Bagian yang bisa diubah sendiri lewat CMS: Hero, Membership');
    expect(block).toContain(`- Pengelolaan isi: ${COMPANY_FACTS.templatePackage.contentManagement}`);
  });

  it('jasa custom tanpa angka harga; tanya jawab dari COMPANY_FACTS bila FAQ situs tidak diberikan', () => {
    const jasa = full.slice(full.indexOf('## Jasa custom'), full.indexOf('## Tanya jawab'));
    expect(jasa).not.toMatch(/Rp\s?\d/);
    expect(jasa).toContain('penawaran setelah konsultasi gratis');
    for (const faq of factFaqs(COMPANY_FACTS, TEMPLATES)) expect(full).toContain(`### ${faq.question}\n${faq.answer}`);
    const custom = buildLlmsFullTxt({ ...input, faqs: [{ question: 'Apa saja yang sudah termasuk?', answer: 'Jawaban situs.' }] });
    expect(custom).toContain('### Apa saja yang sudah termasuk?\nJawaban situs.');
    expect(custom).not.toContain('### Bagaimana cara membayar?');
  });

  it('panduan hanya bila artikelnya index', () => {
    const guides = [{ slug: 'biaya-website-company-profile', title: 'Berapa Biaya Website?', description: 'Ringkasan.', dateModified: '2026-11-02' }];
    expect(buildLlmsFullTxt({ ...input, guides })).not.toContain('## Panduan');
    const indexed = buildLlmsFullTxt({ ...input, guides, entries: [...entries, { path: '/panduan/biaya-website-company-profile', lastmod: '2026-11-02' }] });
    expect(indexed).toContain('## Panduan\nDiperbarui 2 November 2026.');
  });
});

describe('penolong', () => {
  it('priceRange & formatDateId', () => {
    expect(priceRange(TEMPLATES)).toBe('Rp990.000–Rp1.790.000');
    expect(priceRange([TEMPLATES[0]])).toBe('Rp1.500.000');
    expect(priceRange([])).toBeNull();
    expect(formatDateId('2026-01-05')).toBe('5 Januari 2026');
    // builtAt prerender (UTC) ditulis sebagai tanggal WIB: 22 Okt 21.38 UTC = 23 Okt 04.38 WIB
    expect(buildLlmsTxt({ ...input, builtAt: '2026-10-22T21:38:32.247Z' })).toContain('(per 23 Oktober 2026)');
  });

  it('tanpa template terbit: tidak ada baris harga', () => {
    const empty = seoData([]);
    const txt = buildLlmsTxt({ ...input, templates: [], entries: getIndexableRoutes(empty) });
    expect(txt).not.toContain('Harga template');
  });
});
