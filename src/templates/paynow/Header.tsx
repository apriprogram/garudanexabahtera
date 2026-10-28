// Header PayNow: menempel di atas. Di atas foto hero (belum digulir) TRANSPARAN dengan teks putih; setelah digulir 8px,
// saat menu HP terbuka, atau tanpa hero → bilah MALAM INDIGO padat dengan garis rambut putih 10% di bawahnya (tidak
// pernah putih). Kiri: simbol PayNow (atau logo) + nama. Kanan (layar lebar): menu teks dengan garis glow 2px pada
// section yang sedang dibaca, lalu tombol pil putih "Daftar merchant". HP: tombol menu bulat 44px; panel malam di bawah
// bilah (baris 56px, tombol penuh-lebar); Esc menutup dan mengembalikan fokus ke tombol menu.
import { Menu, Store, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import { PaynowMark } from './marks';
import type { PaynowModel } from './model';
import { DISPLAY } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m }: { m: PaynowModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<PaynowMark className="h-8 w-8 text-white" />}
      nameClassName={`${DISPLAY} font-bold! text-[19px] leading-none tracking-[-0.02em] text-white`}
    />
  );
}

export function Header({ m }: { m: PaynowModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const overlay = isEnabled(m.hero);
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

  // Menu HP terbuka lalu wadah melebar melewati @6xl: tombol menu jadi display:none → tutup menu
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

  return (
    <>
      {/* Penanda gulir: 8px di bawah tepi atas halaman template */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header data-pn-header={solid ? 'solid' : 'clear'} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone="inverse"
          className={`border-b transition-colors duration-300 ${solid ? 'border-white/10 bg-(--pn-night)' : 'border-transparent bg-transparent'}`}
        >
          <div className={CONTAINER}>
            <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[76px]">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-h-11 min-w-0 items-center rounded-full"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Logo m={m} />
              </ActionLink>

              <div className="flex shrink-0 items-center gap-6 @7xl:gap-9">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-1 @7xl:gap-2">
                      {m.nav.map((item) => {
                        const current = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={current ? 'true' : undefined}
                              className={`relative flex h-11 items-center px-3 text-[14.5px] font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-(--pn-glow) after:transition-opacity after:duration-200 ${
                                current ? 'text-white after:opacity-100' : 'text-white/80 after:opacity-0 hover:text-white'
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
                <div className="flex items-center gap-2">
                  <span className="hidden @xl:flex">
                    <ButtonLink action={m.headerAction} label={m.headerLabel} variant="light" size="md" icon={<Store aria-hidden className="h-4 w-4 shrink-0" />} />
                  </span>
                  {m.nav.length > 0 && (
                    <button
                      ref={menuButton}
                      type="button"
                      onClick={() => setOpen((v) => !v)}
                      aria-expanded={open}
                      aria-controls={menuId}
                      aria-label={open ? 'Tutup menu' : 'Buka menu'}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/25 transition-colors duration-200 hover:bg-white/15 @6xl:hidden"
                    >
                      {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {open && (
            <nav
              id={menuId}
              aria-label="Menu utama"
              className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-white/10 bg-(--pn-night) @6xl:hidden"
            >
              <div className={`${CONTAINER} pb-6 pt-2`}>
                <ul className="divide-y divide-white/10">
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex min-h-14 items-center justify-between gap-4 py-2 text-white transition-colors hover:text-(--pn-glow) ${DISPLAY} text-[19px] font-semibold tracking-[-0.01em]`}
                      >
                        {item.label}
                        <span aria-hidden className={`h-2 w-2 rounded-full ${active === item.key ? 'pn-grad' : 'bg-white/20'}`} />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  action={m.headerAction}
                  label={m.headerLabel}
                  variant="light"
                  onNavigate={close}
                  icon={<Store aria-hidden className="h-4 w-4 shrink-0" />}
                  className="mt-5 flex w-full"
                />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
