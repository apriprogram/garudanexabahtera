// Header MomKid: bilah krem SOLID yang menempel di atas (tidak transparan di atas foto), garis tipis di bawahnya.
// Kiri: simbol buaian di lingkaran peach lembut (atau logo) + nama Nunito. Tengah (layar lebar): KAPSUL menu berwarna
// peach lembut berisi tautan utama; tautan section yang sedang dibaca menjadi pil putih. Kanan: tombol pil "Daftar
// Kunjungan". HP & tablet: nama + tombol menu bulat 44px; lembar menu di bawah header berisi SEMUA section yang tampil
// (doodle di lingkaran pastel + label besar) dan tombol penuh-lebar; Esc menutup dan mengembalikan fokus.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { Doodle } from './art';
import { useActiveSection } from './hooks';
import type { DoodleName } from './icons';
import { MomkidMark } from './marks';
import type { MomkidModel } from './model';
import { C, DISPLAY, PASTELS } from './styles';
import { ButtonLink } from './ui';

/** Doodle per tautan di lembar menu HP. */
const NAV_DOODLE: Record<string, DoodleName> = {
  journey: 'heart',
  packages: 'swaddle',
  immunization: 'shield',
  pediatrics: 'stethoscope',
  lactation: 'drop',
  tour: 'bed',
  articles: 'book',
  faq: 'chat',
  contact: 'pin',
};

export function Logo({ m }: { m: MomkidModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--mk-peach)">
          <MomkidMark className="h-7 w-7 text-(--mk-accent-text)" />
        </span>
      }
      nameClassName={`${DISPLAY} font-extrabold! text-[17px] leading-[1.15] tracking-[-0.01em] @3xl:text-[18px] ${C.ink}`}
    />
  );
}

export function Header({ m }: { m: MomkidModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const primary = m.nav.filter((item) => item.primary);

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

  return (
    <header ref={headerRef} className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-[#2E2228]/[0.08] bg-[#FFF9F5]">
      <div className={CONTAINER}>
        <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[76px]">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-w-0 items-center rounded-full"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          {primary.length > 0 && (
            <nav aria-label="Menu utama" className="hidden @6xl:block">
              <ul className="flex items-center gap-0.5 rounded-full bg-(--mk-peach-soft) p-1.5">
                {primary.map((item) => {
                  const isCurrent = active === item.key;
                  return (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex h-10 items-center rounded-full px-3.5 ${DISPLAY} text-[14.5px] font-bold transition-colors duration-200 @7xl:px-4 ${
                          isCurrent ? `bg-white ${C.ink}` : `${C.ink} hover:bg-white/70`
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

          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="hidden min-w-0 @xl:flex">
              <ButtonLink action={m.headerAction} label={m.headerLabel} size="md" arrow={false} />
            </span>
            {m.nav.length > 0 && (
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-(--mk-peach-soft) transition-colors duration-200 hover:bg-(--mk-peach) @6xl:hidden ${C.ink}`}
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
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto rounded-b-[28px] border-t border-[#2E2228]/[0.08] bg-[#FFF9F5] @5xl:max-h-[calc(100svh-var(--tpl-sticky-top,0px)-76px)] @6xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-3`}>
            <ul className="grid gap-1 @xl:grid-cols-2 @xl:gap-x-4">
              {m.nav.map((item, i) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center gap-3.5 rounded-[20px] px-2 py-1.5 transition-colors hover:bg-(--mk-peach-soft) ${C.ink}`}
                  >
                    <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${PASTELS[i % 2]}`}>
                      <Doodle name={NAV_DOODLE[item.key] ?? 'heart'} blob="" className="h-8 w-8" />
                    </span>
                    <span className={`${DISPLAY} text-[19px] font-extrabold tracking-[-0.01em]`}>{item.label}</span>
                  </ActionLink>
                </li>
              ))}
            </ul>
            <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-4 flex w-full" />
          </div>
        </nav>
      )}
    </header>
  );
}
