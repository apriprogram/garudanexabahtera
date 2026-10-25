// Teks beranda yang dihitung dari data (docs/platform/SEO-PLAN.md §5.6 langkah 4): intro 2 kalimat yang bisa di-crawl
// dan ubin kategori. Niche dan harga hanya dari template terbit (get_templates), tidak ditulis di kode.
// Modul murni: dipakai section beranda, *.seo.ts dan tes.
import { COMPANY_FACTS, type CompanyFacts } from '../lib/companyFacts';
import { categoryPath, type CategorySlug } from '../seo/paths';
import { categorySlugOf } from '../seo/templateSeo';
import type { Template } from '../types/platform';
import { minTemplatePrice, priceInWords } from './pricing';
import { isPrice } from '../seo/format';

/** Sebutan niche per kategori untuk kalimat ("template website untuk klinik kecantikan"). */
const NICHE_PHRASE: Record<CategorySlug, string> = {
  'company-profile': 'company profile',
  'kecantikan-klinik': 'klinik kecantikan',
  'olahraga-komunitas': 'klub olahraga',
  'fintech-startup': 'fintech',
  'yoga-wellness': 'studio yoga',
  'toko-online': 'toko online',
  'sekolah-pendidikan': 'sekolah',
};

/** "a" / "a dan b" / "a, b, dan c". */
export function joinId(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, dan ${items[items.length - 1]}`;
}

const published = (templates: readonly Template[]) => templates.filter((t) => t && t.status !== 'draft');

/** Niche dari kategori template terbit, urut kemunculan, tanpa duplikat. */
export function nichePhrases(templates: readonly Template[]): string[] {
  const out: string[] = [];
  for (const t of published(templates)) {
    const slug = categorySlugOf(t.category);
    const phrase = slug ? NICHE_PHRASE[slug] : t.category.trim().toLowerCase();
    if (phrase && !out.includes(phrase)) out.push(phrase);
  }
  return out;
}

/**
 * Intro beranda (2 kalimat): "Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website untuk company profile,
 * klinik kecantikan, …, mulai Rp990 ribu sudah termasuk domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? …"
 */
export function homeIntro(templates: readonly Template[], facts: CompanyFacts = COMPANY_FACTS): string {
  const niches = nichePhrases(templates);
  const min = minTemplatePrice(published(templates));
  const target = niches.length ? ` untuk ${joinId(niches)}` : ' siap pakai';
  const price = min ? `, mulai ${priceInWords(min)} sudah termasuk` : ' yang harganya sudah termasuk';
  return `${facts.name} (${facts.legalName}) menyediakan template website${target}${price} domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom.`;
}

export interface CategoryTile {
  slug: CategorySlug;
  /** Nama kategori seperti di DB ("Kecantikan & Klinik"). */
  name: string;
  path: string;
  count: number;
  /** Harga termurah di kategori ini (rupiah) atau null. */
  minPrice: number | null;
  /** Gambar pratinjau template pertama (raster/SVG dari DB) atau null. */
  image: string | null;
  /** Nama template di kategori ini, untuk teks pendukung. */
  templateNames: string[];
}

/** Ubin kategori: hanya kategori yang punya halaman (/template/kategori/{slug}) dan punya template terbit. */
export function categoryTiles(templates: readonly Template[]): CategoryTile[] {
  const tiles = new Map<CategorySlug, CategoryTile>();
  for (const t of published(templates)) {
    const slug = categorySlugOf(t.category);
    if (!slug) continue;
    const tile = tiles.get(slug) ?? {
      slug,
      name: t.category.trim(),
      path: categoryPath(slug),
      count: 0,
      minPrice: null,
      image: null,
      templateNames: [],
    };
    tile.count += 1;
    tile.templateNames.push(t.name);
    if (isPrice(t.price)) tile.minPrice = tile.minPrice === null ? t.price : Math.min(tile.minPrice, t.price);
    if (!tile.image && t.preview_image) tile.image = t.preview_image;
    tiles.set(slug, tile);
  }
  return [...tiles.values()];
}
