// Header Lajur: bilah putih PADAT yang menempel di atas, garis amber 4px paling atas, garis rambut di bawah (tanpa
// bayangan). Kiri: simbol jalan + nama Unbounded. Kanan (@6xl): menu Inter tebal dengan garis amber 2px di bawah section
// yang sedang dibaca; @7xl nomor telepon (JetBrains Mono); tombol amber "Minta penawaran" (ke bilah penawaran di hero).
// HP: nama + tombol menu 44px; panel putih di bawah bilah berisi tautan bernomor (Unbounded 22px), tombol penuh-lebar, dan
// telepon. Esc menutup dan mengembalikan fokus. Tinggi total 68 (HP) / 76px (layar lebar).
import { Menu, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { telHref, text } from '../shared/utils';
import { useActiveSection } from './hooks';
import { LajurMark } from './marks';
import { displayPhone, pad2, type LajurModel } from './model';
import { C, DISPLAY, WRAP } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m, tone = 'light' }: { m: LajurModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<LajurMark className={`h-8 w-8 ${dark ? 'text-(--lj-bright)' : 'text-[#14161A]'}`} />}
      nameClassName={`${DISPLAY} font-bold! text-[15px] leading-none tracking-[-0.01em] @3xl:text-[16px] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m }: { m: LajurModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    anchor,
    m.nav.map((item) => item.key),
  );
  const phone = text(m.contact, 'phone');
  const tel = telHref(phone);
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
    const root = anchor.current?.closest<HTMLElement>('[data-tpl-root]');
    if (!open || !root || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [open]);

  return (
    <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30 bg-white">
      <div ref={anchor} aria-hidden className="h-1 bg-(--tpl-accent)" />
      <div className={`border-b ${C.line}`}>
        <div className={WRAP}>
          <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[72px]">
            <ActionLink action={{ kind: 'section', target: 'hero' }} onNavigate={close} className="flex min-h-11 min-w-0 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} />
            </ActionLink>

            <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-6">
              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-0.5 @7xl:gap-2">
                    {m.nav.map((item) => {
                      const current = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={current ? 'true' : undefined}
                            className={`group relative flex h-11 items-center px-3 text-[14px] font-semibold transition-colors duration-200 ${current ? C.ink : 'text-[#14161A]/[0.72] hover:text-[#14161A]'}`}
                          >
                            {item.label}
                            <span
                              aria-hidden
                              className={`absolute inset-x-3 bottom-1 h-0.5 bg-(--tpl-accent) transition-opacity duration-200 ${current ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                            />
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}
              {tel && (
                <ActionLink action={{ kind: 'external', href: tel }} className={`hidden min-h-11 items-center gap-2 font-mono text-[14px] font-medium tabular-nums @7xl:flex ${C.ink}`}>
                  <Phone aria-hidden className="h-4 w-4 text-(--lj-ink)" strokeWidth={2} />
                  {displayPhone(phone)}
                </ActionLink>
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
                  // Panel menu hanya ada di DOM saat terbuka: id yang dirujuk tidak boleh menunjuk elemen yang tidak ada
                  aria-controls={open ? menuId : undefined}
                  aria-label={open ? 'Tutup menu' : 'Buka menu'}
                  className={`flex h-11 w-11 items-center justify-center rounded-[6px] ring-1 ring-inset ring-[#14161A]/25 transition-colors duration-200 hover:bg-[#F3F2EE] @6xl:hidden ${C.ink}`}
                >
                  {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                </button>
              )}
            </div>
          </div>
        </div>

        {open && (
          <nav id={menuId} aria-label="Menu utama" className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-68px)] overflow-y-auto border-t bg-white @6xl:hidden ${C.line}`}>
            <div className={`${WRAP} pb-6 pt-1`}>
              <ul className={`divide-y ${C.divide}`}>
                {m.nav.map((item, i) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={active === item.key ? 'true' : undefined}
                      className={`flex min-h-14 items-center gap-4 py-2 ${DISPLAY} text-[22px] font-medium tracking-[-0.01em] transition-colors hover:text-(--lj-ink) ${C.ink}`}
                    >
                      <span aria-hidden className={`w-7 font-sans text-[12px] font-semibold tabular-nums ${C.muted}`}>
                        {pad2(i + 1)}
                      </span>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
              <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-5 flex w-full" />
              {tel && (
                <ActionLink action={{ kind: 'external', href: tel }} onNavigate={close} className={`mt-3 flex min-h-11 items-center justify-center gap-2 font-mono text-[15px] font-medium tabular-nums ${C.ink}`}>
                  <Phone aria-hidden className="h-4 w-4 text-(--lj-ink)" strokeWidth={2} />
                  {displayPhone(phone)}
                </ActionLink>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
