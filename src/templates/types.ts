// Format template situs pembeli + skema CMS. Kontrak: docs/platform/SPEC.md §7. Jangan ubah bentuknya.
// Tambahan 2026-10 (semua opsional, lihat docs/platform/TEMPLATE-DESIGN.md §2): `introduced` di field/section dan
// `motion` di TemplateRenderProps.
import type { ComponentType } from 'react';

export type FieldType = 'text' | 'textarea' | 'image' | 'url' | 'email' | 'phone' | 'color';

/**
 * Penanda field/section yang ditambahkan SETELAH situs pembeli bisa menyimpan konten (mis. "2026-10").
 * Konten tersimpan yang belum punya kuncinya tidak diisi nilai demo oleh resolveContent: field → kosong,
 * section → disembunyikan (enabled: false). Situs baru / demo (konten null) tetap memakai nilai bawaan.
 */
export type IntroducedTag = string;

export interface TemplateField {
  type: FieldType;
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  maxLength?: number;
  introduced?: IntroducedTag;
}

export interface TemplateListField {
  type: 'list';
  key: string;
  label: string;
  /** Label satu item, mis. "Layanan" → tombol "Tambah layanan" */
  itemLabel: string;
  fields: TemplateField[];
  max?: number;
  introduced?: IntroducedTag;
}

export type AnyTemplateField = TemplateField | TemplateListField;

export interface TemplateSection {
  key: string;
  label: string;
  description?: string;
  /** Section boleh disembunyikan pembeli (pakai `enabled`) */
  toggleable?: boolean;
  fields: AnyTemplateField[];
  introduced?: IntroducedTag;
}

export type ListItem = Record<string, string>;

export type SectionContent = { enabled?: boolean } & Record<string, string | boolean | ListItem[] | undefined>;

export type SiteContent = Record<string, SectionContent>;

export interface TemplateRenderProps {
  content: SiteContent;
  /** true di pratinjau CMS / demo: tautan tidak membuka halaman lain */
  preview?: boolean;
  /**
   * Gerak (muncul saat digulir, marquee logo, hitung angka, parallax). Bawaan: `!preview`, jadi pratinjau CMS yang
   * merender Component langsung tetap diam; SiteRenderer (demo & situs live) mengirim `true`. Selalu mati bila
   * pengunjung memilih prefers-reduced-motion.
   */
  motion?: boolean;
}

export interface TemplateFeatures {
  /**
   * Berita & pengumuman dikelola sebagai tulisan (tabel site_posts) dengan halaman sendiri /berita/{slug} dan
   * /pengumuman/{slug}, foto, jumlah dilihat, dan SEO per tulisan (docs/platform/SITE-POSTS-SEO-SPEC.md). Daftar kode
   * template yang sama ada di backend (SP_POST_TEMPLATE_CODES / POST_TEMPLATE_CODES).
   */
  posts?: boolean;
}

export interface TemplateDefinition {
  code: string;
  name: string;
  sections: TemplateSection[];
  defaultContent: SiteContent;
  Component: ComponentType<TemplateRenderProps>;
  /** Fitur tambahan; tidak diisi = tidak ada */
  features?: TemplateFeatures;
}

export const isListField = (field: AnyTemplateField): field is TemplateListField => field.type === 'list';
