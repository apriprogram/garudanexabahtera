// Header Sparring Padel: bilah biru-malam PADAT yang menempel di atas (menyatu dengan foto hero yang gelap), garis
// tipis putih 10% di bawahnya. Kiri: simbol raket neon (atau logo) + nama Saira miring kapital. Kanan: menu Inter 14px
// putih 72% dengan garis neon 2px di bawah item aktif (layar ≥ @7xl), lalu tombol pil neon "Book Now" yang SELALU
// terlihat (juga di HP, versi ringkas). HP & tablet: tombol menu 44px; panel menu di bawah header (tautan Saira besar
// bernomor, tombol Book Now penuh-lebar), Esc menutup dan mengembalikan fokus ke tombol menu.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { SparringMark } from './marks';
import { pad2, type SparringModel } from './model';
import { BTN, DISPLAY } from './styles';
import { ArrowDot } from './ui';

export function Logo({ m }: { m: SparringModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<SparringMark className="h-8 w-8 text-(--sp-neon)" />}
      nameClassName={`${DISPLAY} font-bold! italic uppercase text-[15px] leading-[1.1] tracking-[0.01em] text-white @xl:text-[16px] @3xl:text-[18px]`}
    />
  );
}

/** Fokus ke isian pertama bilah booking setelah gulir (tanpa menggulir lagi). */
const focusBooking = () => {
  window.setTimeout(() => document.querySelector<HTMLElement>('[data-sp-booking-first]')?.focus({ preventScroll: true }), 650);
};

export function Header({ m }: { m: SparringModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const toBooking = m.headerAction?.kind === 'section' && m.headerAction.target === 'hero';
  const onBook = () => {
    close();
    if (toBooking) focusBooking();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Menu HP terbuka lalu wadah melebar melewati @7xl (tablet diputar): tombol menu jadi display:none → tutup menu
  useEffect(() => {
    const root = headerRef.current?.closest<HTMLElement>('[data-tpl-root]');
    if (!open || !root || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [open]);

  const book = m.headerAction && m.headerLabel && (
    <ActionLink action={m.headerAction} onNavigate={onBook} className={`${BTN.neon} h-11 gap-2 px-4 text-[14px] @xl:pl-5 @xl:pr-1.5 @3xl:text-[15px]`}>
      <span className="truncate">{m.headerLabel}</span>
      <span className="hidden @xl:flex">
        <ArrowDot className="h-8 w-8" />
      </span>
    </ActionLink>
  );

  return (
    <header ref={headerRef} data-tpl-tone="inverse" className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-white/10 bg-(--sp-night) text-white">
      <div className={CONTAINER}>
        <div className="flex h-16 items-center justify-between gap-3 @5xl:h-[76px] @5xl:gap-6">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-h-11 min-w-0 items-center rounded-full"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          <div className="flex min-w-0 shrink-0 items-center gap-2 @7xl:gap-7">
            {m.nav.length > 0 && (
              <nav aria-label="Menu utama" className="hidden self-stretch @7xl:flex">
                <ul className="flex items-stretch">
                  {m.nav.map((item) => {
                    const isCurrent = active === item.key;
                    return (
                      <li key={item.key} className="flex">
                        <ActionLink
                          action={{ kind: 'section', target: item.key }}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={`relative flex h-[76px] items-center px-3 text-[14px] font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-(--sp-neon) after:transition-opacity after:duration-200 ${
                            isCurrent ? 'text-white after:opacity-100' : 'text-white/72 after:opacity-0 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </ActionLink>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            {book && <span className="flex min-w-0">{book}</span>}
            {m.nav.length > 0 && (
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/25 transition-colors duration-200 hover:bg-white/10 @7xl:hidden"
              >
                {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label="Menu utama"
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-white/10 bg-(--sp-night) @5xl:max-h-[calc(100svh-var(--tpl-sticky-top,0px)-76px)] @7xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-1`}>
            <ul className="divide-y divide-white/10">
              {m.nav.map((item, i) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className="flex min-h-14 items-center gap-4 py-2 text-white transition-colors hover:text-(--sp-neon)"
                  >
                    <span aria-hidden className="w-6 shrink-0 font-mono text-[12px] tabular-nums text-(--sp-neon)">
                      {pad2(i + 1)}
                    </span>
                    <span className={`${DISPLAY} text-[22px] font-semibold`}>{item.label}</span>
                  </ActionLink>
                </li>
              ))}
            </ul>
            {m.headerAction && m.headerLabel && (
              <ActionLink action={m.headerAction} onNavigate={onBook} className={`${BTN.neon} ${BTN.xl} mt-5 flex w-full justify-between`}>
                <span className="truncate">{m.headerLabel}</span>
                <ArrowDot />
              </ActionLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
