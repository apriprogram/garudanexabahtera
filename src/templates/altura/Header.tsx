// Header Altura: bilah putih membulat penuh (pil lebar) yang MENUMPANG di atas dua panel hero di dalam gutter: kiri simbol
// + nama, tengah tautan, kanan "Call us: +65 …" (layar lebar) + tombol pil limau "Get in touch". Lengket saat digulir
// (pil putih yang sama, diberi garis tipis). Tanpa hero → pil biasa di alur halaman. HP: simbol + nama + tombol menu;
// panel menu terbuka DI DALAM pil (pil memanjang ke bawah), Esc menutup dan mengembalikan fokus ke tombol menu.
import { ArrowUpRight, Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { telHref, text } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import { AlturaMark } from './marks';
import type { AlturaModel } from './model';
import { BTN, C, DISPLAY, OUTER } from './styles';

export function Logo({ m, tone = 'light' }: { m: AlturaModel; tone?: 'light' | 'dark' }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
          <AlturaMark className="h-[22px] w-[22px]" />
        </span>
      }
      nameClassName={`${DISPLAY} text-[16.5px] font-bold leading-[1.2] tracking-[-0.03em] @3xl:text-[18px] ${tone === 'dark' ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m, overlay }: { m: AlturaModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const tel = telHref(m.phone);
  const callText = text(m.hero, 'call_label');

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

  // Menu HP terbuka lalu bingkai melebar melewati @6xl: tombol menu jadi display:none → tutup menu
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

  const outlined = scrolled || !overlay || open;

  return (
    <>
      {/* Penanda gulir: 16px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-4 h-px w-px" />
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div className={`${OUTER} ${overlay ? 'pt-5 @3xl:pt-6 @5xl:pt-7' : 'py-3'}`}>
          {/* Masuk 10–16px dari tepi panel hero, seperti pil yang duduk di atas kartu */}
          <div className={overlay ? 'px-2.5 @3xl:px-3.5 @5xl:px-4' : ''}>
            <div
              className={`rounded-[32px] bg-white ${
                outlined ? 'ring-1 ring-[#141612]/[0.09]' : 'ring-1 ring-transparent'
              }`}
            >
              <div className="flex h-16 items-center justify-between gap-3 pl-3.5 pr-2 @3xl:pl-5 @5xl:h-[68px] @6xl:grid @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @6xl:pl-6">
                <ActionLink
                  action={{ kind: 'section', target: 'hero' }}
                  onNavigate={close}
                  className="flex min-w-0 max-w-full items-center justify-self-start rounded-full"
                  aria-label={`${m.companyName}, back to top`}
                >
                  <Logo m={m} />
                </ActionLink>

                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-0.5">
                      {m.nav.map((item) => {
                        const isCurrent = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={`flex h-10 items-center rounded-full px-3.5 text-[14.5px] font-medium transition-colors duration-300 @7xl:px-4 ${
                                isCurrent ? `bg-[#F2EFE7] ${C.ink}` : `${C.muted} hover:bg-[#F2EFE7] hover:text-[#141612]`
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

                <div className="flex min-w-0 shrink-0 items-center justify-self-end gap-2 @7xl:gap-5">
                  {callText && tel && (
                    <p className="hidden items-center gap-1.5 whitespace-nowrap text-[13.5px] @min-[88rem]:flex">
                      <span className={C.muted}>{callText}</span>
                      <ActionLink action={{ kind: 'external', href: tel }} className={`font-semibold ${C.ink} underline-offset-4 hover:underline`}>
                        {m.phone}
                      </ActionLink>
                    </p>
                  )}
                  {m.headerAction && m.headerLabel && (
                    <span className="hidden min-w-0 @xl:flex">
                      <ActionLink action={m.headerAction} className={`group ${BTN.accent} h-12 px-5 text-[14px]`}>
                        <span className="truncate">{m.headerLabel}</span>
                        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-500 group-hover:rotate-45" />
                      </ActionLink>
                    </span>
                  )}
                  {m.nav.length > 0 && (
                    <button
                      ref={menuButton}
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      aria-expanded={open}
                      aria-controls={menuId}
                      aria-label={open ? 'Tutup menu' : 'Buka menu'}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F2EFE7] transition-colors duration-300 hover:bg-[#E8E4D9] @6xl:hidden ${C.ink}`}
                    >
                      {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>

              {open && (
                <nav
                  id={menuId}
                  aria-label="Menu utama"
                  className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-112px)] overflow-y-auto border-t border-[#141612]/[0.08] px-3 pb-3 pt-2 @3xl:px-4 @6xl:hidden"
                >
                  <ul>
                    {m.nav.map((item) => (
                      <li key={item.key}>
                        <ActionLink
                          action={{ kind: 'section', target: item.key }}
                          onNavigate={close}
                          aria-current={active === item.key ? 'true' : undefined}
                          className={`flex h-12 items-center justify-between rounded-[18px] px-3 text-[16px] font-semibold transition-colors hover:bg-[#F2EFE7] ${C.ink}`}
                        >
                          {item.label}
                          <ArrowUpRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                        </ActionLink>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 grid gap-2 @xl:hidden">
                    {m.headerAction && m.headerLabel && (
                      <ActionLink action={m.headerAction} onNavigate={close} className={`${BTN.accent} h-12 w-full px-5 text-[15px]`}>
                        {m.headerLabel}
                      </ActionLink>
                    )}
                    {tel && (
                      <ActionLink action={{ kind: 'external', href: tel }} onNavigate={close} className={`${BTN.white} h-12 w-full px-5 text-[15px]`}>
                        <Phone aria-hidden className="h-4 w-4" />
                        {m.phone}
                      </ActionLink>
                    )}
                  </div>
                </nav>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
