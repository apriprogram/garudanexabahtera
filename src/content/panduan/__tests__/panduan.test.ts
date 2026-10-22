// @vitest-environment node
// Jalankan: npx vitest run src/content/panduan
// Pemuat artikel panduan: frontmatter sederhana tanpa dependensi, validasi, urutan terbaru dulu.
import { describe, expect, it } from 'vitest';
import { getArticle, listArticles, parseArticle, parseFrontmatter, sortArticles, type Article } from '..';

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
});

describe('sortArticles, listArticles, getArticle', () => {
  const make = (slug: string, datePublished: string, dateModified = datePublished): Article => ({
    title: slug, description: slug, slug, author: 'Tim Garuda Nexa', datePublished, dateModified, sources: [], related: [], body: '',
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

  it('artikel di folder ini sah semua (kosong selama belum ada file .md)', () => {
    const articles = listArticles();
    expect(Array.isArray(articles)).toBe(true);
    for (const article of articles) expect(getArticle(article.slug)).toEqual(article);
    expect(getArticle('tidak-ada')).toBeUndefined();
  });
});
