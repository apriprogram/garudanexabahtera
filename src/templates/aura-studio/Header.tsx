// Navigasi Aura Studio (brief §4.2): desktop = bagian atas hero (tidak lengket) — monogram bulat, pil kecil "Layanan ▾"
// (menu turun berisi kategori → gulir + pilih tab), tautan polos kapital 12px; aksi reservasi menumpang sudut kanan-atas
// foto hero (Hero.tsx). HP = bilah lengket ringkas + panel menu dengan tombol reservasi. Setelah hero lewat, desktop
// mendapat bilah ringkas lengket (CompactBar) tanpa tombol menu.
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import type { AuraModel, NavLink } from './model';
import { treatmentsIn } from './model';
import { HAIR, INK, MUTED } from './styles';
import { Brand, SageButton } from './ui';

const LINK = `h-10 items-center whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.14em] ${INK} transition-opacity hover:opacity-60`;

/** Tautan desktop di samping pil "Layanan": prioritas tampil per lebar (Kontak & Tentang selalu). */
const DESKTOP_LINKS: Record<string, string> = {
  about: 'inline-flex',
  gallery: 'hidden @6xl:inline-flex',
  testimonials: 'hidden @min-[96rem]:inline-flex',
  contact: 'inline-flex',
};

/** Tautan bilah ringkas: prioritas tampil per lebar */
const COMPACT_LINKS: Record<string, string> = {
  services: 'inline-flex',
  featured: 'hidden @7xl:inline-flex',
  about: 'inline-flex',
  gallery: 'hidden @6xl:inline-flex',
  testimonials: 'hidden @6xl:inline-flex',
  team: 'hidden @7xl:inline-flex',
  contact: 'inline-flex',
};

function desktopLinks(nav: NavLink[]) {
  return nav.filter((item) => item.key in DESKTOP_LINKS);
}

/** Menu turun "Layanan ▾": kategori perawatan (pilih tab) atau daftar perawatan bila tanpa kategori. */
function ServicesMenu({ m, onCategory }: { m: AuraModel; onCategory: (category: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const entries = m.categories.length
    ? m.categories.map((category) => ({
        key: category,
        label: category,
        meta: `${treatmentsIn(m.treatments, m.categories, category).length} perawatan`,
        category,
      }))
    : m.treatments.slice(0, 6).map((t) => ({ key: String(t.index), label: t.title || 'Perawatan', meta: t.price, category: null }));

  return (
    <div ref={wrapRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F0F0F0] pl-4 pr-3 text-[12px] font-medium uppercase tracking-[0.14em] ${INK} transition-colors hover:bg-[#E6E6E6]`}
      >
        Layanan
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div id={id} className={`absolute left-0 top-[calc(100%+8px)] z-40 w-[280px] rounded-[20px] bg-white p-2 ring-1 ring-black/[0.08]`}>
          <ul>
            {entries.map((entry) => (
              <li key={entry.key}>
                <ActionLink
                  action={{ kind: 'section', target: 'services' }}
                  onNavigate={() => {
                    if (entry.category) onCategory(entry.category);
                    setOpen(false);
                  }}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-3 py-2 transition-colors hover:bg-[#F0F0F0]"
                >
                  <span className={`text-[14px] ${INK}`}>{entry.label}</span>
                  {entry.meta && <span className={`shrink-0 text-[12px] ${MUTED}`}>{entry.meta}</span>}
                </ActionLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Header({ m, heroOn, onCategory }: { m: AuraModel; heroOn: boolean; onCategory: (category: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = () => setOpen(false);
  const links = desktopLinks(m.nav);
  const reserve = m.reserveAction;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b ${HAIR} bg-white/90 backdrop-blur-md @5xl:static @5xl:border-b-0 @5xl:bg-transparent @5xl:backdrop-blur-none`}
    >
      <div className={CONTAINER}>
        <div className={`flex h-16 items-center gap-3 @5xl:h-[88px] @5xl:pt-4 ${heroOn ? '@5xl:w-[calc(45%-12px)]' : ''}`}>
          <ActionLink action={{ kind: 'section', target: 'hero' }} onNavigate={close} aria-label={`${m.companyName}, ke atas halaman`} className="min-w-0 rounded-full">
            <Brand name={m.companyName} logo={m.logo} size="h-10 w-10 @5xl:h-11 @5xl:w-11" nameClassName="@5xl:hidden @7xl:block" />
          </ActionLink>

          {(m.servicesOn || links.length > 0) && (
            <nav aria-label="Menu utama" className="ml-2 hidden min-w-0 items-center gap-5 @5xl:flex @7xl:ml-6">
              {m.servicesOn && <ServicesMenu m={m} onCategory={onCategory} />}
              {links.map((item) => (
                <ActionLink key={item.key} action={{ kind: 'section', target: item.key }} className={`${LINK} ${DESKTOP_LINKS[item.key]}`}>
                  {item.label}
                </ActionLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {reserve && (
              <ActionLink
                action={reserve}
                className={`h-10 items-center rounded-full bg-(--tpl-accent) px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-(--tpl-on-accent) ring-1 ring-inset ring-black/10 transition-colors hover:bg-(--tpl-accent-hover) ${heroOn ? 'hidden @xl:inline-flex @5xl:hidden' : 'hidden @xl:inline-flex'}`}
              >
                {m.reserveLabel}
              </ActionLink>
            )}
            {m.nav.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full ${INK} ring-1 ring-inset ring-black/15 transition-colors hover:bg-[#F0F0F0] @5xl:hidden`}
              >
                {open ? <X className="h-5 w-5" strokeWidth={1.5} aria-hidden /> : <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
              </button>
            )}
          </div>
        </div>

        {open && (
          <nav id={menuId} aria-label="Menu utama" className={`max-h-[calc(100svh-64px)] overflow-y-auto border-t ${HAIR} pb-5 @5xl:hidden`}>
            <ul>
              {m.nav.map((item) => (
                <li key={item.key} className={`border-b ${HAIR}`}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    className={`flex min-h-14 items-center justify-between font-[family-name:var(--tpl-font-display)] text-[22px] font-light uppercase ${INK}`}
                  >
                    {item.label}
                    <ArrowRight className="h-5 w-5" strokeWidth={1.25} aria-hidden />
                  </ActionLink>
                </li>
              ))}
            </ul>
            {reserve && (
              <div className="sticky bottom-0 bg-white pt-5">
                <SageButton action={reserve} onNavigate={close} full>
                  {m.reserveLabel}
                </SageButton>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

/**
 * Bilah ringkas desktop (@5xl): muncul setelah hero (atau header bila hero disembunyikan) lewat dari layar. Tanpa
 * tombol menu (menu HP milik Header). Tersembunyi → inert + aria-hidden.
 */
export function CompactBar({ m }: { m: AuraModel }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const root = el?.closest('[data-tpl-root]');
    const target = root?.querySelector('[data-tpl-section="hero"]') ?? root?.querySelector('header');
    if (!target || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none sticky top-[var(--tpl-sticky-top,0px)] z-40 hidden h-0 @5xl:block">
      <div
        className="aura-compact pointer-events-auto pt-3"
        data-state={visible ? 'visible' : 'hidden'}
        aria-hidden={!visible}
        inert={!visible}
      >
        <div className={CONTAINER}>
          <div className={`flex h-14 items-center gap-6 rounded-full bg-white/90 pl-2 pr-2 ring-1 ring-black/[0.08] backdrop-blur-md`}>
            <ActionLink action={{ kind: 'section', target: 'hero' }} aria-label={`${m.companyName}, ke atas halaman`} className="min-w-0 rounded-full">
              <Brand name={m.companyName} logo={m.logo} size="h-10 w-10" />
            </ActionLink>
            {m.nav.length > 0 && (
              <nav aria-label="Navigasi ringkas" className="flex min-w-0 flex-1 items-center justify-center gap-6 overflow-hidden">
                {m.nav.map((item) => (
                  <ActionLink key={item.key} action={{ kind: 'section', target: item.key }} className={`${LINK} ${COMPACT_LINKS[item.key] ?? 'inline-flex'}`}>
                    {item.label}
                  </ActionLink>
                ))}
              </nav>
            )}
            {m.reserveAction && (
              <ActionLink
                action={m.reserveAction}
                className="ml-auto inline-flex h-10 shrink-0 items-center rounded-full bg-(--tpl-accent) px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-(--tpl-on-accent) ring-1 ring-inset ring-black/10 transition-colors hover:bg-(--tpl-accent-hover)"
              >
                {m.reserveLabel}
              </ActionLink>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
