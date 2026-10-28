// Header SmashHall: bilah putih SOLID yang menempel di atas dengan garis tipis di bawahnya. Kiri: simbol kok (warna
// tema) + nama GOR (Sora 700). Tengah (layar lebar): menu teks; section yang sedang dibaca diberi "lozenge" tint warna
// tema. Kanan: chip jam buka (layar sangat lebar), tombol "Booking" rounded-xl, dan tombol menu 44px (HP & tablet).
// Panel menu HP terbuka di bawah header (baris berikon kok, tombol penuh-lebar); Esc menutup dan mengembalikan fokus.
import { CalendarCheck, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { text } from '../shared/utils';
import { useActiveSection } from './hooks';
import { ShuttleIcon, SmashHallMark } from './marks';
import type { SmashModel } from './model';
import { C, DISPLAY } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m }: { m: SmashModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<SmashHallMark className="h-8 w-8 text-(--tpl-accent)" />}
      nameClassName={`${DISPLAY} font-bold! text-[16px] leading-[1.2] tracking-[-0.02em] @3xl:text-[17px] ${C.ink}`}
    />
  );
}

export function Header({ m }: { m: SmashModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const hours = text(m.contact, 'hours_short');

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
    const root = headerRef.current?.closest<HTMLElement>('[data-tpl-root]');
    if (!open || !root || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [open]);

  const cta = <ButtonLink action={m.headerAction} label={m.headerLabel} size="md" arrow={false} icon={<CalendarCheck aria-hidden className="h-4 w-4 shrink-0" />} />;

  return (
    <header ref={headerRef} className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-[#171512]/10 bg-white">
      <div className={CONTAINER}>
        <div className="flex h-16 items-center justify-between gap-5 @5xl:h-[76px]">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-w-0 items-center rounded-xl"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          {m.nav.length > 0 && (
            <nav aria-label="Menu utama" className="hidden min-w-0 @6xl:block">
              <ul className="flex items-center gap-1">
                {m.nav.map((item) => {
                  const isCurrent = active === item.key;
                  return (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex h-11 items-center rounded-xl px-3 text-[14px] font-medium transition-colors duration-200 @7xl:px-3.5 ${
                          isCurrent ? 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)' : 'text-[#171512]/75 hover:bg-[#F6F5F3] hover:text-[#171512]'
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

          <div className="flex shrink-0 items-center gap-2 @3xl:gap-3">
            {hours && (
              <p className={`hidden items-center gap-2 text-[13px] font-medium @min-[90rem]:flex ${C.muted}`}>
                <span aria-hidden className="h-2 w-2 rounded-full bg-(--tpl-accent)" />
                {hours}
              </p>
            )}
            <span className="hidden @xl:flex">{cta}</span>
            {m.nav.length > 0 && (
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ring-[#171512]/20 transition-colors duration-200 hover:bg-[#F6F5F3] @6xl:hidden ${C.ink}`}
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
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-[#171512]/10 bg-white @5xl:max-h-[calc(100svh-var(--tpl-sticky-top,0px)-76px)] @6xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-1`}>
            <ul className="divide-y divide-[#171512]/10">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center gap-3.5 py-2 transition-colors hover:text-(--tpl-accent-ink) ${C.ink}`}
                  >
                    <ShuttleIcon className="h-4 w-4 shrink-0 rotate-[-30deg] text-(--tpl-accent-ink)" />
                    <span className={`${DISPLAY} text-[20px] font-semibold tracking-[-0.02em]`}>{item.label}</span>
                  </ActionLink>
                </li>
              ))}
            </ul>
            {hours && <p className={`mt-4 text-[14px] ${C.muted}`}>{hours}</p>}
            <ButtonLink
              action={m.headerAction}
              label={m.headerLabel}
              onNavigate={close}
              arrow={false}
              icon={<CalendarCheck aria-hidden className="h-4 w-4 shrink-0" />}
              className="mt-4 flex w-full"
            />
          </div>
        </nav>
      )}
    </header>
  );
}
