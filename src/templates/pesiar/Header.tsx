// Header Pesiar: bilah lengket DI ATAS foto hero. Paling atas (belum digulir) transparan dengan teks putih dan garis
// rambut putih 20%; setelah digulir 8px (atau menu HP terbuka, atau hero disembunyikan) pasir padat #F5EFE6 dengan garis
// rambut tinta 12% — tanpa bayangan. Tiga kolom (@6xl): simbol + nama Playfair di kiri, menu di TENGAH persis
// (Tur, Rancang, Bandara, Mobil, FAQ, Kontak; titik aksen di bawah section yang sedang dibaca), tombol pil "Pesan Tur"
// di kanan. HP: nama + tombol menu bulat 44px; panel pasir di bawah bilah (nama section Playfair 26px bergaris rambut,
// tombol pil penuh-lebar); Esc menutup dan mengembalikan fokus. Tinggi 64 → 72px (teks film menjaga jarak ± 76px).
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { PesiarMark } from './marks';
import type { PesiarModel } from './model';
import { C, SERIF, WRAP } from './styles';
import { ButtonLink } from './ui';

/** Peralihan warna header (bilah, logo, menu) — sama panjang agar berganti serentak; instan bila gerak dikurangi. */
const TONE_FADE = 'transition-colors duration-300 motion-reduce:transition-none';

export function Logo({ m, tone = 'light' }: { m: PesiarModel; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<PesiarMark className={`h-8 w-8 ${TONE_FADE} ${dark ? 'text-[#F5EFE6]' : 'text-(--ps-ink)'}`} />}
      nameClassName={`${SERIF} font-semibold! text-[22px] leading-none tracking-[-0.01em] ${TONE_FADE} ${dark ? 'text-[#F5EFE6]' : C.ink}`}
    />
  );
}

export function Header({ m, overlay }: { m: PesiarModel; overlay: boolean }) {
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

  const tone = solid ? 'light' : 'dark';

  return (
    <>
      {/* Penanda gulir: 8px di bawah tepi atas halaman (begitu digulir sedikit, header jadi pasir padat) */}
      <div aria-hidden className="pointer-events-none relative h-0">
        <span ref={sentinel} className="absolute left-0 top-2 h-px w-px" />
      </div>
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone={solid ? undefined : 'inverse'}
          className={`border-b ${TONE_FADE} ${solid ? `bg-[#F5EFE6] ${C.line}` : 'border-white/20 bg-transparent'}`}
        >
          <div className={WRAP}>
            <div className="flex h-16 items-center justify-between gap-5 @6xl:grid @6xl:h-[72px] @6xl:grid-cols-[1fr_auto_1fr]">
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-h-11 min-w-0 items-center justify-self-start"
                aria-label={`${m.companyName}, ke awal halaman`}
              >
                <Logo m={m} tone={tone} />
              </ActionLink>

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
                            // Di atas foto: putih penuh (langit berkabut terang; titik di bawah menandai section aktif)
                            className={`relative flex h-11 items-center px-3 text-[14.5px] font-medium ${TONE_FADE} ${
                              solid ? (current ? C.ink : 'text-[#1E2622]/75 hover:text-[#1E2622]') : 'text-white'
                            }`}
                          >
                            {item.label}
                            <span
                              aria-hidden
                              className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-[opacity,background-color] duration-300 motion-reduce:transition-none ${solid ? 'bg-(--ps-ink)' : 'bg-white'} ${
                                current ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                          </ActionLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}

              <div className="flex min-w-0 shrink-0 items-center justify-self-end gap-2">
                <span className="hidden min-w-0 @xl:flex">
                  <ButtonLink action={m.headerAction} label={m.headerLabel} size="sm" arrow={false} />
                </span>
                {m.nav.length > 0 && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ${TONE_FADE} @6xl:hidden ${
                      solid ? `ring-[#1E2622]/30 hover:bg-white ${C.ink}` : 'text-white ring-white/60 hover:bg-white/10'
                    }`}
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
              className={`max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t bg-[#F5EFE6] @6xl:hidden ${C.line}`}
            >
              <div className={`${WRAP} pb-6 pt-1`}>
                <ul className={`divide-y ${C.divide}`}>
                  {m.nav.map((item) => (
                    <li key={item.key}>
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex min-h-14 items-center py-2 ${SERIF} text-[26px] font-medium transition-colors hover:text-(--ps-ink) ${C.ink}`}
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
