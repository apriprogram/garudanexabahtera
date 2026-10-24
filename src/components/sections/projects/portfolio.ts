// Isian proyek di setting portfolio_data (Pengaturan website > Proyek): batas & pembersih yang sama dengan backend
// (backend/modules/portfolio_media.php = portfolio_media.js, yang menormalkan isian ini saat disimpan). Dipakai kartu &
// dialog #projects (projectItems.ts) dan editor admin (src/pages/admin/portfolio). Semua isian baru opsional, jadi
// entri lama (judul, tag, gambar, lebar grid) tetap tampil seperti sebelumnya.

export const PROJECT_MAX_GALLERY = 12;
export const PROJECT_MAX_TOOLS = 12;
export const PROJECT_TOOL_MAX = 40;
export const PROJECT_DESCRIPTION_MAX = 3000;
export const PROJECT_URL_MAX = 500;

/** Satu entri `portfolio_data`. */
export interface PortfolioItem {
  title: string;
  /** Tag / kategori kartu (nama lama: desc), mis. "SAAS / FINANCE". */
  desc?: string;
  /** Gambar kartu (mockup). Entri lama bisa berupa data URI; unggahan baru berupa path file. */
  image: string;
  /** Lebar grid lama; tidak dipakai situs lagi, tetap tersimpan apa adanya. */
  span?: string;
  /** Penjelasan proyek di dialog detail. */
  description?: string;
  /** Tools / teknologi yang dipakai, mis. React JS, Laravel. */
  tools?: string[];
  /** Tautan situs yang bisa dikunjungi (http/https). */
  url?: string;
  /** Gambar detail di dialog, berurutan. */
  gallery?: string[];
  /** Video proyek (hasil upload_project_video). */
  video?: string;
}

/* eslint-disable no-control-regex -- karakter kontrol sengaja dicocokkan/dibuang, persis seperti backend */
// Karakter trim() PHP, supaya hasilnya sama dengan backend
const TRIM = /^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g;
const LINE_SPACE = /[ \t\n\r\x0B\x0C]+/g;
const LINE_CONTROL = /[\x00-\x1F\x7F]/g;
// Kontrol selain tab & baris baru
const TEXT_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
// Skema berbahaya di depan (spasi/karakter kontrol di depannya diabaikan browser)
const SCRIPT_LINK = /^[\x00-\x20]*(javascript|vbscript):/i;
/* eslint-enable no-control-regex */

const phpTrim = (text: string) => text.replace(TRIM, '');
const asciiLower = (text: string) => text.replace(/[A-Z]+/g, (letters) => letters.toLowerCase());
const cut = (text: string, max: number) => {
  const chars = Array.from(text);
  return chars.length > max ? phpTrim(chars.slice(0, max).join('')) : text;
};

// URL http(s) atau domain saja: host dengan minimal satu titik, port opsional, lalu karakter URL (RFC 3986) saja
const URL_PATTERN = /^(https?:\/\/)?([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::[0-9]{1,5})?(?:[/?#][A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]*)?)$/i;
/** Tautan situs: URL http(s) (skema huruf kecil) atau domain saja (→ https://); selain itu ''. */
export function projectUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const m = URL_PATTERN.exec(phpTrim(value));
  if (!m) return '';
  const url = (m[1] ? m[1].toLowerCase() : 'https://') + m[2];
  return url.length <= PROJECT_URL_MAX ? url : '';
}

/** Nama tools: spasi dirapikan, maks. 40 karakter, kosong & kembar (abaikan huruf besar/kecil) dibuang, maks. 12. */
export function projectTools(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const tools: string[] = [];
  const seen = new Set<string>();
  for (const tool of list) {
    if (typeof tool !== 'string') continue;
    const name = cut(phpTrim(tool.replace(LINE_SPACE, ' ').replace(LINE_CONTROL, '')), PROJECT_TOOL_MAX);
    const key = asciiLower(name);
    if (name === '' || seen.has(key)) continue;
    seen.add(key);
    tools.push(name);
    if (tools.length === PROJECT_MAX_TOOLS) break;
  }
  return tools;
}

/** Tautan gambar/video untuk ditampilkan: string yang dirapikan, bukan javascript:/vbscript:; selain itu ''. */
export function mediaLink(value: unknown): string {
  if (typeof value !== 'string' || SCRIPT_LINK.test(value)) return '';
  return phpTrim(value);
}

/** Daftar gambar detail: tautan yang layak, maks. 12. */
export function projectGallery(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map(mediaLink).filter(Boolean).slice(0, PROJECT_MAX_GALLERY);
}

/** Deskripsi proyek: baris baru dipertahankan, karakter kontrol dibuang, dirapikan, maks. 3000 karakter. */
export function projectDescription(value: unknown): string {
  if (typeof value !== 'string') return '';
  return cut(phpTrim(value.replace(/\r\n|\r/g, '\n').replace(TEXT_CONTROL, '')), PROJECT_DESCRIPTION_MAX);
}
