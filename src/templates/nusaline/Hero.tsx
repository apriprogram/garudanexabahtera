// Hero Nusaline — "Departure" (data-hero-layout="departure"): foto jalan tol malam dengan jejak lampu SEBAGAI LATAR
// selebar layar, header transparan di atasnya, lapisan midnight (kiri pekat di belakang teks, atas, bawah). Kolom 1-7:
// chip kaca mono "→ Bus malam · berangkat tiap hari", H1 Red Hat Display 900 (kata sorotan neon), kalimat singkat, tombol
// "Pilih kelas" (putih) + "Lihat rute" (garis) — jadwal sudah punya tombolnya di kartu cari, jadi hero tidak punya tiga
// tombol ke tempat yang sama. Kolom 8-12: KARTU CARI JADWAL kaca gelap (Dari ⇄ Ke, Tanggal,
// Penumpang 1–6, tombol warna tema "Cari jadwal" → mengisi saringan tabel jadwal, menggulir ke sana, dan memindahkan
// fokus ke jumlah hasil) dan di bawahnya PAPAN KEBERANGKATAN mini (tiga jadwal pertama; huruf jam & kode kota membalik
// sekali saat dimuat, ≤ 1,2 dtk, lalu diam). HP: teks di atas foto (foto ± 640px lalu melebur ke midnight), kartu
// selebar layar, papan 2 baris. Validasi: Dari ≠ Ke, tanggal tidak lewat, penumpang 1–6. Foto (LCP) tidak pernah
// disembunyikan; Ken Burns skala 1 → 1,05 sekali pada WADAH foto.
import { ArrowLeftRight, ChevronDown, Search } from 'lucide-react';
import { useId, useState, type CSSProperties, type FormEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { PAX_OPTIONS, clampPax, splitTitle, todayIso, validateSearch, type NusalineModel, type SearchErrors, type SearchForm } from './model';
import { NUSALINE_PHOTOS } from './photos';
import { BTN, C, INPUT_DARK, LABEL, LABEL_SM, MONO, TYPE, WRAP } from './styles';
import { ButtonLink } from './ui';

/** Satu baris huruf papan: tiap huruf satu ubin (animasi membalik bertahap lewat --nl-i / --nl-r). */
function Tiles({ value, row, offset }: { value: string; row: number; offset: number }) {
  return (
    <span className="flex gap-[2px] @3xl:gap-[3px]">
      {Array.from(value).map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="nl-flap relative inline-flex h-7 w-[15px] items-center justify-center rounded-[4px] bg-white/[0.09] font-mono text-[13px] font-semibold text-white @3xl:h-8 @3xl:w-[19px] @3xl:text-[15px]"
          style={{ '--nl-i': offset + i, '--nl-r': row } as CSSProperties}
        >
          {ch === ' ' ? '' : ch}
        </span>
      ))}
    </span>
  );
}

function DepartureBoard({ m }: { m: NusalineModel }) {
  const title = text(m.hero, 'board_title');
  if (!title || m.board.length === 0) return null;
  return (
    <div className="mt-3 rounded-[18px] bg-[#0B1026]/[0.78] p-4 ring-1 ring-inset ring-white/12 backdrop-blur-md @3xl:p-5">
      <p className={`flex items-center gap-2 ${LABEL} ${C.onNightMuted}`}>
        <span aria-hidden className={C.neon}>
          →
        </span>
        {title}
      </p>
      <ul aria-label={title} className="mt-3 grid gap-2">
        {m.board.map((row, r) => (
          <li key={`${row.time}-${r}`} className={`relative min-w-0 items-center gap-2.5 overflow-hidden @3xl:gap-3 ${r >= 2 ? 'hidden @3xl:flex' : 'flex'}`}>
            <span className="sr-only">{row.spoken}</span>
            {/* Ubin tidak menyusut: bila sempit, label kelas yang dipotong (…), tidak pernah menimpa ubin */}
            <span aria-hidden className="flex shrink-0 items-center gap-2.5 @3xl:gap-3">
              <Tiles value={row.time} row={r} offset={0} />
              <span className="flex items-center gap-1.5">
                <Tiles value={row.from} row={r} offset={5} />
                <span className={`font-mono text-[13px] ${C.neon}`}>→</span>
                <Tiles value={row.to} row={r} offset={9} />
              </span>
            </span>
            {/* Label kelas hanya bila muat di samping ubin: HP ≥ 368px, tablet, dan ≥ 1440px. Pada 1024–1439px kartu
                hanya 4–5 kolom (± 360–410px), jadi label disembunyikan (tadinya terpotong dan menimpa ubin terakhir). */}
            <span aria-hidden className={`ml-auto hidden truncate @min-[23rem]:block @5xl:hidden @min-[90rem]:block ${LABEL_SM} text-white/80`}>
              {row.cls}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchCard({ m, initial, onSearch }: { m: NusalineModel; initial: SearchForm; onSearch: (form: SearchForm) => void }) {
  const baseId = useId();
  const [form, setForm] = useState<SearchForm>(initial);
  const [errors, setErrors] = useState<SearchErrors>({});
  const today = todayIso();
  const title = text(m.hero, 'search_title');
  const button = text(m.hero, 'search_button') || 'Cari jadwal';
  const id = (key: keyof SearchForm) => `${baseId}-${key}`;
  const set = (patch: Partial<SearchForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof SearchForm)[]) delete next[key];
      if ('from' in patch) delete next.to;
      return next;
    });
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateSearch(form, today);
    setErrors(found);
    const first = (['from', 'to', 'date', 'pax'] as (keyof SearchForm)[]).find((key) => found[key]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    onSearch(form);
  };
  const describe = (key: keyof SearchForm) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `${id(key)}-error` } : {};
  const error = (key: keyof SearchForm) =>
    errors[key] && (
      <p id={`${id(key)}-error`} className="mt-1.5 text-[13px] font-medium text-[#FFB4C8]">
        {errors[key]}
      </p>
    );
  const labelClass = `mb-1.5 block ${LABEL_SM} text-white/75`;
  const select = (key: 'from' | 'to', label: string, all: string) => (
    <div className="min-w-0">
      <label htmlFor={id(key)} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select id={id(key)} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} className={`${INPUT_DARK} cursor-pointer appearance-none truncate pr-9`} {...describe(key)}>
          <option value="">{all}</option>
          {m.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
      </div>
    </div>
  );

  return (
    <form
      role="search"
      aria-label="Cari jadwal bus"
      noValidate
      onSubmit={submit}
      className="rounded-[18px] bg-[#0B1026]/[0.78] p-4 ring-1 ring-inset ring-white/12 backdrop-blur-md @3xl:p-6"
    >
      {title && (
        <p className={`flex items-center gap-2 ${LABEL} text-white`}>
          <span aria-hidden className={C.neon}>
            →
          </span>
          {title}
        </p>
      )}
      <div className={`${title ? 'mt-4' : ''} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2`}>
        {select('from', 'Dari', 'Semua')}
        <button
          type="button"
          onClick={() => set({ from: form.to, to: form.from })}
          aria-label="Tukar kota asal dan tujuan"
          className="mt-[22px] flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10 hover:ring-(--nl-neon)"
        >
          <ArrowLeftRight aria-hidden className="h-4 w-4" />
        </button>
        {select('to', 'Ke', 'Semua')}
      </div>
      {error('to')}
      <div className="mt-3 grid grid-cols-2 gap-x-3">
        <div className="min-w-0">
          <label htmlFor={id('date')} className={labelClass}>
            Tanggal
          </label>
          <input id={id('date')} type="date" min={today} value={form.date} onChange={(e) => set({ date: e.target.value })} className={`${INPUT_DARK} ${MONO}`} {...describe('date')} />
        </div>
        <div className="min-w-0">
          <label htmlFor={id('pax')} className={labelClass}>
            Penumpang
          </label>
          <div className="relative">
            <select id={id('pax')} value={form.pax} onChange={(e) => set({ pax: clampPax(e.target.value) })} className={`${INPUT_DARK} cursor-pointer appearance-none pr-9`} {...describe('pax')}>
              {PAX_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} orang
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
          </div>
        </div>
      </div>
      {error('date')}
      {error('pax')}
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-4 w-full`}>
        <Search aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        {button}
      </button>
    </form>
  );
}

export function Hero({ m, initial, onSearch }: { m: NusalineModel; initial: SearchForm; onSearch: (form: SearchForm) => void }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const [before, highlight, after] = splitTitle(title, text(hero, 'highlight'));
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const searchable = m.departures.length > 0;
  const primary = text(hero, 'primary_label');
  const secondary = text(hero, 'secondary_label');

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="departure" data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-[#0B1026] text-white">
      {/* Foto latar: HP ± 740px teratas — teks di langit gelap, jejak lampu terlihat di pita antara tombol dan kartu,
          lalu melebur ke midnight di belakang kartu; ≥ @5xl seluruh hero */}
      <div className="absolute inset-x-0 top-0 h-[min(740px,100svh)] overflow-hidden @5xl:h-full">
        <div className="nl-kenburns absolute inset-0">
          <KitPhoto
            src={image}
            alt={NUSALINE_PHOTOS.alt(image, `Perjalanan malam ${m.companyName}`)}
            priority
            fallback="none"
            // HP: foto 16:9 menutupi kotak tegak (±390×740) sehingga tergambar ±3,4× lebar layar
            sizes="(max-width: 767px) 340vw, 100vw"
            className="absolute inset-0"
            imgClassName="object-[64%_50%] @5xl:object-[50%_58%]"
          />
        </div>
        <div aria-hidden className="nl-hero-scrim absolute inset-0" />
      </div>

      <div
        className={`${WRAP} relative grid min-h-[max(620px,min(90svh,900px))] content-center items-center gap-y-10 pb-14 pt-[108px] @5xl:grid-cols-12 @5xl:gap-x-10 @5xl:pb-16 @5xl:pt-[124px] @7xl:gap-x-14`}
      >
        <div className="min-w-0 @5xl:col-span-7">
          {eyebrow && (
            <Reveal
              as="p"
              variant="fade"
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-white ring-1 ring-inset ring-white/20 backdrop-blur-md"
            >
              <span aria-hidden className="shrink-0 text-(--nl-neon)">
                →
              </span>
              <span className="min-w-0 truncate">{eyebrow}</span>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[13ch] text-white ${TYPE.h1}`}>
            {before}
            {highlight && <span className="text-(--nl-neon)">{highlight}</span>}
            {after}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty text-white/85 ${TYPE.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {(primary || secondary) && (
            <Reveal delay={240} className="mt-7 flex flex-wrap gap-3">
              <ButtonLink action={m.primaryAction} label={primary} variant="light" className="flex-1 @xl:flex-none" />
              <ButtonLink action={m.secondaryAction} label={secondary} variant="ghostDark" className="flex-1 @xl:flex-none" />
            </Reveal>
          )}
        </div>

        {searchable && (
          <Reveal delay={320} className="mt-36 min-w-0 @5xl:col-span-5 @5xl:mt-0 @7xl:col-span-4 @7xl:col-start-9">
            <SearchCard m={m} initial={initial} onSearch={onSearch} />
            <DepartureBoard m={m} />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
