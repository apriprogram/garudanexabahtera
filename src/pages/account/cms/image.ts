// Siapkan gambar unggahan CMS: perkecil di klien (sisi terpanjang maks. 1600 px) lalu jadikan data-URI ≤ 2 MB.
// Server (customer_save_site_content) menyimpan data-URI jadi file di assets/sites/<site_id>/.
import { readImageAsDataUrl } from '../../../lib/api';

export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_IMAGE_MB = 2;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
/** File asli boleh lebih besar karena akan dikompres; di atas ini ditolak agar browser HP tidak kehabisan memori. */
const MAX_SOURCE_MB = 25;

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibaca. Coba file lain.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function draw(img: HTMLImageElement, width: number, height: number, background?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser Anda tidak mendukung pengolahan gambar. Gunakan gambar di bawah 2 MB.');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/** Kompres ke JPEG/WebP/PNG sampai ≤ 2 MB (kualitas lalu ukuran diturunkan bertahap). */
async function compress(img: HTMLImageElement, sourceType: string): Promise<Blob> {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  let scale = Math.min(1, MAX_IMAGE_DIMENSION / longest);
  // JPEG tidak punya transparansi; PNG/WebP dicoba sebagai WebP (tetap transparan, jauh lebih kecil)
  const lossyType = sourceType === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  let quality = sourceType === 'image/jpeg' ? 0.86 : 0.9;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = draw(img, width, height);
    let blob = await canvasToBlob(canvas, lossyType, quality);
    // Browser tanpa encoder WebP mengembalikan PNG; bila PNG terlalu besar, pakai JPEG berlatar putih
    if (blob && blob.type !== lossyType && blob.size > MAX_IMAGE_BYTES) {
      blob = await canvasToBlob(draw(img, width, height, '#ffffff'), 'image/jpeg', quality);
    }
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
    if (quality > 0.7) quality -= 0.08;
    else scale *= 0.8;
  }
  throw new Error(`Gambar terlalu besar. Gunakan gambar di bawah ${MAX_IMAGE_MB} MB.`);
}

const extensionFor = (type: string) =>
  ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[type] ?? 'img';

/**
 * File gambar → data-URI siap simpan. SVG & GIF dipakai apa adanya (vektor / animasi), maks. 2 MB.
 * PNG/JPG/WEBP yang lebih besar dari 1600 px atau 2 MB diperkecil dengan canvas.
 */
export async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar (PNG, JPG, WEBP, GIF, atau SVG).');
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Format gambar belum didukung. Gunakan PNG, JPG, WEBP, GIF, atau SVG.');
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return readImageAsDataUrl(file, MAX_IMAGE_MB);
  if (file.size > MAX_SOURCE_MB * 1024 * 1024) throw new Error(`Ukuran file maksimal ${MAX_SOURCE_MB} MB.`);

  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longest) throw new Error('Gambar tidak bisa dibaca. Coba file lain.');
  if (longest <= MAX_IMAGE_DIMENSION && file.size <= MAX_IMAGE_BYTES) return readImageAsDataUrl(file, MAX_IMAGE_MB);

  const blob = await compress(img, file.type);
  const name = file.name.replace(/\.[^.]+$/, '') || 'gambar';
  return readImageAsDataUrl(new File([blob], `${name}.${extensionFor(blob.type)}`, { type: blob.type }), MAX_IMAGE_MB);
}
