// Impor proyek sekaligus (Pengaturan website > Proyek > Impor proyek, permintaan pemilik 2026-10-25): satu ZIP (atau
// folder) berisi proyek.json, yaitu daftar entri berbentuk portfolio_data (title, desc, url, description, tools, image,
// gallery, video), plus file gambar/video yang disebut namanya relatif terhadap proyek.json. Diperiksa dengan batas &
// pembersih yang sama dengan editor (portfolio.ts, portfolioMedia.ts, validasi video hero), lalu media diunggah lewat
// upload_project_image / upload_project_video yang sama. Proyek masuk daftar; tersimpan di website setelah "Simpan semua
// perubahan". Format & prompt agen: docs/prompts/upload-proyek-portofolio.md.
import { getToken } from '../../../lib/auth';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_MAX_GALLERY,
  PROJECT_MAX_TOOLS,
  mediaLink,
  projectDescription,
  projectTools,
  projectUrl,
  type PortfolioItem,
} from '../../../components/sections/projects/portfolio';
import { UPLOAD_SESSION_ERROR, validateHeroVideoFile } from '../hero/heroMedia';
import { HeroUploadError, uploadHeroVideo } from '../hero/heroVideo';
import { PROJECT_VIDEO_UPLOAD_URL, ProjectUploadError, checkProjectImage, cleanPortfolioItem, uploadProjectImage } from './portfolioMedia';
import { ZipError } from './zipReader';

export const IMPORT_MANIFEST = 'proyek.json';
const MANIFEST_MAX_BYTES = 2 * 1024 * 1024;
/** Kolom entri portfolio_data; selain ini diabaikan dengan catatan. `span` (lebar grid lama) diterima tanpa dipakai. */
const KNOWN_KEYS = new Set(['title', 'desc', 'url', 'description', 'tools', 'image', 'gallery', 'video', 'span']);
/** Jenis file dari ekstensinya (isi ZIP tidak membawa jenis file). */
const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

/** Satu file di ZIP / folder yang dipilih. */
export interface ImportFile {
  /** Path relatif dengan pemisah "/". */
  path: string;
  size: number;
  /** Alasan file tidak bisa dibuka (mis. terenkripsi), atau undefined. */
  problem?: string;
  read: () => Promise<Blob>;
}

/** Error impor dengan pesan siap tampil. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Impor dihentikan pengguna. */
export class ImportCancelled extends Error {
  constructor() {
    super('Impor dihentikan.');
    this.name = 'ImportCancelled';
  }
}

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const extension = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');
/** Isi ZIP buatan macOS yang bukan file proyek. */
const isJunk = (path: string) => path.split('/').some((part) => part === '__MACOSX' || part === '.DS_Store');
const shorten = (text: string) => (text.length > 60 ? `${text.slice(0, 57)}…` : text);

/** Gabung folder proyek.json dengan nama file relatif ("./", "..", dan "\" dirapikan). */
function joinPath(base: string, ref: string): string {
  const parts: string[] = [];
  for (const part of `${base}${ref}`.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

/** File dari pilihan folder (input webkitdirectory): path relatif dari folder yang dipilih. */
export function folderFiles(files: File[]): ImportFile[] {
  return files.map((file) => ({
    path: (file.webkitRelativePath || file.name).replace(/\\/g, '/'),
    size: file.size,
    read: async () => file,
  }));
}

/** ZIP / folder yang sudah dibuka: isi proyek.json dan file di sekitarnya. */
export interface ImportBundle {
  /** Isi proyek.json (selalu daftar; satu objek dibungkus jadi daftar). */
  manifest: unknown[];
  /** Folder proyek.json ('' = paling atas, selain itu diakhiri "/"); nama file di proyek.json relatif terhadapnya. */
  base: string;
  files: ImportFile[];
}

/** Cari & baca proyek.json (yang paling dekat ke atas; ZIP sebuah folder pun bisa). Gagal dengan ImportError. */
export async function openImportBundle(all: ImportFile[]): Promise<ImportBundle> {
  const files = all.filter((file) => !isJunk(file.path));
  const manifests = files.filter((file) => basename(file.path).toLowerCase() === IMPORT_MANIFEST);
  if (!manifests.length) {
    throw new ImportError(`${IMPORT_MANIFEST} tidak ditemukan. Taruh ${IMPORT_MANIFEST} di ZIP/folder bersama file gambar dan videonya.`);
  }
  const depth = (file: ImportFile) => file.path.split('/').length;
  const top = Math.min(...manifests.map(depth));
  const nearest = manifests.filter((file) => depth(file) === top);
  if (nearest.length > 1) {
    throw new ImportError(`Ada ${nearest.length} ${IMPORT_MANIFEST} (${nearest.map((file) => file.path).join(', ')}). Sisakan satu saja.`);
  }
  const manifest = nearest[0];
  if (manifest.problem) throw new ImportError(manifest.problem);
  if (manifest.size > MANIFEST_MAX_BYTES) throw new ImportError(`${IMPORT_MANIFEST} lebih dari 2 MB. Pisahkan jadi beberapa ZIP.`);

  let text: string;
  try {
    // TextDecoder membuang BOM (mis. dari Out-File -Encoding utf8 di PowerShell 5.1)
    text = new TextDecoder().decode(await (await manifest.read()).arrayBuffer());
  } catch (error) {
    throw new ImportError(error instanceof ZipError ? error.message : `${IMPORT_MANIFEST} tidak bisa dibaca.`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ImportError(`${IMPORT_MANIFEST} bukan JSON yang valid${error instanceof Error && error.message ? `: ${error.message}` : '.'}`);
  }
  const list = Array.isArray(data) ? data : data !== null && typeof data === 'object' ? [data] : null;
  if (!list) throw new ImportError(`${IMPORT_MANIFEST} harus berisi daftar proyek: [ { "title": …, "desc": …, "image": … } ].`);
  if (!list.length) throw new ImportError(`${IMPORT_MANIFEST} tidak berisi proyek.`);
  const cut = manifest.path.lastIndexOf('/');
  return { manifest: list, base: cut >= 0 ? manifest.path.slice(0, cut + 1) : '', files };
}

/** Gambar/video proyek: file di ZIP/folder (diunggah), atau path yang sudah ada di situs ini (dipakai apa adanya). */
export type ImportMedia = { file: ImportFile; name: string; type: string } | { link: string };

/** Satu proyek dari proyek.json, sudah diperiksa & dirapikan. */
export interface ImportItem {
  /** Nomor urut di proyek.json, mulai 1. */
  number: number;
  title: string;
  desc: string;
  url: string;
  description: string;
  tools: string[];
  image: ImportMedia | null;
  gallery: ImportMedia[];
  video: ImportMedia | null;
  /** Alasan proyek ini dilewati (kosong = siap diimpor). */
  problems: string[];
  /** Isian yang dipotong / diabaikan; proyek tetap diimpor. */
  notes: string[];
  /** Posisi proyek bernama sama di daftar saat ZIP dibuka, atau -1. */
  existing: number;
}

/** Kunci pencocokan nama proyek: tanpa spasi tepi, huruf kecil. */
export const projectTitleKey = (title: unknown) => (typeof title === 'string' ? title.trim().toLowerCase() : '');

/** Periksa tiap proyek di proyek.json dengan batas & pembersih editor. videoMaxMb: batas server (get_hero_media_limits). */
export function planImport(bundle: ImportBundle, existing: readonly PortfolioItem[], videoMaxMb: number): ImportItem[] {
  const byPath = new Map<string, ImportFile>();
  const byLower = new Map<string, ImportFile>();
  for (const file of bundle.files) {
    byPath.set(file.path, file);
    if (!byLower.has(file.path.toLowerCase())) byLower.set(file.path.toLowerCase(), file);
  }
  const existingKeys = existing.map((item) => projectTitleKey(item.title));
  const seen = new Map<string, number>();

  return bundle.manifest.map((raw, index): ImportItem => {
    const number = index + 1;
    const problems: string[] = [];
    const notes: string[] = [];
    const empty: ImportItem = { number, title: '', desc: '', url: '', description: '', tools: [], image: null, gallery: [], video: null, problems, notes, existing: -1 };
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      problems.push('Bukan data proyek: tulis sebagai { "title": …, "desc": …, "image": … }.');
      return empty;
    }
    const entry = raw as Record<string, unknown>;
    const text = (key: string) => (typeof entry[key] === 'string' ? (entry[key] as string).trim() : '');

    const title = text('title');
    const desc = text('desc');
    if (!title) problems.push('Nama proyek (title) wajib diisi.');
    if (!desc) problems.push('Tag / kategori (desc) wajib diisi.');

    const rawUrl = text('url');
    const url = rawUrl ? projectUrl(rawUrl) : '';
    if (rawUrl && !url) problems.push(`Tautan situs "${shorten(rawUrl)}" tidak valid. Isi mis. https://contoh.com, atau kosongkan.`);

    const description = projectDescription(entry.description);
    if (typeof entry.description === 'string' && Array.from(entry.description.trim()).length > PROJECT_DESCRIPTION_MAX) {
      notes.push(`Deskripsi lebih dari ${PROJECT_DESCRIPTION_MAX.toLocaleString('id-ID')} karakter, jadi dipotong.`);
    }

    // Tools boleh juga satu teks dipisah koma, seperti kolom tools di editor
    const rawTools = typeof entry.tools === 'string' ? entry.tools.split(',') : entry.tools;
    const tools = projectTools(rawTools);
    if (Array.isArray(rawTools)) {
      const distinct = new Set(
        rawTools.flatMap((tool) => (typeof tool === 'string' && tool.trim() ? [tool.trim().replace(/\s+/g, ' ').toLowerCase()] : [])),
      );
      if (distinct.size > PROJECT_MAX_TOOLS) notes.push(`Maksimal ${PROJECT_MAX_TOOLS} tools, jadi ${distinct.size - PROJECT_MAX_TOOLS} terakhir tidak diimpor.`);
    }

    const media = (value: unknown, kind: 'image' | 'video', label: string): ImportMedia | null => {
      if (typeof value !== 'string' || !value.trim()) return null;
      const ref = value.trim().replace(/\\/g, '/');
      // Path di situs ini (mis. /assets/projects/…): dipakai apa adanya, tidak diunggah ulang
      if (ref.startsWith('/') && !ref.startsWith('//')) return { link: mediaLink(ref) };
      if (ref.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(ref)) {
        problems.push(`${label} "${shorten(ref)}": tulis nama file di dalam ZIP/folder, bukan tautan.`);
        return null;
      }
      const path = joinPath(bundle.base, ref);
      const file = byPath.get(path) ?? byLower.get(path.toLowerCase());
      if (!file) {
        problems.push(`${label}: file "${shorten(ref)}" tidak ada di ZIP/folder.`);
        return null;
      }
      if (file.problem) {
        problems.push(file.problem);
        return null;
      }
      const name = basename(file.path);
      const type = MEDIA_TYPES[extension(name)] ?? '';
      const invalid =
        kind === 'image'
          ? checkProjectImage({ name, type, size: file.size })
          : validateHeroVideoFile({ name, type, size: file.size }, videoMaxMb);
      if (invalid) {
        problems.push(kind === 'image' ? invalid : `${label} "${name}": ${invalid}`);
        return null;
      }
      return { file, name, type };
    };

    const image = media(entry.image, 'image', 'Gambar kartu');
    if (!text('image')) problems.push('Gambar kartu (image) wajib diisi: proyek tanpa gambar tidak tampil di website.');

    const rawGallery = (typeof entry.gallery === 'string' ? [entry.gallery] : Array.isArray(entry.gallery) ? entry.gallery : []).filter(
      (src): src is string => typeof src === 'string' && src.trim() !== '',
    );
    if (rawGallery.length > PROJECT_MAX_GALLERY) {
      notes.push(`Maksimal ${PROJECT_MAX_GALLERY} gambar detail, jadi ${rawGallery.length - PROJECT_MAX_GALLERY} terakhir tidak diimpor.`);
    }
    const gallery = rawGallery
      .slice(0, PROJECT_MAX_GALLERY)
      .flatMap((src, i) => {
        const found = media(src, 'image', `Gambar detail ${i + 1}`);
        return found ? [found] : [];
      });

    const video = media(entry.video, 'video', 'Video');

    const unknown = Object.keys(entry).filter((key) => !KNOWN_KEYS.has(key));
    if (unknown.length) notes.push(`Kolom tidak dikenal diabaikan: ${unknown.join(', ')}.`);

    const key = projectTitleKey(title);
    if (key) {
      const first = seen.get(key);
      if (first !== undefined) problems.push(`Nama proyek sama dengan proyek #${first} di ${IMPORT_MANIFEST}.`);
      else seen.set(key, number);
    }

    return { ...empty, title, desc, url, description, tools, image, gallery, video, existing: key ? existingKeys.indexOf(key) : -1 };
  });
}

const isFile = (media: ImportMedia | null): media is Extract<ImportMedia, { file: ImportFile }> => Boolean(media && 'file' in media);

/** File yang akan diunggah untuk satu proyek: jumlah & total ukuran. */
export function importUploads(item: ImportItem): { count: number; bytes: number } {
  const files = [item.image, ...item.gallery, item.video].filter(isFile);
  return { count: files.length, bytes: files.reduce((sum, media) => sum + media.file.size, 0) };
}

/**
 * Unggah media satu proyek (gambar kartu, gambar detail berurutan, video) lalu kembalikan entri portfolio_data yang
 * dirapikan seperti simpanan editor. onProgress: 0–100 untuk proyek ini. signal: hentikan sebelum file berikutnya
 * (unggahan video yang sedang jalan langsung dibatalkan) → ImportCancelled. Gagal dengan pesan siap tampil.
 */
export async function uploadImportItem(
  item: ImportItem,
  { signal, onProgress }: { signal: AbortSignal; onProgress?: (percent: number) => void },
): Promise<PortfolioItem> {
  if (!item.image || item.problems.length) throw new ImportError(item.problems[0] ?? 'Gambar kartu wajib diisi.');
  const total = importUploads(item).count;
  let done = 0;
  const report = (part = 0) => onProgress?.(total ? Math.round(((done + part) / total) * 100) : 100);

  const upload = async (media: ImportMedia, kind: 'cover' | 'gallery' | 'video'): Promise<string> => {
    if (!isFile(media)) return media.link;
    if (signal.aborted) throw new ImportCancelled();
    let file: File;
    try {
      file = new File([await media.file.read()], media.name, { type: media.type });
    } catch (error) {
      throw new ImportError(error instanceof ZipError ? error.message : `"${media.name}" tidak bisa dibaca.`);
    }
    if (signal.aborted) throw new ImportCancelled();
    let src: string;
    if (kind === 'video') {
      const token = getToken();
      if (!token) throw new ImportError(UPLOAD_SESSION_ERROR);
      const job = uploadHeroVideo(file, { token, url: PROJECT_VIDEO_UPLOAD_URL, onProgress: (percent) => report(percent / 100) });
      const stop = () => job.abort();
      signal.addEventListener('abort', stop);
      try {
        src = await job.promise;
      } catch (error) {
        if (error instanceof HeroUploadError && error.aborted) throw new ImportCancelled();
        throw new ImportError(`Video "${media.name}": ${error instanceof Error ? error.message : 'gagal diunggah.'}`);
      } finally {
        signal.removeEventListener('abort', stop);
      }
    } else {
      try {
        src = await uploadProjectImage(file, kind);
      } catch (error) {
        const text = error instanceof ProjectUploadError ? error.message : 'Gagal mengunggah gambar.';
        throw new ImportError(text.includes(`"${media.name}"`) ? text : `"${media.name}": ${text}`);
      }
    }
    done += 1;
    report();
    return src;
  };

  report();
  const image = await upload(item.image, 'cover');
  const gallery: string[] = [];
  for (const media of item.gallery) gallery.push(await upload(media, 'gallery'));
  const video = item.video ? await upload(item.video, 'video') : '';
  return cleanPortfolioItem({
    title: item.title,
    desc: item.desc,
    image,
    description: item.description,
    tools: item.tools,
    url: item.url,
    gallery,
    video,
  });
}

/** Masukkan proyek hasil impor ke daftar: replace = ganti proyek pertama bernama sama (bila ada), selain itu di akhir. */
export function addImportedProject(list: PortfolioItem[], item: PortfolioItem, replace: boolean): PortfolioItem[] {
  const index = replace ? list.findIndex((old) => projectTitleKey(old.title) === projectTitleKey(item.title)) : -1;
  return index >= 0 ? list.map((old, i) => (i === index ? item : old)) : [...list, item];
}
