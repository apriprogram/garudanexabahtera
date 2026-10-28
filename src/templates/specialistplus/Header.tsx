// Header SpecialistPlus: bilah NAVY padat yang menempel di atas (data-tpl-tone="inverse"), garis rambut putih 10% di
// bawahnya, tanpa blur/bayangan. Kiri: simbol cincin pemindai (teal terang) + nama klinik putih IBM Plex. Kanan (layar
// lebar): menu Inter 14px putih 72% dengan garis aktif teal 2px di tepi bawah, lalu tombol teal "Daftar Konsultasi".
// HP: tombol menu 44px bercincin putih; panel menu navy di bawah header (baris bernomor mono 01-06, label 20px), tombol
// penuh-lebar; Esc menutup dan mengembalikan fokus ke tombol menu.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { SpecialistPlusMark } from './marks';
import { pad2, type SpxModel } from './model';
import { DISPLAY } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m }: { m: SpxModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<SpecialistPlusMark className="h-8 w-8 text-(--spx-bright)" />}
      nameClassName={`${DISPLAY} font-semibold! text-[16px] leading-[1.2] tracking-[-0.01em] text-white @3xl:text-[17px]`}
    />
  );
}

export function Header({ m }: { m: SpxModel }) {
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
    <header
      ref={headerRef}
      data-tpl-tone="inverse"
      className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-white/10 bg-(--spx-navy) text-white"
    >
      <div className={CONTAINER}>
        <div className="flex h-16 items-center justify-between gap-5 @5xl:h-[68px]">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-h-11 min-w-0 items-center rounded-[6px]"
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
                    return (
                      <li key={item.key} className="flex">
                        <ActionLink
                          action={{ kind: 'section', target: item.key }}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={`relative flex h-[68px] items-center px-3 text-[14px] font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-(--tpl-accent) after:transition-opacity after:duration-200 @7xl:px-3.5 ${
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
                className="flex h-11 w-11 items-center justify-center rounded-[6px] text-white ring-1 ring-inset ring-white/25 transition-colors duration-200 hover:bg-white/10 @6xl:hidden"
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
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-white/10 bg-(--spx-navy) @6xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-1`}>
            <ul className="divide-y divide-white/10">
              {m.nav.map((item, i) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className="flex min-h-14 items-center gap-4 py-2 text-white transition-colors hover:text-(--spx-bright)"
                  >
                    <span aria-hidden className="w-6 shrink-0 font-mono text-[12px] tabular-nums text-(--spx-bright)">
                      {pad2(i + 1)}
                    </span>
                    <span className={`${DISPLAY} text-[20px] font-medium tracking-[-0.01em]`}>{item.label}</span>
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
