// Kerangka halaman akun pembeli (/akun/*). Penjaga akses (SPEC §2): tanpa sesi → /masuk?next=...,
// staf (admin/user) → /admin. Header terang: logo, "Pesanan saya", "Proyek saya", "Lihat Template", lonceng notifikasi,
// menu pengguna (keluar).
// <Outlet /> tidak diberi lebar/padding: tiap halaman (AccountHome, AccountOrderDetail, SiteEditor) mengatur sendiri.
// Header sticky setinggi 64px (h-16) + safe-area atas; elemen sticky di halaman anak memakai top-16 atau lebih.
// Di HP ada baris tab di bawah header yang ikut tergulir (tidak sticky).
// "Lewati ke konten" (SkipLink) = elemen fokus pertama, menuju <main id="konten-akun">.
import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, FolderKanban, LayoutTemplate, LogOut, ReceiptText } from 'lucide-react';
import { BrandLogo } from '../../components/ui/LogoMark';
import { SkipLink } from '../../components/ui/SkipLink';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { NotificationBell } from '../../features/project-docs/notifications/NotificationBell';
import { customerLoginPath, getCurrentUser, getRole, logout, type SessionUser } from '../../lib/auth';
import { confirmLeave } from './cms/useLeaveGuard';
import { accountHelpMessage, helpWhatsappUrl } from './components/orderCopy';

export default function AccountLayout() {
  const location = useLocation();
  const role = getRole();

  if (!role) {
    return <Navigate to={customerLoginPath(`${location.pathname}${location.search}`)} replace />;
  }
  if (role !== 'customer') return <Navigate to="/admin" replace />;

  const user = getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col bg-alt">
      <SkipLink target="konten-akun" />
      <AccountHeader user={user} />
      <MobileTabs />
      <main id="konten-akun" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <AccountFooter />
    </div>
  );
}

/** Footer akun: "Hubungi kami" membuka WhatsApp (pesan awal menyebut nomor pesanan yang sedang dibuka). */
function AccountFooter() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Garuda Nexa Bahtera</span>
        <span>
          Butuh bantuan?{' '}
          <a href={helpWhatsappUrl(settings, accountHelpMessage(pathname))} target="_blank" rel="noopener noreferrer" className="link-site">
            Hubungi kami via WhatsApp
          </a>
        </span>
      </div>
    </footer>
  );
}

/** Menu akun; `match` = halaman yang membuat item aktif. Proyek saya = dokumen proyek custom (PROJECT-DOCS-SPEC §7). */
const NAV = [
  { to: '/akun', label: 'Pesanan saya', icon: ReceiptText, match: (p: string) => p === '/akun' || p.startsWith('/akun/pesanan') },
  { to: '/akun/proyek', label: 'Proyek saya', icon: FolderKanban, match: (p: string) => p === '/akun/proyek' || p.startsWith('/akun/proyek/') },
  { to: '/#templates', label: 'Lihat Template', icon: LayoutTemplate, match: () => false },
];

function AccountHeader({ user }: { user: SessionUser | null }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-5 sm:px-8">
        <Link to="/akun" aria-label="Akun saya, Garuda Nexa" className="min-w-0 rounded-xl">
          <BrandLogo compact />
        </Link>

        <nav aria-label="Menu akun" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-alt hover:text-fg'
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell variant="account" />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/** Tab "Pesanan saya" / "Proyek saya" / "Lihat Template" di HP (< 768px), di bawah header dan ikut tergulir. */
function MobileTabs() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Menu akun" className="border-b border-line bg-surface md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-1 px-5 py-2">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-1 text-[13px] font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-alt hover:text-fg'
              }`}
            >
              {/* Ikon hanya bila muat: tiga tab di layar 360px */}
              <item.icon className="h-4 w-4 shrink-0 max-[419px]:hidden" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';

/**
 * Menu pengguna = disclosure biasa (tombol aria-expanded + daftar tautan/tombol), bukan role="menu": tidak ada
 * navigasi panah yang diharapkan pembaca layar. Saat dibuka fokus pindah ke item pertama; Tab bergerak normal dan
 * menu tertutup bila fokus keluar; Esc menutup dan mengembalikan fokus ke tombol.
 */
function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { pathname } = useLocation();
  const name = user?.name?.trim() || 'Akun saya';

  // Tutup saat pindah halaman
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // Tab/Shift+Tab keluar dari menu → tutup (fokus tidak tertinggal di panel yang tak terlihat lagi)
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  // Keluar menghapus sesi lebih dulu, jadi perubahan CMS yang belum disimpan ditanyakan SEBELUM logout()
  const signOut = () => {
    if (!confirmLeave()) return;
    logout();
  };

  const itemClass =
    'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-fg transition-colors hover:bg-alt';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Menu akun ${name}`}
        className="relative flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-2 ring-1 ring-inset ring-line transition-colors after:absolute after:-inset-1 hover:bg-alt hover:ring-line-strong sm:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white" aria-hidden>
          {initials(name)}
        </span>
        <span className="hidden max-w-[160px] truncate text-[13px] font-medium text-fg sm:block">{name}</span>
        <ChevronDown className={`h-4 w-4 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl bg-surface p-2 shadow-float ring-1 ring-line"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            {user?.email && <p className="truncate text-xs text-subtle">{user.email}</p>}
          </div>
          <ul className="border-t border-line pt-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={itemClass}>
                  <item.icon className="h-4 w-4 text-subtle" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={signOut} className={`${itemClass} text-danger-700 hover:bg-danger-50`}>
                <LogOut className="h-4 w-4" aria-hidden />
                Keluar
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
