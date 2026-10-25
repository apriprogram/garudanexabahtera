// Header TaniMakmur: menu TRANSPARAN di atas foto ladang — kiri simbol tunas + nama putih, kanan tautan huruf kapital
// kecil (item aktif bergaris bawah), tombol konsultasi berbingkai, dan tombol cari KOTAK warna aksen seperti referensi.
// Header berupa lapisan lengket setinggi 0 yang menumpang di atas hero; setelah digulir (atau saat menu/cari terbuka)
// menjadi bilah krem tembus + blur dengan teks gelap. Tanpa hero → bilah krem biasa. Tombol cari membuka kolom
// pencarian halaman (produk, paket, panduan, tanya jawab, bagian) yang menggulir ke bagian yang dipilih.
// HP: simbol + nama, tombol cari, tombol menu; panel menu di bawah bilah.
import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, usePageSelection, useScrolledPast, useShopFilter } from './hooks';
import { TaniMark } from './marks';
import { searchFilter, type SearchEntry, type TaniModel } from './model';
import { BTN, C, DISPLAY } from './styles';
import { PillLink } from './ui';

export function Logo({ m, tone }: { m: TaniModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<TaniMark className={`h-8 w-8 ${light ? 'text-(--tm-glow)' : 'text-[#1E3A16]'}`} />}
      nameClassName={`${DISPLAY} font-semibold text-[19px] tracking-[-0.02em] @3xl:text-[20px] ${light ? 'text-white' : 'text-[#18230F]'}`}
    />
  );
}

function SearchPanel({ m, id, onClose }: { m: TaniModel; id: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { setCategory } = useShopFilter();
  const { setBundle, setFaq } = usePageSelection();
  // Hasil yang diklik ikut terlihat di tujuannya: tab paket dipilih, pertanyaan FAQ dibuka, filter produk disamakan
  const pick = (entry: SearchEntry) => {
    if (entry.target === 'bundles' && entry.index !== undefined) setBundle(entry.index);
    if (entry.target === 'faq' && entry.index !== undefined) setFaq(entry.index);
    if (entry.target === 'products' && entry.category !== undefined) setCategory(entry.category);
    onClose();
  };
  const input = useRef<HTMLInputElement>(null);
  const results = searchFilter(m.search, query);
  const typed = query.trim() !== '';

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div id={id} className={`${CONTAINER} pb-5`}>
      <div role="search" className="mx-auto max-w-[680px]">
        <label className="relative block">
          <span className="sr-only">Cari di halaman</span>
          <Search aria-hidden className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${C.muted}`} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari benih, pupuk, paket tanam…"
            autoComplete="off"
            className="h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-[15px] text-[#18230F] ring-1 ring-inset ring-[#18230F]/10 placeholder:text-[#535E47] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {!typed && m.nav.length > 0 && (
          <div className="mt-4">
            <p className={`px-1 text-[12px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>Pintasan</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={onClose}
                    className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-medium text-[#18230F] ring-1 ring-inset ring-[#18230F]/10 transition-colors hover:bg-[#ECE6CF]"
                  >
                    {item.label}
                  </ActionLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {typed && results.length > 0 && (
          <ul className="mt-3" aria-label="Hasil pencarian">
            {results.map((entry, i) => (
              <li key={`${entry.target}-${entry.label}-${i}`}>
                <ActionLink
                  action={{ kind: 'section', target: entry.target }}
                  onNavigate={() => pick(entry)}
                  className="group flex min-h-12 items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-colors hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[#18230F]">{entry.label}</span>
                    <span className={`block text-[12.5px] ${C.muted}`}>{entry.group}</span>
                  </span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[#1E3A16] transition-transform group-hover:translate-x-0.5" />
                </ActionLink>
              </li>
            ))}
          </ul>
        )}

        {typed && results.length === 0 && (
          <div className={`mt-4 px-1 text-[14px] ${C.muted}`}>
            <p>Tidak ada hasil untuk “{query.trim()}”.</p>
            {m.startAction && (
              <ActionLink action={m.startAction} onNavigate={onClose} className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-semibold text-[#1E3A16]">
                Tanyakan stoknya kepada kami
                <ArrowRight aria-hidden className="h-4 w-4" />
              </ActionLink>
            )}
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {typed ? `${results.length} hasil` : ''}
        </p>
      </div>
    </div>
  );
}

export function Header({ m, overlay }: { m: TaniModel; overlay: boolean }) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const menuId = useId();
  const searchId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolledPast(sentinel);
  const active = useActiveSection(
    sentinel,
    m.nav.map((item) => item.key),
  );
  const solid = !overlay || scrolled || open || searching;
  const close = () => {
    setOpen(false);
    setSearching(false);
  };

  useEffect(() => {
    if (!open && !searching) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (searching) searchButton.current?.focus();
      setOpen(false);
      setSearching(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, searching]);

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header data-tpl-tone={solid ? undefined : 'inverse'} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color] duration-300 ${
            solid ? 'border-[#18230F]/[0.08] bg-[#F6F2E3]/92 backdrop-blur-md' : 'border-transparent'
          }`}
        >
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-3 @3xl:h-[80px]">
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-full" onNavigate={close}>
                <Logo m={m} tone={solid ? 'dark' : 'light'} />
              </ActionLink>

              <div className="flex shrink-0 items-center gap-2 @6xl:gap-8">
                {m.nav.length > 0 && (
                  <nav aria-label="Menu utama" className="hidden @6xl:block">
                    <ul className="flex items-center gap-7 @7xl:gap-9">
                      {m.nav.map((item) => {
                        const isCurrent = active === item.key;
                        return (
                          <li key={item.key}>
                            <ActionLink
                              action={{ kind: 'section', target: item.key }}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={`relative flex h-10 items-center text-[13px] font-medium uppercase tracking-[0.08em] transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-[2px] after:bg-(--tpl-accent) after:transition-opacity ${
                                solid
                                  ? isCurrent
                                    ? 'text-[#18230F]'
                                    : 'text-[#18230F]/70 hover:text-[#18230F]'
                                  : isCurrent
                                    ? 'text-white'
                                    : 'text-white/85 hover:text-white'
                              } ${isCurrent ? 'after:opacity-100' : 'after:opacity-0'}`}
                            >
                              {item.label}
                            </ActionLink>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                )}

                <div className="flex items-center gap-1.5 @xl:gap-2">
                  <span className="hidden @xl:inline-flex">
                    <PillLink action={m.headerAction} label={m.headerLabel} arrow={false} className={`${solid ? BTN.ghost : BTN.ghostDark} ${BTN.sm}`} />
                  </span>
                  {m.search.length > 0 && (
                    <button
                      ref={searchButton}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setSearching((v) => !v);
                      }}
                      aria-expanded={searching}
                      aria-controls={searchId}
                      aria-label={searching ? 'Tutup pencarian' : 'Cari di halaman'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-(--tpl-accent) text-(--tpl-on-accent) transition-colors hover:bg-(--tpl-accent-hover)"
                    >
                      {searching ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
                    </button>
                  )}
                  {m.nav.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearching(false);
                        setOpen((v) => !v);
                      }}
                      aria-expanded={open}
                      aria-controls={menuId}
                      aria-label={open ? 'Tutup menu' : 'Buka menu'}
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-colors @6xl:hidden ${
                        solid ? 'bg-[#ECE6CF] text-[#18230F] hover:bg-[#E2DBC0]' : 'bg-white/[0.12] text-white hover:bg-white/20'
                      }`}
                    >
                      {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {searching && <SearchPanel m={m} id={searchId} onClose={close} />}

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
              <ul className="rounded-[24px] bg-white p-2">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={active === item.key ? 'true' : undefined}
                      className="flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium text-[#18230F] transition-colors hover:bg-[#F6F2E3]"
                    >
                      {item.label}
                      <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
              <PillLink action={m.headerAction} label={m.headerLabel} onNavigate={close} className={`${BTN.ink} ${BTN.lg} mt-3 flex w-full @xl:hidden`} />
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
