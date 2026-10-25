// Opsi tambahan di bawah form /masuk dan /daftar: garis "atau" + tombol resmi Google (digambar skrip Google Identity
// Services di dalam iframe, teks bahasa Indonesia). Tidak tampil sama sekali selama client ID belum diisi atau skrip
// Google gagal dimuat, jadi form email + kata sandi tetap jalan seperti biasa. Lihat src/lib/googleIdentity.ts.
import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, loadGoogleIdentity, setCredentialHandler } from '../../lib/googleIdentity';

interface GoogleAuthButtonProps {
  /** `signin_with` = "Login dengan Google", `signup_with` = "Daftar dengan Google" (teks dari Google) */
  text: 'signin_with' | 'signup_with';
  onCredential: (credential: string) => void;
  /** Saat form sedang memproses: tombol diredupkan dan tidak bisa diklik */
  disabled?: boolean;
}

/** Lebar tombol Google: selebar kolom form, dalam batas yang diterima Google (200–400 px). */
const buttonWidth = (el: HTMLElement) => Math.max(200, Math.min(400, Math.floor(el.clientWidth || 320)));

export function GoogleAuthButton({ text, onCredential, disabled = false }: GoogleAuthButtonProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const slotRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onCredential);

  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let alive = true;
    void getGoogleClientId().then((id) => {
      if (alive) setClientId(id);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!clientId || !slot) return;
    let alive = true;
    let observer: ResizeObserver | null = null;
    setCredentialHandler((credential) => handlerRef.current(credential));
    loadGoogleIdentity(clientId).then(
      (gis) => {
        if (!alive) return;
        let width = buttonWidth(slot);
        const draw = () => {
          slot.replaceChildren();
          gis.renderButton(slot, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text,
            shape: 'pill',
            logo_alignment: 'center',
            width,
            locale: 'id',
          });
        };
        draw();
        setState('ready');
        // Lebar tombol Google tetap setelah digambar: gambar ulang bila kolom berubah lebar (layar HP diputar, jendela
        // diperkecil), supaya tombol tidak melebihi kartu
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => {
            const next = buttonWidth(slot);
            if (Math.abs(next - width) < 8) return;
            width = next;
            draw();
          });
          observer.observe(slot);
        }
      },
      () => {
        if (alive) setState('failed');
      },
    );
    return () => {
      alive = false;
      observer?.disconnect();
      setCredentialHandler(null);
    };
  }, [clientId, text]);

  if (!clientId || state === 'failed') return null;

  return (
    <div className="mt-5 sm:mt-6">
      <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        atau
        <span className="h-px flex-1 bg-line" />
      </div>
      {/* Tinggi tetap (tombol large Google = 40 px) agar kartu tidak melompat saat tombolnya selesai digambar */}
      <div
        ref={slotRef}
        aria-busy={state === 'loading' || undefined}
        aria-disabled={disabled || undefined}
        className={`mt-4 flex h-11 items-center justify-center transition-opacity ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      />
    </div>
  );
}
