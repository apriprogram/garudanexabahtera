// Header Finova (brief §4.3): menu DI DALAM panel hero gelap — kiri simbol lumbung + nama putih, tengah tautan dalam
// pil gelap (item yang sedang dibaca = pil white/12), kanan tombol pil limau. Header berupa lapisan lengket setinggi 0
// yang menumpang di atas panel; setelah halaman digulir menjadi bilah gelap #0B0F0E/90 + blur dengan susunan sama.
// Tanpa hero (section dimatikan) → bilah gelap biasa. HP: simbol + nama + tombol menu; panel menu gelap di bawah bilah.
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { FinovaMark } from './marks';
import type { FinovaModel } from './model';
import { BTN, DISPLAY } from './styles';
import { PillLink } from './ui';

/** Padding dalam panel hero; header memakai nilai yang sama agar menu sejajar dengan isi panel. */
export const PANEL_X = 'px-5 @3xl:px-10 @5xl:px-12';

export function Logo({ m, tone }: { m: FinovaModel; tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<FinovaMark className={`h-8 w-8 ${dark ? 'text-(--fin-hl)' : 'text-(--tpl-accent)'}`} />}
      nameClassName={`${DISPLAY} text-[17px] tracking-[-0.03em] @3xl:text-[18px] ${dark ? 'text-white' : 'text-[#0B0F0E]'}`}
    />
  );
}

export function Header({ m, overlay }: { m: FinovaModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const solid = !overlay || scrolled || open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links = m.nav.filter((item) => item.key !== 'hero' || overlay);

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header data-tpl-tone="inverse" className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color,padding] duration-300 ${
            solid ? 'border-white/10 bg-[#0B0F0E]/90 backdrop-blur-md' : 'border-transparent pt-3 @3xl:pt-4'
          }`}
        >
          <div className={CONTAINER}>
            <div className={`flex h-[68px] items-center justify-between gap-4 @3xl:h-[76px] @6xl:grid @6xl:grid-cols-[1fr_auto_1fr] ${PANEL_X}`}>
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 justify-self-start rounded-full" onNavigate={close}>
                <Logo m={m} tone="dark" />
              </ActionLink>

              {links.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-0.5 rounded-full bg-white/[0.05] p-1 ring-1 ring-inset ring-white/10">
                    {links.map((item) => {
                      const current = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={current ? 'true' : undefined}
                            className={`flex h-9 items-center rounded-full px-4 text-[14px] transition-colors ${
                              current ? 'bg-white/[0.12] font-medium text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
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

              <div className="flex shrink-0 items-center justify-self-end gap-2">
                <span className="hidden @xl:inline-flex">
                  <PillLink action={m.headerAction} label={m.headerLabel} chip={null} className={`${BTN.lime} ${BTN.plainMd}`} />
                </span>
                {links.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.12] @6xl:hidden"
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
              <div className={PANEL_X}>
                <ul className="rounded-[20px] bg-white/[0.04] p-2 ring-1 ring-inset ring-white/10">
                  {links.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className="flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium text-white transition-colors hover:bg-white/[0.06]"
                      >
                        {item.label}
                        <ArrowUpRight className="h-4 w-4 text-white/60" aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <PillLink
                  action={m.headerAction}
                  label={m.headerLabel}
                  onNavigate={close}
                  chip="ink"
                  className={`${BTN.lime} ${BTN.lg} mt-3 flex w-full justify-between @xl:hidden`}
                />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
