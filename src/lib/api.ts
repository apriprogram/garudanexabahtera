// Pemanggil API bersama untuk halaman baru (marketplace template, akun, custom order).
// Token login dilampirkan otomatis oleh pembungkus fetch di src/lib/auth.ts.

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const API_URL = '/api.php';
const NETWORK_ERROR = 'Tidak bisa terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.';

async function parse<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // respons bukan JSON
  }
  const body = (data ?? {}) as { error?: string; code?: string; errors?: Record<string, string> };
  if (!res.ok || body.error) {
    throw new ApiError(body.error || `Permintaan gagal (${res.status}).`, res.status, body.code, body.errors);
  }
  return data as T;
}

/**
 * Aksi baca publik yang hasilnya dibagi selama satu kali muat halaman: beberapa komponen (hero, katalog, template
 * lain) memanggil `get_templates` bersamaan, cukup satu request. Hasil dianggap hanya-baca oleh pemanggil.
 */
const SHARED_GET_ACTIONS = new Set(['get_templates']);
const sharedGets = new Map<string, Promise<unknown>>();

/** Kosongkan cache apiGet bersama (untuk tes, atau setelah admin mengubah data di tab yang sama). */
export const clearApiCache = () => sharedGets.clear();

async function requestGet<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError(NETWORK_ERROR, 0, 'NETWORK');
  }
  return parse<T>(res);
}

/** GET untuk aksi baca publik: apiGet('get_templates', { category: 'Company Profile' }) */
export async function apiGet<T>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const url = `${API_URL}?${query.toString()}`;
  if (!SHARED_GET_ACTIONS.has(action)) return requestGet<T>(url);

  let shared = sharedGets.get(url) as Promise<T> | undefined;
  if (!shared) {
    shared = requestGet<T>(url);
    sharedGets.set(url, shared);
    // Gagal → hapus dari cache, jadi "Coba lagi" benar-benar meminta ulang ke server
    shared.catch(() => {
      if (sharedGets.get(url) === shared) sharedGets.delete(url);
    });
  }
  return shared;
}

/** POST JSON: apiPost('customer_create_order', { template_id: 1, ... }) */
export async function apiPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, action }),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0, 'NETWORK');
  }
  return parse<T>(res);
}

/** POST JSON yang membalas file (mis. download_project_file): Blob dengan Content-Type dari server. */
export async function apiPostBlob(action: string, body: Record<string, unknown> = {}): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, action }),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0, 'NETWORK');
  }
  // Gagal: server membalas JSON {error, code}; parse() melempar ApiError dengan pesannya
  if (!res.ok) await parse<never>(res);
  return res.blob();
}

/** Pesan error yang aman ditampilkan ke pengguna. */
export const errorMessage = (err: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.') =>
  err instanceof ApiError ? err.message : err instanceof Error && err.message ? err.message : fallback;

/** Baca file gambar jadi data-URI (untuk upload base64), dengan batas ukuran. */
export function readImageAsDataUrl(file: File, maxMb = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('File harus berupa gambar.'));
    if (file.size > maxMb * 1024 * 1024) return reject(new Error(`Ukuran gambar maksimal ${maxMb} MB.`));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}
