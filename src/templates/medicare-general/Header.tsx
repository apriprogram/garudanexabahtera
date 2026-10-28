// Header MediCare General: STRIP MERAH IGD (48px) di paling atas — ikon sirene, "IGD 24 jam", nomor IGD yang bisa
// langsung ditelepon, dan kontrol "Ukuran teks" (A / A+ / A++) di kanan — lalu bilah putih solid bergaris tipis: simbol
// (atau logo) + nama, menu dengan garis aktif 3px warna tema, dan tombol "Daftar Online". Seluruh <header> menempel
// dengan `top` minus tinggi strip, jadi strip ikut tergulir dan bilah putih (64/72px) yang tetap terlihat. HP: tombol
// merah "Telepon IGD" 48px + tombol menu 48px; panel menu berisi ukuran teks, tautan besar, tombol daftar, dan
// telepon IGD. Esc menutup dan mengembalikan fokus. Ukuran huruf header TIDAK ikut kontrol ukuran teks (tinggi bilah
// harus tetap agar tujuan gulir section pas).
import { Menu, Phone, Siren, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { MediCareMark } from './marks';
import { displayPhone, type MedicareModel } from './model';
import { BTN, C, DISPLAY } from './styles';
import { ButtonLink, TextSizeControl } from './ui';

export function Logo({ m, tone = 'light' }: { m: MedicareModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<MediCareMark className={`h-9 w-9 ${dark ? 'text-white' : 'text-(--tpl-accent)'}`} />}
      nameClassName={`${DISPLAY} font-bold! text-[18px] leading-[1.15] tracking-[-0.01em] ${dark ? 'text-white' : C.ink}`}
    />
  );
}

export function Header({ m }: { m: MedicareModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const igdNumber = displayPhone(m.igdPhone);

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
    <header ref={headerRef} className="sticky top-[calc(var(--tpl-sticky-top,0px)-48px)] z-30 bg-white">
      {/* Strip IGD: merah darurat tetap, putih di atasnya 6,57:1 */}
      <div className="bg-[#B71C1C] text-white">
        <div className={`${CONTAINER} flex h-12 items-center justify-between gap-4`}>
          <p className="flex min-w-0 items-center gap-2.5 text-[15px] leading-tight">
            <Siren aria-hidden className="h-5 w-5 shrink-0" />
            <span className="shrink-0 font-bold">{m.igdLabel}</span>
            {m.igdAction && (
              <>
                <span aria-hidden className="text-white/70">
                  ·
                </span>
                <ActionLink
                  action={m.igdAction}
                  aria-label={`Telepon ${m.igdLabel}: ${igdNumber}`}
                  className="flex min-h-12 min-w-0 items-center truncate font-semibold tabular-nums underline decoration-white/60 decoration-1 underline-offset-4 hover:decoration-white"
                >
                  {igdNumber}
                </ActionLink>
              </>
            )}
          </p>
          <TextSizeControl tone="emergency" className="hidden shrink-0 @xl:flex" />
        </div>
      </div>

      <div className="border-b border-[#0E1B2E]/[0.1]">
        <div className={CONTAINER}>
          <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[72px]">
            {/* flex (bukan inline): logo & nama tepat di tengah tinggi bilah */}
            <ActionLink
              action={{ kind: 'section', target: 'hero' }}
              onNavigate={close}
              className="flex min-w-0 items-center rounded-[10px]"
              aria-label={`${m.companyName}, ke awal halaman`}
            >
              <Logo m={m} />
            </ActionLink>

            <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-5">
              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden self-stretch @6xl:flex">
                  <ul className="flex items-stretch">
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key} className="flex">
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`relative flex h-[72px] items-center px-2.5 text-[16px] font-semibold transition-colors duration-200 after:absolute after:inset-x-2.5 after:-bottom-px after:h-[3px] after:rounded-full after:bg-(--tpl-accent) after:transition-opacity after:duration-200 @7xl:px-3.5 @7xl:after:inset-x-3.5 ${
                              isCurrent ? `${C.ink} after:opacity-100` : 'text-[#0E1B2E]/80 after:opacity-0 hover:text-(--tpl-accent-ink)'
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
                <ButtonLink action={m.headerAction} label={m.headerLabel} className="min-h-12! px-5! text-[16px]!" />
              </span>
              {m.igdAction && (
                <ActionLink
                  action={m.igdAction}
                  aria-label={`Telepon ${m.igdLabel}: ${igdNumber}`}
                  className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#B71C1C] text-white transition-colors hover:bg-[#9A1717] @6xl:hidden"
                >
                  <Phone aria-hidden className="h-5 w-5" />
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
                  className={`flex h-12 w-12 items-center justify-center rounded-[10px] ring-1 ring-inset ring-[#0E1B2E]/20 transition-colors duration-200 hover:bg-[#F3F7FC] @6xl:hidden ${C.ink}`}
                >
                  {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
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
          className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-b border-[#0E1B2E]/[0.1] bg-white @5xl:max-h-[calc(100svh-var(--tpl-sticky-top,0px)-72px)] @6xl:hidden"
        >
          <div className={`${CONTAINER} pb-6 pt-4`}>
            <TextSizeControl className="@xl:hidden" />
            <ul className="mt-2 divide-y divide-[#0E1B2E]/[0.1]">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center py-2 text-[19px] font-semibold transition-colors hover:text-(--tpl-accent-ink) ${C.ink}`}
                  >
                    {item.label}
                  </ActionLink>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3">
              <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="w-full" />
              {m.igdAction && (
                <ActionLink action={m.igdAction} onNavigate={close} className={`${BTN.emergency} w-full`}>
                  <Phone aria-hidden className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    {m.igdLabel}: <span className="tabular-nums">{igdNumber}</span>
                  </span>
                </ActionLink>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
