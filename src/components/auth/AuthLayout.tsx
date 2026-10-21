// Kerangka halaman masuk/daftar (/login, /masuk, /daftar): tata letak lama yang disukai pengguna (logo di tengah,
// judul, satu kartu berisi tab Masuk/Daftar, tautan di bawah kartu, cahaya lembut di latar) dalam tema TERANG
// "Calm Workspace": latar abu muda, kartu putih datar ber-garis tipis, aksen biru brand, tanpa shadow.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';

const EASE_CALM = [0.2, 0.8, 0.2, 1] as const;

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Tab Masuk/Daftar di bagian atas kartu */
  tabs?: ReactNode;
  /** Isi kartu: pemberitahuan + form */
  children: ReactNode;
  /** Teks di bawah kartu, mis. "Belum punya akun? Daftar sekarang" */
  footer?: ReactNode;
  /**
   * `page` (default): seluruh kolom muncul halus dari bawah.
   * `tab`: datang dari tab Masuk/Daftar halaman lain, hanya isi kartu yang memudar masuk (terasa satu halaman).
   */
  entrance?: 'page' | 'tab';
}

export function AuthLayout({ title, subtitle, tabs, children, footer, entrance = 'page' }: AuthLayoutProps) {
  const reduce = useReducedMotion();
  const fromTab = entrance === 'tab';

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-alt text-fg">
        <AuthBackdrop still={!!reduce} />

        <header className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
          <Link
            to="/"
            className="group relative inline-flex h-10 items-center gap-2 rounded-full bg-surface pl-3.5 pr-4 text-[13px] font-medium text-muted ring-1 ring-inset ring-line transition-colors hover:text-fg hover:ring-line-strong max-sm:w-10 max-sm:justify-center max-sm:p-0 max-sm:after:absolute max-sm:after:-inset-1"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            <span className="sr-only sm:not-sr-only">Kembali ke beranda</span>
          </Link>
        </header>

        {/* Kepala dirapatkan (logo, judul, jarak) agar tombol kirim form daftar tetap di layar pertama */}
        <main id="konten" className="flex flex-1 justify-center px-4 pb-8 pt-2 sm:items-center sm:px-6 sm:py-6">
          <motion.div
            initial={fromTab ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_CALM }}
            className="w-full max-w-[400px] md:max-w-[460px]"
          >
            <div className="mb-4 text-center sm:mb-6">
              <Link to="/" aria-label="Garuda Nexa, ke beranda" className="mx-auto mb-3 inline-flex rounded-[14px]">
                <img src="/brand/logo-mark.svg" alt="" width={48} height={48} className="h-10 w-10 sm:h-12 sm:w-12" />
              </Link>
              {/* key: judul berganti (mis. tab Masuk ↔ Daftar staf) memudar masuk */}
              <motion.div key={title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                <h1
                  id="auth-title"
                  className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[30px] sm:tracking-[-0.03em]"
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="mx-auto mt-2 max-w-[360px] text-sm leading-relaxed text-muted sm:text-[15px]">{subtitle}</p>
                )}
              </motion.div>
            </div>

            <section
              aria-labelledby="auth-title"
              className="relative overflow-hidden rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line sm:rounded-[28px] sm:p-8"
            >
              {/* Garis cahaya tipis di tepi atas kartu (gaya kartu lama, versi terang) */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-brand-300 to-transparent"
              />
              {tabs}
              <motion.div
                initial={fromTab ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_CALM }}
              >
                {children}
              </motion.div>
            </section>

            {footer && <div className="mt-4 text-center text-sm text-muted sm:mt-8 sm:space-y-2">{footer}</div>}
          </motion.div>
        </main>

        <footer className="pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-subtle">
          © {new Date().getFullYear()} Garuda Nexa Bahtera
        </footer>
      </div>
    </MotionConfig>
  );
}

/** Latar: pola titik halus memudar ke tepi + dua cahaya biru brand yang "bernapas" pelan (diam bila reduced motion). */
function AuthBackdrop({ still }: { still: boolean }) {
  const breathe = (delay: number, [low, high]: [number, number]) =>
    still
      ? { style: { opacity: high } }
      : {
          initial: { opacity: low },
          animate: { opacity: [low, high, low], scale: [1, 1.06, 1] },
          transition: { duration: 12, ease: 'easeInOut' as const, repeat: Infinity, delay },
        };

  // Gradien radial (bukan filter blur): tanpa pita warna dan ringan di GPU ponsel
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="grid-dots absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_35%,#000_25%,transparent_75%)]" />
      <motion.div
        {...breathe(0, [0.45, 0.75])}
        className="absolute -left-[22%] -top-[26%] h-[72%] w-[70%] bg-[radial-gradient(closest-side,var(--color-brand-200),transparent)]"
      />
      <motion.div
        {...breathe(4, [0.7, 1])}
        className="absolute -bottom-[28%] -right-[22%] h-[72%] w-[70%] bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)]"
      />
    </div>
  );
}

interface AuthSwitchProps {
  text: ReactNode;
  children: ReactNode;
  /** Tautan ke halaman lain … */
  to?: string;
  state?: unknown;
  /** Ganti entri riwayat (pindah antara /masuk dan /daftar) */
  replace?: boolean;
  /** … atau aksi di halaman yang sama (ganti mode) */
  onClick?: () => void;
}

/** Baris "Belum punya akun? Daftar sekarang" di bawah kartu (tautan/tombol dengan area sentuh 44px di HP). */
export function AuthSwitch({ text, children, to, state, replace, onClick }: AuthSwitchProps) {
  const cls =
    'relative inline-flex items-center rounded-md px-0.5 font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline after:absolute after:-inset-x-1 after:-inset-y-3 sm:after:-inset-y-1.5';
  // HP: tiap baris setinggi 44px agar area sentuh tautan tidak saling tumpang tindih
  return (
    <p className="flex min-h-11 flex-wrap items-center justify-center gap-x-1 sm:min-h-0">
      {text}
      {to ? (
        <Link to={to} state={state} replace={replace} className={cls}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          {children}
        </button>
      )}
    </p>
  );
}
