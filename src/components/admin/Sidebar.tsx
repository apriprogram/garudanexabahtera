import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { logout } from '../../lib/auth';
import { LogoMark } from '../ui/LogoMark';
import { ADMIN_NAV, getActiveChild, getActiveNavItem, isNavActive, isNavItemActive, type AdminNavItem } from './nav';
import { useAdminNavBadges, type AdminNavBadges } from './useAdminNavBadges';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt';

const itemClass = (active: boolean, collapsed: boolean) =>
  [
    'flex h-10 items-center gap-3 rounded-xl text-sm transition-colors',
    collapsed ? 'justify-center' : 'px-3',
    active ? 'bg-adm-hover font-semibold text-adm-fg' : 'font-medium text-adm-muted hover:bg-adm-hover/70 hover:text-adm-fg',
    focusRing,
  ].join(' ');

/** Angka notifikasi di kanan menu; `corner` = gelembung di pojok ikon saat sidebar diciutkan. */
const NavBadge: React.FC<{ count: number; corner?: boolean }> = ({ count, corner = false }) =>
  count > 0 ? (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none tabular-nums text-white ${
        corner ? 'absolute -right-2 -top-1.5 ring-2 ring-adm-surface' : 'ml-auto shrink-0'
      }`}
    >
      <span aria-hidden>{count > 99 ? '99+' : count}</span>
      {/* Mode pojok: teks pembaca layar ditaruh di label (setelah nama menu), lihat NavGroupItem */}
      {!corner && <span className="sr-only">, {count} perlu ditindaklanjuti</span>}
    </span>
  ) : null;

interface SidebarContentProps {
  collapsed?: boolean;
  badges?: AdminNavBadges;
  onToggle?: () => void;
  onClose?: () => void;
  onNavigate?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ collapsed = false, badges = {}, onToggle, onClose, onNavigate }) => {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isAdmin = currentUser?.role === 'admin';
  const items = ADMIN_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) =>
    item.children ? { ...item, children: item.children.filter((c) => !c.adminOnly || isAdmin) } : item,
  );
  const groups = [...new Set(items.map((item) => item.group))];
  // Satu item aktif saja: yang paling spesifik (/admin/proyek/pengaturan bukan juga /admin/proyek)
  const activePath = getActiveNavItem(location.pathname)?.path;

  // Hapus authToken + currentUser lalu ke /login (lihat src/lib/auth.ts)
  const handleLogout = () => {
    onNavigate?.();
    logout();
  };

  return (
    <div className="flex h-full flex-col rounded-[20px] bg-adm-surface px-3 py-4 ring-1 ring-inset ring-adm-line">
      {/* Logo + ciutkan */}
      <div className={collapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between gap-2 pl-1.5'}>
        <Link to="/admin" onClick={onNavigate} aria-label="Dashboard admin" className={`flex min-w-0 items-center gap-2.5 rounded-xl py-1 ${focusRing}`}>
          {/* Sayap brand tanpa latar, sama dengan navbar website; adm-link = biru brand (terang) / brand-300 (gelap) */}
          <span className="flex h-8 w-9 shrink-0 items-center justify-center">
            <LogoMark className="h-5 text-adm-link" />
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-adm-fg">Garuda Nexa</span>
              <span className="block truncate text-[11px] font-medium text-adm-subtle">Panel Admin</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onClose ?? onToggle}
          aria-label={onClose ? 'Tutup menu' : collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
          aria-expanded={onClose ? undefined : !collapsed}
          title={onClose ? undefined : collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-adm-muted transition-colors hover:bg-adm-hover hover:text-adm-fg ${focusRing}`}
        >
          {onClose ? (
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Navigasi */}
      <nav aria-label="Navigasi admin" className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group} className={gi > 0 ? 'mt-4 border-t border-adm-line pt-4' : ''}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-adm-subtle">{group}</p>
            )}
            <ul className="space-y-0.5">
              {items
                .filter((item) => item.group === group)
                .map((item) =>
                  item.children ? (
                    <NavGroupItem
                      key={item.path}
                      item={item}
                      collapsed={collapsed}
                      badges={badges}
                      onNavigate={onNavigate}
                      pathname={location.pathname}
                    />
                  ) : (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-current={item.path === activePath ? 'page' : undefined}
                        className={itemClass(item.path === activePath, collapsed)}
                      >
                        <item.icon
                          className={`h-[18px] w-[18px] shrink-0 ${item.path === activePath ? 'text-cobalt' : 'text-adm-subtle'}`}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                      </Link>
                    </li>
                  ),
                )}
            </ul>
          </div>
        ))}
      </nav>

      {/* Keluar */}
      <div className="mt-3 border-t border-adm-line pt-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Keluar' : undefined}
          className={`flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium text-adm-danger-fg transition-colors hover:bg-adm-danger-soft ${
            collapsed ? 'justify-center' : 'px-3'
          } ${focusRing}`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
          <span className={collapsed ? 'sr-only' : ''}>Keluar</span>
        </button>
      </div>
    </div>
  );
};

const NavGroupItem: React.FC<{
  item: AdminNavItem;
  collapsed: boolean;
  badges: AdminNavBadges;
  pathname: string;
  onNavigate?: () => void;
}> = ({ item, collapsed, badges, pathname, onNavigate }) => {
  const active = isNavItemActive(pathname, item);
  const [open, setOpen] = useState(active);
  // Bila path induk sama dengan salah satu anak (Pesanan Template = Order Masuk), aria-current cukup di anak
  const pageIsChild = item.children?.some((c) => c.path === item.path) ?? false;
  // Satu anak aktif saja: yang paling spesifik (/admin/proyek/pengaturan bukan juga Dashboard proyek)
  const activeChildPath = getActiveChild(pathname, item)?.path;
  const childCount = (key?: keyof AdminNavBadges) => (key ? badges[key] ?? 0 : 0);
  const total = item.children!.reduce((sum, c) => sum + childCount(c.badge), 0);

  // Buka submenu otomatis saat pindah ke salah satu halamannya (penyesuaian state saat render, tanpa effect)
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpen(true);
  }

  return (
    <li>
      <div className="flex items-center gap-1">
        <Link
          to={item.path}
          onClick={onNavigate}
          title={collapsed ? (total > 0 ? `${item.label} (${total})` : item.label) : undefined}
          aria-current={!pageIsChild && isNavActive(pathname, { path: item.path, end: true }) ? 'page' : undefined}
          className={`${itemClass(active, collapsed)} min-w-0 flex-1`}
        >
          <span className="relative flex shrink-0">
            <item.icon className={`h-[18px] w-[18px] ${active ? 'text-cobalt' : 'text-adm-subtle'}`} strokeWidth={1.75} aria-hidden />
            {collapsed && <NavBadge count={total} corner />}
          </span>
          <span className={collapsed ? 'sr-only' : 'truncate'}>
            {item.label}
            {collapsed && total > 0 && `, ${total} perlu ditindaklanjuti`}
          </span>
          {/* Submenu terbuka: angka tampil per anak, jadi induk tidak mengulangnya */}
          {!collapsed && !open && <NavBadge count={total} />}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Tutup submenu ${item.label}` : `Buka submenu ${item.label}`}
            aria-expanded={open}
            className={`flex h-10 w-8 shrink-0 items-center justify-center rounded-xl text-adm-subtle transition-colors hover:bg-adm-hover hover:text-adm-fg ${focusRing}`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && !collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="ml-[21px] overflow-hidden border-l border-adm-line pl-3"
          >
            {item.children!.map((child) => {
              const isActive = child.path === activeChildPath;
              return (
                <li key={child.path} className="pt-0.5">
                  <Link
                    to={child.path}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors ${focusRing} ${
                      isActive ? 'bg-adm-hover font-semibold text-adm-fg' : 'font-medium text-adm-muted hover:bg-adm-hover/70 hover:text-adm-fg'
                    }`}
                  >
                    <child.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cobalt' : 'text-adm-subtle'}`} strokeWidth={1.75} aria-hidden />
                    <span className="truncate">{child.label}</span>
                    <NavBadge count={childCount(child.badge)} />
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

/**
 * Sidebar admin gaya "kanvas dalam kanvas": kartu putih rounded terpisah, bisa diciutkan jadi rail ikon
 * (tersimpan di localStorage). Di layar < lg menjadi drawer.
 */
const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, toggleMobileSidebar } = useStore();
  const location = useLocation();
  // Dimuat sekali di sini, dipakai sidebar desktop dan drawer HP
  const badges = useAdminNavBadges();
  const close = () => toggleMobileSidebar(false);

  useEffect(() => {
    toggleMobileSidebar(false);
  }, [location.pathname, toggleMobileSidebar]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && toggleMobileSidebar(false);
    const onResize = () => window.innerWidth >= 1024 && toggleMobileSidebar(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prev;
    };
  }, [isMobileSidebarOpen, toggleMobileSidebar]);

  return (
    <>
      <aside
        className={`sticky top-2 z-30 hidden h-[calc(100vh-16px)] shrink-0 transition-[width] duration-200 ease-out lg:block ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <SidebarContent collapsed={isSidebarCollapsed} badges={badges} onToggle={toggleSidebar} />
      </aside>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-obsidian/30"
              onClick={close}
              aria-hidden
            />
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu admin"
              className="absolute bottom-[max(8px,env(safe-area-inset-bottom))] left-[max(8px,env(safe-area-inset-left))] top-[max(8px,env(safe-area-inset-top))] w-[272px] max-w-[85vw] rounded-[20px] shadow-float"
            >
              <SidebarContent badges={badges} onClose={close} onNavigate={close} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
