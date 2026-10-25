// Header GadgetKu (referensi "Bose"): bilah pengumuman hitam tipis, lalu bilah putih lengket — kiri simbol + nama,
// tengah tautan bagian (item aktif bergaris bawah), kanan tombol cari bulat + tombol pil hitam "Chat Admin". Tombol cari
// membuka pencarian di halaman: tipe HP (→ pencarian per tipe dengan tipe itu terpilih), produk (nama, kategori, isi
// "Cocok untuk"), kategori (→ produk tersaring), paket, dan FAQ. HP: simbol + nama, cari, menu; panel menu di bawah bilah.
import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { BrandMark } from '../shared/media';
import { ActionLink } from '../shared/Shell';
import { useActiveSection } from './hooks';
import { GadgetkuMark } from './marks';
import { samplePhones, searchFilter, type GadgetkuModel, type SearchEntry, type Shop } from './model';
import { BTN, C, DISPLAY } from './styles';
import { PillLink } from './ui';

export function Logo({ m, tone }: { m: GadgetkuModel; tone: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <BrandMark
      name={m.companyName}
      logo={m.logo}
      mark={<GadgetkuMark className={`h-8 w-8 ${light ? 'text-(--gk-on-dark)' : 'text-[#0B0C0E]'}`} />}
      nameClassName={`${DISPLAY} text-[18px] tracking-[-0.03em] @3xl:text-[19px] ${light ? 'text-white' : 'text-[#0B0C0E]'}`}
    />
  );
}

/** Pilih tipe HP / kategori yang dibawa hasil pencarian, lalu tutup panel. */
const applyEntry = (entry: SearchEntry, shop: Shop, close: () => void) => () => {
  if (entry.phone) shop.pickPhone(entry.phone);
  if (entry.category) shop.pickCategory(entry.category);
  else if (entry.target === 'products') shop.pickCategory('');
  close();
};

function SearchPanel({ m, shop, id, onClose }: { m: GadgetkuModel; shop: Shop; id: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const results = searchFilter(m.search, query);
  const typed = query.trim() !== '';
  const popular = samplePhones(m.models, 4);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div id={id} className={`${CONTAINER} pb-5`}>
      <div role="search" className="mx-auto max-w-[680px]">
        <label className="relative block">
          <span className="sr-only">Cari produk atau tipe HP</span>
          <Search aria-hidden className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${C.muted}`} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari casing, charger, atau tipe HP…"
            autoComplete="off"
            className="h-12 w-full rounded-full bg-[#F2F3F5] pl-11 pr-4 text-[15px] text-[#0B0C0E] placeholder:text-[#575C65] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {!typed && popular.length > 0 && (
          <div className="mt-4">
            <p className={`px-1 text-[12px] font-medium uppercase tracking-[0.12em] ${C.muted}`}>Tipe HP populer</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {popular.map((phone) => (
                <li key={phone.id}>
                  <ActionLink
                    action={{ kind: 'section', target: 'finder' }}
                    onNavigate={() => {
                      shop.pickPhone(phone.id);
                      onClose();
                    }}
                    className="inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium text-[#0B0C0E] ring-1 ring-inset ring-black/[0.1] transition-colors hover:bg-[#F2F3F5]"
                  >
                    {phone.label}
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
                  onNavigate={applyEntry(entry, shop, onClose)}
                  className="group flex min-h-12 items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-colors hover:bg-[#F2F3F5]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[#0B0C0E]">{entry.label}</span>
                    <span className={`block text-[12.5px] ${C.muted}`}>{entry.group}</span>
                  </span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-(--tpl-accent-ink) transition-transform group-hover:translate-x-0.5" />
                </ActionLink>
              </li>
            ))}
          </ul>
        )}

        {typed && results.length === 0 && (
          <div className={`mt-4 px-1 text-[14px] ${C.muted}`}>
            <p>Tidak ada hasil untuk “{query.trim()}”.</p>
            {m.startAction && (
              <ActionLink
                action={m.askAction(`apakah ada aksesori untuk ${query.trim()}?`)}
                onNavigate={onClose}
                className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-medium text-(--tpl-accent-ink)"
              >
                Tanyakan stoknya ke admin
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

export function Header({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const menuId = useId();
  const searchId = useId();
  const anchor = useRef<HTMLElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    anchor,
    m.nav.map((item) => item.key),
  );
  const close = () => {
    setOpen(false);
    setSearching(false);
  };
  const isWa = m.headerAction?.kind === 'external' && /wa\.me/.test(m.headerAction.href);

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
      {m.announcement && (
        <div data-tpl-tone="inverse" className="bg-[#0B0C0E] text-white">
          <p className={`${CONTAINER} py-2.5 text-center text-[12.5px] font-medium leading-snug text-white/90 @3xl:text-[13px]`}>{m.announcement}</p>
        </div>
      )}
      <header ref={anchor} className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-black/[0.07] bg-white/90 backdrop-blur-md">
        <div className={CONTAINER}>
          <div className="flex h-[64px] items-center justify-between gap-3 @3xl:h-[76px] @6xl:grid @6xl:grid-cols-[1fr_auto_1fr]">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 justify-self-start rounded-full" onNavigate={close}>
              <Logo m={m} tone="dark" />
            </ActionLink>

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
                          className={`relative flex h-10 items-center text-[14px] transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-[1.5px] after:bg-[#0B0C0E] after:transition-opacity ${
                            isCurrent ? 'font-medium text-[#0B0C0E] after:opacity-100' : 'text-[#0B0C0E]/70 after:opacity-0 hover:text-[#0B0C0E]'
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
                  aria-label={searching ? 'Tutup pencarian' : 'Cari produk atau tipe HP'}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2F3F5] text-[#0B0C0E] transition-colors hover:bg-[#E6E8EB]"
                >
                  {searching ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
                </button>
              )}
              <span className="hidden @xl:inline-flex">
                <PillLink
                  action={m.headerAction}
                  label={m.headerLabel}
                  arrow={false}
                  icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                  className={`${BTN.ink} ${BTN.sm}`}
                />
              </span>
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
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B0C0E] text-white transition-colors hover:bg-[#26282C] @6xl:hidden"
                >
                  {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
                </button>
              )}
            </div>
          </div>
        </div>

        {searching && <SearchPanel m={m} shop={shop} id={searchId} onClose={close} />}

        {open && (
          <nav id={menuId} aria-label="Menu utama" className={`${CONTAINER} pb-5 @6xl:hidden`}>
            <ul className="rounded-[22px] bg-[#F2F3F5] p-2">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    onNavigate={close}
                    aria-current={active === item.key ? 'true' : undefined}
                    className="flex h-12 items-center justify-between rounded-2xl px-4 text-[16px] font-medium text-[#0B0C0E] transition-colors hover:bg-white"
                  >
                    {item.label}
                    <ArrowRight className={`h-4 w-4 ${C.muted}`} aria-hidden />
                  </ActionLink>
                </li>
              ))}
            </ul>
            <PillLink
              action={m.headerAction}
              label={m.headerLabel}
              onNavigate={close}
              arrow={false}
              icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
              className={`${BTN.ink} ${BTN.lg} mt-3 flex w-full @xl:hidden`}
            />
          </nav>
        )}
      </header>
    </>
  );
}
