// @vitest-environment node
// Jalankan: npx vitest run src/content/panduan
// Artikel panduan: pembaca respons API (get_guides, get_guide), urutan terbaru dulu, frontmatter sederhana (salinan
// seed di data uji), penolong Markdown.
import { describe, expect, it } from 'vitest';
import { articleFromApi, findArticle, guidesFromApi } from '..';
import {
  articleHeadings,
  countWords,
  headingId,
  markdownLinks,
  parseArticle,
  parseFrontmatter,
  proseBeforeSources,
  readingMinutes,
  sortArticles,
  type Article,
} from '../parse';

const ARTICLE = [
  '---',
  'title: "Berapa Biaya Membuat Website Company Profile di 2026?"',
  'description: Ringkasan: faktor biaya, contoh paket, dan cara memilih.',
  'slug: biaya-website-company-profile',
  'author: Tim Garuda Nexa',
  '# komentar diabaikan',
  'datePublished: 2026-11-02',
  'dateModified: 2026-11-05',
  'sources:',
  '  - https://contoh.go.id/data-harga',
  '  - "https://contoh.test/laporan?tahun=2026"',
  'related: [template-vs-jasa-website-custom, \'website-klinik-kecantikan\']',
  '---',
  '',
  '## Jawaban singkat',
  '',
  'Isi artikel: titik dua: dan --- di tengah tetap isi.',
  '',
].join('\r\n');

describe('parseFrontmatter', () => {
  it('membaca teks, kutip, daftar bertingkat, daftar sebaris, CRLF dan BOM', () => {
    const { data, body } = parseFrontmatter(String.fromCharCode(0xfeff) + ARTICLE);
    expect(data).toEqual({
      title: 'Berapa Biaya Membuat Website Company Profile di 2026?',
      description: 'Ringkasan: faktor biaya, contoh paket, dan cara memilih.',
      slug: 'biaya-website-company-profile',
      author: 'Tim Garuda Nexa',
      datePublished: '2026-11-02',
      dateModified: '2026-11-05',
      sources: ['https://contoh.go.id/data-harga', 'https://contoh.test/laporan?tahun=2026'],
      related: ['template-vs-jasa-website-custom', 'website-klinik-kecantikan'],
    });
    expect(body).toBe('## Jawaban singkat\n\nIsi artikel: titik dua: dan --- di tengah tetap isi.\n');
  });

  it('tanpa frontmatter → data kosong, seluruh teks jadi isi; [] = daftar kosong', () => {
    expect(parseFrontmatter('# Judul\n\nIsi')).toEqual({ data: {}, body: '# Judul\n\nIsi' });
    expect(parseFrontmatter('---\nsources: []\nrelated:\n---\nx').data).toEqual({ sources: [], related: [] });
  });

  it('menolak frontmatter yang tidak ditutup, baris asing, dan kunci ganda', () => {
    expect(() => parseFrontmatter('---\ntitle: A\n')).toThrow(/tidak ditutup/);
    expect(() => parseFrontmatter('---\ntitle A\n---\n')).toThrow(/tidak dikenali/);
    expect(() => parseFrontmatter('---\n- tanpa kunci\n---\n')).toThrow(/tidak dikenali/);
    expect(() => parseFrontmatter('---\ntitle: A\ntitle: B\n---\n')).toThrow(/dua kali/);
  });
});

describe('parseArticle', () => {
  it('menghasilkan Article lengkap', () => {
    const article = parseArticle(ARTICLE, 'biaya-website-company-profile');
    expect(article).toMatchObject({
      slug: 'biaya-website-company-profile',
      author: 'Tim Garuda Nexa',
      datePublished: '2026-11-02',
      dateModified: '2026-11-05',
      cta: 'template',
      related: ['template-vs-jasa-website-custom', 'website-klinik-kecantikan'],
    });
    expect(article.body.startsWith('## Jawaban singkat')).toBe(true);
  });

  it('menolak field wajib yang kosong, slug/tanggal/sumber yang salah, dan slug yang beda dengan nama file', () => {
    const swap = (from: string, to: string) => ARTICLE.replace(from, to);
    expect(() => parseArticle(swap('author: Tim Garuda Nexa', 'author:'))).toThrow(/"author" wajib/);
    expect(() => parseArticle(swap('title: "Berapa', 'judul: "Berapa'))).toThrow(/"title" wajib/);
    expect(() => parseArticle(ARTICLE, 'nama-lain')).toThrow(/sama dengan nama file/);
    expect(() => parseArticle(swap('slug: biaya-website-company-profile', 'slug: Biaya_Website'))).toThrow(/slug/);
    expect(() => parseArticle(swap('datePublished: 2026-11-02', 'datePublished: 2026-02-30'))).toThrow(/datePublished/);
    expect(() => parseArticle(swap('dateModified: 2026-11-05', 'dateModified: 2026-10-01'))).toThrow(/sebelum datePublished/);
    expect(() => parseArticle(swap('https://contoh.go.id/data-harga', 'contoh.go.id'))).toThrow(/URL/);
    expect(() => parseArticle(ARTICLE.replace(/sources:[\s\S]*?(?=related:)/, 'sources: satu\r\n'))).toThrow(/daftar/);
    expect(() => parseArticle(swap("'website-klinik-kecantikan'", 'Bukan Slug'))).toThrow(/related/);
  });

  it('reviewed opsional: tanpa baris = draf (null), selain itu tanggal YYYY-MM-DD', () => {
    expect(parseArticle(ARTICLE).reviewed).toBeNull();
    const withReviewed = (value: string) => ARTICLE.replace('slug: biaya', `reviewed: ${value}\r\nslug: biaya`);
    expect(parseArticle(withReviewed('2026-11-06')).reviewed).toBe('2026-11-06');
    expect(parseArticle(withReviewed('"2026-11-06"')).reviewed).toBe('2026-11-06');
    expect(() => parseArticle(withReviewed('ya'))).toThrow(/reviewed "ya"/);
    expect(() => parseArticle(withReviewed('2026-02-30'))).toThrow(/reviewed/);
    expect(() => parseArticle(withReviewed('[2026-11-06]'))).toThrow(/reviewed/);
  });

  it('cta opsional: bawaan template, nilai lain harus template | website | mobile', () => {
    const withCta = (value: string) => ARTICLE.replace('slug: biaya', `cta: ${value}\r\nslug: biaya`);
    expect(parseArticle(withCta('mobile')).cta).toBe('mobile');
    expect(parseArticle(withCta('website')).cta).toBe('website');
    expect(() => parseArticle(withCta('toko'))).toThrow(/cta "toko"/);
    expect(() => parseArticle(withCta('[mobile]'))).toThrow(/cta/);
  });
});

describe('sortArticles, guidesFromApi, articleFromApi', () => {
  const make = (slug: string, datePublished: string, dateModified = datePublished): Article => ({
    title: slug, description: slug, slug, author: 'Tim Garuda Nexa', datePublished, dateModified, reviewed: null, cta: 'template', sources: [], related: [], body: '',
  });
  const row = (slug: string, extra: Record<string, unknown> = {}) => ({
    slug, title: `Judul ${slug}`, description: `Deskripsi ${slug}`, author: 'Tim Garuda Nexa', datePublished: '2026-10-23', dateModified: '2026-10-24', reviewed: '2026-10-24', ...extra,
  });

  it('terbaru dulu, seri → dateModified, lalu slug; slug ganda ditolak', () => {
    const sorted = sortArticles([
      make('lama', '2026-01-01'),
      make('b-baru', '2026-11-02'),
      make('a-baru', '2026-11-02'),
      make('baru-diubah', '2026-11-02', '2026-11-09'),
    ]);
    expect(sorted.map((a) => a.slug)).toEqual(['baru-diubah', 'a-baru', 'b-baru', 'lama']);
    expect(() => sortArticles([make('x', '2026-01-01'), make('x', '2026-02-01')])).toThrow(/lebih dari satu/);
  });

  it('guidesFromApi: hanya artikel terbit yang lengkap, slug ganda dibuang, terbaru dulu', () => {
    const guides = guidesFromApi({
      success: true,
      guides: [
        row('lama', { datePublished: '2026-01-01', dateModified: '2026-01-02' }),
        row('baru'),
        row('draf', { reviewed: null }),
        row('baru', { title: 'Ganda' }),
        row('Slug Salah'),
        row('tanpa-judul', { title: '  ' }),
        row('tanggal-salah', { datePublished: '23-10-2026' }),
        'bukan objek',
      ],
    });
    expect(guides.map((g) => g.slug)).toEqual(['baru', 'lama']);
    expect(guides[0]).toEqual(row('baru'));
    expect(guidesFromApi(null)).toEqual([]);
    expect(guidesFromApi({ guides: 'x' })).toEqual([]);
    expect(findArticle(guides, 'lama')?.title).toBe('Judul lama');
    expect(findArticle(guides, 'tidak-ada')).toBeUndefined();
  });

  it('articleFromApi: isi (CRLF → LF), ajakan sah atau template, sumber & terkait yang rapi', () => {
    const article = articleFromApi({
      success: true,
      guide: row('a', { body: 'Baris 1\r\nBaris 2', cta: 'mobile', sources: [' https://contoh.test ', 3, ''], related: ['b', 'Bukan Slug'] }),
    });
    expect(article).toEqual({ ...row('a'), body: 'Baris 1\nBaris 2', cta: 'mobile', sources: ['https://contoh.test'], related: ['b'] });
    expect(articleFromApi({ guide: row('a', { cta: 'lain' }) })?.cta).toBe('template');
    expect(articleFromApi({ guide: row('a', { slug: '' }) })).toBeNull();
    expect(articleFromApi({ success: true })).toBeNull();
  });
});

describe('penolong Markdown', () => {
  const MD = [
    'Paragraf pembuka dengan [tautan](https://contoh.test/a) dan {{harga_template_min}}.',
    '',
    '## Domain, hosting & SSL',
    '',
    '| Kolom | Isi |',
    '|---|---|',
    '| a | b |',
    '',
    '```',
    '## bukan judul',
    '```',
    '',
    '## Biaya perawatan per tahun',
    '',
    '![gambar](/x.png) dan [internal](/harga "judul")',
    '',
    '## Sumber',
    '',
    '- [Sumber satu](https://contoh.test/sumber) kata kata kata',
  ].join('\n');

  it('judul H2 (tanpa blok kode) dengan id yang sama seperti render', () => {
    expect(articleHeadings(MD)).toEqual([
      { id: 'domain-hosting-dan-ssl', text: 'Domain, hosting & SSL' },
      { id: 'biaya-perawatan-per-tahun', text: 'Biaya perawatan per tahun' },
      { id: 'sumber', text: 'Sumber' },
    ]);
    expect(headingId('Apa itu SSL (HTTPS)?')).toBe('apa-itu-ssl-https');
    expect(headingId('Café & Spa')).toBe('cafe-dan-spa');
  });

  it('hitung kata tanpa URL, sintaks tabel, dan bagian Sumber', () => {
    const prose = proseBeforeSources(MD);
    expect(prose).not.toContain('Sumber satu');
    // "Paragraf pembuka dengan tautan dan x" (6) + judul (3 + 4, "&" bukan kata) + tabel (Kolom Isi a b = 4) +
    // "gambar dan internal" (3); blok kode tidak dihitung
    expect(countWords(prose)).toBe(6 + 3 + 4 + 4 + 3);
    expect(countWords('Rp1.390.000 per 23 Oktober 2026, siap-pakai.')).toBe(6);
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1400)).toBe(7);
  });

  it('daftar tautan (tanpa gambar)', () => {
    expect(markdownLinks(MD)).toEqual([
      { text: 'tautan', href: 'https://contoh.test/a' },
      { text: 'internal', href: '/harga' },
      { text: 'Sumber satu', href: 'https://contoh.test/sumber' },
    ]);
  });
});
