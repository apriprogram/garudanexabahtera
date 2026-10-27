// Header Saudagar — masthead dua tingkat di atas kertas krem (TIDAK menempel; menyatu dengan latar hero). Layar lebar
// (@6xl): bilah tanggal tipis (tagline kiri, jam kerja kanan), lalu baris utama: menu kiri (Tentang · Komoditas · Mutu),
// simbol + nama perusahaan bertumpuk di TENGAH, menu kanan (Musim · Pasar · Galeri) + pil tinta "Minta penawaran".
// Item menu section yang sedang dibaca bergaris saffron. HP & tablet: satu baris — tombol menu kiri, simbol + nama di
// tengah, tombol bulat tinta berpanah kanan; panel menu (nav kedua "Menu utama") terbuka di bawah header, Esc menutup
// dan mengembalikan fokus ke tombol menu.
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { safeImage, telHref, text } from '../shared/utils';
import { useActiveSection } from './hooks';
import { SaudagarMark } from './marks';
import type { SaudagarModel, SaudagarNavItem } from './model';
import { C, SERIF } from './styles';
import { InkPill } from './ui';

/**
 * Simbol + nama perusahaan. `stacked` = simbol di atas nama (masthead layar lebar). Logo unggahan menggantikan simbol;
 * logo lebar (rasio ≥ 2,6) tampil sendiri tanpa nama, logo gagal dimuat → simbol bawaan.
 */
export function Wordmark({ m, stacked = false, className = '' }: { m: SaudagarModel; stacked?: boolean; className?: string }) {
  const url = safeImage(m.logo);
  const [state, setState] = useState<{ url: string; wide: boolean; broken: boolean } | null>(null);
  const current = state?.url === url ? state : null;
  const showLogo = !!url && !current?.broken;
  const showName = !showLogo || !current?.wide;
  return (
    <span className={`flex min-w-0 items-center ${stacked ? 'flex-col gap-1.5' : 'gap-2'} ${className}`}>
      {showLogo ? (
        <img
          src={url}
          alt={showName ? '' : m.companyName}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            setState({ url, wide: h > 0 && w / h >= 2.6, broken: false });
          }}
          onError={() => setState({ url, wide: false, broken: true })}
          className={`w-auto shrink-0 object-contain ${current?.wide ? 'h-9 max-w-[200px] @6xl:h-12' : stacked ? 'h-10 max-w-[64px]' : 'h-8 max-w-[48px]'}`}
        />
      ) : (
        <SaudagarMark className={`shrink-0 text-(--tpl-accent) ${stacked ? 'h-7 w-7' : 'h-[22px] w-[22px]'}`} />
      )}
      {showName && (
        <span className={`${SERIF} min-w-0 truncate font-normal leading-none tracking-[-0.01em] ${C.ink} ${stacked ? 'text-[26px]' : 'text-[19px]'}`}>{m.companyName}</span>
      )}
    </span>
  );
}

function NavLink({ item, active }: { item: SaudagarNavItem; active: boolean }) {
  return (
    <li>
      <ActionLink
        action={{ kind: 'section', target: item.key }}
        aria-current={active ? 'true' : undefined}
        className={`relative inline-flex h-11 items-center text-[14.5px] transition-colors duration-300 after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:origin-left after:bg-(--tpl-accent) after:transition-transform after:duration-300 ${
          active ? `${C.ink} after:scale-x-100` : 'text-[#221A13]/80 after:scale-x-0 hover:text-[#221A13]'
        }`}
      >
        {item.label}
      </ActionLink>
    </li>
  );
}

export function Header({ m }: { m: SaudagarModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    headerRef,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const left = m.nav.filter((item) => item.side === 'left');
  const right = m.nav.filter((item) => item.side === 'right');
  const hours = text(m.contact, 'hours');
  const phone = text(m.contact, 'phone');
  const tel = telHref(phone);
  const pill = m.headerAction && m.headerLabel;

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

  // Panel HP terbuka lalu bingkai melebar melewati @6xl: tombol menu jadi display:none → tutup panel
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
    <header ref={headerRef} className="relative z-30 bg-[#F7F2E8]">
      <div className={CONTAINER}>
        {(m.tagline || hours || phone) && (
          <div className={`hidden h-9 items-center justify-between gap-6 border-b text-[12.5px] @6xl:flex ${C.line} ${C.muted}`}>
            <p className="min-w-0 truncate">{m.tagline}</p>
            {hours ? (
              <p className="shrink-0">{hours}</p>
            ) : (
              tel && (
                <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-9 shrink-0 items-center hover:text-[#221A13]">
                  {phone}
                </ActionLink>
              )
            )}
          </div>
        )}

        <div
          className={`grid h-16 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b @6xl:h-24 @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @6xl:gap-10 ${C.line}`}
        >
          {m.nav.length > 0 ? (
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              className={`col-start-1 row-start-1 flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-[#221A13]/[0.16] transition-colors duration-300 hover:bg-[#EFE6D3] @6xl:hidden ${C.ink}`}
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          ) : (
            <span aria-hidden className="col-start-1 row-start-1 @6xl:hidden" />
          )}

          {/* Simbol + nama: tengah di semua lebar; di atas lapisan nav (nav selebar 3 kolom) agar tetap bisa diklik */}
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            aria-label={`${m.companyName}, ke awal halaman`}
            className="relative z-10 col-start-2 row-start-1 flex min-w-0 justify-center justify-self-center rounded-[4px]"
          >
            <Wordmark m={m} className="@6xl:hidden" />
            <Wordmark m={m} stacked className="hidden @6xl:flex" />
          </ActionLink>

          {pill ? (
            <ActionLink
              action={m.headerAction}
              aria-label={m.headerLabel}
              className="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#221A13] text-[#F7F2E8] transition-colors duration-300 hover:bg-[#3A2C21] @6xl:hidden"
            >
              <ArrowUpRight className="h-5 w-5" aria-hidden />
            </ActionLink>
          ) : (
            <span aria-hidden className="col-start-3 row-start-1 @6xl:hidden" />
          )}

          {/* Layar lebar: menu terbelah kiri-kanan (subgrid 3 kolom; kolom tengah milik simbol + nama) */}
          {(m.nav.length > 0 || pill) && (
            <nav aria-label="Menu utama" className="hidden @6xl:col-span-3 @6xl:col-start-1 @6xl:row-start-1 @6xl:grid @6xl:grid-cols-subgrid @6xl:items-center">
              <ul className="col-start-1 flex min-w-0 items-center justify-start gap-8">
                {left.map((item) => (
                  <NavLink key={item.key} item={item} active={active === item.key} />
                ))}
              </ul>
              <div className="col-start-3 flex min-w-0 items-center justify-end gap-8">
                {right.length > 0 && (
                  <ul className="flex items-center gap-8">
                    {right.map((item) => (
                      <NavLink key={item.key} item={item} active={active === item.key} />
                    ))}
                  </ul>
                )}
                <InkPill action={m.headerAction} label={m.headerLabel} size="md" arrow={false} className="shrink-0" />
              </div>
            </nav>
          )}
        </div>
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label="Menu utama"
          className={`absolute inset-x-0 top-full max-h-[calc(100svh-64px)] overflow-y-auto border-b bg-[#F7F2E8] @6xl:hidden ${C.line}`}
        >
          <div className={`${CONTAINER} pb-6 pt-2`}>
            <ul className={`divide-y ${C.divide}`}>
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`group flex min-h-14 items-center justify-between gap-4 ${SERIF} text-[26px] font-normal tracking-[-0.01em] ${C.ink}`}
                  >
                    {item.label}
                    <ArrowRight aria-hidden className="h-5 w-5 text-(--sg-ink) transition-transform duration-300 group-hover:translate-x-1" />
                  </ActionLink>
                </li>
              ))}
            </ul>
            <InkPill action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-5 flex w-full" />
          </div>
        </nav>
      )}
    </header>
  );
}
