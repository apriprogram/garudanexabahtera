// Unggah video latar hero (aksi upload_hero_video) dan pembuatan gambar sampul dari frame video, di sisi browser.
// Unggah memakai XMLHttpRequest agar ada progres; pembungkus fetch di src/lib/auth.ts tidak berlaku untuk XHR,
// jadi header Authorization dipasang sendiri oleh pemanggil (lewat `token`).
import {
  HERO_POSTER_MAX_WIDTH,
  HERO_POSTER_QUALITY,
  HERO_POSTER_TIMEOUT_MS,
  HERO_VIDEO_UPLOAD_URL,
  UPLOAD_NETWORK_ERROR,
  fitWithin,
  heroUploadErrorMessage,
  heroVideoContentType,
  posterFrameTime,
  uploadedVideoUrl,
} from './heroMedia';

/** Error unggah dengan pesan siap tampil. `aborted` = dibatalkan pengguna (tidak perlu ditampilkan). */
export class HeroUploadError extends Error {
  status: number;
  aborted: boolean;

  constructor(message: string, status = 0, aborted = false) {
    super(message);
    this.name = 'HeroUploadError';
    this.status = status;
    this.aborted = aborted;
  }
}

export interface HeroVideoUpload {
  /** Selesai dengan URL video tersimpan; gagal dengan HeroUploadError. */
  promise: Promise<string>;
  abort: () => void;
}

/**
 * Kirim file video mentah (bukan JSON/base64/multipart) ke upload_hero_video. onProgress menerima 0–100.
 * Server memeriksa isi file (magic bytes); Content-Type hanya informasi.
 */
export function uploadHeroVideo(
  file: File,
  { token, onProgress, url = HERO_VIDEO_UPLOAD_URL }: { token: string | null; onProgress?: (percent: number) => void; url?: string },
): HeroVideoUpload {
  const xhr = new XMLHttpRequest();
  let settled = false;

  const promise = new Promise<string>((resolve, reject) => {
    const fail = (error: HeroUploadError) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', heroVideoContentType(file));

    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      };
    }
    xhr.onload = () => {
      const body = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      if (xhr.status >= 200 && xhr.status < 300) {
        const stored = uploadedVideoUrl(body);
        if (stored) {
          settled = true;
          onProgress?.(100);
          resolve(stored);
          return;
        }
      }
      // Termasuk 2xx tanpa URL (mis. {error} dari server)
      fail(new HeroUploadError(heroUploadErrorMessage(xhr.status, body), xhr.status));
    };
    xhr.onerror = () => fail(new HeroUploadError(UPLOAD_NETWORK_ERROR, 0));
    xhr.ontimeout = () => fail(new HeroUploadError(UPLOAD_NETWORK_ERROR, 0));
    xhr.onabort = () => fail(new HeroUploadError('Unggahan dibatalkan.', 0, true));

    xhr.send(file);
  });

  return {
    promise,
    abort: () => {
      if (settled) return;
      xhr.abort();
    },
  };
}

export interface PosterResult {
  /** data:image/jpeg;base64,... atau null bila frame tidak bisa diambil. */
  poster: string | null;
  /** Durasi video dalam detik, null bila tidak diketahui. */
  duration: number | null;
}

/**
 * Ambil satu frame (detik min(1, durasi/4)) dari file video lokal sebagai JPEG maks. 1280 px lebar.
 * Tidak pernah gagal: bila browser tidak bisa membaca video atau lewat ~8 dtk → poster null.
 */
export function captureVideoPoster(file: Blob, timeoutMs = HERO_POSTER_TIMEOUT_MS): Promise<PosterResult> {
  return new Promise((resolve) => {
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve({ poster: null, duration: null });
      return;
    }

    const video = document.createElement('video');
    let duration: number | null = null;
    let done = false;

    const finish = (poster: string | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('loadeddata', onData);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        // elemen sudah dilepas
      }
      URL.revokeObjectURL(objectUrl);
      resolve({ poster, duration });
    };

    const draw = () => {
      try {
        const size = fitWithin(video.videoWidth, video.videoHeight, HERO_POSTER_MAX_WIDTH, Number.POSITIVE_INFINITY);
        if (!size.width) return finish(null);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, size.width, size.height);
        const dataUrl = canvas.toDataURL('image/jpeg', HERO_POSTER_QUALITY);
        finish(dataUrl.startsWith('data:image/') ? dataUrl : null);
      } catch {
        finish(null);
      }
    };

    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration;
    };
    const onData = () => {
      onMeta();
      const at = posterFrameTime(video.duration);
      if (at <= 0) {
        draw();
        return;
      }
      try {
        video.currentTime = at;
      } catch {
        draw();
      }
    };
    const onSeeked = () => draw();
    const onError = () => finish(null);

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('loadeddata', onData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = objectUrl;
  });
}
