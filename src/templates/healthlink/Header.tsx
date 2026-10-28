// Header HealthLink: bilah putih MELAYANG (radius 20, garis 1px, tanpa bayangan) yang menempel 12px dari atas di atas
// foto hero, seperti bilah aplikasi. Kiri: simbol di kotak tint + nama. Layar lebar: menu berupa grup kapsul bersegmen
// (kanvas abu; item aktif = kapsul putih bergaris, dari IntersectionObserver), lalu tombol "Konsultasi". HP: nama +
// tombol menu 44px; panel menu = kartu ala bottom sheet di bawah bilah: baris seperti daftar pengaturan (ikon di kotak
// tint, label, panah), tombol penuh-lebar di bawahnya. Esc menutup dan mengembalikan fokus ke tombol menu.
import { ChevronRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { HealthLinkMark } from './marks';
import type { HealthLinkModel } from './model';
import { C, DISPLAY } from './styles';
import { ButtonLink, ItemIcon } from './ui';

/** Ikon baris menu HP per section (nama → ikon otomatis di ./icons). */
const MENU_ICON: Record<string, string> = {
  services: 'Layanan dokter',
  doctors: 'Chat dokter',
  prescription: 'Resep obat',
  hospitals: 'Rumah sakit',
  pricing: 'Langganan keluarga',
  faq: 'Tanya',
};

export function Logo({ m, tone = 'light' }: { m: HealthLinkModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={
        <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${dark ? 'bg-white/10 text-white' : 'bg-(--hl-tint) text-(--hl-solid)'}`}>
          <HealthLinkMark className="h-7 w-7" />
        </span>
      }
      nameClassName={`${DISPLAY} font-bold! text-[17px] leading-[1.15] tracking-[-0.02em] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m, overlay }: { m: HealthLinkModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
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
    // Di atas hero: tinggi 0 (foto hero mulai dari tepi atas, bilah melayang di atasnya); tanpa hero: bilah biasa
    <header ref={headerRef} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : 'pb-3'}`}>
      <div className={`${CONTAINER} pt-3`}>
        <div className="flex h-[60px] items-center justify-between gap-3 rounded-[20px] bg-white pl-3 pr-2 ring-1 ring-inset ring-[#0E1B2B]/[0.08] @3xl:h-16 @3xl:pl-4">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-w-0 items-center rounded-xl"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          {m.nav.length > 0 && (
            <nav aria-label="Menu utama" className="hidden @6xl:block">
              <ul className="flex items-center gap-1 rounded-full bg-[#F5F7FA] p-1">
                {m.nav.map((item) => {
                  const isCurrent = active === item.key;
                  return (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex h-11 items-center rounded-full px-4 text-[14.5px] font-semibold transition-colors duration-200 ${
                          isCurrent ? `bg-white ring-1 ring-inset ring-[#0E1B2B]/[0.08] ${C.ink}` : `${C.muted} hover:text-[#0E1B2B]`
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

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden @xl:flex">
              <ButtonLink action={m.headerAction} label={m.headerLabel} size="sm" />
            </span>
            {m.nav.length > 0 && (
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className={`flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F7FA] transition-colors duration-200 hover:bg-(--hl-tint) @6xl:hidden ${C.ink}`}
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
            className="mt-2 max-h-[calc(100svh-var(--tpl-sticky-top,0px)-96px)] overflow-y-auto rounded-[24px] bg-white p-2 ring-1 ring-inset ring-[#0E1B2B]/[0.08] @6xl:hidden"
          >
            <ul>
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-[#F5F7FA] ${C.ink}`}
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-(--hl-tint) text-(--hl-tint-ink)">
                      <ItemIcon title={MENU_ICON[item.key] ?? item.label} className="h-5 w-5" />
                    </span>
                    <span className={`${DISPLAY} flex-1 text-[17px] font-semibold`}>{item.label}</span>
                    <ChevronRight aria-hidden className="h-5 w-5 text-[#4A5869]" />
                  </ActionLink>
                </li>
              ))}
            </ul>
            <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-2 flex w-full" />
          </nav>
        )}
      </div>
    </header>
  );
}
