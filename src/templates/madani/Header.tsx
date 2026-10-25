// Header Madani: menu di ATAS bingkai foto hero — kiri simbol (lingkaran warna sorotan) + nama sekolah, tengah pil kaca
// berisi tautan (item aktif = pil warna sorotan), kanan tombol "PPDB" warna sorotan dengan lingkaran panah. Header berupa
// lapisan lengket setinggi 0 yang menumpang di atas hero; setelah digulir (atau saat menu terbuka) menjadi bilah putih
// tembus + blur dengan teks warna tema tua. Tanpa hero → bilah putih biasa. HP: simbol + nama + tombol menu; panel menu
// di bawah bilah (Esc menutup dan mengembalikan fokus ke tombol menu).
import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { MadaniMark } from './marks';
import type { MadaniModel } from './model';
import { C, DISPLAY } from './styles';
import { ArrowLink } from './ui';

export function Logo({ m, tone }: { m: MadaniModel; tone: 'light' | 'dark' }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--md-hl) text-(--md-on-hl)">
          <MadaniMark className="h-6 w-6" />
        </span>
      }
      nameClassName={`${DISPLAY} text-[16px] tracking-[-0.015em] @3xl:text-[17px] ${tone === 'light' ? 'text-white' : 'text-(--md-deep)'}`}
    />
  );
}

export function Header({ m, overlay }: { m: MadaniModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const solid = !overlay || scrolled || open;
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

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} data-md-scroll-sentinel="" aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header data-tpl-tone={solid ? undefined : 'inverse'} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color] duration-300 ${
            solid ? 'border-black/[0.06] bg-white/90 backdrop-blur-md' : 'border-transparent'
          }`}
        >
          <div className={CONTAINER}>
            <div
              className={`flex items-center justify-between gap-3 transition-[height] duration-300 @6xl:grid @6xl:grid-cols-[1fr_auto_1fr] ${
                solid ? 'h-[66px] @3xl:h-[74px]' : 'h-[76px] @3xl:h-[92px]'
              }`}
            >
              <ActionLink action={{ kind: 'section', target: 'hero' }} onNavigate={close} className="min-w-0 justify-self-start rounded-full" aria-label={`${m.companyName}, ke awal halaman`}>
                <Logo m={m} tone={solid ? 'dark' : 'light'} />
              </ActionLink>

              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul
                    className={`flex items-center gap-0.5 rounded-full p-1.5 ring-1 ring-inset transition-colors duration-300 ${
                      solid ? 'bg-[#F6F4EC] ring-black/[0.05]' : 'bg-white/[0.12] ring-white/25 backdrop-blur-md'
                    }`}
                  >
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`flex h-9 items-center rounded-full px-4 text-[14px] font-medium transition-colors @7xl:px-[18px] ${
                              isCurrent
                                ? 'bg-(--md-hl) text-(--md-on-hl)'
                                : solid
                                  ? 'text-(--md-deep) hover:bg-white'
                                  : 'text-white hover:bg-white/[0.14]'
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

              <div className="flex shrink-0 items-center gap-2 justify-self-end">
                <span className="hidden @xl:inline-flex">
                  <ArrowLink action={m.headerAction} label={m.headerLabel} variant="hl" size="md" />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors @6xl:hidden ${
                      solid ? 'bg-[#F6F4EC] text-(--md-deep) hover:bg-[#ECE9DE]' : 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md hover:bg-white/25'
                    }`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
              <ul className="rounded-[24px] bg-[#F6F4EC] p-2">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={active === item.key ? 'true' : undefined}
                      className="flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium text-(--md-deep) transition-colors hover:bg-white aria-[current=true]:bg-white"
                    >
                      {item.label}
                      <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
              <ArrowLink action={m.headerAction} label={m.headerLabel} variant="hl" size="lg" onNavigate={close} className="mt-3 flex w-full justify-between" />
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
