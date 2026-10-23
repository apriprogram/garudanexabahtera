// DIBUAT OTOMATIS dari frontmatter src/content/panduan/*.md oleh src/content/panduan/__tests__/summaries.test.ts.
// Jangan diedit manual. Setelah mengubah artikel: npx vitest run src/content/panduan -u
import type { ArticleSummary } from './core';

export const ARTICLE_SUMMARIES: readonly ArticleSummary[] = [
  {
    slug: 'biaya-aplikasi-android-ios',
    title: 'Biaya Pembuatan Aplikasi Android & iOS: Faktor Penentunya',
    description: 'Kisaran biaya pembuatan aplikasi Android & iOS di Indonesia, faktor yang menentukan harga, dan biaya rutin setelah rilis seperti akun Google Play & Apple.',
    author: 'Tim Garuda Nexa',
    datePublished: '2026-10-23',
    dateModified: '2026-10-23',
    reviewed: null,
  },
  {
    slug: 'biaya-website-company-profile',
    title: 'Berapa Biaya Membuat Website Company Profile di 2026?',
    description: 'Kisaran biaya website company profile 2026, dari website builder, template, sampai jasa custom, plus biaya domain, hosting, SSL dan perawatan per tahun.',
    author: 'Tim Garuda Nexa',
    datePublished: '2026-10-23',
    dateModified: '2026-10-23',
    reviewed: null,
  },
  {
    slug: 'template-vs-jasa-website-custom',
    title: 'Template vs Jasa Website Custom: Mana yang Tepat?',
    description: 'Bandingkan template website siap pakai dan jasa website custom dari sisi biaya, waktu, fitur, dan perawatan, plus checklist untuk memilih.',
    author: 'Tim Garuda Nexa',
    datePublished: '2026-10-23',
    dateModified: '2026-10-23',
    reviewed: null,
  },
  {
    slug: 'website-klinik-kecantikan',
    title: 'Website Klinik Kecantikan: Halaman Wajib & Contohnya',
    description: 'Halaman wajib di website klinik kecantikan & salon, cara menulis isinya tanpa janji berlebihan, reservasi WhatsApp, Google Maps, dan contoh strukturnya.',
    author: 'Tim Garuda Nexa',
    datePublished: '2026-10-23',
    dateModified: '2026-10-23',
    reviewed: null,
  },
];
