// Header Dermaga: bilah putih SOLID yang menempel di atas dengan garis tipis di bawahnya (tanpa blur, tanpa
// transparansi). Kiri: simbol Dermaga (atau logo) + nama. Kanan: menu Inter 14px (nomor mono di layar lebar) dengan
// garis aktif 2px warna tema yang duduk di atas garis bawah header, lalu tombol persegi "Minta Penawaran →". HP: nama +
// tombol menu persegi 44px; panel menu terbuka di bawah header (baris bernomor, garis tipis, tombol penuh-lebar), Esc
// menutup dan mengembalikan fokus ke tombol menu.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { DermagaMark } from './marks';
import type { DermagaModel } from './model';
import { C, DISPLAY } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m, tone = 'light' }: { m: DermagaModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<DermagaMark className={`h-8 w-8 ${dark ? 'text-white' : 'text-(--tpl-accent)'}`} />}
      nameClassName={`${DISPLAY} font-medium! text-[16px] leading-[1.2] tracking-[-0.02em] @3xl:text-[17px] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m }: { m: DermagaModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);

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

  // Menu HP terbuka lalu wadah melebar melewati @6xl (tablet diputar): tombol menu jadi display:none → tutup menu
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

  return (
    <header ref={headerRef} className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-[#0F1D20]/[0.1] bg-white">
      <div className={CONTAINER}>
        <div className="flex h-[60px] items-center justify-between gap-5 @5xl:h-[72px]">
          {/* flex (bukan inline): logo & nama tepat di tengah tinggi header di semua zoom */}
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-w-0 items-center rounded-[2px]"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-6">
            {m.nav.length > 0 && (
              <nav aria-label="Menu utama" className="hidden self-stretch @6xl:flex">
                <ul className="flex items-stretch">
                  {m.nav.map((item) => {
                    const isCurrent = active === item.key;
                    // Nomor = nomor label section yang sama ("07 / FAQ"), bukan urutan menu; section tanpa label → tanpa nomor
                    const number = m.number(item.key);
                    return (
                      <li key={item.key} className="flex">
                        <ActionLink
                          action={{ kind: 'section', target: item.key }}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={`relative flex h-[72px] items-center gap-2 px-3 text-[14px] font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-(--tpl-accent) after:transition-opacity after:duration-200 @7xl:px-3.5 ${
                            isCurrent ? `${C.ink} after:opacity-100` : 'text-[#0F1D20]/75 after:opacity-0 hover:text-[#0F1D20]'
                          }`}
                        >
                          {number && (
                            <span aria-hidden className="hidden font-mono text-[11px] tabular-nums text-(--tpl-accent-ink) @7xl:inline">
                              {number}
                            </span>
                          )}
                          {item.label}
                        </ActionLink>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            <span className="hidden min-w-0 @xl:flex">
              <ButtonLink action={m.headerAction} label={m.headerLabel} size="md" />
            </span>
            {m.nav.length > 0 && (
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`flex h-11 w-11 items-center justify-center rounded-[2px] ring-1 ring-inset ring-[#0F1D20]/20 transition-colors duration-200 hover:bg-[#F4F7F7] @6xl:hidden ${C.ink}`}
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
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-60px)] overflow-y-auto border-t border-[#0F1D20]/[0.1] bg-white @5xl:max-h-[calc(100svh-var(--tpl-sticky-top,0px)-72px)] @6xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-1`}>
            <ul className="divide-y divide-[#0F1D20]/[0.1]">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center gap-4 py-2 transition-colors hover:text-(--tpl-accent-ink) ${C.ink}`}
                  >
                    {/* Tetap dirender walau kosong: label menu sejajar */}
                    <span aria-hidden className="w-6 shrink-0 font-mono text-[12px] tabular-nums text-(--tpl-accent-ink)">
                      {m.number(item.key)}
                    </span>
                    <span className={`${DISPLAY} text-[20px] font-medium tracking-[-0.02em]`}>{item.label}</span>
                  </ActionLink>
                </li>
              ))}
            </ul>
            <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-4 flex w-full" />
          </div>
        </nav>
      )}
    </header>
  );
}
