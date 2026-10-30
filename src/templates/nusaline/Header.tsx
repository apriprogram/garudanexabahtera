// Header Nusaline: bilah yang menempel di atas, DI ATAS foto malam hero. Paling atas (belum digulir) transparan dengan
// teks putih dan garis rambut putih 15%; setelah digulir 8px (atau menu HP terbuka, atau hero disembunyikan) midnight
// padat #0B1026 — tetap GELAP — dengan garis rambut putih 10%, tanpa bayangan. Kiri: simbol bulan & jalur (neon) +
// nama Red Hat Display 900. Kanan (@6xl): menu (Jadwal, Kelas, Rute, Fasilitas, FAQ, Kontak) dengan garis neon 2px
// untuk section yang sedang dibaca, lalu tombol pill warna tema "Cek Jadwal". HP: nama + tombol menu bundar 44px; panel
// menu midnight di bawah bilah (tautan besar bergaris rambut, tombol penuh-lebar); Esc menutup dan mengembalikan fokus.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { NusalineMark } from './marks';
import type { NusalineModel } from './model';
import { C, DISPLAY, WRAP } from './styles';
import { ButtonLink } from './ui';

export function Logo({ m }: { m: NusalineModel }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<NusalineMark className="h-8 w-8 text-(--nl-neon)" />}
      nameClassName={`${DISPLAY} font-black! text-[22px] leading-none tracking-[-0.02em] text-white`}
    />
  );
}

export function Header({ m, overlay }: { m: NusalineModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
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
      {/* Penanda gulir: 8px di bawah tepi atas halaman (begitu digulir sedikit, header jadi midnight padat) */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone="inverse"
          data-solid={solid ? 'true' : 'false'}
          className={`border-b transition-colors duration-300 ${solid ? 'border-white/10 bg-[#0B1026]' : 'border-white/15 bg-transparent'}`}
        >
          <div className={WRAP}>
            <div className="flex h-[68px] items-center justify-between gap-5 @5xl:h-[76px]">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-h-11 min-w-0 items-center"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Logo m={m} />
              </ActionLink>

              <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-6">
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
                              className={`relative flex h-11 items-center px-3 text-[14.5px] font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:transition-colors ${
                                current ? 'text-white after:bg-(--nl-neon)' : 'text-white/80 after:bg-transparent hover:text-white'
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
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/30 transition-colors duration-200 hover:bg-white/10 @6xl:hidden"
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
              className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-68px)] overflow-y-auto border-t bg-[#0B1026] @6xl:hidden ${C.lineDark}`}
            >
              <div className={`${WRAP} pb-6 pt-1`}>
                <ul className="divide-y divide-white/10">
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex min-h-14 items-center justify-between py-2 ${DISPLAY} text-[24px] font-bold text-white transition-colors after:font-mono after:text-[14px] after:font-medium after:text-(--nl-neon) after:content-['→'] hover:text-(--nl-neon)`}
                      >
                        {item.label}
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                <ButtonLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className="mt-5 flex w-full" />
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
