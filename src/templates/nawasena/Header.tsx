// Header Nawasena: bilah selebar layar yang menempel di atas, SELALU bernada gelap (teks putih). Di atas foto hero
// (belum digulir) latarnya transparan di atas lapisan navy foto; setelah digulir 24px, saat menu HP terbuka, di halaman
// /berita, /pengumuman, tulisan, dan bila hero dimatikan → navy pekat dengan garis bawah putih 10%. Kiri: logo di kotak
// putih kecil (agar logo berwarna tetap terbaca di navy) + nama sekolah; kanan: menu dengan garis bawah aktif yang
// memanjang (scrollspy) dan tombol bergaris putih "SPMB 2027". HP/tablet: tombol menu 44px → lembar navy di bawah bilah
// (nav kedua "Menu utama"); Esc menutup dan mengembalikan fokus ke tombol menu.
import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { safeImage } from '../shared/utils';
import { useActiveSection, useScrolledPast } from './hooks';
import { NawasenaMark } from './marks';
import type { NawasenaModel } from './model';
import { ButtonLink } from './ui';

/** Logo sekolah di kotak putih kecil; tanpa logo (atau gagal dimuat) → simbol Nawasena berwarna navy. Dekoratif: nama
 *  sekolah ditulis di sampingnya dan tautannya berlabel. */
export function LogoChip({ logo, className = 'h-9 w-9 @5xl:h-10 @5xl:w-10' }: { logo: string; className?: string }) {
  const url = safeImage(logo);
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-[8px] bg-white p-1 ${className}`}>
      {url && broken !== url ? (
        <img src={url} alt="" onError={() => setBroken(url)} className="h-full w-full object-contain" />
      ) : (
        <NawasenaMark className="h-[72%] w-[72%] text-(--nw-navy)" />
      )}
    </span>
  );
}

export function Header({ m, overlay }: { m: NawasenaModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  // Navy pekat: sudah digulir, tanpa hero (sub-halaman / hero dimatikan), atau menu HP terbuka
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

  // Menu HP terbuka lalu bingkai melebar melewati @6xl: tombol & panel jadi display:none → tutup menu
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
      {/* Penanda gulir: 24px di bawah tepi atas halaman (begitu digulir sedikit, header jadi navy pekat) */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header data-tpl-tone="inverse" className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        {/* Menu HP dibuka → langsung navy pekat (tanpa transisi), jadi menu tidak pernah tampil di atas teks hero */}
        <div
          className={`border-b text-white ${open ? '' : 'transition-colors duration-300'} ${solid ? 'border-white/10 bg-(--nw-navy)' : 'border-transparent bg-transparent'}`}
        >
          <div className={CONTAINER}>
            <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[72px]">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                aria-label={`${m.companyName}, ke awal halaman`}
                className="flex min-h-11 min-w-0 items-center gap-3 rounded-[8px]"
              >
                <LogoChip logo={m.logo} />
                <span className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[-0.005em] text-white @5xl:text-[15.5px]">{m.companyName}</span>
              </ActionLink>

              <div className="flex shrink-0 items-center gap-2 @6xl:gap-6">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-1">
                      {m.nav.map((item) => {
                        const isCurrent = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={`relative flex h-11 items-center px-3 text-[14px] font-medium transition-colors duration-300 ${
                                isCurrent ? 'text-white' : 'text-white/[0.85] hover:text-white'
                              }`}
                            >
                              {item.label}
                              <span aria-hidden data-on={isCurrent ? 'true' : 'false'} className="nw-nav-line absolute inset-x-3 bottom-1.5 h-0.5 bg-(--nw-bright)" />
                            </ActionLink>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                )}
                <span className="hidden @6xl:flex">
                  <ButtonLink action={m.headerAction} label={m.headerLabel} variant="outlineWhite" size="sm" />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className="flex h-11 w-11 items-center justify-center rounded-[6px] text-white ring-1 ring-inset ring-white/25 transition-colors duration-300 hover:bg-white/10 @6xl:hidden"
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
              className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-white/10 bg-(--nw-navy) @6xl:hidden"
            >
              <div className={`${CONTAINER} pb-5 pt-1`}>
                <ul>
                  {m.nav.map((item) => (
                    <li key={item.key} className="border-b border-white/10">
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className="flex h-[52px] items-center justify-between text-[16px] font-medium text-white"
                      >
                        {item.label}
                        <ArrowRight className="h-4 w-4 text-white/[0.72]" aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <ButtonLink action={m.headerAction} label={m.headerLabel} variant="primary" size="lg" onNavigate={close} className="mt-5 w-full" />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
