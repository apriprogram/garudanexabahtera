// Header NusaNiaga: bilah putih lengket bergaris rambut di bawah, tanpa blur dan tanpa transparansi. Kiri simbol + nama
// perusahaan (Manrope 700), tengah-kanan menu Inter 14px abu (item aktif bertitik aksen dan berwarna tinta), dan di ujung
// kanan BLOK WARNA AKSEN setinggi bilah yang berisi tombol permintaan penawaran, rata dengan tepi kanan layar (di atas
// 1680px warnanya diteruskan sampai tepi layar). HP & tablet: blok aksen menjadi tombol menu persegi; panel menu di bawah
// bilah berisi baris besar bergaris, tombol penawaran, dan tautan WhatsApp. Esc menutup dan mengembalikan fokus.
import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { NusaNiagaMark } from './marks';
import type { NusaNiagaModel } from './model';
import { C, DISPLAY, DIVIDE, LINE } from './styles';
import { PillLink } from './ui';

export function Logo({ m }: { m: NusaNiagaModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<NusaNiagaMark className="h-8 w-8 text-(--tpl-accent)" />}
      nameClassName={`${DISPLAY} text-[16px] leading-[1.2] font-bold! tracking-[-0.02em]! @3xl:text-[17px] ${C.ink}`}
    />
  );
}

export function Header({ m }: { m: NusaNiagaModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const cta = m.headerLabel && m.headerAction ? m.headerAction : null;

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

  // Menu HP terbuka lalu bingkai melebar melewati @6xl: tombol menu jadi display:none → tutup panelnya
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
    <header ref={headerRef} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 overflow-x-clip border-b bg-white ${LINE}`}>
      <div className={`${CONTAINER} flex h-16 items-stretch gap-6 @5xl:h-[72px] @7xl:h-20`}>
        <ActionLink
          action={{ kind: 'section', target: 'hero' }}
          onNavigate={close}
          className="flex min-w-0 shrink items-center self-center rounded-md py-1"
          aria-label={`${m.companyName}, ke awal halaman`}
        >
          <Logo m={m} />
        </ActionLink>

        {m.nav.length > 0 && (
          <nav aria-label="Menu utama" className="ml-auto hidden shrink-0 items-center @6xl:flex">
            <ul className="flex items-center gap-0.5 @7xl:gap-1">
              {m.nav.map((item) => {
                const current = active === item.key;
                return (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      aria-current={current ? 'true' : undefined}
                      className={`relative flex h-11 items-center rounded-full px-3.5 text-[14px] font-medium transition-colors duration-200 ${
                        current ? C.ink : 'text-[#4D5562] hover:text-[#141821]'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-[3px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-(--tpl-accent) transition-opacity duration-200 ${
                          current ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      {item.label}
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {cta && (
          // Blok aksen setinggi bilah, rata tepi kanan layar (margin negatif = jarak tepi CONTAINER); di atas 1680px
          // ::after meneruskan warnanya sampai tepi layar (header ber-overflow-x-clip, jadi tanpa gulir samping)
          <ActionLink
            action={cta}
            className={`group/cta relative -mr-12 hidden shrink-0 items-center gap-3 self-stretch bg-(--tpl-accent) px-7 text-[15px] font-semibold text-(--tpl-on-accent) transition-colors duration-200 after:absolute after:inset-y-0 after:left-full after:w-[50cqw] after:bg-inherit hover:bg-(--tpl-accent-hover) focus-visible:outline-offset-[-6px] focus-visible:outline-(--tpl-on-accent) @6xl:flex @7xl:px-9 @min-[96rem]:-mr-16 ${
              m.nav.length > 0 ? '' : 'ml-auto'
            }`}
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-current transition-transform duration-200 group-hover/cta:scale-150" />
            <span className="whitespace-nowrap">{m.headerLabel}</span>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </ActionLink>
        )}

        {m.nav.length > 0 && (
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            className="-mr-5 ml-auto flex w-16 shrink-0 items-center justify-center self-stretch bg-(--tpl-accent) text-(--tpl-on-accent) transition-colors duration-200 hover:bg-(--tpl-accent-hover) focus-visible:outline-offset-[-6px] focus-visible:outline-(--tpl-on-accent) @2xl:-mr-8 @5xl:-mr-12 @5xl:w-[72px] @6xl:hidden"
          >
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        )}
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label="Menu utama"
          className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t bg-white ${LINE} @6xl:hidden`}
        >
          <div className={`${CONTAINER} pb-7 pt-1`}>
            <ul className={`divide-y ${DIVIDE}`}>
              {m.nav.map((item) => {
                const current = active === item.key;
                return (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={current ? 'true' : undefined}
                      className={`group flex min-h-14 items-center justify-between gap-4 ${DISPLAY} text-[20px] font-semibold tracking-[-0.02em] ${C.ink}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {current && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                      <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-(--nn-ink) transition-transform duration-200 group-hover:translate-x-0.5" />
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 grid gap-2">
              <PillLink action={cta} label={m.headerLabel} size="lg" onNavigate={close} className="w-full" />
              {m.waAction && (
                <ActionLink
                  action={m.waAction}
                  onNavigate={close}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 text-[15px] font-medium transition-colors hover:text-[#141821] ${C.muted}`}
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  Chat lewat WhatsApp
                </ActionLink>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
