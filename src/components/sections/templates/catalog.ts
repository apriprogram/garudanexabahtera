// Logika katalog "Pilih Template" (tanpa UI): pencarian, kata kunci populer, urutan, penanda "Baru".
import type { Template } from '../../../types/platform';

/**
 * Isian abu tipis berbasis warna teks (bukan bg-alt), supaya kolom cari, area gambar, dan skeleton
 * tetap terlihat baik di latar section putih maupun abu (latar beranda ber-crossfade per section).
 */
export const TINT = 'bg-fg/5';

export type SortKey = 'rekomendasi' | 'terbaru' | 'termurah' | 'termahal';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rekomendasi', label: 'Rekomendasi' },
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'termurah', label: 'Harga terendah' },
  { value: 'termahal', label: 'Harga tertinggi' },
];

/** Huruf kecil, tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Kata kunci yang umum dicari pembeli; `terms` = sinonim yang dicocokkan ke isi template.
 * Label sentence case (huruf besar hanya untuk akronim & nama produk: UMKM, WhatsApp, CMS).
 */
const KEYWORDS: { label: string; terms: string[] }[] = [
  { label: 'Company profile', terms: ['company profile', 'profil perusahaan', 'compro'] },
  { label: 'Landing page', terms: ['landing page', 'halaman promosi', 'one page'] },
  { label: 'Toko online', terms: ['toko online', 'e-commerce', 'ecommerce', 'online shop', 'katalog produk', 'keranjang'] },
  { label: 'UMKM', terms: ['umkm', 'usaha kecil'] },
  { label: 'Startup', terms: ['startup'] },
  { label: 'Portofolio', terms: ['portofolio', 'portfolio'] },
  { label: 'Restoran', terms: ['restoran', 'kafe', 'cafe', 'kuliner'] },
  { label: 'Pendidikan', terms: ['sekolah', 'pendidikan', 'kursus', 'bimbel'] },
  { label: 'Kesehatan', terms: ['klinik', 'kesehatan', 'dokter', 'apotek'] },
  { label: 'Properti', terms: ['properti', 'real estate', 'perumahan'] },
  { label: 'Travel', terms: ['travel', 'wisata'] },
  { label: 'Undangan', terms: ['undangan', 'pernikahan', 'wedding'] },
  { label: 'Blog', terms: ['blog', 'artikel', 'berita'] },
  { label: 'WhatsApp', terms: ['whatsapp'] },
  { label: 'Galeri', terms: ['galeri', 'gallery'] },
  { label: 'Testimoni', terms: ['testimoni'] },
  { label: 'CMS', terms: ['cms', 'kelola konten'] },
].map((kw) => ({ label: kw.label, terms: kw.terms.map(normalize) }));

export interface IndexedTemplate {
  template: Template;
  /** Teks gabungan (nama, kategori, deskripsi, fitur) yang sudah dinormalisasi untuk pencarian. */
  haystack: string;
}

export const indexTemplates = (templates: Template[]): IndexedTemplate[] =>
  templates.map((template) => ({
    template,
    haystack: normalize(
      [
        template.name,
        template.category,
        template.short_description ?? '',
        template.description ?? '',
        ...(Array.isArray(template.features) ? template.features : []),
      ].join(' '),
    ),
  }));

/**
 * Cocokkan kueri ke teks template. Kueri yang sama dengan label kata kunci populer ikut mencari sinonimnya
 * ("toko online" juga cocok dengan "e-commerce"); kueri lain: semua kata harus ada (urutan bebas).
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (haystack.includes(q)) return true;
  const keyword = KEYWORDS.find((kw) => normalize(kw.label) === q);
  if (keyword) return keyword.terms.some((term) => haystack.includes(term));
  return q.split(' ').every((word) => haystack.includes(word));
}

/**
 * Chip "Populer:": kata kunci yang benar-benar ada di template (tidak pernah memberi hasil kosong).
 * Yang membedakan template (tidak cocok dengan semuanya) didahulukan. Kata kunci yang sama dengan nama kategori
 * dilewati, karena kategori sudah punya tab sendiri (atau, bila hanya satu kategori, memberi hasil yang sama).
 */
export function buildPopularKeywords(items: IndexedTemplate[], categories: string[], limit = 8): string[] {
  if (items.length === 0) return [];
  const categoryKeys = new Set(categories.map(normalize));
  return KEYWORDS.map((kw, order) => ({
    label: kw.label,
    order,
    count: items.filter((item) => kw.terms.some((term) => item.haystack.includes(term))).length,
  }))
    .filter((kw) => kw.count > 0 && !categoryKeys.has(normalize(kw.label)))
    .sort((a, b) => {
      const aAll = a.count === items.length ? 1 : 0;
      const bAll = b.count === items.length ? 1 : 0;
      return aAll - bAll || b.count - a.count || a.order - b.order;
    })
    .map((kw) => kw.label)
    .slice(0, limit);
}

/** Waktu dari string "YYYY-MM-DD HH:mm:ss" (format MySQL); tidak valid → 0. */
export const parseTime = (value?: string | null) => {
  if (!value) return 0;
  const time = Date.parse(value.replace(' ', 'T'));
  return Number.isNaN(time) ? 0 : time;
};

export function sortTemplates(list: Template[], key: SortKey): Template[] {
  const byAdminOrder = (a: Template, b: Template) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id;
  const sorted = [...list];
  switch (key) {
    case 'terbaru':
      return sorted.sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at) || b.id - a.id);
    case 'termurah':
      return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0) || byAdminOrder(a, b));
    case 'termahal':
      return sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0) || byAdminOrder(a, b));
    default:
      // Rekomendasi = urutan yang diatur admin (sort_order)
      return sorted.sort(byAdminOrder);
  }
}

const NEW_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

/**
 * Slug template terbaru yang diberi lencana "Baru": satu template yang paling baru ditambahkan (lebih baru dari
 * semua yang lain) dan usianya ≤ 45 hari. Bila beberapa template dibuat bersamaan, tidak ada yang ditandai.
 */
export function findNewestSlug(templates: Template[], now: number): string | null {
  const dated = templates
    .map((tpl) => ({ slug: tpl.slug, time: parseTime(tpl.created_at) }))
    .filter((item) => item.time > 0)
    .sort((a, b) => b.time - a.time);
  if (dated.length === 0) return null;
  const [first, second] = dated;
  if (second && second.time === first.time) return null;
  return now - first.time <= NEW_WINDOW_MS ? first.slug : null;
}
