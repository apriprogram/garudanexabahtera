// Binary assets for the exports: signature images (object URL or data URL → bytes / data URL) and the wings logo as
// a PNG rendered from the SVG through a canvas (DOCX; Word has no reliable inline SVG). Failures never break an
// export: a missing image falls back to the text label.
import { wingsSvg } from './layout';

export interface ImageBytes {
  data: Uint8Array;
  type: 'png' | 'jpg';
  /** pixel size (from the PNG/JPEG header) */
  width: number;
  height: number;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Width/height of a PNG (IHDR) or baseline/progressive JPEG (SOFn); null for anything else. */
export function imageSize(bytes: Uint8Array): { type: 'png' | 'jpg'; width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return { type: 'png', width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpg', height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** Bytes of an image given as a data URL or a fetchable (object) URL; null when it cannot be read or is no PNG/JPEG. */
export async function loadImage(src: string | undefined): Promise<ImageBytes | null> {
  if (!src) return null;
  try {
    let data: Uint8Array;
    const inline = /^data:image\/[a-z+]+;base64,(.*)$/i.exec(src);
    if (inline) data = base64ToBytes(inline[1]);
    else data = new Uint8Array(await (await fetch(src)).arrayBuffer());
    const size = imageSize(data);
    return size && size.width > 0 && size.height > 0 ? { data, ...size } : null;
  } catch {
    return null;
  }
}

/** Data URL of a loaded image (pdfmake needs data URLs). */
export const toDataUrl = (image: ImageBytes) => `data:image/${image.type === 'png' ? 'png' : 'jpeg'};base64,${bytesToBase64(image.data)}`;

/** Gives up on an asset that takes longer than `ms` (e.g. an image that never fires load in a test DOM). */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** The wings logo as a PNG (4× the viewBox, transparent background); null outside a browser with canvas support. */
export async function logoPng(): Promise<ImageBytes | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const render = async (): Promise<ImageBytes | null> => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo'));
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wingsSvg())}`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 257 * 4;
    canvas.height = 156 * 4;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return { data: new Uint8Array(await blob.arrayBuffer()), type: 'png', width: canvas.width, height: canvas.height };
  };
  return withTimeout(render(), 4000, null);
}
