// Unggah gambar & video proyek dari editor Pengaturan website > Proyek. Gambar dikecilkan dulu di browser lalu dikirim
// sebagai data URI ke upload_project_image; video dikirim mentah ke upload_project_video lewat uploadHeroVideo (progres,
// batal). Batas & pemeriksaan isi file di server: backend/modules/portfolio_media.php = portfolio_media.js (gambar
// UPLOAD_MAX_IMAGE_MB, video UPLOAD_MAX_VIDEO_MB yang juga dipakai video hero, lihat get_hero_media_limits).
import { ApiError, apiPost } from '../../../lib/api';
import { UPLOAD_SESSION_ERROR } from '../hero/heroMedia';
import { resizeHeroImage } from '../hero/heroImage';
import { projectDescription, type PortfolioItem } from '../../../components/sections/projects/portfolio';

export const PROJECT_VIDEO_UPLOAD_URL = '/api.php?action=upload_project_video';
/** File asli boleh lebih besar dari batas server: yang dikirim adalah hasil kecilnya (GIF apa adanya). */
export const PROJECT_IMAGE_SOURCE_MAX_MB = 25;
/** Bawaan UPLOAD_MAX_IMAGE_MB di server. */
export const PROJECT_IMAGE_MAX_MB = 10;
/** Gambar detail tampil selebar dialog (maks. ±1000 px, layar retina 2×); tangkapan layar halaman penuh tetap utuh. */
export const PROJECT_IMAGE_MAX_WIDTH = 2000;
export const PROJECT_IMAGE_MAX_HEIGHT = 8000;
/** Gambar kartu 4:3 tampil maks. ±450 px lebar (retina 2× + ruang potong). */
export const PROJECT_COVER_MAX_WIDTH = 1600;
export const PROJECT_COVER_MAX_HEIGHT = 1600;
export const PROJECT_IMAGE_QUALITY = 0.85;

const MB = 1024 * 1024;
const TYPE_ERROR = 'Gambar proyek harus JPG, PNG, WEBP, atau GIF.';

/** Error unggah dengan pesan siap tampil. */
export class ProjectUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectUploadError';
  }
}

type FileLike = { name: string; type: string; size: number };

/** Pesan bila file gambar tidak boleh diunggah, atau null bila lolos. */
export function checkProjectImage(file: FileLike): string | null {
  if (!file.type.startsWith('image/')) return `"${file.name}" bukan file gambar.`;
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return `"${file.name}": ${TYPE_ERROR}`;
  if (file.size > PROJECT_IMAGE_SOURCE_MAX_MB * MB) return `"${file.name}" lebih dari ${PROJECT_IMAGE_SOURCE_MAX_MB} MB.`;
  return null;
}

/** Ukuran isi data URI base64 dalam byte (perkiraan, tanpa padding). */
export const dataUriBytes = (uri: string) => Math.floor(((uri.length - uri.indexOf(',') - 1) * 3) / 4);

const readDataUri = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Gambar tidak bisa dibaca')));
    reader.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
    reader.readAsDataURL(file);
  });

/** Data URI siap kirim: GIF apa adanya (animasinya tetap), lainnya JPEG yang muat di batas kartu / gambar detail. */
export function prepareProjectImage(file: File, kind: 'cover' | 'gallery'): Promise<string> {
  if (file.type.toLowerCase() === 'image/gif') return readDataUri(file);
  return kind === 'cover'
    ? resizeHeroImage(file, { maxWidth: PROJECT_COVER_MAX_WIDTH, maxHeight: PROJECT_COVER_MAX_HEIGHT, quality: PROJECT_IMAGE_QUALITY })
    : resizeHeroImage(file, { maxWidth: PROJECT_IMAGE_MAX_WIDTH, maxHeight: PROJECT_IMAGE_MAX_HEIGHT, quality: PROJECT_IMAGE_QUALITY });
}

/** Pesan gagal unggah gambar dari error apiPost. */
export function imageUploadMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return UPLOAD_SESSION_ERROR;
    // 413 tanpa pesan JSON (mis. dari nginx/LiteSpeed)
    if (error.status === 413 && error.message.startsWith('Permintaan gagal')) return 'Ukuran gambar terlalu besar untuk server.';
    return error.message;
  }
  return error instanceof Error && error.message ? error.message : 'Gagal mengunggah gambar.';
}

/** Kecilkan lalu unggah satu gambar; selesai dengan path/URL tersimpan, gagal dengan ProjectUploadError. */
export async function uploadProjectImage(file: File, kind: 'cover' | 'gallery'): Promise<string> {
  const invalid = checkProjectImage(file);
  if (invalid) throw new ProjectUploadError(invalid);
  let data: string;
  try {
    data = await prepareProjectImage(file, kind);
  } catch {
    throw new ProjectUploadError(`"${file.name}" tidak bisa dibaca.`);
  }
  if (dataUriBytes(data) > PROJECT_IMAGE_MAX_MB * MB) {
    throw new ProjectUploadError(`"${file.name}" lebih dari ${PROJECT_IMAGE_MAX_MB} MB${file.type === 'image/gif' ? '' : ' setelah dikecilkan'}.`);
  }
  let url: unknown;
  try {
    url = (await apiPost<{ url?: unknown }>('upload_project_image', { data })).url;
  } catch (error) {
    throw new ProjectUploadError(imageUploadMessage(error));
  }
  if (typeof url !== 'string' || !url.trim() || /^data:/i.test(url)) throw new ProjectUploadError('Gagal mengunggah gambar: respons server tidak sesuai.');
  return url.trim();
}

/**
 * Entri yang disimpan: isian lama apa adanya (mis. `span`), isian baru yang kosong dibuang (sama dengan backend), jadi
 * proyek tanpa isian baru tersimpan persis seperti dulu.
 */
export function cleanPortfolioItem(item: PortfolioItem): PortfolioItem {
  const out: PortfolioItem = { ...item };
  const description = projectDescription(out.description);
  if (description) out.description = description;
  else delete out.description;
  if (!out.url) delete out.url;
  if (!out.video) delete out.video;
  if (!out.tools?.length) delete out.tools;
  if (!out.gallery?.length) delete out.gallery;
  return out;
}
