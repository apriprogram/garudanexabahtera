// Satu baris di bawah tombol WhatsApp /pesan-custom: arahkan ke template siap pakai dan akun pembeli (/daftar). Akun
// dipakai untuk pesanan TEMPLATE (bayar online); permintaan custom tidak butuh akun, jadi teksnya tidak menjanjikan
// pemantauan permintaan custom. Pembeli yang sudah login melihat "Akun Saya"; staf tidak melihat apa pun.
// Ringkas (pemilik 2026-10-24: halaman pesan custom terlalu banyak kalimat).
import { Link } from 'react-router-dom';
import { HUB_PATHS } from '../../../seo/paths';
import { useSessionRole } from '../../../hooks/useSessionRole';

export function AccountOffer({ className = '' }: { className?: string }) {
  // Sesi dari localStorage: null saat prerender & hidrasi (= HTML server), lalu peran sebenarnya
  const role = useSessionRole();
  if (role && role !== 'customer') return null;

  return (
    <p className={`text-sm leading-relaxed text-muted ${className}`}>
      Butuh harga pasti?{' '}
      <Link to={HUB_PATHS.catalog} className="link-site font-medium">
        Lihat template siap pakai
      </Link>
      {role === 'customer' ? (
        <>
          {' '}
          atau buka{' '}
          <Link to="/akun" className="link-site font-medium">
            Akun Saya
          </Link>
          .
        </>
      ) : (
        <>
          , lalu{' '}
          <Link to="/daftar" className="link-site font-medium">
            Daftar Akun
          </Link>{' '}
          untuk bayar online.
        </>
      )}
    </p>
  );
}
