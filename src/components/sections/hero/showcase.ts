// Data tayangan hero: template asli dari API (get_templates), dengan cadangan pratinjau statis bila gagal/kosong.
import { apiGet, peekApiGet } from '../../../lib/api';
import type { Template } from '../../../types/platform';

export interface ShowcaseItem {
  key: string;
  /** null = contoh tampilan (bukan template yang bisa dipesan) */
  slug: string | null;
  name: string;
  category: string;
  price: number | null;
  /** Pratinjau utama dan cadangannya (SVG mockup bawaan per template_code) */
  image: string;
  fallbackImage: string | null;
  /** Tautan demo: /demo/:slug, URL luar (demo_url), atau null untuk contoh */
  demoHref: string | null;
  demoExternal: boolean;
}

export interface ShowcaseData {
  items: ShowcaseItem[];
  /** true = memakai contoh tampilan karena template belum bisa dimuat / belum ada */
  sample: boolean;
}

/** Mode hero (toggle kiri): menentukan judul, tombol, DAN alur yang diputar di visual kanan. */
export type HeroMode = 'template' | 'custom';

export interface HeroStep {
  key: string;
  label: string;
}

/**
 * Alur yang diputar di rail hero, per mode (sama dengan alur di section Proses):
 * template = Pilih template → Bayar via Midtrans → Domain aktif → Kelola lewat CMS;
 * custom = Konsultasi → Penawaran → Pengerjaan → Rilis.
 */
export const HERO_FLOWS: Record<HeroMode, { label: string; steps: readonly HeroStep[] }> = {
  template: {
    label: 'Alur pemesanan template',
    steps: [
      { key: 'pilih', label: 'Pilih template' },
      { key: 'bayar', label: 'Bayar via Midtrans' },
      { key: 'domain', label: 'Domain aktif' },
      { key: 'cms', label: 'Kelola lewat CMS' },
    ],
  },
  custom: {
    label: 'Alur website & aplikasi custom',
    steps: [
      { key: 'konsultasi', label: 'Konsultasi' },
      { key: 'penawaran', label: 'Penawaran' },
      { key: 'pengerjaan', label: 'Pengerjaan' },
      { key: 'rilis', label: 'Rilis' },
    ],
  },
};

/** Lama satu langkah (ms). Satu template = 4 langkah. */
export const STEP_MS = 3200;

const MAX_ITEMS = 6;
const TIMEOUT_MS = 7000;

const previewFor = (code: string) => `/assets/templates/${code}-preview.svg`;

const SAMPLE: ShowcaseItem[] = [
  {
    key: 'sample-corporate-nexa',
    slug: null,
    name: 'Corporate Nexa',
    category: 'Company Profile',
    price: null,
    image: previewFor('corporate-nexa'),
    fallbackImage: null,
    demoHref: null,
    demoExternal: false,
  },
  {
    key: 'sample-startup-clean',
    slug: null,
    name: 'Startup Clean',
    category: 'Company Profile',
    price: null,
    image: previewFor('startup-clean'),
    fallbackImage: null,
    demoHref: null,
    demoExternal: false,
  },
];

const toItem = (tpl: Template): ShowcaseItem => {
  const fallback = tpl.template_code ? previewFor(tpl.template_code) : null;
  const external = /^https?:\/\//i.test(tpl.demo_url || '');
  return {
    key: `tpl-${tpl.id}-${tpl.slug}`,
    slug: tpl.slug,
    name: tpl.name,
    category: tpl.category || 'Template',
    price: Number.isFinite(Number(tpl.price)) ? Number(tpl.price) : null,
    image: tpl.preview_image || fallback || '',
    fallbackImage: tpl.preview_image && fallback && tpl.preview_image !== fallback ? fallback : null,
    demoHref: external ? (tpl.demo_url as string) : `/demo/${encodeURIComponent(tpl.slug)}`,
    demoExternal: external,
  };
};

/** Daftar `templates` dari respons get_templates → tayangan (maks 6). Kosong / tanpa gambar → contoh tampilan. */
export const showcaseFromTemplates = (templates: unknown): ShowcaseData => {
  const items = (Array.isArray(templates) ? (templates as Template[]) : [])
    .filter((tpl) => tpl && tpl.slug && tpl.name)
    .slice(0, MAX_ITEMS)
    .map(toItem)
    .filter((item) => item.image);
  return items.length > 0 ? { items, sample: false } : { items: SAMPLE, sample: true };
};

/**
 * Tayangan dari data preload halaman prerender (src/lib/preload.ts), dibaca sinkron untuk render pertama: slide
 * pertama ikut di HTML server dan hidrasi memakai data yang sama. null = tidak ada preload (dev, render klien biasa).
 */
export const peekShowcase = (): ShowcaseData | null => {
  const data = peekApiGet<{ templates?: unknown }>('get_templates');
  return data ? showcaseFromTemplates(data.templates) : null;
};

/** URL gambar slide pertama tayangan hero (kandidat LCP beranda): dipakai head beranda sebagai `preloadImage`. */
export const firstShowcaseImage = (templates: unknown): string | undefined =>
  showcaseFromTemplates(templates).items[0]?.image || undefined;

/** Muat template untuk tayangan hero. Tidak pernah gagal: error/kosong/timeout → contoh tampilan. */
export const loadShowcase = async (): Promise<ShowcaseData> => {
  try {
    const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
    const data = await Promise.race([apiGet<{ templates?: Template[] }>('get_templates'), timeout]);
    return showcaseFromTemplates(data.templates);
  } catch {
    return { items: SAMPLE, sample: true };
  }
};
