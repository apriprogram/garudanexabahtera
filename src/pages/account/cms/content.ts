// Helper murni untuk membaca & mengubah konten situs di CMS (/akun/situs/:siteId).
// Semua perubahan imutabel: mengembalikan objek SiteContent baru agar React dan pratinjau ikut diperbarui.
import type { ListItem, SectionContent, SiteContent, TemplateField, TemplateListField } from '../../../templates/types';

/** Nilai teks satu field section; selain string → "". */
export function readText(content: SiteContent, section: string, key: string): string {
  const value = content[section]?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** Item list satu field section; bukan array → []. */
export function readList(content: SiteContent, section: string, key: string): ListItem[] {
  const value = content[section]?.[key];
  return Array.isArray(value) ? value : [];
}

/** Section tampil kecuali `enabled === false`. */
export const isSectionEnabled = (content: SiteContent, section: string): boolean => content[section]?.enabled !== false;

const withSection = (content: SiteContent, section: string, patch: Partial<SectionContent>): SiteContent => ({
  ...content,
  [section]: { ...(content[section] ?? {}), ...patch } as SectionContent,
});

export const setText = (content: SiteContent, section: string, key: string, value: string): SiteContent =>
  withSection(content, section, { [key]: value });

export const setList = (content: SiteContent, section: string, key: string, items: ListItem[]): SiteContent =>
  withSection(content, section, { [key]: items });

export const setEnabled = (content: SiteContent, section: string, enabled: boolean): SiteContent =>
  withSection(content, section, { enabled });

/** Item kosong untuk list baru (semua field berisi ""). */
export const emptyListItem = (field: TemplateListField): ListItem =>
  Object.fromEntries(field.fields.map((sub) => [sub.key, '']));

/** Ringkasan satu item list untuk judul kartu yang diciutkan (isi field teks pertama yang terisi). */
export function itemSummary(field: TemplateListField, item: ListItem): string {
  for (const sub of field.fields) {
    if (sub.type === 'image' || sub.type === 'color') continue;
    const value = (item[sub.key] ?? '').trim();
    if (value) return value.length > 60 ? `${value.slice(0, 57)}...` : value;
  }
  return '';
}

/** Gambar baru (data-URI) yang belum tersimpan di server. */
export const isDataUri = (value: unknown): value is string => typeof value === 'string' && /^\s*data:/i.test(value);

/** Jumlah gambar baru dalam konten (server menerima maksimal 30 per simpan). */
export function countNewImages(value: unknown): number {
  if (isDataUri(value)) return 1;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + countNewImages(item), 0);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + countNewImages(item), 0);
  }
  return 0;
}

/** Path error/id field: "hero.title" atau "services.items.2.title". */
export const fieldPath = (section: string, key: string, index?: number, sub?: string): string =>
  index === undefined ? `${section}.${key}` : `${section}.${key}.${index}.${sub}`;

/** id elemen input untuk sebuah path (dipakai label, pesan error, dan fokus ke field error). */
export const fieldDomId = (path: string): string => `cms-${path.replace(/[^A-Za-z0-9_-]/g, '-')}`;

/** Nilai bawaan template untuk field level section (dipakai tombol "Pakai bawaan"). */
export function defaultText(defaults: SiteContent, section: string, field: TemplateField): string {
  return readText(defaults, section, field.key);
}

/** Sumber gambar yang aman ditampilkan di pratinjau field (path aset, http(s), atau data-URI gambar). */
export function imageSrc(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(value)) return value;
  if (/^(https?:\/\/|blob:)/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^[\w-]+(\/[\w.@%-]+)+\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(value)) return `/${value}`;
  return '';
}
