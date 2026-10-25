// Header Cakrawala: bilah pengumuman tipis (PPDB) di paling atas, lalu menu yang MENUMPANG di dalam bingkai foto hero:
// logo putih kiri, menu pil kaca di tengah (item aktif = pil putih), tombol pil putih + lingkaran panah di kanan
// (referensi CBRLP/MedixWeb). Setelah digulir (atau saat menu HP terbuka) menjadi bilah putih tembus + blur dengan
// menu pil abu. Tanpa hero → bilah putih biasa. HP: logo + tombol menu; panel menu di bawah bilah, Esc menutup dan
// mengembalikan fokus ke tombol menu.
import { ArrowRight, Megaphone, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { text } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import { CakrawalaMark } from './marks';
import type { CakrawalaModel } from './model';
import { BTN, C, DISPLAY, INSET, INSET_PAD } from './styles';
import { PillLink } from './ui';

export function Logo({ m, tone }: { m: CakrawalaModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${
            light ? 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/25' : 'bg-(--tpl-accent) text-(--tpl-on-accent)'
          }`}
        >
          <CakrawalaMark className="h-6 w-6" />
        </span>
      }
      nameClassName={`${DISPLAY} text-[16px] font-bold tracking-[-0.02em] @3xl:text-[17px] ${light ? 'text-white' : C.ink}`}
    />
  );
}

/** Bilah pengumuman di atas menu (mis. PPDB dibuka). Kosong → tidak dirender. */
export function TopBar({ m }: { m: CakrawalaModel }) {
  const message = text(m.hero, 'topbar_text');
  const label = text(m.hero, 'topbar_label');
  if (!message) return null;
  return (
    // Bilah gelap menyatu dengan hero selebar layar: bagian atas halaman tidak putih (pemilik 2026-10-25)
    <div data-tpl-tone="inverse" className="bg-(--ck-deep) text-white">
      <div className={`${CONTAINER} flex min-h-10 items-center justify-center py-2 text-center`}>
        <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[12.5px] leading-snug text-white/90 @3xl:text-[13px]">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Megaphone aria-hidden className="hidden h-4 w-4 shrink-0 text-white/80 @xl:block" strokeWidth={1.8} />
            <span>{message}</span>
          </span>
          {label && m.topbarAction && (
            <ActionLink action={m.topbarAction} className="group inline-flex min-h-8 items-center gap-1 font-semibold text-white">
              <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{label}</span>
              <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </ActionLink>
          )}
        </p>
      </div>
    </div>
  );
}

export function Header({ m, overlay }: { m: CakrawalaModel; overlay: boolean }) {
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
  const tone = solid ? 'dark' : 'light';
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
      {/* Penanda gulir: 24px di bawah tepi atas menu */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-16 h-px w-px" />
      <header data-tpl-tone={solid ? undefined : 'inverse'} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color,padding] duration-300 ${
            solid ? 'border-black/[0.06] bg-white/[0.94] backdrop-blur-md' : `border-transparent pt-2 @2xl:pt-3 @min-[96rem]:pt-4`
          }`}
        >
          <div className={`mx-auto max-w-[1680px] ${INSET}`}>
            <div className={`flex h-[68px] items-center justify-between gap-3 @3xl:h-[78px] @6xl:grid @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${INSET_PAD}`}>
              <ActionLink action={{ kind: 'section', target: 'hero' }} onNavigate={close} className="min-w-0 justify-self-start rounded-[12px]" aria-label={`${m.companyName}, ke awal halaman`}>
                <Logo m={m} tone={tone} />
              </ActionLink>

              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul
                    className={`flex items-center gap-0.5 rounded-full p-1.5 transition-colors ${
                      solid ? 'bg-[#F3F6FA]' : 'bg-white/[0.12] ring-1 ring-inset ring-white/20 backdrop-blur-md'
                    }`}
                  >
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`flex h-9 items-center rounded-full px-4 text-[14px] font-medium transition-colors ${
                              isCurrent
                                ? `bg-white ${C.ink}`
                                : solid
                                  ? 'text-[#0D1830]/75 hover:bg-white hover:text-[#0D1830]'
                                  : 'text-white/85 hover:bg-white/[0.14] hover:text-white'
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
                  <PillLink
                    action={m.headerAction}
                    label={m.headerLabel}
                    dot={solid ? 'white' : 'accent'}
                    className={`${solid ? BTN.primary : BTN.white} h-11 pl-5 pr-1 text-[14px]`}
                  />
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
                      solid ? `bg-[#F3F6FA] ${C.ink} hover:bg-[#E7ECF4]` : `${'bg-white/[0.14] text-white ring-1 ring-inset ring-white/25 hover:bg-white/25'}`
                    }`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`mx-auto max-w-[1680px] pb-5 @6xl:hidden ${INSET}`}>
              <div className={INSET_PAD}>
                <ul className="rounded-[22px] bg-[#F3F6FA] p-2">
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex h-12 items-center justify-between rounded-[16px] px-4 text-[16px] font-medium transition-colors hover:bg-white ${C.ink}`}
                      >
                        {item.label}
                        <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <PillLink
                  action={m.headerAction}
                  label={m.headerLabel}
                  dot="white"
                  onNavigate={close}
                  className={`${BTN.primary} ${BTN.lg} mt-3 flex w-full justify-between @xl:hidden`}
                />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
