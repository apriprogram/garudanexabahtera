// Hero HomeNest — "Estate" (data-hero-layout="estate"): foto rumah selebar layar SEBAGAI LATAR seluruh hero, header
// transparan di atasnya, lapisan hijau tua (atas untuk menu, elips di belakang teks, bawah), lalu di tengah: label kecil
// bergaris kiri-kanan, H1 Cormorant besar rata tengah, kalimat singkat. Di tepi bawah foto menempel PANEL CARI RUMAH krem
// bergaris rambut: Lokasi | Tipe | Harga (dari data daftar rumah) + tombol "Cari Rumah" → mengisi saringan daftar rumah,
// menggulir ke sana, dan memindahkan fokus ke jumlah hasil. HP: foto menutupi 2/3 atas hero dan melebur ke hijau tua;
// label & judul di bagian bawah foto, panel bertumpuk (Lokasi, lalu Tipe + Harga, lalu tombol penuh-lebar) di bawahnya.
// Daftar rumah disembunyikan → panel diganti satu tombol (tujuan tombol menu atas).
// Gerak (./homenest.css): Ken Burns pelan (skala 1 → 1,05 selama 12 dtk, sekali) pada WADAH foto; foto hero (LCP) tidak
// pernah disembunyikan (tanpa opacity/clip). Teks muncul bertahap 0/80/160 ms, panel 240 ms.
import { ChevronDown, Search } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { HomeNestModel, ListingFilters } from './model';
import { HOMENEST_PHOTOS } from './photos';
import { BTN, C, LABEL, LABEL_SM, TYPE } from './styles';
import { ButtonLink } from './ui';

type Draft = Pick<ListingFilters, 'city' | 'type' | 'range'>;

function SearchPanel({ m, filters, onSearch }: { m: HomeNestModel; filters: ListingFilters; onSearch: (draft: Draft) => void }) {
  const baseId = useId();
  const [draft, setDraft] = useState<Draft>({ city: filters.city, type: filters.type, range: filters.range });
  const label = text(m.hero, 'search_label') || 'Cari Rumah';
  const fields: { key: keyof Draft; label: string; all: string; options: { value: string; label: string }[] }[] = [
    { key: 'city', label: 'Lokasi', all: 'Semua lokasi', options: m.options.cities.map((c) => ({ value: c, label: c })) },
    { key: 'type', label: 'Tipe', all: 'Semua tipe', options: m.options.types.map((t) => ({ value: t, label: t })) },
    { key: 'range', label: 'Harga', all: 'Semua harga', options: m.ranges.map((r) => ({ value: r.id, label: r.label })) },
  ];
  const shownFields = fields.filter((f) => f.options.length > 0);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(draft);
  };
  // Lebar kolom panel per jumlah isian (kelas utuh agar terbaca Tailwind)
  const cols = ['@3xl:grid-cols-[auto]', '@3xl:grid-cols-[1fr_auto]', '@3xl:grid-cols-[1fr_1fr_auto]', '@3xl:grid-cols-[1.15fr_1fr_1.15fr_auto]'][shownFields.length];
  return (
    <form role="search" aria-label="Cari rumah" onSubmit={submit} className={`grid grid-cols-2 bg-[#F4EFE4] ring-1 ring-inset ring-[#1E2A24]/[0.12] ${cols} ${C.ink}`}>
      {shownFields.map((f, i) => {
        const id = `${baseId}-${f.key}`;
        // HP: isian pertama selebar panel, dua berikutnya berdampingan; layar ≥ @3xl: satu baris dengan garis tegak
        const span = shownFields.length === 3 && i === 0 ? 'col-span-2 @3xl:col-span-1' : shownFields.length === 1 ? 'col-span-2 @3xl:col-span-1' : '';
        const borders = [
          i > 0 ? '@3xl:border-l' : '',
          shownFields.length === 3 && i === 2 ? 'border-l' : '',
          shownFields.length === 2 && i === 1 ? 'border-l' : '',
          shownFields.length === 3 && i > 0 ? 'border-t @3xl:border-t-0' : '',
        ].join(' ');
        return (
          <div key={f.key} className={`relative min-w-0 border-[#1E2A24]/[0.12] ${span} ${borders}`}>
            <label htmlFor={id} className={`pointer-events-none absolute left-5 top-3.5 ${LABEL_SM} ${C.muted} @5xl:left-7 @5xl:top-5`}>
              {f.label}
            </label>
            <select
              id={id}
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              className={`h-[68px] w-full min-w-0 cursor-pointer appearance-none truncate rounded-none bg-transparent pl-5 pr-10 pt-6 text-[16px] font-medium transition-colors hover:bg-white/60 focus:outline-none focus-visible:bg-white @5xl:h-[88px] @5xl:pl-7 @5xl:pt-7 @5xl:text-[17px] ${C.ink}`}
            >
              <option value="">{f.all}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={`pointer-events-none absolute bottom-[22px] right-4 h-4 w-4 @5xl:bottom-[30px] @5xl:right-6 ${C.muted}`} />
          </div>
        );
      })}
      <button type="submit" className={`${BTN.primary} col-span-2 h-14 px-8 @3xl:col-span-1 @3xl:h-auto @5xl:px-10`}>
        <Search aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
        {label}
      </button>
    </form>
  );
}

export function Hero({ m, filters, onSearch }: { m: HomeNestModel; filters: ListingFilters; onSearch: (draft: Draft) => void }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const searchable = m.homes.length > 0;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="estate" data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-(--hn-deep) text-[#F4EFE4]">
      {/* HP: foto menutupi hero sampai tepi atas panel cari (di belakang menu, label, judul, kalimat) lalu melebur ke
          hijau tua di belakang panel — potongan foto lebih lebar sehingga atap, kisi kayu, dan dinding batu tetap
          terbaca. ≥ @3xl: penuh. */}
      <div className="absolute inset-x-0 top-0 bottom-[230px] overflow-hidden @3xl:bottom-0">
        <div className="hn-kenburns absolute inset-0">
          <KitPhoto
            src={image}
            alt={HOMENEST_PHOTOS.alt(image, `Rumah yang dipasarkan ${m.companyName}`)}
            priority
            fallback="none"
            sizes="100vw"
            className="absolute inset-0"
            imgClassName="object-[42%_50%] @3xl:object-[46%_50%]"
          />
        </div>
        <div aria-hidden className="hn-hero-scrim absolute inset-0" />
      </div>

      {/* Jarak atas = bilah menu (68/80px) + ruang napas. HP: setinggi layar yang terlihat (dikurangi bilah demo/
          --tpl-sticky-top), panel cari berjarak 72px dari tepi bawah → tidak tertutup tombol WhatsApp melayang. */}
      <div
        className={`${CONTAINER} relative flex min-h-[max(600px,calc(100svh-var(--tpl-sticky-top,0px)))] flex-col pb-[72px] pt-[112px] @3xl:min-h-[max(640px,min(92svh,880px))] @3xl:pb-8 @5xl:pt-[132px]`}
      >
        <div className="flex flex-1 flex-col items-center justify-end pb-10 text-center @3xl:justify-center @3xl:pb-14">
          {eyebrow && (
            <Reveal as="p" variant="fade" className={`flex max-w-full items-center justify-center gap-3 ${LABEL} text-[#F4EFE4]`}>
              <span aria-hidden className="hidden h-px w-10 shrink-0 bg-[#F4EFE4]/60 @xl:block" />
              <span className="min-w-0 text-balance">{eyebrow}</span>
              <span aria-hidden className="hidden h-px w-10 shrink-0 bg-[#F4EFE4]/60 @xl:block" />
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-7' : ''} max-w-[20ch] text-[#FBF9F4] ${TYPE.h1}`}>
            {title}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-6 max-w-[54ch] text-pretty text-[#F4EFE4]/90 ${TYPE.lead}`}>
              {subtitle}
            </Reveal>
          )}
        </div>

        <Reveal delay={240} className="mx-auto w-full max-w-[1120px]">
          {searchable ? (
            <SearchPanel m={m} filters={filters} onSearch={onSearch} />
          ) : (
            <div className="flex justify-center">
              <ButtonLink action={m.headerAction} label={m.headerLabel} variant="cream" className="w-full @xl:w-auto" />
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
