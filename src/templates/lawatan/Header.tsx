// Header Lawatan: bilah KREM padat yang menempel di atas (top: --tpl-sticky-top), garis airmail 4px di tepi paling atas
// (hijau tema · krem · tinta 20%, diagonal), garis rambut tinta 12% di bawah — tanpa bayangan, tanpa blur. Kiri: simbol
// perangko + nama Bricolage 800. Kanan (@6xl): menu Inter 14px (Paket, Itinerary, Termasuk, Testimoni, FAQ, Kontak) dengan
// garis bawah 2px warna tema untuk section yang sedang dibaca, lalu pil "Konsultasi Trip". HP: nama + tombol menu
// bundar 44px; panel menu krem di bawah bilah (tautan Bricolage 22px bergaris rambut, pil penuh-lebar); Esc menutup dan
// mengembalikan fokus. Tinggi 72 → 80px (stripe 4 + bilah 68/76): teks panggung film menjauh 88px dari atas.
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { LawatanMark } from './marks';
import type { LawatanModel } from './model';
import { C, DISPLAY, WRAP } from './styles';
import { ButtonLink } from './ui';

/**
 * Simbol + nama biro. Nama TIDAK dipotong "…" di HP sempit: di bawah 352px hurufnya 17px (demo tetap satu baris di 320px)
 * dan nama yang lebih panjang turun ke baris kedua (maks. 2 baris, baru sesudahnya "…").
 */
export function Logo({ m, tone = 'light' }: { m: LawatanModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<LawatanMark className={`h-8 w-8 ${dark ? 'text-[#FBF6EE]' : 'text-(--lw-ink)'}`} />}
      nameClassName={`${DISPLAY} font-extrabold! whitespace-normal! line-clamp-2 text-[19px] leading-[1.08] tracking-[-0.015em] @max-[22rem]:text-[17px] @xl:text-[20px] ${dark ? 'text-[#FBF6EE]' : C.ink}`}
    />
  );
}

export function Header({ m }: { m: LawatanModel }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const anchor = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    anchor,
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
    <header ref={anchor} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b bg-[#FBF6EE] ${C.line}`}>
      <div aria-hidden className="lw-airmail h-1" />
      <div className={WRAP}>
        <div className="flex h-[68px] items-center justify-between gap-3 @sm:gap-5 @5xl:h-[76px]">
          <ActionLink
            action={{ kind: 'section', target: 'hero' }}
            onNavigate={close}
            className="flex min-h-11 min-w-0 items-center"
            aria-label={`${m.companyName}, ke awal halaman`}
          >
            <Logo m={m} />
          </ActionLink>

          <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:gap-6 @7xl:gap-8">
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
                          className={`flex h-11 items-center px-3 text-[14.5px] font-semibold decoration-2 underline-offset-[10px] transition-colors duration-200 hover:underline hover:decoration-(--tpl-accent) ${
                            current ? `${C.ink} underline decoration-(--tpl-accent)` : 'text-[#1D2320]/75 hover:text-[#1D2320]'
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
                className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-[#1D2320]/30 transition-colors duration-200 hover:bg-white @6xl:hidden ${C.ink}`}
              >
                {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <nav id={menuId} aria-label="Menu utama" className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-72px)] overflow-y-auto border-t bg-[#FBF6EE] @6xl:hidden ${C.line}`}>
          <div className={`${WRAP} pb-6 pt-1`}>
            <ul className={`divide-y ${C.divide}`}>
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className={`flex min-h-14 items-center py-2 ${DISPLAY} text-[22px] font-bold transition-colors hover:text-(--lw-ink) ${C.ink}`}
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
    </header>
  );
}
