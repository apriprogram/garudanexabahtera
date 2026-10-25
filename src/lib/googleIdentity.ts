// Google Identity Services (GIS) untuk tombol "Masuk/Daftar dengan Google" di /masuk dan /daftar
// (docs/platform/GOOGLE-LOGIN.md). Client ID diambil dari aksi google_auth_config (setting admin atau env server);
// selama kosong, skrip Google tidak dimuat dan tombolnya tidak tampil. Tombol yang digambar Google menghasilkan ID token
// (credential) yang diverifikasi server lewat customer_google_auth; di browser token itu hanya dibaca untuk mengisi
// email (credentialEmail), tidak pernah dipercaya.
import { apiGet } from './api';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
/** Format client ID OAuth Google; sama dengan GA_CLIENT_ID_PATTERN di backend/modules/google_auth.php. */
export const GOOGLE_CLIENT_ID_PATTERN = /^[0-9]+-[0-9a-z]+\.apps\.googleusercontent\.com$/;

export const isGoogleClientId = (value: string) => GOOGLE_CLIENT_ID_PATTERN.test(value.trim());

/** Bagian google.accounts.id yang dipakai (https://developers.google.com/identity/gsi/web/reference/js-reference). */
export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let clientIdPromise: Promise<string | null> | null = null;

/** Client ID yang berlaku, atau null bila Google belum diaktifkan. Satu request per muat halaman (gagal = coba lagi nanti). */
export function getGoogleClientId(): Promise<string | null> {
  clientIdPromise ??= apiGet<{ client_id?: unknown }>('google_auth_config').then(
    (res) => (typeof res.client_id === 'string' && isGoogleClientId(res.client_id) ? res.client_id.trim() : null),
    () => {
      clientIdPromise = null;
      return null;
    },
  );
  return clientIdPromise;
}

let gisPromise: Promise<GoogleAccountsId> | null = null;
let initializedFor: string | null = null;
let credentialHandler: ((credential: string) => void) | null = null;

/**
 * Muat skrip GIS (sekali) lalu initialize dengan client ID ini. Callback Google diteruskan ke handler tombol yang sedang
 * tampil (setCredentialHandler), jadi pindah tab Masuk ↔ Daftar tidak memanggil initialize lagi.
 */
export function loadGoogleIdentity(clientId: string): Promise<GoogleAccountsId> {
  gisPromise ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const ready = () => window.google?.accounts?.id;
    const found = ready();
    if (found) {
      resolve(found);
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      const gis = ready();
      if (gis) resolve(gis);
      else reject(new Error('Google Identity Services tidak tersedia'));
    };
    script.onerror = () => reject(new Error('Skrip Google tidak bisa dimuat'));
    document.head.appendChild(script);
  }).catch((err: unknown) => {
    gisPromise = null;
    throw err;
  });
  return gisPromise.then((gis) => {
    if (initializedFor !== clientId) {
      gis.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) credentialHandler?.(response.credential);
        },
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true,
      });
      initializedFor = clientId;
    }
    return gis;
  });
}

/** Penerima credential dari tombol Google yang sedang tampil; null saat tombolnya hilang. */
export function setCredentialHandler(handler: ((credential: string) => void) | null) {
  credentialHandler = handler;
}

/** Email di dalam ID token (tanpa verifikasi; hanya untuk mengisi kolom email), atau null. */
export function credentialEmail(credential: string): string | null {
  try {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload)) as { email?: unknown };
    return typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Untuk tes: lupakan client ID, skrip, dan handler yang tersimpan. */
export function resetGoogleIdentity() {
  clientIdPromise = null;
  gisPromise = null;
  initializedFor = null;
  credentialHandler = null;
}
