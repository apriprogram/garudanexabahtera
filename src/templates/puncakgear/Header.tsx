// Header PuncakGear: menu TRANSPARAN di atas foto hero — kiri simbol puncak + nama putih, tengah tautan huruf kapital
// kecil (item aktif bergaris bawah aksen), kanan tombol cari bulat + tombol pil bergaris putih ("Sewa Alat"). Header
// berupa lapisan lengket setinggi 0 yang menumpang di atas hero; setelah digulir (atau saat menu/cari terbuka) menjadi
// bilah putih tembus + blur dengan teks tinta. Tanpa hero → bilah putih biasa. Tombol cari membuka kolom pencarian
// halaman (produk, gunung, alat sewa, tips, tanya jawab) yang menggulir ke bagian yang dipilih — memilih gunung juga
// langsung membuka panduannya, memilih kategori menyaring produk. HP: simbol + nama, tombol cari, tombol menu.
import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { PuncakMark } from './marks';
import { searchFilter, type PuncakModel, type SearchEntry } from './model';
import { BTN, C, DISPLAY } from './styles';
import { PillLink } from './ui';

export function Logo({ m, tone }: { m: PuncakModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<PuncakMark className={`h-8 w-8 ${light ? 'text-white' : 'text-[#0E1512]'}`} />}
      nameClassName={`${DISPLAY} text-[17px] tracking-[-0.02em] @3xl:text-[18px] ${light ? 'text-white' : 'text-[#0E1512]'}`}
    />
  );
}

function SearchPanel({ m, id, onClose, onPick }: { m: PuncakModel; id: string; onClose: () => void; onPick: (entry: SearchEntry) => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = searchFilter(m.search, query);
  const shortcuts = m.nav.filter((item) => item.key !== 'hero');
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
            placeholder="Cari produk, gunung, atau alat sewa…"
            autoComplete="off"
            className="h-12 w-full rounded-full bg-[#F1F2EE] pl-11 pr-4 text-[15px] text-[#0E1512] placeholder:text-[#59625C] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {!typed && shortcuts.length > 0 && (
          <div className="mt-4">
            <p className={`px-1 text-[12px] font-semibold uppercase tracking-[0.14em] ${C.muted}`}>Pintasan</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {shortcuts.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={onClose}
                    className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium text-[#0E1512] ring-1 ring-inset ring-black/[0.1] transition-colors hover:bg-[#F1F2EE]"
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
                  onNavigate={() => {
                    onPick(entry);
                    onClose();
                  }}
                  className="group flex min-h-12 items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-colors hover:bg-[#F1F2EE]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[#0E1512]">{entry.label}</span>
                    <span className={`block text-[12.5px] ${C.muted}`}>{entry.group}</span>
                  </span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[#0E1512] transition-transform group-hover:translate-x-0.5" />
                </ActionLink>
              </li>
            ))}
          </ul>
        )}

        {typed && results.length === 0 && (
          <div className={`mt-4 px-1 text-[14px] ${C.muted}`}>
            <p>Tidak ada hasil untuk “{query.trim()}”.</p>
            {m.startAction && (
              <ActionLink action={m.startAction} onNavigate={onClose} className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-medium text-[#0E1512] underline decoration-(--tpl-accent) decoration-2 underline-offset-4">
                Tanyakan langsung kepada kami
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

export function Header({ m, overlay, onPick }: { m: PuncakModel; overlay: boolean; onPick: (entry: SearchEntry) => void }) {
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
  const tone = solid ? 'dark' : 'light';
  const current = active ?? (overlay && !scrolled ? 'hero' : null);
  const links = m.nav.filter((item) => item.key !== 'hero' || overlay);
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

  const iconButton = `flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
    solid ? 'text-[#0E1512] hover:bg-black/[0.05]' : 'text-white hover:bg-white/[0.12]'
  }`;

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header data-tpl-tone={solid ? undefined : 'inverse'} className={`sticky top-[var(--tpl-sticky-top,0px)] z-30 ${overlay ? 'h-0' : ''}`}>
        <div
          className={`border-b transition-[background-color,border-color] duration-300 ${
            solid ? 'border-black/[0.06] bg-white/90 backdrop-blur-md' : 'border-transparent'
          }`}
        >
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-3 @3xl:h-[84px] @6xl:grid @6xl:grid-cols-[1fr_auto_1fr]">
              <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 justify-self-start rounded-full" onNavigate={close}>
                <Logo m={m} tone={tone} />
              </ActionLink>

              {links.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-7 @7xl:gap-9">
                    {links.map((item) => {
                      const isCurrent = current === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`relative flex h-10 items-center text-[13px] font-medium uppercase tracking-[0.08em] transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-[2px] after:rounded-full after:bg-(--tpl-accent) after:transition-opacity ${
                              solid
                                ? isCurrent
                                  ? 'text-[#0E1512]'
                                  : 'text-[#0E1512]/70 hover:text-[#0E1512]'
                                : isCurrent
                                  ? 'text-white'
                                  : 'text-white/80 hover:text-white'
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

              <div className="flex shrink-0 items-center justify-self-end gap-1.5 @xl:gap-2">
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
                    className={iconButton}
                  >
                    {searching ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
                  </button>
                )}
                <span className="hidden @xl:inline-flex">
                  <PillLink action={m.headerAction} label={m.headerLabel} arrow={false} className={`${solid ? BTN.outlineDark : BTN.outlineLight} ${BTN.sm} uppercase tracking-[0.08em]`} />
                </span>
                {links.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearching(false);
                      setOpen((v) => !v);
                    }}
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={open ? 'Tutup menu' : 'Buka menu'}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors @6xl:hidden ${
                      solid ? 'bg-[#F1F2EE] text-[#0E1512] hover:bg-[#E6E8E2]' : 'bg-white/[0.12] text-white ring-1 ring-inset ring-white/30 hover:bg-white/20'
                    }`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {searching && <SearchPanel m={m} id={searchId} onClose={close} onPick={onPick} />}

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
              <ul className="rounded-[24px] bg-[#F1F2EE] p-2">
                {links.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={current === item.key ? 'true' : undefined}
                      className="flex h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-medium uppercase tracking-[0.06em] text-[#0E1512] transition-colors hover:bg-white"
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
