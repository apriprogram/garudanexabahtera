// Header Kemudi: bilah putih dengan garis rambut bawah yang menempel di atas halaman (melayang di atas isi, tinggi 0 di
// alur halaman). 72px di puncak halaman, 60px setelah digulir 8px (transisi tinggi 200 ms bila gerak menyala). Kiri:
// simbol setir warna tema + nama Hanken 700. Kanan (@6xl): menu pil (Mobil, Harga, Syarat, Cara Sewa, FAQ, Kontak;
// section yang sedang dibaca berlatar abu) + tombol biru "Pesan Mobil". HP: nama + tombol menu 44px abu; panel menu
// putih di bawah bilah (tautan Hanken 22px bergaris rambut, tombol penuh-lebar); Esc menutup dan mengembalikan fokus.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { KemudiMark } from './marks';
import type { KemudiModel } from './model';
import { C, DISPLAY, WRAP } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m, tone = 'light' }: { m: KemudiModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<KemudiMark className={`h-8 w-8 ${dark ? 'text-(--km-bright)' : 'text-(--tpl-accent)'}`} />}
      nameClassName={`${DISPLAY} font-bold! text-[18px] leading-none tracking-[-0.02em] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m }: { m: KemudiModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const compact = useScrolledPast(sentinel);
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

  return (
    <>
      {/* Penanda gulir: 8px di bawah tepi atas halaman (begitu digulir sedikit, bilah memendek 72 → 60px) */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30 h-0">
        <div className="border-b border-[#0D1117]/[0.08] bg-white">
          <div className={WRAP}>
            <div data-compact={compact && !open ? 'true' : 'false'} className="km-bar flex h-[72px] items-center justify-between gap-5 data-[compact=true]:h-[60px]">
              <ActionLink action={{ kind: 'section', target: 'hero' }} onNavigate={close} className="flex min-h-11 min-w-0 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
                <Logo m={m} />
              </ActionLink>

              <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-5">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-0.5 @7xl:gap-1">
                      {m.nav.map((item) => {
                        const current = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={current ? 'true' : undefined}
                              className={`flex h-10 items-center rounded-xl px-3.5 text-[14.5px] font-medium transition-colors duration-200 ${
                                current ? `bg-[#F2F4F7] ${C.ink}` : 'text-[#0D1117]/70 hover:bg-[#F2F4F7] hover:text-[#0D1117]'
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
                  <ButtonLink action={m.headerAction} label={m.headerLabel} size="md" arrow={false} className="h-11 px-5" />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2F4F7] transition-colors duration-200 hover:bg-[#E8EBF0] @6xl:hidden ${C.ink}`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <nav id={menuId} aria-label="Menu utama" className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-72px)] overflow-y-auto border-t border-[#0D1117]/[0.08] bg-white @6xl:hidden">
              <div className={`${WRAP} pb-6 pt-1`}>
                <ul className={`divide-y ${C.divide}`}>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex min-h-14 items-center py-2 ${DISPLAY} text-[22px] font-semibold tracking-[-0.02em] transition-colors hover:text-(--km-ink) ${C.ink}`}
                      >
                        {item.label}
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} arrow={false} className="mt-5 flex w-full" />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
