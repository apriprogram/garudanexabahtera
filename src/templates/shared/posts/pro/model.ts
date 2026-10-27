// Data section berita & pengumuman profesional (fitur Berita & Pengumuman aktif, docs/platform/SITE-ADDONS-SPEC.md §6),
// fungsi murni tanpa React. Sumbernya items section yang SUDAH digabung useContentWithPosts: tulisan terbit (kunci
// POST_PATH_KEY → tautan ke halaman tulisan) atau, bila belum ada tulisan, item CMS section itu (tanpa tautan detail).
import type { ListItem, SectionContent } from '../../../types';
import { field, list } from '../../utils';
import { POST_PATH_KEY, postDate, type PostDate } from '../model';
import type { PostTheme } from '../theme';

export interface ProItem {
  key: string;
  title: string;
  /** Tanggal mentah: YYYY-MM-DD dari tulisan; isian bebas dari CMS */
  date: string;
  /** Berita: kategori; pengumuman: label ("Penting", "Wajib", …) */
  tag: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  /** Path halaman tulisan relatif akar situs; null = item CMS (tanpa tautan detail) */
  path: string | null;
}

/** Item section (berita: category/excerpt; pengumuman: badge/text) → ProItem. Tanpa judul dilewati. */
export function proItems(section: SectionContent | null | undefined, kind: 'news' | 'announcements', max = 12): ProItem[] {
  return list(section, 'items', max)
    .filter((item) => field(item, 'title'))
    .map((item: ListItem, i) => {
      const path = field(item, POST_PATH_KEY) || null;
      const title = field(item, 'title');
      return {
        key: path ?? `${title}-${i}`,
        title,
        date: field(item, 'date'),
        tag: kind === 'news' ? field(item, 'category') : field(item, 'badge'),
        excerpt: kind === 'news' ? field(item, 'excerpt') || field(item, 'text') : field(item, 'text') || field(item, 'excerpt'),
        image: field(item, 'image'),
        imageAlt: field(item, 'image_alt'),
        path,
      };
    });
}

/** Ada tulisan (bukan item CMS) → tombol "Lihat semua …" ke halaman daftar. */
export const hasPostLinks = (items: ProItem[]): boolean => items.some((item) => item.path !== null);

/**
 * Tanggal item: YYYY-MM-DD (tulisan & demo) atau DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (isian CMS) → tanggal Indonesia;
 * selain itu null (teks apa adanya ditampilkan tanpa <time>).
 */
export function proDate(raw: string): PostDate | null {
  const value = raw.trim();
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (dmy) return postDate(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  return iso ? postDate(`${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`) : null;
}

/** Kunci pembanding kategori/label: huruf kecil, tanpa diakritik, spasi dirapatkan. */
export const tagKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Kategori/label unik (urutan kemunculan, ejaan pertama) untuk tombol filter. */
export function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = tagKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
}

/** Cocok dengan filter (null = semua). */
export const matchesTag = (value: string, wanted: string | null): boolean => wanted === null || tagKey(value) === tagKey(wanted);

/**
 * Warna label pengumuman: "Penting"/"Segera"/"Mendesak" merah lembut, "Wajib"/"Batas waktu" kuning tanah, lainnya chip
 * warna tema.
 */
export function badgeTone(label: string, theme: PostTheme): string {
  if (/penting|segera|mendesak|darurat|urgent/i.test(label)) return theme.urgent;
  if (/wajib|batas|tenggat/i.test(label)) return theme.warn;
  return theme.chip;
}
