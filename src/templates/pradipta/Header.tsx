// Header Pradipta: bilah PUTIH yang menempel di atas dan TIDAK pernah menumpang di foto hero (foto mulai tepat di
// bawahnya). Garis tipis di bawah bilah baru muncul setelah halaman digulir. Kiri logo + nama sekolah; tengah (layar
// lebar) menu di lintasan pil biru langit dengan penunjuk putih yang BERGESER mengikuti section yang sedang dibaca
// (scrollspy IntersectionObserver; diam di pratinjau CMS & prefers-reduced-motion); kanan tombol "Info SPMB". HP: logo
// + tombol menu bulat; panel menu di bawah bilah berisi menu utama kedua, Esc menutup dan mengembalikan fokus. Sama di
// halaman /berita, /pengumuman, dan tulisan.
import { ChevronRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useIndicator, useScrolledPast } from './hooks';
import { PradiptaMark } from './marks';
import type { PradiptaModel } from './model';
import { C, DISPLAY } from './styles';
import { PillLink } from './ui';

/** Logo sekolah (atau simbol Pradipta bila logo kosong) + nama sekolah. */
export function Logo({ m, className = '' }: { m: PradiptaModel; className?: string }) {
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      className={className}
      mark={<PradiptaMark className="h-10 w-10 text-(--tpl-accent)" />}
      nameClassName={`${DISPLAY} text-[15.5px] font-semibold leading-[1.2] tracking-[-0.015em] @3xl:text-[16.5px] ${C.ink}`}
    />
  );
}

export function Header({ m }: { m: PradiptaModel }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(sentinel);
  // Semua section diamati; yang tanpa item menu menyalakan item menu sebelumnya (penunjuk meluncur, tidak berkedip)
  const observed = useActiveSection(sentinel, m.navOwners);
  // Klik menu langsung menandai tujuannya (penunjuk tidak ikut melewati section di antaranya selama gulir halus)
  const active = picked ?? observed;
  useIndicator(track, active);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!picked) return;
    const timer = window.setTimeout(() => setPicked(null), 1200);
    return () => window.clearTimeout(timer);
  }, [picked]);

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

  // Menu HP terbuka lalu bingkai melebar sampai menu layar lebar tampil: tombol menu jadi display:none → tutup panel
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
      {/* Penanda gulir: 8px di bawah tepi atas halaman (begitu digulir sedikit, garis tipis bilah muncul) */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-2 h-px w-px" />
      <header
        className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b bg-white transition-[border-color] duration-200 ${
          scrolled || open ? 'border-black/[0.07]' : 'border-transparent'
        }`}
      >
        <div className={CONTAINER}>
          <div className="flex h-16 items-center justify-between gap-4 @5xl:h-[76px]">
            <ActionLink
              action={{ kind: 'section', target: 'hero' }}
              onNavigate={close}
              className="flex min-h-11 min-w-0 items-center rounded-[12px]"
              aria-label={`${m.companyName}, ke awal halaman`}
            >
              <Logo m={m} />
            </ActionLink>

            {m.nav.length > 0 && (
              <nav aria-label="Menu utama" className="hidden @6xl:block">
                {/* Lintasan pil: penunjuk putih (posisi dari ./hooks useIndicator) di bawah tautan yang aktif */}
                <div ref={track} className="relative rounded-full bg-(--pd-sky2) p-0.5">
                  <span aria-hidden className="pd-ind absolute bottom-0.5 left-0 top-0.5 rounded-full bg-white" />
                  <ul className="flex items-center">
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            onNavigate={() => setPicked(item.key)}
                            data-pd-key={item.key}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`relative z-10 flex h-11 items-center rounded-full px-4 text-[14px] transition-colors duration-200 ${
                              isCurrent ? `font-semibold ${C.ink}` : `font-medium ${C.body} hover:text-[#0E1B2B]`
                            }`}
                          >
                            {item.label}
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </nav>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden @3xl:flex">
                <PillLink action={m.headerAction} label={m.headerLabel} variant="primary" />
              </span>
              {m.nav.length > 0 && (
                <button
                  ref={menuButton}
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-controls={menuId}
                  aria-label={open ? 'Tutup menu' : 'Buka menu'}
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-(--pd-sky2) transition-colors duration-200 hover:bg-(--pd-ring) @6xl:hidden ${C.ink}`}
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
            className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-black/[0.07] bg-white @6xl:hidden"
          >
            <div className={`${CONTAINER} pb-5 pt-2`}>
              <ul className="divide-y divide-black/[0.07]">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={active === item.key ? 'true' : undefined}
                      className={`-mx-3 flex h-12 items-center justify-between rounded-[12px] px-3 text-[16px] font-medium transition-colors hover:bg-(--pd-sky) ${
                        active === item.key ? 'bg-(--pd-sky)' : ''
                      } ${C.ink}`}
                    >
                      {item.label}
                      <ChevronRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
              <div className="pt-4 @3xl:hidden">
                <PillLink action={m.headerAction} label={m.headerLabel} variant="primary" size="lg" onNavigate={close} className="w-full" />
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
