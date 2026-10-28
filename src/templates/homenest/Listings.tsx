// Daftar rumah (kunci `listings`): kepala section (label + H2 kiri, kalimat pengantar kanan), bilah saringan bergaris
// rambut (Lokasi, Tipe, Harga, Urutkan — pilihan dibuat dari data rumah & batas harga CMS), jumlah hasil yang
// diumumkan pembaca layar (role=status, juga tujuan fokus dari panel cari di hero) + "Atur ulang", lalu kisi kartu 3/2/1
// kolom. Kartu persegi tanpa bingkai: foto 4:3 (zoom pelan saat disorot) dengan chip status krem, klaster · kota, nama
// rumah Cormorant, harga Inter warna tema, baris spesifikasi LT/LB/KT/KM bergaris tegak, lalu "Simulasi KPR" (mengisi
// harga ke kalkulator) dan "Tanya unit" (WhatsApp). Tidak cocok → kotak kosong bergaris + atur ulang. Gerak: kartu
// muncul (opacity + skala 0,98 → 1, ≤ 300 ms, bertahap) HANYA setelah saringan/urutan diganti (./homenest.css).
import { ArrowUpRight, Calculator, ChevronDown, RotateCcw } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  SORTS,
  applyListingFilters,
  formatPriceShort,
  isFiltered,
  listingMessage,
  listingPlace,
  resultCount,
  type HomeNestModel,
  type Listing,
  type ListingFilters,
  type SortKey,
} from './model';
import { HOMENEST_PHOTOS } from './photos';
import { BTN, C, LABEL_SM, NUM, SECTION_PAD, TYPE } from './styles';
import { SectionHead } from './ui';

const SPECS: { key: 'lt' | 'lb' | 'kt' | 'km'; short: string; long: string; unit: string }[] = [
  { key: 'lt', short: 'LT', long: 'Luas tanah', unit: ' m²' },
  { key: 'lb', short: 'LB', long: 'Luas bangunan', unit: ' m²' },
  { key: 'kt', short: 'KT', long: 'Kamar tidur', unit: '' },
  { key: 'km', short: 'KM', long: 'Kamar mandi', unit: '' },
];

/** Jumlah kartu sebelum tombol "Lihat semua n rumah" (tanpa saringan aktif): 6 di layar lebar, 3 di HP (kartu 4-6
 * disembunyikan lewat container query agar halaman HP tidak terlalu panjang). */
const PREVIEW = 6;
const PREVIEW_PHONE = 3;

const CARD_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[#1E2A24] underline decoration-[#1E2A24]/30 underline-offset-[5px] transition-colors hover:text-(--hn-ink) hover:decoration-(--tpl-accent)';

function Card({ m, home, kprLabel, askLabel, onSimulate }: { m: HomeNestModel; home: Listing; kprLabel: string; askLabel: string; onSimulate: (price: number) => void }) {
  const price = formatPriceShort(home.price);
  const specs = SPECS.filter((s) => home[s.key]);
  const ask = askLabel ? m.waWith(listingMessage(home, m.companyName)) : null;
  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div className="relative">
        <KitPhoto
          src={home.image}
          alt={HOMENEST_PHOTOS.alt(home.image, `Foto ${home.title}`)}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[3/2] @2xl:aspect-[4/3]"
          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
        />
        {home.status && <span className={`absolute left-0 top-0 bg-[#F4EFE4] px-3 py-2 ${LABEL_SM} ${C.ink}`}>{home.status}</span>}
      </div>
      {listingPlace(home) && <p className={`mt-5 ${LABEL_SM} ${C.muted}`}>{listingPlace(home)}</p>}
      <h3 className={`mt-2 ${TYPE.h3} ${C.ink}`}>{home.title}</h3>
      <p className={`mt-2 text-[20px] font-semibold ${NUM} ${price ? C.accent : C.muted}`}>{price || 'Harga menyusul'}</p>
      {specs.length > 0 && (
        <dl className={`mt-5 grid border-y ${C.line}`} style={{ gridTemplateColumns: `repeat(${specs.length}, minmax(0, 1fr))` }}>
          {specs.map((s, i) => (
            <div key={s.key} className={`min-w-0 py-3 ${i > 0 ? `border-l pl-3.5 ${C.line}` : ''}`}>
              <dt className={`${LABEL_SM} ${C.muted}`}>
                <span aria-hidden>{s.short}</span>
                <span className="sr-only">{s.long}</span>
              </dt>
              <dd className={`mt-1 text-[15px] font-medium ${NUM} ${C.ink}`}>
                {home[s.key]}
                {s.unit}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {((kprLabel && home.price > 0) || ask) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-6 pt-3">
          {kprLabel && home.price > 0 && (
            <button type="button" onClick={() => onSimulate(home.price)} className={CARD_LINK} aria-label={`${kprLabel}: ${home.title}`}>
              <Calculator aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {kprLabel}
            </button>
          )}
          {ask && (
            <ActionLink action={ask} className={CARD_LINK} aria-label={`${askLabel}: ${home.title} (WhatsApp)`}>
              {askLabel}
              <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
            </ActionLink>
          )}
        </div>
      )}
    </article>
  );
}

export function Listings({
  m,
  filters,
  setFilters,
  changed,
  statusRef,
  onSimulate,
}: {
  m: HomeNestModel;
  filters: ListingFilters;
  setFilters: (f: ListingFilters) => void;
  /** true setelah saringan/urutan diganti (kartu beranimasi muncul) */
  changed: boolean;
  statusRef: RefObject<HTMLParagraphElement | null>;
  onSimulate: (price: number) => void;
}) {
  const { listings } = m;
  const baseId = useId();
  const homes = m.homes;
  const shown = applyListingFilters(homes, filters, m.ranges);
  const filtered = isFiltered(filters);
  const kprLabel = m.shown('kpr') ? text(listings, 'kpr_label') : '';
  const askLabel = text(listings, 'ask_label');
  const empty = text(listings, 'empty_text') || 'Belum ada rumah yang cocok dengan pilihan ini.';
  const signature = `${filters.city}|${filters.type}|${filters.range}|${filters.sort}`;
  // Tanpa saringan: 6 rumah dulu (2 baris di layar lebar; 3 kartu di HP), sisanya lewat tombol "Lihat semua n rumah"
  const [expanded, setExpanded] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const limited = !expanded && !filtered && shown.length > PREVIEW_PHONE;
  const cards = limited ? shown.slice(0, PREVIEW) : shown;
  const showMore = () => {
    // Fokus ke kartu pertama yang tadinya tersembunyi (kartu ke-4 di HP, ke-7 di layar lebar)
    const items = Array.from(list.current?.children ?? []) as HTMLElement[];
    const hidden = items.findIndex((li) => getComputedStyle(li).display === 'none');
    const first = hidden >= 0 ? hidden : Math.min(PREVIEW, cards.length);
    setExpanded(true);
    window.setTimeout(() => (list.current?.children[first] as HTMLElement | undefined)?.focus(), 0);
  };

  const selects: { key: keyof ListingFilters; label: string; all?: string; options: { value: string; label: string }[] }[] = [
    { key: 'city', label: 'Lokasi', all: 'Semua lokasi', options: m.options.cities.map((c) => ({ value: c, label: c })) },
    { key: 'type', label: 'Tipe', all: 'Semua tipe', options: m.options.types.map((t) => ({ value: t, label: t })) },
    { key: 'range', label: 'Harga', all: 'Semua harga', options: m.ranges.map((r) => ({ value: r.id, label: r.label })) },
    { key: 'sort', label: 'Urutkan', options: SORTS.map((s) => ({ value: s.key, label: s.label })) },
  ];
  const visible = selects.filter((s) => s.key === 'sort' || s.options.length > 0);
  const set = (key: keyof ListingFilters, value: string) => setFilters({ ...filters, [key]: key === 'sort' ? (value as SortKey) : value });

  return (
    <TemplateSection sectionKey="listings" className={`${SECTION_PAD} ${C.warm}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(listings, 'eyebrow')} title={text(listings, 'title')} subtitle={text(listings, 'subtitle')} srTitle="Daftar rumah" />

        <Reveal className="mt-12 @3xl:mt-16">
          <div role="group" aria-label="Saring dan urutkan rumah" className={`grid grid-cols-2 border-y @3xl:flex ${C.line}`}>
            {visible.map((s, i) => {
              const id = `${baseId}-${s.key}`;
              // HP 2 kolom: garis kiri di kolom kanan, garis atas di baris kedua; layar ≥ @3xl satu baris bergaris tegak
              const cell = [i % 2 === 1 ? 'border-l' : '', i >= 2 ? 'border-t @3xl:border-t-0' : '', i > 0 ? '@3xl:border-l' : '', visible.length % 2 === 1 && i === visible.length - 1 ? 'col-span-2 border-l-0' : ''].join(' ');
              return (
                <div key={s.key} className={`relative min-w-0 @3xl:flex-1 ${s.key === 'sort' ? '@3xl:max-w-[260px]' : ''} ${C.line} ${cell}`}>
                  <label htmlFor={id} className={`pointer-events-none absolute left-4 top-3 ${LABEL_SM} ${C.muted} @3xl:left-5`}>
                    {s.label}
                  </label>
                  <select
                    id={id}
                    value={filters[s.key]}
                    onChange={(e) => set(s.key, e.target.value)}
                    className={`h-[64px] w-full min-w-0 cursor-pointer appearance-none truncate rounded-none bg-transparent pl-4 pr-9 pt-5 text-[15px] font-medium transition-colors hover:bg-[#F4EFE4]/60 focus:outline-none focus-visible:bg-[#F4EFE4] @3xl:pl-5 @3xl:text-[16px] ${C.ink}`}
                  >
                    {s.all && <option value="">{s.all}</option>}
                    {s.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden className={`pointer-events-none absolute bottom-[18px] right-3 h-4 w-4 ${C.muted} @3xl:right-4`} />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1">
            {/* role="status" sudah polite; tanpa aria-live eksplisit (region status ber-aria-live milik Shell untuk keterangan pratinjau) */}
            <p ref={statusRef} tabIndex={-1} role="status" className={`text-[15px] focus:outline-none ${C.muted}`}>
              <span className={`font-semibold ${NUM} ${C.ink}`}>{resultCount(shown.length)}</span>
              {filtered && shown.length > 0 && <span> dari {homes.length}</span>}
            </p>
            {(filtered || filters.sort !== 'featured') && (
              <button
                type="button"
                onClick={() => setFilters({ city: '', type: '', range: '', sort: 'featured' })}
                className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[#1E2A24] underline decoration-[#1E2A24]/30 underline-offset-[5px] transition-colors hover:text-(--hn-ink)"
              >
                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                Atur ulang
              </button>
            )}
          </div>
        </Reveal>

        {shown.length > 0 ? (
          <Reveal className="mt-8 @3xl:mt-10">
            <ul
              ref={list}
              key={signature}
              data-filtered={changed ? 'true' : 'false'}
              className="grid gap-x-8 gap-y-12 @2xl:grid-cols-2 @2xl:gap-y-14 @5xl:grid-cols-3 @5xl:gap-x-10 @5xl:gap-y-16"
            >
              {cards.map((home, i) => (
                <li
                  key={home.index}
                  tabIndex={-1}
                  className={`hn-pop min-w-0 focus:outline-none ${limited && i >= PREVIEW_PHONE ? 'hidden @2xl:block' : ''}`}
                  style={{ '--hn-delay': `${Math.min(i, 6) * 35}ms` } as CSSProperties}
                >
                  <Card m={m} home={home} kprLabel={kprLabel} askLabel={askLabel} onSimulate={onSimulate} />
                </li>
              ))}
            </ul>
            {limited && (
              // Layar lebar dengan ≤ 6 rumah: semua sudah tampil → tombol hanya untuk HP
              <div className={`mt-12 flex justify-center border-t pt-8 @3xl:mt-14 ${C.line} ${shown.length <= PREVIEW ? '@2xl:hidden' : ''}`}>
                <button type="button" onClick={showMore} className={`${BTN.outline} ${BTN.lg} w-full @xl:w-auto`}>
                  Lihat semua {shown.length} rumah
                  <ChevronDown aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
          </Reveal>
        ) : (
          <div className={`mt-8 border px-6 py-14 text-center @3xl:mt-10 ${C.line}`}>
            <p className={`mx-auto max-w-[36ch] ${TYPE.h3sm} ${C.ink}`}>{empty}</p>
            <button
              type="button"
              onClick={() => setFilters({ city: '', type: '', range: '', sort: filters.sort })}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#1E2A24] underline decoration-[#1E2A24]/35 underline-offset-[6px] transition-colors hover:text-(--hn-ink)"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Atur ulang filter
            </button>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
