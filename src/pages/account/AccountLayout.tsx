// Kerangka panel akun pembeli (/akun/*), gaya panel admin (permintaan pemilik 2026-10-26): kanvas abu + gutter 8px,
// sidebar putih rounded (grup Utama · Layanan · Akun · Lainnya, bisa diciutkan jadi rail ikon, drawer di < lg) dan panel
// konten putih dengan topbar: breadcrumb kiri; tanggal, lonceng notifikasi, menu profil (avatar + nama + peran) kanan.
// Penjaga akses (SPEC §2): tanpa sesi → /masuk?next=..., staf (admin/user) → /admin.
// <Outlet /> tidak diberi lebar/padding: tiap halaman mengatur sendiri. Topbar sticky setinggi 4rem (+ safe-area) di HP
// dan 3.5rem di lg dengan offset 8px, jadi elemen sticky di halaman anak tetap memakai top-16 / 4rem atau lebih.
// Tema terang/gelap (tombol bulan/matahari di topbar): useAccountTheme, token warna gelap di src/index.css.
// "Lewati ke konten" (SkipLink) = elemen fokus pertama, menuju <main id="konten-akun">.
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronRight, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserRound, X } from 'lucide-react';
import { LogoMark } from '../../components/ui/LogoMark';
import { SkipLink } from '../../components/ui/SkipLink';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { NotificationBell } from '../../features/project-docs/notifications/NotificationBell';
import { customerLoginPath, getRole, logout } from '../../lib/auth';
import { confirmLeave } from './cms/useLeaveGuard';
import { ACCOUNT_NAV, ACCOUNT_NAV_GROUPS, accountCrumbs } from './components/accountNav';
import { accountHelpMessage, helpWhatsappUrl } from './components/orderCopy';
import { profileInitials, refreshProfile, safeAvatarUrl, useProfile } from './components/profileStore';
import { useAccountTheme, type AccountTheme } from './components/useAccountTheme';

const COLLAPSE_KEY = 'accountSidebarCollapsed';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

// Keluar menghapus sesi lebih dulu, jadi perubahan CMS yang belum disimpan ditanyakan SEBELUM logout()
const signOut = async () => {
  if (!(await confirmLeave())) return;
  logout();
};

export default function AccountLayout() {
  const location = useLocation();
  const role = getRole();
  const customer = role === 'customer';
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useAccountTheme();

  // Sekali per kunjungan akun (layout tetap terpasang selama berpindah di /akun/*); gagal = tetap data sesi login
  useEffect(() => {
    if (customer) refreshProfile();
  }, [customer]);

  // Drawer tertutup saat pindah halaman
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawerOpen(false);
  }

  if (!role) {
    return <Navigate to={customerLoginPath(`${location.pathname}${location.search}`)} replace />;
  }
  if (!customer) return <Navigate to="/admin" replace />;

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        // penyimpanan tidak tersedia: hanya untuk sesi ini
      }
      return !value;
    });

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <div className="min-h-dvh bg-alt text-fg lg:flex lg:gap-2 lg:p-2">
      <SkipLink target="konten-akun" />

      <aside
        className={`sticky top-2 z-30 hidden h-[calc(100dvh-16px)] shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-surface lg:min-h-[calc(100dvh-16px)] lg:rounded-[20px] lg:ring-1 lg:ring-inset lg:ring-line">
        <AccountTopbar
          menuButtonRef={menuButtonRef}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main id="konten-akun" tabIndex={-1} className="flex-1 focus:outline-none">
          <Outlet />
        </main>
        <AccountFooter />
      </div>
    </div>
  );
}

/* ─────────────────────────── Sidebar ─────────────────────────── */

function SidebarContent({
  collapsed = false,
  onToggle,
  onClose,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  /** Drawer HP: tombol tutup menggantikan tombol ciutkan */
  onClose?: () => void;
}) {
  const { pathname } = useLocation();
  const itemClass = (active: boolean) =>
    `flex h-10 items-center gap-3 rounded-xl text-sm transition-colors ${collapsed ? 'justify-center' : 'px-3'} ${
      active ? 'bg-alt font-semibold text-fg' : 'font-medium text-muted hover:bg-alt/70 hover:text-fg'
    } ${focusRing}`;

  return (
    <div className="flex h-full flex-col rounded-[20px] bg-surface px-3 py-4 ring-1 ring-inset ring-line">
      {/* Logo + ciutkan / tutup */}
      <div className={collapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between gap-2 pl-1.5'}>
        <Link to="/akun" aria-label="Beranda akun, Garuda Nexa" className={`flex min-w-0 items-center gap-2.5 rounded-xl py-1 ${focusRing}`}>
          <span className="flex h-8 w-9 shrink-0 items-center justify-center">
            <LogoMark className="h-5 text-primary" />
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-fg">Garuda Nexa</span>
              <span className="block truncate text-[11px] font-medium text-subtle">Akun pembeli</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onClose ?? onToggle}
          aria-label={onClose ? 'Tutup menu' : collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
          aria-expanded={onClose ? undefined : !collapsed}
          title={onClose ? undefined : collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted transition-colors after:absolute after:-inset-1.5 hover:bg-alt hover:text-fg ${focusRing}`}
        >
          {onClose ? (
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          ) : collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>

      <nav aria-label="Menu akun" className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto">
        {ACCOUNT_NAV_GROUPS.map((group, gi) => (
          <div key={group} className={gi > 0 ? 'mt-4 border-t border-line pt-4' : ''}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{group}</p>}
            <ul className="space-y-0.5">
              {ACCOUNT_NAV.filter((item) => item.group === group).map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={itemClass(active)}
                    >
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-primary' : 'text-subtle'}`}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? 'Keluar' : undefined}
          className={`flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50 ${
            collapsed ? 'justify-center' : 'px-3'
          } ${focusRing}`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
          <span className={collapsed ? 'sr-only' : ''}>Keluar</span>
        </button>
      </div>
    </div>
  );
}

/** Sidebar sebagai drawer di < lg: Esc / ketuk latar menutup, gulir halaman dikunci, fokus ke tombol tutup. */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) onClose();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="absolute inset-0 bg-obsidian/30"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            initial={{ x: reduceMotion ? 0 : -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : -24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu akun"
            className="absolute bottom-[max(8px,env(safe-area-inset-bottom))] left-[max(8px,env(safe-area-inset-left))] top-[max(8px,env(safe-area-inset-top))] w-[272px] max-w-[85vw] rounded-[20px] shadow-float"
          >
            <SidebarContent onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── Topbar ─────────────────────────── */

const todayLabel = () =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

function AccountTopbar({
  menuButtonRef,
  drawerOpen,
  onOpenDrawer,
  theme,
  onToggleTheme,
}: {
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  theme: AccountTheme;
  onToggleTheme: () => void;
}) {
  const { pathname, search } = useLocation();
  const crumbs = accountCrumbs(pathname, search);
  const [today] = useState(todayLabel);

  return (
    // Pembungkus menempel di atas (layar lg: ikut menutup gutter 8px & sudut lengkung dengan warna kanvas), jadi konten
    // yang digulir tidak pernah tampak di atas atau di sudut topbar. Topbar sendiri padat (tanpa transparansi/blur) dan
    // di layar lg membawa garis tepi panel konten (ring) karena tepi panel di belakangnya tertutup pembungkus.
    <div className="sticky top-0 z-20 shrink-0 lg:-mt-2 lg:bg-alt lg:pt-2">
      <header className="flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-3 border-b border-line bg-surface px-3 pt-[env(safe-area-inset-top)] sm:px-6 lg:h-14 lg:rounded-t-[20px] lg:border-b-0 lg:pt-0 lg:ring-1 lg:ring-inset lg:ring-line">
        <div className="flex min-w-0 items-center gap-2">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onOpenDrawer}
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-alt hover:text-fg lg:hidden ${focusRing}`}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0 text-[13px]">
            <ol className="flex min-w-0 items-center gap-1.5">
              <li className="hidden shrink-0 text-muted sm:block">
                <Link to="/akun" className={`rounded-md hover:text-fg ${focusRing}`}>
                  Akun
                </Link>
              </li>
              {crumbs.map((crumb, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${i}`} className={`min-w-0 items-center gap-1.5 ${last ? 'flex' : 'hidden sm:flex'}`}>
                    <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-subtle sm:block" aria-hidden />
                    {last || !crumb.to ? (
                      <span className={`truncate ${last ? 'font-medium text-fg' : 'text-muted'}`} aria-current={last ? 'page' : undefined}>
                        {crumb.label}
                      </span>
                    ) : (
                      <Link to={crumb.to} className={`truncate rounded-md text-muted hover:text-fg ${focusRing}`}>
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[13px] text-muted xl:inline-flex">
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {today}
          </span>
          <span className="hidden h-4 w-px bg-line xl:block" aria-hidden />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg max-sm:h-9 max-sm:w-9 ${focusRing}`}
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            )}
          </button>
          <NotificationBell variant="account" />
          <UserMenu />
        </div>
      </header>
    </div>
  );
}

/**
 * Lingkaran foto profil (img object-cover); tanpa foto, atau foto gagal dimuat, = inisial nama. Dekoratif (aria-hidden):
 * nama selalu tertulis di dekatnya. `src` dari server harus lolos safeAvatarUrl(); pratinjau unggahan di /akun/profil
 * berupa data URI buatan canvas halaman itu sendiri.
 */
export function UserAvatar({ name, src, className = 'h-8 w-8 text-xs' }: { name: string; src: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white ${className}`}
      aria-hidden
    >
      {src && src !== failedSrc ? (
        <img src={src} alt="" draggable={false} className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        profileInitials(name)
      )}
    </span>
  );
}

/**
 * Menu profil (avatar + nama + peran) = disclosure biasa (tombol aria-expanded + daftar tautan/tombol), bukan
 * role="menu": tidak ada navigasi panah yang diharapkan pembaca layar. Saat dibuka fokus pindah ke item pertama; Tab
 * bergerak normal dan menu tertutup bila fokus keluar; Esc menutup dan mengembalikan fokus ke tombol.
 */
function UserMenu() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { pathname } = useLocation();
  const name = profile?.name?.trim() || 'Akun saya';
  const avatar = safeAvatarUrl(profile?.avatar);

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

  const itemClass = `flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${focusRing}`;

  return (
    <div ref={rootRef} className="relative ml-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Menu akun ${name}`}
        className={`relative flex h-10 items-center gap-2 rounded-full p-1 ring-1 ring-inset ring-line transition-colors after:absolute after:-inset-1 hover:bg-alt max-sm:h-9 sm:pr-3 ${focusRing}`}
      >
        <UserAvatar name={name} src={avatar} className="h-8 w-8 text-xs max-sm:h-7 max-sm:w-7" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[150px] truncate text-[13px] font-semibold leading-tight text-fg">{name}</span>
          <span className="block text-[11px] leading-tight text-subtle">Pembeli</span>
        </span>
        <ChevronDown className={`hidden h-4 w-4 text-subtle transition-transform sm:block ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl bg-surface p-2 shadow-float ring-1 ring-inset ring-line"
        >
          <div className="mb-1 flex items-center gap-3 rounded-xl bg-alt px-3 py-2.5">
            <UserAvatar name={name} src={avatar} className="h-9 w-9 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-fg">{name}</p>
              {profile?.email && <p className="truncate text-xs text-subtle">{profile.email}</p>}
            </div>
          </div>
          <ul>
            <li>
              <Link to="/akun/profil" className={`${itemClass} text-fg hover:bg-alt`}>
                <UserRound className="h-[18px] w-[18px] text-subtle" strokeWidth={1.75} aria-hidden />
                Profil
              </Link>
            </li>
            <li className="my-1 h-px bg-line" aria-hidden />
            <li>
              <button type="button" onClick={signOut} className={`${itemClass} text-danger-700 hover:bg-danger-50`}>
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                Keluar
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */

/** Footer panel: "Hubungi kami" membuka WhatsApp (pesan awal menyebut nomor pesanan yang sedang dibuka). */
function AccountFooter() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  return (
    <footer className="border-t border-line">
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
