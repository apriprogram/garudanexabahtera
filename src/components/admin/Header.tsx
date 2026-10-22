import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronRight, Eye, HelpCircle, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { logout } from '../../lib/auth';
import { getAdminCrumbs } from './nav';
import { NotificationBell } from '../../features/project-docs/notifications/NotificationBell';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt';
const iconBtn = `relative flex h-10 w-10 items-center justify-center rounded-xl text-adm-muted transition-colors hover:bg-adm-hover hover:text-adm-fg max-sm:h-9 max-sm:w-9 max-sm:after:absolute max-sm:after:-inset-1 ${focusRing}`;
const menuItem = `flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${focusRing}`;

const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/** Label peran `users.role` (SPEC §2), sama dengan halaman Pengguna. */
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', user: 'Staf', customer: 'Pembeli' };

/** Baris dari action get_users; currentUser di localStorage berbentuk sama. */
interface AdminUser {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  avatar?: string;
}

const readStoredUser = (): AdminUser | null => {
  const storedUser = localStorage.getItem('currentUser');
  return storedUser ? JSON.parse(storedUser) : null;
};

/** Topbar tipis panel admin: breadcrumb kiri, tanggal + aksi + menu profil kanan. */
const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileSidebar, isMobileSidebarOpen, theme, toggleTheme } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(readStoredUser);
  const menuRef = useRef<HTMLDivElement>(null);
  const { parent, label } = getAdminCrumbs(location.pathname);

  useEffect(() => {
    const userObj = readStoredUser();
    if (userObj) {
      // Ambil data user terbaru dari DB agar avatar/nama ikut berubah
      fetch('/api.php?action=get_users')
        .then(res => {
          if (!res.ok) throw new Error('API not available');
          return res.json();
        })
        .then(users => {
          if (Array.isArray(users)) {
            const freshData = users.find((u: AdminUser) => u.id == userObj.id);
            if (freshData) {
              setCurrentUser(freshData);
              localStorage.setItem('currentUser', JSON.stringify(freshData));
            }
          }
        })
        .catch(err => console.error("Header sync error:", err));
    }
  }, []);

  // Tutup menu profil setiap pindah halaman
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setIsMenuOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  // Hapus authToken + currentUser lalu ke /login (lihat src/lib/auth.ts)
  const handleLogout = () => logout();

  const name = currentUser?.name || 'Admin User';
  const role = currentUser?.role || 'admin';
  const roleLabel = ROLE_LABEL[role] ?? role.charAt(0).toUpperCase() + role.slice(1);

  const avatar = (size: string) => (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cobalt text-[13px] font-semibold text-white ${size}`}>
      {currentUser?.avatar ? (
        <img src={currentUser.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-adm-line bg-adm-surface/95 px-3 backdrop-blur-xl sm:px-6 lg:top-2 lg:rounded-t-[20px]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => toggleMobileSidebar(true)}
          aria-label="Buka menu"
          aria-expanded={isMobileSidebarOpen}
          className={`${iconBtn} lg:hidden`}
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0 text-[13px]">
          <ol className="flex min-w-0 items-center gap-1.5">
            <li className="hidden text-adm-muted sm:block">
              <Link to="/admin" className={`rounded-md hover:text-adm-fg ${focusRing}`}>Admin</Link>
            </li>
            <li className="hidden text-adm-subtle sm:block" aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            {parent && (
              <>
                <li className="hidden truncate text-adm-muted sm:block">
                  <Link to={parent.path} className={`rounded-md hover:text-adm-fg ${focusRing}`}>{parent.label}</Link>
                </li>
                <li className="hidden text-adm-subtle sm:block" aria-hidden>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              </>
            )}
            <li className="truncate font-medium text-adm-fg" aria-current="page">{label}</li>
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 text-[13px] text-adm-muted xl:inline-flex">
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {today}
        </span>
        <span className="hidden h-4 w-px bg-adm-line xl:block" aria-hidden />

        <div className="flex items-center gap-1">
          <a href="/" target="_blank" rel="noopener noreferrer" aria-label="Lihat website" title="Lihat website" className={`${iconBtn} max-sm:hidden`}>
            <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
            title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
            className={iconBtn}
          >
            {theme === 'light' ? <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          </button>
          {/* Notifikasi dokumen proyek (persetujuan, jatuh tempo): src/features/project-docs/notifications */}
          <NotificationBell variant="admin" />

          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setIsMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Menu profil"
              className={`flex h-10 items-center gap-2 rounded-full p-1 ring-1 ring-inset ring-adm-line transition-colors hover:bg-adm-hover max-sm:h-9 sm:pr-3 ${focusRing}`}
            >
              {avatar('h-8 w-8 max-sm:h-7 max-sm:w-7')}
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[150px] truncate text-[13px] font-semibold leading-tight text-adm-fg">{name}</span>
                <span className="block text-[11px] leading-tight text-adm-subtle">{roleLabel}</span>
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-adm-subtle transition-transform sm:block ${isMenuOpen ? 'rotate-180' : ''}`} strokeWidth={1.75} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  role="menu"
                  className="profile-dropdown absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-adm-surface p-2 shadow-float ring-1 ring-inset ring-adm-line"
                >
                  <div className="mb-1 flex items-center gap-3 rounded-xl bg-adm-hover px-3 py-2.5">
                    {avatar('h-9 w-9')}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-adm-fg">{name}</p>
                      <p className="truncate text-xs text-adm-subtle">{currentUser?.email || 'admin@garudanexa.com'}</p>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { navigate('/admin/profile'); setIsMenuOpen(false); }} className={`${menuItem} text-adm-fg hover:bg-adm-hover`}>
                    <User className="h-[18px] w-[18px] text-adm-subtle" strokeWidth={1.75} /> Edit profil
                  </button>
                  <button type="button" role="menuitem" onClick={() => { navigate('/admin/help'); setIsMenuOpen(false); }} className={`${menuItem} text-adm-fg hover:bg-adm-hover`}>
                    <HelpCircle className="h-[18px] w-[18px] text-adm-subtle" strokeWidth={1.75} /> Catatan perubahan
                  </button>
                  <a href="/" target="_blank" rel="noopener noreferrer" role="menuitem" className={`${menuItem} text-adm-fg hover:bg-adm-hover sm:hidden`}>
                    <Eye className="h-[18px] w-[18px] text-adm-subtle" strokeWidth={1.75} /> Lihat website
                  </a>
                  <div className="my-1 h-px bg-adm-line" />
                  <button type="button" role="menuitem" onClick={handleLogout} className={`${menuItem} text-adm-danger-fg hover:bg-adm-danger-soft`}>
                    <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} /> Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
