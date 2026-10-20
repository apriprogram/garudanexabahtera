import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate, ReceiptText, ShieldCheck, SquarePen } from 'lucide-react';
import { BrandLogo, LogoMark } from '../../../components/ui/LogoMark';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  /** Panel samping di layar lebar (≥ 1024px); null = tanpa panel */
  aside?: ReactNode | null;
  children: ReactNode;
  /** Teks di bawah kartu, mis. "Belum punya akun? Daftar" */
  footer?: ReactNode;
}

/** Kerangka halaman masuk/daftar: tema terang, logo, kartu form, panel manfaat di desktop. */
export function AuthShell({ title, subtitle, aside = <CustomerBenefits />, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-alt">
      <header className="container-site flex h-16 items-center justify-between gap-3 lg:h-[72px]">
        <Link to="/" aria-label="Garuda Nexa Bahtera, ke beranda" className="min-w-0 rounded-xl">
          <BrandLogo />
        </Link>
        <Link to="/" className="btn btn-ghost btn-sm shrink-0">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Beranda
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-10 pt-2 sm:items-center sm:px-6 sm:py-10">
        <div
          className={`grid w-full gap-6 ${aside ? 'max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]' : 'max-w-[460px]'}`}
        >
          {aside && <div className="hidden lg:block">{aside}</div>}
          <div className="min-w-0">
            <section className="card-site p-5 sm:p-8" aria-labelledby="auth-title">
              <h1 id="auth-title" className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                {title}
              </h1>
              {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
              <div className="mt-6">{children}</div>
            </section>
            {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </main>

      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-subtle">
        © {new Date().getFullYear()} Garuda Nexa Bahtera
      </footer>
    </div>
  );
}

interface Benefit {
  icon: ReactNode;
  title: string;
  text: string;
}

/** Panel samping bertema brand muda dengan daftar manfaat. */
export function BenefitsPanel({ eyebrow, heading, items }: { eyebrow: string; heading: string; items: Benefit[] }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-brand-50 p-10 ring-1 ring-inset ring-brand-100">
      <LogoMark className="pointer-events-none absolute -bottom-10 -right-12 h-56 text-brand-100" />
      <span className="badge-site w-fit bg-surface">{eyebrow}</span>
      <h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight text-fg">{heading}</h2>
      <ul className="relative mt-8 space-y-5">
        {items.map((item) => (
          <li key={item.title} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-soft">
              {item.icon}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-fg">{item.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Manfaat akun pembeli (halaman /masuk dan /daftar). */
export function CustomerBenefits() {
  return (
    <BenefitsPanel
      eyebrow="Akun pembeli"
      heading="Satu akun untuk pesanan dan situs Anda"
      items={[
        {
          icon: <LayoutTemplate className="h-5 w-5" aria-hidden />,
          title: 'Pesan template siap pakai',
          text: 'Pilih template, tulis domain yang Anda inginkan, lalu bayar.',
        },
        {
          icon: <ShieldCheck className="h-5 w-5" aria-hidden />,
          title: 'Pembayaran aman lewat Midtrans',
          text: 'Bayar dengan metode yang tersedia di halaman pembayaran Midtrans.',
        },
        {
          icon: <ReceiptText className="h-5 w-5" aria-hidden />,
          title: 'Pantau status pesanan',
          text: 'Dari pembayaran, persetujuan, sampai domain aktif.',
        },
        {
          icon: <SquarePen className="h-5 w-5" aria-hidden />,
          title: 'Kelola konten situs sendiri',
          text: 'Ubah teks, gambar, dan kontak tanpa coding.',
        },
      ]}
    />
  );
}
