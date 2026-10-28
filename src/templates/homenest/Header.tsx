// Header HomeNest: bilah yang menempel di atas, DI ATAS foto hero. Paling atas (belum digulir) transparan dengan teks
// krem dan garis rambut krem 20%; setelah digulir 8px (atau menu HP terbuka, atau hero disembunyikan) krem padat #F4EFE4
// dengan garis rambut tinta 12% — tanpa bayangan, tanpa blur. Kiri: simbol + nama Cormorant. Kanan (@6xl): menu Inter
// kapital kecil berjarak dengan garis bawah 1px untuk section yang sedang dibaca, lalu tombol persegi "Jadwalkan
// Kunjungan" (garis krem di atas foto, warna tema saat padat). HP: nama + tombol menu persegi 44px; panel menu krem di
// bawah bilah (nama section Cormorant 24px bergaris rambut, tombol penuh-lebar); Esc menutup dan mengembalikan fokus.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { HomeNestMark } from './marks';
import type { HomeNestModel } from './model';
import { C, SERIF } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m, tone = 'light' }: { m: HomeNestModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<HomeNestMark className={`h-8 w-8 ${dark ? 'text-[#F4EFE4]' : 'text-(--hn-ink)'}`} />}
      nameClassName={`${SERIF} font-semibold! text-[23px] leading-none tracking-[-0.005em] ${dark ? 'text-[#F4EFE4]' : C.ink}`}
    />
  );
}

export function Header({ m, overlay }: { m: HomeNestModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const solid = scrolled || !overlay || open;
  const active = useActiveSection(
    sentinel,
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
    const root = sentinel.current?.closest<HTMLElement>('[data-tpl-root]');
    if (!open || !root || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [open]);

  const tone = solid ? 'light' : 'dark';

  return (
    <>
      {/* Penanda gulir: 8px di bawah tepi atas halaman (begitu digulir sedikit, header jadi krem padat) */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone={solid ? undefined : 'inverse'}
          className={`border-b transition-colors duration-300 ${solid ? `bg-[#F4EFE4] ${C.line}` : 'border-[#F4EFE4]/20 bg-transparent'}`}
        >
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-5 @5xl:h-20">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-h-11 min-w-0 items-center"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Logo m={m} tone={tone} />
              </ActionLink>

              <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-8">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-1 @7xl:gap-3">
                      {m.nav.map((item) => {
                        const current = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={current ? 'true' : undefined}
                              className={`flex h-11 items-center px-2.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] underline-offset-[9px] decoration-1 transition-colors duration-200 hover:underline ${
                                solid
                                  ? `decoration-(--hn-ink) ${current ? `${C.ink} underline` : 'text-[#1E2A24]/75 hover:text-[#1E2A24]'}`
                                  : `decoration-[#F4EFE4] ${current ? 'text-[#F4EFE4] underline' : 'text-[#F4EFE4]/85 hover:text-[#F4EFE4]'}`
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
                  <ButtonLink action={m.headerAction} label={m.headerLabel} variant={solid ? 'primary' : 'outlineLight'} size="md" arrow={false} />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center ring-1 ring-inset transition-colors duration-200 @6xl:hidden ${
                      solid ? `ring-[#1E2A24]/30 hover:bg-white ${C.ink}` : 'text-[#F4EFE4] ring-[#F4EFE4]/60 hover:bg-[#F4EFE4]/10'
                    }`}
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
              className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-68px)] overflow-y-auto border-t bg-[#F4EFE4] @6xl:hidden ${C.line}`}
            >
              <div className={`${CONTAINER} pb-6 pt-1`}>
                <ul className={`divide-y ${C.divide}`}>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex min-h-14 items-center py-2 ${SERIF} text-[24px] font-medium transition-colors hover:text-(--hn-ink) ${C.ink}`}
                      >
                        {item.label}
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-5 flex w-full" />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
