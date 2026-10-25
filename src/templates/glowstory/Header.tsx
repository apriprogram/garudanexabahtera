// Header GlowStory (gaya katalog "Seram."): bilah krem lengket — kiri tautan bagian (item aktif bergaris bawah tipis),
// tengah simbol + nama toko berhuruf serif, kanan tombol cari bulat dan pil gelap "Keranjang (n)". Setelah digulir
// muncul garis tipis di bawah bilah. Tombol cari membuka kolom pencarian halaman (produk, kategori, tipe kulit,
// langganan, tanya jawab) yang menggulir ke bagian yang dipilih. HP: simbol + nama kiri; cari, keranjang, menu kanan.
import { ArrowRight, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection, useScrolledPast } from './hooks';
import { GlowMark } from './marks';
import { searchFilter, type GlowModel } from './model';
import { useStore } from './storeContext';
import { C, MONO, SERIF } from './styles';

export function Logo({ m, tone = 'ink' }: { m: GlowModel; tone?: 'ink' | 'cream' }) {
  const cream = tone === 'cream';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<GlowMark className={`h-8 w-8 ${cream ? 'text-(--gs-accent-light)' : 'text-(--gs-accent-text)'}`} />}
      nameClassName={`${SERIF} text-[24px] font-normal tracking-[-0.01em] @3xl:text-[26px] ${cream ? 'text-[#F6F1EA]' : 'text-[#2B211C]'}`}
    />
  );
}

function SearchPanel({ m, id, onClose }: { m: GlowModel; id: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
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
            placeholder="Cari serum, sunscreen, kulit berminyak…"
            autoComplete="off"
            className="h-12 w-full rounded-full bg-[#EDE5D9] pl-11 pr-4 text-[15px] text-[#2B211C] placeholder:text-[#6B5D53] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {!typed && m.nav.length > 0 && (
          <div className="mt-4">
            <p className={`px-1 ${MONO} ${C.muted}`}>Pintasan</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={onClose}
                    className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium text-[#2B211C] ring-1 ring-inset ring-[#2B211C]/15 transition-colors hover:bg-[#EDE5D9]"
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
                  onNavigate={onClose}
                  className="group flex min-h-12 items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-colors hover:bg-[#EDE5D9]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[#2B211C]">{entry.label}</span>
                    <span className={`block text-[12.5px] ${C.muted}`}>{entry.group}</span>
                  </span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-(--gs-accent-text) transition-transform group-hover:translate-x-0.5" />
                </ActionLink>
              </li>
            ))}
          </ul>
        )}

        {typed && results.length === 0 && (
          <div className={`mt-4 px-1 text-[14px] ${C.muted}`}>
            <p>Tidak ada hasil untuk “{query.trim()}”.</p>
            {m.askAction && (
              <ActionLink action={m.askAction} onNavigate={onClose} className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-medium text-(--gs-accent-text)">
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

export function Header({ m }: { m: GlowModel }) {
  const store = useStore();
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

  const iconButton = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#2B211C] transition-colors hover:bg-[#2B211C]/[0.06]';
  const cartLabel = store.count > 0 ? `Keranjang, ${store.count} barang` : 'Keranjang kosong';

  return (
    <>
      {/* Penanda gulir: 24px di bawah tepi atas halaman */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30">
        <div className={`border-b bg-[#F6F1EA]/95 backdrop-blur-md transition-colors duration-300 ${scrolled || open || searching ? 'border-[#2B211C]/10' : 'border-transparent'}`}>
          <div className={CONTAINER}>
            <div className="flex h-[68px] items-center justify-between gap-3 @3xl:h-[76px] @6xl:grid @6xl:grid-cols-[1fr_auto_1fr]">
              {m.nav.length > 0 && (
                <nav aria-label="Menu utama" className="hidden @6xl:block">
                  <ul className="flex items-center gap-6 @7xl:gap-8">
                    {m.nav.map((item) => {
                      const isCurrent = active === item.key;
                      return (
                        <li key={item.key}>
                          <ActionLink
                            action={{ kind: 'section', target: item.key }}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`relative flex h-10 items-center text-[14px] transition-colors after:absolute after:inset-x-0 after:bottom-1.5 after:h-px after:bg-(--gs-accent-text) after:transition-opacity ${
                              isCurrent ? 'font-medium text-[#2B211C] after:opacity-100' : 'text-[#2B211C]/75 after:opacity-0 hover:text-[#2B211C]'
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

              <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 justify-self-center rounded-full @6xl:col-start-2" onNavigate={close}>
                <Logo m={m} />
              </ActionLink>

              <div className="flex shrink-0 items-center justify-self-end gap-1 @xl:gap-2 @6xl:col-start-3">
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
                <button
                  type="button"
                  onClick={() => {
                    close();
                    store.openCart();
                  }}
                  aria-label={cartLabel}
                  className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#2B211C] px-3.5 text-[14px] font-medium text-[#F6F1EA] transition-colors hover:bg-[#45372F] @xl:px-5"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
                  <span className="hidden @xl:inline">Keranjang</span>
                  <span aria-hidden className="tabular-nums">
                    ({store.count})
                  </span>
                </button>
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
                    className={`${iconButton} @6xl:hidden`}
                  >
                    {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {searching && <SearchPanel m={m} id={searchId} onClose={close} />}

          {open && (
            <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
              <ul className="rounded-[22px] bg-[#EDE5D9] p-2">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      onNavigate={close}
                      aria-current={active === item.key ? 'true' : undefined}
                      className="flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium text-[#2B211C] transition-colors hover:bg-[#F6F1EA]"
                    >
                      {item.label}
                      <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
