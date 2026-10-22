// Ajakan membuat akun pembeli (/daftar) di samping form /pesan-custom. Akun dipakai untuk pesanan TEMPLATE (bayar online,
// pantau status); permintaan custom belum tersimpan di akun, jadi teksnya tidak menjanjikan pemantauan permintaan custom.
// Pembeli yang sudah login melihat "Akun Saya"; staf tidak melihat apa pun.
import { Link } from 'react-router-dom';
import { ArrowRight, UserRoundPlus, UserRound } from 'lucide-react';
import { customerLoginPath, getRole } from '../../../lib/auth';

export function AccountOffer({ className = '' }: { className?: string }) {
  const role = getRole();
  if (role && role !== 'customer') return null;

  if (role === 'customer') {
    return (
      <div className={`flex items-start gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100 sm:p-5 ${className}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary" aria-hidden>
          <UserRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Anda masuk sebagai pembeli</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            Pesanan template dan status pembayarannya bisa Anda pantau di akun. Permintaan custom kami tindak lanjuti lewat
            WhatsApp atau email.
          </p>
          <Link to="/akun" className="link-site mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm">
            Akun Saya
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100 sm:p-5 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary" aria-hidden>
        <UserRoundPlus className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Punya rencana memesan template?</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">
          Akun dipakai untuk memesan template siap pakai, membayar online, dan memantau pesanan template. Permintaan custom
          tidak butuh akun.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/daftar" className="btn btn-primary btn-sm">
            Daftar Akun
          </Link>
          <Link to={customerLoginPath('/pesan-custom')} className="link-site inline-flex min-h-9 items-center text-sm">
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
