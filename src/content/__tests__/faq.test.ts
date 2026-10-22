// Jalankan: npx vitest run src/content/__tests__/faq.test.ts
// FAQ bersama (docs/platform/SEO-PLAN.md §5.6 langkah 2): satu jawaban per pertanyaan di semua halaman, gaya jawaban,
// fakta null tidak disebut, FAQ admin tanpa duplikat, dan migration 009 menulis teks yang sama persis ke faq_data.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS, type CompanyFacts } from '../../lib/companyFacts';
import type { Template } from '../../types/platform';
import {
  adminFaqs,
  CATALOG_FAQ_IDS,
  DEFAULT_ADMIN_FAQS,
  FAQ_ENTRIES,
  faqContext,
  faqForLlms,
  faqItem,
  faqItems,
  HOME_FAQ_IDS,
  homeFaqs,
  MOBILE_SERVICE_FAQ_IDS,
  PRICING_FAQ_IDS,
  TEMPLATE_PAGE_FAQ_IDS,
  WEB_SERVICE_FAQ_IDS,
  type FaqId,
} from '../faq';

const tpl = (slug: string, price: number, status: Template['status'] = 'published') => ({ slug, price, status }) as Template;
const TEMPLATES = [tpl('a', 1500000), tpl('b', 990000), tpl('c', 1790000), tpl('draft', 50000, 'draft')];
const IDS = Object.keys(FAQ_ENTRIES) as FaqId[];
const words = (text: string) => text.trim().split(/\s+/).length;
const MIGRATION = readFileSync(resolve(__dirname, '../../../database/migrations/2026-10-23_009_seo_faq_contact.sql'), 'utf8');

describe('isi FAQ', () => {
  it('setiap jawaban 35–60 kata, pertanyaan unik dan diakhiri tanda tanya', () => {
    const ctx = faqContext(TEMPLATES);
    const questions = new Set<string>();
    for (const id of IDS) {
      const { question, answer } = faqItem(id, ctx);
      expect(question, id).toMatch(/\?$/);
      expect(questions.has(question), `pertanyaan ganda: ${question}`).toBe(false);
      questions.add(question);
      expect(words(answer), `${id}: ${answer}`).toBeGreaterThanOrEqual(35);
      expect(words(answer), `${id}: ${answer}`).toBeLessThanOrEqual(60);
    }
  });

  it('harga template dari data (tanpa draft); tanpa data → kalimat tanpa angka', () => {
    expect(faqItem('harga-template', faqContext(TEMPLATES)).answer).toContain('saat ini Rp990.000–Rp1.790.000');
    const empty = faqItem('harga-template', faqContext([])).answer;
    expect(empty).not.toMatch(/Rp\s?\d/);
    expect(empty).toContain('halaman Harga');
  });

  it('jasa custom tanpa angka harga; hanya jawaban harga template yang memuat rupiah', () => {
    const ctx = faqContext(TEMPLATES);
    for (const id of IDS.filter((x) => x !== 'harga-template')) expect(faqItem(id, ctx).answer, id).not.toMatch(/Rp\s?\d|\d\.\d{3}\.\d{3}/);
  });

  it('fakta null tidak disebut: tanpa "X–Y hari kerja", tanpa "beberapa hari kerja", tanpa nominal tahun ke-2', () => {
    const all = faqForLlms({ templates: TEMPLATES }).map((f) => f.answer).join(' ');
    expect(all).not.toMatch(/beberapa hari kerja|X–Y|\[PEMILIK|null|undefined/);
    expect(faqItem('sudah-termasuk').answer).toContain('nominalnya kami informasikan sebelum jatuh tempo');
  });

  it('fakta pemilik dipakai begitu diisi (waktu aktif, biaya tahun ke-2)', () => {
    const facts: CompanyFacts = {
      ...COMPANY_FACTS,
      templatePackage: { ...COMPANY_FACTS.templatePackage, activationTime: '3–5 hari kerja', renewalCost: 'Rp500.000' },
    };
    const ctx = { ...faqContext(TEMPLATES), facts };
    expect(faqItem('waktu-aktif', ctx).answer).toContain('aktif dalam 3–5 hari kerja setelah pembayaran dikonfirmasi');
    expect(faqItem('sudah-termasuk', ctx).answer).toContain('perpanjangan domain dan hosting Rp500.000 per tahun');
  });

  it('jawaban hosting/SSL/waktu: SSL hanya dijanjikan untuk template, hosting termasuk tahun pertama', () => {
    expect(faqItem('keamanan').answer).toMatch(/^Website dari template sudah memakai sertifikat SSL/);
    expect(faqItem('keamanan').answer).not.toMatch(/Setiap website yang kami bangun/);
    expect(faqItem('sudah-termasuk').answer).toMatch(/domain, hosting, serta sertifikat SSL \(HTTPS\) untuk tahun pertama/);
    expect(faqItem('sudah-termasuk').question).toBe('Apa saja yang sudah termasuk dalam harga template?');
  });
});

describe('satu jawaban per pertanyaan di semua halaman', () => {
  it('beranda, /harga, katalog, halaman template dan llms-full.txt memakai teks yang sama', () => {
    const ctx = faqContext(TEMPLATES);
    const byQuestion = new Map<string, string>();
    const lists = [
      homeFaqs({}, ctx),
      faqItems(PRICING_FAQ_IDS, ctx),
      faqItems(TEMPLATE_PAGE_FAQ_IDS, ctx),
      faqItems(CATALOG_FAQ_IDS, ctx),
      faqItems(WEB_SERVICE_FAQ_IDS, ctx),
      faqItems(MOBILE_SERVICE_FAQ_IDS, ctx),
      faqForLlms({ templates: TEMPLATES }),
    ];
    for (const list of lists) {
      for (const { question, answer } of list) {
        if (byQuestion.has(question)) expect(answer, question).toBe(byQuestion.get(question));
        else byQuestion.set(question, answer);
      }
    }
    for (const id of ['sudah-termasuk', 'waktu-aktif', 'keamanan'] as const) {
      expect(lists.filter((list) => list.some((f) => f.question === FAQ_ENTRIES[id].question)).length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('beranda: FAQ marketplace dulu (memuat "Apa saja yang sudah termasuk"), lalu FAQ admin', () => {
    const faqs = homeFaqs({ faq_data: JSON.stringify([{ question: 'Pertanyaan admin?', answer: 'Jawaban admin.' }]) });
    expect(faqs.slice(0, HOME_FAQ_IDS.length).map((f) => f.question)).toEqual(HOME_FAQ_IDS.map((id) => FAQ_ENTRIES[id].question));
    expect(faqs[0].question).toMatch(/^Apa saja yang sudah termasuk/);
    expect(faqs.at(-1)).toEqual({ question: 'Pertanyaan admin?', answer: 'Jawaban admin.' });
  });

  it('faqForLlms memuat setiap pertanyaan tepat satu kali', () => {
    const questions = faqForLlms({ templates: TEMPLATES, settings: {} }).map((f) => f.question);
    expect(new Set(questions).size).toBe(questions.length);
    expect(questions.length).toBe(IDS.length + DEFAULT_ADMIN_FAQS.length);
  });
});

describe('FAQ admin (faq_data)', () => {
  it('pertanyaan yang sudah dijawab FAQ marketplace (termasuk alias versi lama) tidak tampil dua kali', () => {
    const raw = JSON.stringify([
      { question: 'Apakah sudah termasuk hosting dan domain?', answer: 'Jawaban lama.' },
      { question: '  berapa LAMA proses pembuatan satu website? ', answer: 'Jawaban lama.' },
      { question: 'Bisakah memakai domain .id?', answer: 'Bisa.' },
      { question: 'Bisakah memakai domain .id?', answer: 'Duplikat.' },
      { question: '', answer: 'Tanpa pertanyaan.' },
      { question: 'Tanpa jawaban?', answer: '' },
    ]);
    expect(adminFaqs(raw)).toEqual([{ question: 'Bisakah memakai domain .id?', answer: 'Bisa.' }]);
  });

  it('kosong / rusak → bawaan; array kosong dari admin dihormati', () => {
    expect(adminFaqs(undefined)).toEqual(DEFAULT_ADMIN_FAQS);
    expect(adminFaqs('{rusak')).toEqual(DEFAULT_ADMIN_FAQS);
    expect(adminFaqs('[]')).toEqual([]);
  });
});

describe('migration 2026-10-23_009', () => {
  it('menulis jawaban yang sama persis dengan src/content/faq.ts (fakta pemilik masih null)', () => {
    for (const id of ['waktu-aktif', 'sudah-termasuk', 'edit-sendiri', 'keamanan', 'kepemilikan'] as const) {
      expect(MIGRATION, id).toContain(`'${faqItem(id).answer}'`);
    }
    expect(MIGRATION).toContain(`SET new_q = '${FAQ_ENTRIES['sudah-termasuk'].question}'`);
  });

  it('hanya mengubah nilai lama yang persis (placeholder WhatsApp, hero Inggris, CTA lama), aman diulang', () => {
    expect(MIGRATION).toMatch(/setting_key = 'contact_whatsapp' AND TRIM\(setting_value\) = '628123456789'/);
    expect(MIGRATION).toContain(`'${COMPANY_FACTS.whatsapp}'`);
    expect(MIGRATION).toMatch(/setting_key = 'hero_title' AND TRIM\(setting_value\) = 'Leading With Vision, Moving With Purpose'/);
    expect(MIGRATION).toMatch(/INSERT IGNORE INTO schema_migrations[\s\S]*'2026-10-23_009'/);
    expect(MIGRATION).not.toMatch(/\bDELETE\b|\bDROP TABLE\b|\bTRUNCATE\b/i);
  });
});
