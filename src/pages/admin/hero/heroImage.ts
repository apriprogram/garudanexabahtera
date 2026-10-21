// Kecilkan gambar latar hero di browser sebelum dikirim sebagai data URI (backend menyimpannya di assets/bg).
import { HERO_IMAGE_MAX_HEIGHT, HERO_IMAGE_MAX_WIDTH, HERO_IMAGE_QUALITY, fitWithin } from './heroMedia';

/**
 * Gambar → JPEG yang muat di 1920×1080 (rasio tetap, tidak diperbesar), kualitas 0.82.
 * Latar putih di bawahnya supaya PNG transparan tidak jadi hitam. Gagal dibaca → reject.
 */
export function resizeHeroImage(
  file: Blob,
  { maxWidth = HERO_IMAGE_MAX_WIDTH, maxHeight = HERO_IMAGE_MAX_HEIGHT, quality = HERO_IMAGE_QUALITY } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = fitWithin(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);
        if (!size.width) throw new Error('Ukuran gambar tidak valid');
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.drawImage(img, 0, 0, size.width, size.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gambar tidak bisa dibaca'));
    };
    img.src = objectUrl;
  });
}
