// Header Portline: dua lapis yang menempel di atas. Kiri: simbol + nama perusahaan (setinggi dua lapis). Kanan atas:
// bilah utilitas dengan dua tombol biru pejal kecil berikon (mis. "Container Lines", "Track a shipment" → tautan CMS,
// bukan pelacak sungguhan) dan pilihan bahasa "EN | ID". Kanan bawah: menu KAPITAL dengan garis bawah pada section yang
// sedang dibaca. Di atas foto hero (belum digulir) transparan dengan teks putih; setelah digulir putih pejal + garis
// tipis, bilah utilitas dilipat. Tanpa hero → selalu putih. HP: logo + tombol menu; panel menu (berisi juga tombol
// utilitas & bahasa) terbuka di bawah header, Esc menutup dan mengembalikan fokus ke tombol menu.
import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { text, type LinkAction } from '../shared/utils';
import { useEnquiry } from './context';
import { useActiveSection, useScrolledPast } from './hooks';
import { PortlineMark } from './marks';
import { matchType, type PortlineModel } from './model';
import { BTN, C, DISPLAY } from './styles';
import { AutoIcon } from './ui';

export function Logo({ m, tone }: { m: PortlineModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<PortlineMark className={`h-9 w-9 @5xl:h-10 @5xl:w-10 ${light ? 'text-white' : 'text-(--tpl-accent)'}`} />}
      nameClassName={`${DISPLAY} text-[17px] font-bold uppercase leading-none tracking-[0.05em]! @5xl:text-[19px] ${light ? 'text-white' : C.ink}`}
    />
  );
}

/** Pilihan bahasa "EN | ID": bahasa aktif bertanda, bahasa lain tautan bila diisi (selain itu teks dekoratif). */
function LangToggle({ m, solid }: { m: PortlineModel; solid: boolean }) {
  const current = text(m.hero, 'lang_current');
  const other = text(m.hero, 'lang_other');
  if (!current) return null;
  const box = solid ? 'ring-(--pl-deep)/30 text-(--pl-deep)' : 'ring-white/60 text-white';
  const dim = solid ? C.muted : 'text-white/85';
  return (
    <div role="group" aria-label={m.ui.languageGroup} className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em]">
      <span aria-current="true" className={`flex h-8 min-w-8 items-center justify-center rounded-[3px] px-1.5 ring-1 ring-inset ${box}`}>
        {current}
      </span>
      {other &&
        (m.langAction ? (
          <ActionLink action={m.langAction} lang={other.toLowerCase()} className={`flex h-8 min-w-8 items-center justify-center px-1.5 transition-colors hover:underline ${dim}`}>
            {other}
          </ActionLink>
        ) : (
          <span className={`flex h-8 min-w-8 items-center justify-center px-1.5 ${dim}`}>{other}</span>
        ))}
    </div>
  );
}

function UtilityButtons({ m, onNavigate, stacked = false }: { m: PortlineModel; onNavigate?: () => void; stacked?: boolean }) {
  const { setPrefill } = useEnquiry();
  const buttons: { label: string; action: LinkAction | null; prefill: boolean }[] = [
    { label: text(m.hero, 'utility_1_label'), action: m.utility1, prefill: false },
    { label: text(m.hero, 'utility_2_label'), action: m.utility2, prefill: !text(m.hero, 'utility_2_url') },
  ];
  const shown = buttons.filter((b) => b.label && b.action);
  if (shown.length === 0) return null;
  return (
    <ul className={stacked ? 'grid gap-2' : 'flex items-center gap-2'}>
      {shown.map((b, i) => (
        <li key={`${b.label}-${i}`}>
          <ActionLink
            action={b.action}
            onNavigate={() => {
              // "Track a shipment" tanpa tautan sendiri: formulir kontak dengan topik status pengiriman
              if (b.prefill && b.action?.kind === 'section' && b.action.target === 'contact') {
                setPrefill({ type: matchType(m.types, /status|track|lacak|shipment/i) });
              }
              onNavigate?.();
            }}
            className={`${BTN.small} ${stacked ? 'h-11 w-full justify-start text-[12.5px]' : ''} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`}
          >
            <AutoIcon text={b.label} index={i} className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{b.label}</span>
          </ActionLink>
        </li>
      ))}
    </ul>
  );
}

export function Header({ m, overlay }: { m: PortlineModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  // Latar putih: sudah digulir, tanpa hero, atau menu HP terbuka. Paling atas di atas foto → transparan, teks putih.
  const solid = scrolled || !overlay || open;
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const close = () => setOpen(false);
  const hasUtility = !!(text(m.hero, 'utility_1_label') || text(m.hero, 'utility_2_label') || text(m.hero, 'lang_current'));

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

  // Menu HP terbuka lalu bingkai melebar melewati @6xl: tombol & panel menu disembunyikan CSS → tutup menu
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
      {/* Penanda gulir: 16px di bawah tepi atas halaman (begitu digulir sedikit, header jadi putih) */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-4 h-px w-px" />
      <header className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          data-tpl-tone={solid ? undefined : 'inverse'}
          className={`border-b transition-[background-color,border-color] duration-300 ${solid ? 'border-(--pl-deep)/[0.1] bg-white' : 'border-transparent bg-transparent'}`}
        >
          <div className={CONTAINER}>
            <div className="flex min-h-16 items-center justify-between gap-6 @6xl:min-h-0 @6xl:items-stretch">
              {/* flex (bukan inline): logo & nama tepat di tengah tinggi header di semua zoom */}
              <ActionLink
                action={{ kind: 'section', target: 'hero' }}
                onNavigate={close}
                className="flex min-w-0 max-w-full items-center self-center"
                aria-label={`${m.companyName}, ${m.ui.toHome}`}
              >
                <Logo m={m} tone={solid ? 'dark' : 'light'} />
              </ActionLink>

              <div className="flex min-w-0 shrink-0 items-center gap-2 @6xl:flex-col @6xl:items-end @6xl:justify-center @6xl:gap-0">
                {hasUtility && (
                  <div
                    aria-hidden={scrolled || undefined}
                    inert={scrolled}
                    className={`hidden overflow-hidden transition-[max-height,opacity] duration-300 @6xl:block ${scrolled ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'}`}
                  >
                    <div className={`flex items-center gap-4 border-b py-2.5 ${solid ? 'border-(--pl-deep)/[0.1]' : 'border-white/20'}`}>
                      <UtilityButtons m={m} />
                      <LangToggle m={m} solid={solid} />
                    </div>
                  </div>
                )}
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-1 @7xl:gap-2">
                      {m.nav.map((item) => {
                        const isCurrent = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={`group relative flex h-14 items-center px-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300 @7xl:px-3 ${
                                solid ? (isCurrent ? C.ink : 'text-[#44546A] hover:text-(--pl-deep)') : 'text-white'
                              }`}
                            >
                              {item.label}
                              <span
                                aria-hidden
                                className={`absolute inset-x-2.5 bottom-2.5 h-[2px] origin-left transition-transform duration-300 @7xl:inset-x-3 ${
                                  solid ? 'bg-(--tpl-accent)' : 'bg-white'
                                } ${isCurrent ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                              />
                            </ActionLink>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                )}
                {(m.nav.length > 0 || hasUtility) && (
                  <button
                    ref={menuButton}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-[4px] transition-colors duration-300 @6xl:hidden ${
                      solid ? 'bg-(--pl-ice) text-(--pl-deep) hover:bg-(--pl-ice-2)' : 'bg-white/[0.12] text-white ring-1 ring-inset ring-white/30 hover:bg-white/20'
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
              className="max-h-[calc(100svh-var(--tpl-sticky-top,0px)-64px)] overflow-y-auto border-t border-(--pl-deep)/[0.08] @6xl:hidden"
            >
              <div className={`${CONTAINER} pb-5 pt-2`}>
                <ul>
                  {m.nav.map((item) => (
                    <li key={item.key} className="border-b border-(--pl-deep)/[0.08]">
                      <ActionLink
                        action={{ kind: 'section', target: item.key }}
                        onNavigate={close}
                        aria-current={active === item.key ? 'true' : undefined}
                        className={`flex h-13 items-center justify-between text-[14px] font-semibold uppercase tracking-[0.08em] ${C.ink}`}
                      >
                        {item.label}
                        <ArrowRight className="h-4 w-4 text-(--pl-ink)" aria-hidden />
                      </ActionLink>
                    </li>
                  ))}
                </ul>
                {hasUtility && (
                  <div className="mt-4 flex flex-col gap-3">
                    <UtilityButtons m={m} onNavigate={close} stacked />
                    <LangToggle m={m} solid />
                  </div>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
