import React, { useEffect, useRef, useState } from 'react';
import {
  Menu, X, ChevronDown, Globe, Globe2, ArrowRight, UserRound,
  ShoppingCart, GraduationCap, Users2, ShieldCheck, HeartHandshake, Moon,
  Briefcase, MessageSquare, Info, BookOpen, Layout, Link as LinkIcon, Smartphone, Monitor, Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Presence } from '../ui/Presence';
import { getHiddenSections, useSiteSettings } from '../../hooks/useSiteSettings';
import { useNavbarMenus, type NavbarMenuRow } from '../../hooks/useNavbarMenus';
import { useSectionSpy } from '../../hooks/useSectionSpy';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { accountLinkFor, useSessionRole } from '../../hooks/useSessionRole';
import { BrandLogo } from '../ui/LogoMark';
import { HUB_PATHS } from '../../seo/paths';
import { useHeroNavState } from '../sections/hero/heroNavState';
import { SkipLink } from '../ui/SkipLink';
import { SmartLink } from './SmartLink';

interface MenuEntry {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}

/** Item menu utama: tautan biasa, atau dropdown bila punya submenu */
interface NavItem {
  key: string;
  label: string;
  href: string;
  children: MenuEntry[];
}

// Nama ikon dari admin "Navbar Manager" (teks bebas) → komponen; nama lain memakai Globe2
const ICONS: Record<string, LucideIcon> = {
  Globe, Globe2, Layout, Info, Link: LinkIcon, MessageSquare, Briefcase, Users2, ShieldCheck,
  GraduationCap, ShoppingCart, Smartphone, Monitor, Zap, Moon, HeartHandshake, BookOpen,
};

// Anchor section lama → section baru (menu lama di database tetap mengarah ke tempat yang benar)
const ANCHOR_ALIAS: Record<string, string> = { '#products': '#templates', '#portfolio': '#projects' };
// Section yang sudah dihapus dari beranda: tautannya disembunyikan
const REMOVED_SECTIONS = new Set(['pricing']);

const normalizeHref = (raw: string | null | undefined): string => {
  const href = (raw || '').trim() || '#';
  const hash = href.startsWith('/#') ? href.slice(1) : href;
  return ANCHOR_ALIAS[hash.toLowerCase()] ?? hash;
};

const bySortOrder = (a: NavbarMenuRow, b: NavbarMenuRow) => a.sort_order - b.sort_order || a.id - b.id;

/** Baris datar navbar_menus → menu utama + submenu (1 level). Website hanya berbahasa Indonesia: label_id. */
const toNavItems = (rows: NavbarMenuRow[]): NavItem[] => {
  const label = (row: NavbarMenuRow) => row.label_id;
  return rows
    .filter((row) => row.parent_id === null)
    .sort(bySortOrder)
    .map((parent) => ({
      key: `menu-${parent.id}`,
      label: label(parent),
      href: normalizeHref(parent.url),
      children: rows
        .filter((row) => row.parent_id === parent.id)
        .sort(bySortOrder)
        .map((child) => {
          const Icon = ICONS[child.icon] ?? Globe2;
          return {
            icon: <Icon />,
            title: label(child),
            desc: child.description_id || '',
            href: normalizeHref(child.url),
          };
        }),
    }));
};

/** id section dari href `#templates` (null untuk tautan lain). */
const anchorId = (href: string) => (href.startsWith('#') && href.length > 1 ? href.slice(1) : null);

/** Tautan halaman (`/template`) yang sedang dibuka: path sama, atau halaman di bawahnya (`/template/aura-studio`). */
const isCurrentPage = (href: string, pathname: string) => {
  if (!href.startsWith('/') || href.startsWith('/#')) return false;
  const path = href.split(/[?#]/, 1)[0].replace(/(.)\/+$/, '$1');
  return path !== '/' && (pathname === path || pathname.startsWith(`${path}/`));
};

/**
 * Menu bawaan (dipakai bila Navbar Manager kosong; struktur yang sama dipasang migrasi
 * database/migrations/2026-10-23_011_seo_navbar.sql): halaman nyata dengan <a href>, bukan anchor beranda
 * (docs/platform/SEO-PLAN.md §5.5 langkah 5). Anchor `#…` hanya navigasi sekunder di beranda.
 */
const DEFAULT_ITEMS: NavItem[] = [
  { key: 'template', label: 'Template', href: HUB_PATHS.catalog, children: [] },
  {
    key: 'jasa',
    label: 'Jasa',
    href: HUB_PATHS.webService,
    children: [
      {
        icon: <Monitor />,
        title: 'Website custom',
        desc: 'Company profile, sekolah, instansi, dan sistem web',
        href: HUB_PATHS.webService,
      },
      {
        icon: <Smartphone />,
        title: 'Aplikasi mobile',
        desc: 'Aplikasi Android & iOS sesuai alur bisnis',
        href: HUB_PATHS.mobileService,
      },
    ],
  },
  { key: 'harga', label: 'Harga', href: HUB_PATHS.pricing, children: [] },
  { key: 'panduan', label: 'Panduan', href: HUB_PATHS.guides, children: [] },
];

interface Pill {
  left: number;
  width: number;
  visible: boolean;
}

/**
 * Warna isi bar: bawaan (di atas halaman terang / putih kaca) atau terang (transparan di atas strip gambar/video gelap
 * di puncak beranda; nada dari Hero, lihat heroNavState). Tombol CTA biru tetap sama (permukaannya sendiri).
 */
const NAV_LOOKS = {
  default: {
    link: 'text-muted hover:text-fg',
    linkCurrent: 'text-fg',
    pill: 'bg-fg/[0.06]',
    dot: 'bg-primary',
    account: 'text-muted hover:bg-fg/[0.06] hover:text-fg',
    accountIcon: 'text-primary',
    toggle: 'text-fg hover:bg-fg/[0.06]',
    brand: 'default',
  },
  // Putih penuh (bukan on-media-muted): kontras sebesar mungkin di atas gambar; hover = sorotan pill, aktif = titik putih
  light: {
    link: 'text-on-media',
    linkCurrent: 'text-on-media',
    pill: 'bg-on-media/15',
    dot: 'bg-on-media',
    account: 'text-on-media hover:bg-on-media/15',
    accountIcon: 'text-on-media',
    toggle: 'text-on-media hover:bg-on-media/15',
    brand: 'onMedia',
  },
} as const;

type NavLook = (typeof NAV_LOOKS)[keyof typeof NAV_LOOKS];

/**
 * Navbar publik gaya BELAJAR CPNS: transparan di puncak halaman, jadi putih kaca (teks gelap) saat digulir, tanpa
 * garis bawah maupun shadow di semua state. Di puncak beranda berlatar gambar/video: tetap transparan, teks (logo,
 * menu, akun, tombol menu) PUTIH bila strip latar di belakang navbar gelap atau gelap bila terang (diukur Hero,
 * heroNavState); selama belum terukur / tidak terukur / tidak ada nada yang terbaca: putih kaca seperti saat digulir. Menu di tengah dengan sorotan pill yang meluncur mengikuti
 * hover, titik biru menandai halaman yang sedang dibuka (aria-current="page", juga di dalam menu Jasa) atau section aktif
 * di beranda. Menu = tautan halaman nyata (DEFAULT_ITEMS / Navbar Manager), terbaca crawler di HTML prerender. Tinggi = `--nav-h` (56px HP / 64px ≥ 1024px, di index.css): halaman lain memberi `pt-nav`
 * pada konten pertamanya.
 */
const Navbar: React.FC = () => {
  const { t } = useTranslation();
  // Berlangganan perubahan rute: navbar dirender ulang saat pindah halaman (tombol akun ikut diperbarui)
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  const { menus, loaded: menusLoaded } = useNavbarMenus();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, visible: false });
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Dibaca ulang tiap render (mis. setelah pindah halaman) dan saat login/logout di tab lain
  const role = useSessionRole();
  const closeMenu = () => setIsMenuOpen(false);
  // Menu HP terbuka: Tab berputar di header (logo, CTA, tombol menu, isi menu); Escape menutup & fokus kembali ke tombol menu
  const headerRef = useFocusTrap<HTMLElement>(isMenuOpen, {
    initialFocus: 'none',
    returnFocusRef: toggleRef,
    onEscape: closeMenu,
  });

  // Latar mengikuti posisi gulir (rAF agar ringan)
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Menu dari admin (Navbar Manager); bila kosong/gagal dimuat, pakai menu bawaan
  const source = !menusLoaded ? [] : menus.length > 0 ? toNavItems(menus) : DEFAULT_ITEMS;

  // Tautan ke section yang disembunyikan admin (setting disabled_sections) atau sudah dihapus ikut disembunyikan
  const hidden = getHiddenSections(settings);
  const visible = (href: string) => {
    if (!href.startsWith('#')) return true;
    const id = href.slice(1).toLowerCase();
    return !REMOVED_SECTIONS.has(id) && !hidden.has(id);
  };
  const navItems = source
    .map((item) => ({ ...item, children: item.children.filter((entry) => visible(entry.href)) }))
    .filter((item) => item.children.length > 0 || visible(item.href));

  // Scroll-spy hanya di beranda: titik biru di bawah menu section yang sedang dibaca
  const onHome = pathname === '/';
  // Puncak beranda di atas gambar/video: transparan dengan nada strip latar (putih di atas latar gelap); belum / tidak
  // terukur → putih kaca. Digulir atau menu HP terbuka → putih kaca / putih dengan teks gelap seperti biasa
  const heroNav = useHeroNavState();
  const overMedia = onHome && heroNav.media;
  const mediaTone = overMedia && !scrolled && !isMenuOpen ? heroNav.tone : null;
  const glass = scrolled || (overMedia && heroNav.tone === null);
  const look: NavLook = mediaTone === 'light' ? NAV_LOOKS.light : NAV_LOOKS.default;
  const spyIds = navItems.map((item) => anchorId(item.href)).filter((id): id is string => Boolean(id));
  const { activeId } = useSectionSpy(spyIds, { enabled: onHome });

  // Menu ringkas (≤ 5 item) sudah muat di layar 1024px; menu panjang baru tampil penuh di ≥ 1280px
  const compact = navItems.length <= 5;
  const desktopNav = compact ? 'lg:flex' : 'xl:flex';
  const mobileOnly = compact ? 'lg:hidden' : 'xl:hidden';

  // Menu HP terbuka: halaman di belakang tidak ikut tergulir; menu tertutup sendiri saat layar melebar ke menu desktop
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onResize = () => window.innerWidth >= (compact ? 1024 : 1280) && setIsMenuOpen(false);
    window.addEventListener('resize', onResize);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen, compact]);

  const account = accountLinkFor(role);

  // Sorotan hover meluncur: diukur dari <li> saat hover/fokus (tanpa efek tata letak)
  const showPill = (el: HTMLElement | null) => {
    const li = el?.closest('li');
    if (li) setPill({ left: li.offsetLeft, width: li.offsetWidth, visible: true });
  };
  const hidePill = () => setPill((p) => ({ ...p, visible: false }));

  return (
    <header
      ref={headerRef}
      // Safe-area atas untuk mode standalone/PWA (di browser biasa nilainya 0); kiri-kanan diurus container-site.
      // Tinggi total header = --nav-offset (bar --nav-h + safe-area), tanpa garis bawah / shadow di state mana pun.
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300 ${
        isMenuOpen ? 'bg-canvas' : glass ? 'bg-canvas/85 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
      }`}
      // Teks terang di atas media: cincin fokus putih (index.css), kecuali di panel dropdown putih (data-nav-surface)
      data-nav-tone={mediaTone === 'light' ? 'light' : undefined}
    >
      {/* Tautan pertama di urutan Tab: lompat ke <main> (id="konten" di beranda, <main> pertama di halaman lain) */}
      <SkipLink />

      <nav aria-label="Navigasi utama" className="container-site flex h-(--nav-h) items-center gap-3">
        {/* Kiri: logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="flex min-w-0 shrink items-center rounded-full"
          aria-label="Garuda Nexa Bahtera, ke beranda"
        >
          <BrandLogo size="sm" fullFrom="xl" tone={look.brand} />
        </Link>

        {/* Tengah: navigasi desktop + sorotan hover */}
        <ul className={`relative hidden flex-1 items-center justify-center gap-1 ${desktopNav}`} onMouseLeave={hidePill}>
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 h-9 -translate-y-1/2 rounded-full transition-[left,width,opacity] duration-300 ease-calm ${look.pill}`}
            style={{ left: pill.left, width: pill.width, opacity: pill.visible ? 1 : 0 }}
          />
          {navItems.map((item) => {
            const id = anchorId(item.href);
            const page = isCurrentPage(item.href, pathname);
            const current = (Boolean(id) && id === activeId) || page;
            return item.children.length > 0 ? (
              <DropdownItem
                key={item.key}
                id={item.key}
                label={item.label}
                entries={item.children}
                wide={item.children.length > 4}
                current={item.children.some((entry) => isCurrentPage(entry.href, pathname))}
                pathname={pathname}
                look={look}
                active={activeDropdown}
                setActive={setActiveDropdown}
                onHover={showPill}
                onLeave={hidePill}
              />
            ) : (
              <li key={item.key} className="relative">
                <SmartLink
                  href={item.href}
                  onMouseEnter={(e) => showPill(e.currentTarget)}
                  onFocus={(e) => showPill(e.currentTarget)}
                  onBlur={hidePill}
                  aria-current={page ? 'page' : current ? 'location' : undefined}
                  className={`relative z-10 inline-flex h-9 items-center rounded-full px-3.5 text-[14px] font-medium transition-colors duration-200 ${
                    current ? look.linkCurrent : look.link
                  }`}
                >
                  {item.label}
                </SmartLink>
                {/* Titik penanda section aktif */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-all duration-300 ${look.dot} ${
                    current ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
                />
              </li>
            );
          })}
        </ul>

        {/* Kanan: akun, CTA, tombol menu HP */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to={account.to}
            className={`hidden h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors sm:inline-flex ${look.account}`}
          >
            {role && <UserRound className={`h-4 w-4 ${look.accountIcon}`} strokeWidth={2} aria-hidden />}
            {account.label}
          </Link>

          <SmartLink href="#kontak" className="btn btn-primary btn-sm sm:h-10 sm:px-5 sm:text-sm">
            <span className="sm:hidden">{t('nav-consult-short')}</span>
            <span className="max-sm:hidden">{t('nav-consult')}</span>
          </SmartLink>

          <button
            ref={toggleRef}
            type="button"
            className={`relative -mr-1.5 flex h-9 w-9 items-center justify-center rounded-full transition-colors after:absolute after:-inset-1 sm:mr-0 ${look.toggle} ${mobileOnly}`}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isMenuOpen}
            aria-controls="menu-hp"
          >
            {isMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Latar redup datar (tanpa blur) di bawah menu HP: ketuk untuk menutup. -z-10 = di bawah isi header & menu */}
      {isMenuOpen && (
        <div
          aria-hidden
          onClick={closeMenu}
          className={`absolute inset-x-0 top-full -z-10 h-[100lvh] animate-fade-in bg-fg/20 motion-reduce:animate-none ${mobileOnly}`}
        />
      )}

      {/* Menu HP: lapisan di bawah navbar (tidak menggeser tata letak), membuka dengan animasi tinggi */}
      <nav
        id="menu-hp"
        aria-label="Menu"
        inert={!isMenuOpen}
        className={`absolute inset-x-0 top-full grid transition-[grid-template-rows] duration-300 ease-out ${mobileOnly} ${
          isMenuOpen ? 'grid-rows-[1fr] border-b border-line bg-canvas' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <ul className="container-site max-h-[calc(100svh-var(--nav-offset))] space-y-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
            {navItems.map((item, index) => {
              const id = anchorId(item.href);
              const page = isCurrentPage(item.href, pathname);
              const current = (Boolean(id) && id === activeId) || page;
              return (
                <li
                  key={item.key}
                  className={`transition-all duration-300 ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
                  style={{ transitionDelay: isMenuOpen ? `${index * 40}ms` : '0ms' }}
                >
                  {item.children.length > 0 ? (
                    <MobileGroup
                      id={item.key}
                      label={item.label}
                      entries={item.children}
                      pathname={pathname}
                      open={mobileSubmenu}
                      setOpen={setMobileSubmenu}
                      onNavigate={closeMenu}
                    />
                  ) : (
                    <SmartLink
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={page ? 'page' : current ? 'location' : undefined}
                      className={`flex min-h-11 items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-alt ${current ? 'bg-alt' : ''}`}
                    >
                      {item.label}
                      <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
                    </SmartLink>
                  )}
                </li>
              );
            })}
            <li className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:hidden">
              <Link to={account.to} onClick={closeMenu} className="btn btn-outline">
                {role && <UserRound className="h-4 w-4 text-primary" aria-hidden />}
                {account.label}
              </Link>
              <SmartLink href="#kontak" onClick={closeMenu} className="btn btn-primary">
                {t('nav-consult')}
              </SmartLink>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

const DropdownItem: React.FC<{
  id: string;
  label: string;
  entries: MenuEntry[];
  wide?: boolean;
  /** Salah satu tautan di dalamnya = halaman yang sedang dibuka */
  current?: boolean;
  pathname: string;
  /** Warna tombol & titik sesuai latar bar (bawaan / terang di atas media) */
  look: NavLook;
  active: string | null;
  setActive: (id: string | null) => void;
  onHover: (el: HTMLElement) => void;
  onLeave: () => void;
}> = ({ id, label, entries, wide, current = false, pathname, look, active, setActive, onHover, onLeave }) => {
  const open = active === id;
  return (
    <li
      className="relative"
      onMouseEnter={(e) => {
        setActive(id);
        onHover(e.currentTarget);
      }}
      onMouseLeave={() => setActive(null)}
    >
      <button
        type="button"
        onClick={() => setActive(open ? null : id)}
        onFocus={(e) => onHover(e.currentTarget)}
        onBlur={onLeave}
        aria-expanded={open}
        className={`relative z-10 inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[14px] font-medium transition-colors ${open || current ? look.linkCurrent : look.link}`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden />
      </button>
      {/* Titik penanda: halaman yang sedang dibuka ada di dalam menu ini */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-all duration-300 ${look.dot} ${
          current ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      />

      <Presence
        show={open}
        hiddenClassName="translate-y-2 opacity-0"
        exitMs={180}
        className={`absolute top-full z-20 pt-3 transition-[opacity,translate] duration-[180ms] ease-out motion-reduce:transition-none ${wide ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}
      >
        {/* Lapisan melayang: satu-satunya tempat shadow-float di navbar */}
        <div
          data-nav-surface
          className={`rounded-[20px] bg-surface p-2 shadow-float ring-1 ring-inset ring-line ${wide ? 'grid w-[600px] grid-cols-2 gap-1' : 'grid w-[300px] gap-1'}`}
        >
          {entries.map((entry, index) => (
            <SmartLink
              key={`${index}-${entry.title}`}
              href={entry.href}
              onClick={() => setActive(null)}
              aria-current={isCurrentPage(entry.href, pathname) ? 'page' : undefined}
              className="group/item flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-alt aria-[current=page]:bg-alt"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-white [&>svg]:h-[18px] [&>svg]:w-[18px]">
                {entry.icon}
              </span>
              <span className="pt-0.5">
                <span className="block text-[13px] font-semibold text-fg">{entry.title}</span>
                <span className="block text-xs leading-snug text-subtle">{entry.desc}</span>
              </span>
            </SmartLink>
          ))}
        </div>
      </Presence>
    </li>
  );
};

const MobileGroup: React.FC<{
  id: string;
  label: string;
  entries: MenuEntry[];
  pathname: string;
  open: string | null;
  setOpen: (id: string | null) => void;
  onNavigate: () => void;
}> = ({ id, label, entries, pathname, open, setOpen, onNavigate }) => {
  const isOpen = open === id;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-alt"
      >
        {label}
        <ChevronDown className={`h-4 w-4 text-subtle transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!isOpen}>
          <div className="ml-4 grid gap-0.5 border-l border-line py-1 pl-3">
            {entries.map((entry, index) => (
              <SmartLink
                key={`${index}-${entry.title}`}
                href={entry.href}
                onClick={onNavigate}
                aria-current={isCurrentPage(entry.href, pathname) ? 'page' : undefined}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-[13px] font-medium text-muted hover:bg-alt hover:text-fg aria-[current=page]:bg-alt aria-[current=page]:text-fg [&>span>svg]:h-4 [&>span>svg]:w-4"
              >
                <span className="text-primary">{entry.icon}</span>
                {entry.title}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-subtle" />
              </SmartLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
