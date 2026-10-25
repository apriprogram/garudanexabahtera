// Profil pembeli (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §4): satu sumber untuk nama & foto di header akun dan
// halaman Profil (/akun/profil), lewat useSyncExternalStore.
// - Isi awal = sesi login (localStorage 'currentUser', lewat getCurrentUser()), jadi header langsung tampil.
// - Disegarkan sekali per kunjungan akun (AccountLayout) dengan customer_get_profile; gagal = diam, tetap data sesi.
// - setProfile() (setelah simpan) ikut menulis name/phone/avatar/company_name/address/city ke 'currentUser', supaya
//   halaman lain yang membaca getCurrentUser() (mis. isian otomatis form /pesan/:slug) memakai data terbaru.
// Bagian bawah: pengolahan foto profil di klien (cek jenis & ukuran, potong persegi di tengah, WebP ≤ 512 px).
import { useSyncExternalStore } from 'react';
import { apiGet } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/auth';
import type { CustomerProfile } from '../../../types/platform';

const USER_KEY = 'currentUser';

/** Field profil yang disalin ke sesi login; kunci lain (role, email, dll.) dibiarkan. */
const SESSION_FIELDS = ['name', 'phone', 'avatar', 'company_name', 'address', 'city'] as const;

/**
 * Foto profil yang boleh ditampilkan: path file dari server PHP ("/assets/avatars/…") atau URL https (S3 di backend
 * Node). Selain itu (data:, javascript:, http:, kosong) = null, jadi yang tampil inisial nama.
 */
export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  return url.startsWith('/assets/') || url.startsWith('https://') ? url : null;
}

/** "Budi Santoso" → "BS"; nama kosong → "A" (akun). */
export const profileInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';

const optionalText = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

/** Bentuk profil yang rapi dari respons server atau objek sesi login (field tak dikenal diabaikan). */
function normalizeProfile(raw: Record<string, unknown>): CustomerProfile {
  return {
    id: Number(raw.id) || 0,
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: optionalText(raw.phone),
    company_name: optionalText(raw.company_name),
    address: optionalText(raw.address),
    city: optionalText(raw.city),
    avatar: safeAvatarUrl(raw.avatar),
  };
}

/* ─────────────────────────── Store ─────────────────────────── */

let snapshot: CustomerProfile | null = null;
/** Isi mentah 'currentUser' saat snapshot dibuat; berubah (login lain, tab lain) → snapshot dibuat ulang. */
let snapshotRaw: string | null | undefined;
/** Naik setiap setProfile(); hasil customer_get_profile yang dimulai sebelum simpan terakhir tidak menimpanya. */
let version = 0;
let inflight: Promise<CustomerProfile> | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** Profil saat ini (null = tidak ada sesi). Nilainya tetap sama selama tidak ada perubahan (aman untuk useSyncExternalStore). */
export function getProfile(): CustomerProfile | null {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    const user = getCurrentUser();
    snapshot = user ? normalizeProfile(user) : null;
  }
  return snapshot;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Profil diubah di tab lain → header di tab ini ikut berganti
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === USER_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Profil pembeli yang sedang masuk; komponen ikut dirender ulang saat profil berubah. */
export const useProfile = () => useSyncExternalStore(subscribe, getProfile, () => null);

/**
 * Pasang profil baru (hasil customer_update_profile / customer_get_profile) dan salin field-nya ke sesi login
 * 'currentUser' (kunci lain, termasuk role, tetap). Mengembalikan profil yang sudah dirapikan.
 */
export function setProfile(next: CustomerProfile): CustomerProfile {
  const profile = normalizeProfile(next as unknown as Record<string, unknown>);
  version += 1;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      const merged: Record<string, unknown> = { ...stored };
      for (const key of SESSION_FIELDS) merged[key] = profile[key];
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
    }
  } catch {
    // Penyimpanan tidak tersedia/penuh: profil tetap berlaku di memori untuk kunjungan ini
  }
  snapshotRaw = readRaw();
  snapshot = profile;
  emit();
  return profile;
}

/**
 * Ambil profil dari server (customer_get_profile) dan pasang di store. Panggilan bersamaan memakai satu request.
 * Melempar ApiError bila gagal (halaman Profil menampilkan galat + Coba lagi).
 */
export function loadProfile(): Promise<CustomerProfile> {
  if (inflight) return inflight;
  const startedAt = version;
  const request = apiGet<{ profile?: CustomerProfile }>('customer_get_profile').then((res) => {
    if (!res?.profile || typeof res.profile !== 'object') throw new Error('Profil belum bisa dimuat. Silakan coba lagi.');
    const profile = normalizeProfile(res.profile as unknown as Record<string, unknown>);
    const current = getCurrentUser();
    // Tidak menimpa simpanan yang lebih baru, dan tidak memasang profil akun lain (sesi berganti saat request berjalan)
    if (version === startedAt && (!current || Number(current.id) === profile.id)) setProfile(profile);
    return profile;
  });
  inflight = request;
  request
    .finally(() => {
      if (inflight === request) inflight = null;
    })
    .catch(() => {});
  return request;
}

/** Segarkan profil di latar belakang (header akun); kegagalan diabaikan, data sesi login tetap dipakai. */
export function refreshProfile(): void {
  loadProfile().catch(() => {});
}

/** Kosongkan store (untuk tes). Request yang masih berjalan tidak lagi memasang hasilnya. */
export function resetProfileStore(): void {
  snapshot = null;
  snapshotRaw = undefined;
  version += 1;
  inflight = null;
}

/* ─────────────────────────── Foto profil ─────────────────────────── */

export const AVATAR_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',');
/** File asli maksimal 5 MB (diperiksa sebelum dibaca); hasil olahan jauh di bawah batas server 2 MB. */
export const AVATAR_MAX_SOURCE_MB = 5;
/** Sisi foto hasil (px); foto yang lebih kecil tidak diperbesar. */
export const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.85;
const SERVER_MAX_BYTES = 2 * 1024 * 1024;
const UNREADABLE = 'Foto tidak bisa dibaca. Coba file lain.';

/** Pesan galat untuk file foto yang dipilih, atau undefined bila boleh diolah. */
export function avatarFileError(file: Pick<File, 'type' | 'size'>): string | undefined {
  if (!AVATAR_TYPES.includes(file.type)) return 'Foto profil harus JPG, PNG, atau WEBP.';
  if (file.size > AVATAR_MAX_SOURCE_MB * 1024 * 1024) return `Ukuran foto maksimal ${AVATAR_MAX_SOURCE_MB} MB.`;
  return undefined;
}

/** Potongan persegi di tengah gambar (sx, sy, side = sisi sumber) dan sisi hasil `size` (maks. `max`). */
export function centerSquare(width: number, height: number, max = AVATAR_SIZE) {
  const side = Math.max(0, Math.min(width, height));
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
    size: Math.max(1, Math.min(max, side)),
  };
}

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
      reject(new Error(UNREADABLE));
    };
    img.src = url;
  });
}

/** Perkiraan ukuran byte isi data URI base64. */
const dataUrlBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

/**
 * File foto → data URI siap kirim ke customer_update_profile: dipotong persegi di tengah, maks. 512×512, WebP
 * kualitas 0,85 (JPEG berlatar putih bila browser tidak bisa membuat WebP). Melempar Error berisi pesan untuk pembeli.
 */
export async function prepareAvatar(file: File): Promise<string> {
  const problem = avatarFileError(file);
  if (problem) throw new Error(problem);

  const img = await loadImage(file);
  const { sx, sy, side, size } = centerSquare(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error(UNREADABLE);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser Anda tidak bisa mengolah foto. Coba browser lain.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  let dataUrl = canvas.toDataURL('image/webp', AVATAR_QUALITY);
  // Tanpa encoder WebP browser mengembalikan PNG: pakai JPEG, bagian transparan diberi latar putih (bukan hitam)
  if (!dataUrl.startsWith('data:image/webp')) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    dataUrl = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
  }
  if (!dataUrl.startsWith('data:image/webp') && !dataUrl.startsWith('data:image/jpeg')) throw new Error(UNREADABLE);
  if (dataUrlBytes(dataUrl) > SERVER_MAX_BYTES) throw new Error('Ukuran foto maksimal 2 MB.');
  return dataUrl;
}
