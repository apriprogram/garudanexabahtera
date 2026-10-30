// Armada (kunci `fleet`), pita abu: kepala section (label + H2 kiri, kalimat kanan), bilah kontrol: chip saringan kelas
// (Semua + kelas dari data, jumlah mobil mono; HP = rel geser di wadahnya sendiri) dan kontrol bersegmen Lepas kunci |
// Dengan sopir (sama dengan kartu pesan di hero; harga kartu ikut berganti), lalu satu baris catatan harga ("harga contoh;
// harga final dikonfirmasi admin"). Jumlah hasil diumumkan (role=status). Kisi kartu 1 / 2 / 3 / 4 kolom: sumur ilustrasi
// abu radius 18 dengan mobil SVG kelas itu berdiri di garis lantai 2px (atau foto pembeli 16:10), nama + "atau setara",
// chip spesifikasi mono, harga "mulai Rp450rb / 24 jam" + "12 jam Rp350rb" (dengan sopir: "Rp650rb / 12 jam"; tanpa harga
// di CMS: "Harga via admin"), tombol abu "Pesan ↑" → mengisi kartu pesan di hero, menggulir ke kartu itu, fokus ke isian
// pertama.
// Gerak: kartu muncul (opacity + skala 0,98 → 1, 250 ms, bertahap 35 ms) HANYA setelah saringan diganti.
import { ArrowUp, Cog, Fuel, Info, Luggage, Users } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  MODES,
  carSpecs,
  filterFleet,
  fleetClasses,
  fleetColumns,
  fleetCount,
  formatPriceShort,
  pricedFor,
  supports,
  unpriced,
  type FleetCar,
  type KemudiModel,
  type RentalMode,
} from './model';
import { KEMUDI_PHOTOS } from './photos';
import { BTN, C, CHIP, MONO, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, Segmented } from './ui';
import { CarSide } from './vehicles';

const SPEC_ICON = { seats: Users, transmission: Cog, fuel: Fuel, luggage: Luggage } as const;

/** Layar ≥ 1920px: 4 kolom hanya bila baris terakhir tidak jadi baris pendek (6 mobil → tetap 3 × 2, bukan 4 + 2). */
const wideColumns = (n: number): string => (fleetColumns(n) === 4 ? '@min-[120rem]:grid-cols-4' : '');

function Price({ car, mode }: { car: FleetCar; mode: RentalMode }) {
  if (pricedFor(car, mode)) {
    const big = mode === 'self' ? formatPriceShort(car.p24) : formatPriceShort(car.driver);
    const unit = mode === 'self' ? '/ 24 jam' : '/ 12 jam';
    const small = mode === 'self' ? (car.p12 > 0 && car.p12 < car.p24 ? `12 jam ${formatPriceShort(car.p12)}` : '') : 'termasuk sopir';
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0">
          {/* "mulai": harga contoh, harga final dikonfirmasi admin (catatan di bawah saringan) */}
          <span className={`mr-1.5 text-[13px] ${C.muted}`}>mulai</span>
          <span className={`text-[26px] leading-none ${TYPE.price} ${C.ink}`}>{big}</span>
          <span className={`ml-1.5 text-[14px] ${C.muted}`}>{unit}</span>
        </p>
        {small && <p className={`text-[12.5px] ${MONO} ${C.muted}`}>{small}</p>}
      </div>
    );
  }
  // Kolom harga lepas kunci 24 jam & sopir dikosongkan → "Harga via admin" (bisa dipesan di kedua layanan)
  if (unpriced(car)) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={`${TYPE.h3sm} ${C.ink}`}>Harga via admin</p>
        {car.p12 > 0 && <p className={`text-[12.5px] ${MONO} ${C.muted}`}>{`12 jam ${formatPriceShort(car.p12)}`}</p>}
      </div>
    );
  }
  const other: RentalMode = mode === 'self' ? 'driver' : 'self';
  const otherPrice = other === 'driver' ? formatPriceShort(car.driver) : formatPriceShort(car.p24);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className={`${TYPE.h3sm} ${C.ink}`}>{mode === 'self' ? 'Khusus dengan sopir' : 'Lepas kunci saja'}</p>
      {otherPrice && <p className={`text-[12.5px] ${MONO} ${C.muted}`}>{`${otherPrice} / ${other === 'driver' ? '12' : '24'} jam`}</p>}
    </div>
  );
}

function Card({ car, mode, bookLabel, onBook }: { car: FleetCar; mode: RentalMode; bookLabel: string; onBook: (index: number) => void }) {
  const specs = carSpecs(car);
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-[24px] bg-white p-4 ring-1 ring-inset ring-[#0D1117]/[0.06] transition-colors duration-300 hover:ring-(--tpl-accent-200) @xl:p-5">
      <div className="relative aspect-[2/1] overflow-hidden rounded-[18px] bg-[#F6F7F9]">
        {hasImage(car.image) ? (
          <KitPhoto
            src={car.image}
            alt={KEMUDI_PHOTOS.alt(car.image, `Foto ${car.name}`)}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            fallback="none"
            className="absolute inset-0"
            imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <CarSide kind={car.kind} floor className="absolute inset-0 h-full w-full" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className={`${TYPE.h3} ${C.ink}`}>{car.name}</h3>
        <span className={`text-[13px] ${C.muted}`}>atau setara</span>
      </div>
      {specs.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Spesifikasi ${car.name}`}>
          {specs.map((s) => {
            const Icon = SPEC_ICON[s.key];
            return (
              <li key={s.key} className={CHIP}>
                <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--km-ink)" strokeWidth={1.8} />
                {s.label}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-auto pt-4">
        <div className="border-t border-[#0D1117]/10 pt-4">
          <Price car={car} mode={mode} />
        </div>
        {bookLabel && (
          <button type="button" onClick={() => onBook(car.index)} aria-label={`${bookLabel}: ${car.name}`} className={`${BTN.secondary} ${BTN.lg} mt-4 flex w-full`}>
            {bookLabel}
            {/* Panah ke atas: tombol menggulir ke kartu pesan di hero (panah serong dipakai untuk tautan keluar) */}
            <ArrowUp aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:-translate-y-0.5" />
          </button>
        )}
      </div>
    </article>
  );
}

export function Fleet({ m, mode, onMode, onBook }: { m: KemudiModel; mode: RentalMode; onMode: (mode: RentalMode) => void; onBook: (index: number) => void }) {
  const { fleet } = m;
  const baseId = useId();
  const [cls, setCls] = useState('');
  const [changed, setChanged] = useState(false);
  const classes = fleetClasses(m.cars);
  const shown = filterFleet(m.cars, cls);
  const bookLabel = m.shown('hero') ? text(fleet, 'book_label') : '';
  const priceNote = text(fleet, 'price_note');
  const pick = (value: string) => {
    setCls(value);
    setChanged(true);
  };
  const chip = (active: boolean) =>
    `inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[14px] font-semibold transition-colors duration-200 ${
      active ? 'bg-[#0D1117] text-white' : 'bg-white text-[#0D1117]/80 ring-1 ring-inset ring-[#0D1117]/[0.08] hover:text-[#0D1117] hover:ring-[#0D1117]/25'
    }`;
  const modeOptions = MODES.map((o) => ({ value: o.key, label: o.label, disabled: !m.cars.some((car) => supports(car, o.key)) }));

  return (
    <TemplateSection sectionKey="fleet" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(fleet, 'eyebrow')} index={m.index('fleet')} title={text(fleet, 'title')} subtitle={text(fleet, 'subtitle')} srTitle="Armada mobil" tone="grey" />

        {/* Kontrol: HP = rel chip yang digeser; ≥ @5xl chip membungkus (tidak ada chip terpotong); satu baris dengan
            kontrol layanan baru dari @6xl (1024px terlalu sempit untuk 6 chip + jumlah + kontrol bersegmen) */}
        <Reveal className="mt-10 flex flex-col gap-4 @5xl:mt-12 @6xl:flex-row @6xl:items-center @6xl:justify-between">
          {classes.length > 1 && (
            <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] @2xl:-mx-8 @2xl:px-8 @5xl:mx-0 @5xl:overflow-visible @5xl:px-0 @5xl:pb-0">
              <div role="group" aria-label="Saring kelas mobil" className="flex w-max gap-2 @5xl:w-auto @5xl:flex-wrap">
                <button type="button" aria-pressed={cls === ''} onClick={() => pick('')} className={chip(cls === '')}>
                  Semua
                  <span aria-hidden className={`${MONO} text-[12px] ${cls === '' ? 'text-white/70' : 'text-[#0D1117]/65'}`}>
                    {m.cars.length}
                  </span>
                </button>
                {classes.map((c) => {
                  const active = cls.toLowerCase() === c.label.toLowerCase();
                  return (
                    <button key={c.label} type="button" aria-pressed={active} onClick={() => pick(c.label)} className={chip(active)}>
                      {c.label}
                      <span aria-hidden className={`${MONO} text-[12px] ${active ? 'text-white/70' : 'text-[#0D1117]/65'}`}>
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 @6xl:shrink-0">
            <p role="status" className={`sr-only text-[13px] @3xl:not-sr-only @3xl:whitespace-nowrap ${MONO} ${C.muted}`}>
              {fleetCount(shown.length)}
            </p>
            <Segmented name={`${baseId}-mode`} label="Harga untuk layanan" options={modeOptions} value={mode} onChange={onMode} tone="white" className="w-full @xl:w-[320px]" />
          </div>
        </Reveal>
        {priceNote && (
          <p className={`mt-4 flex items-start gap-2 text-[13.5px] leading-snug ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {priceNote}
          </p>
        )}

        <Reveal className={priceNote ? 'mt-5 @3xl:mt-6' : 'mt-6 @3xl:mt-8'}>
          <ul
            key={cls}
            data-filtered={changed ? 'true' : 'false'}
            aria-label="Daftar mobil"
            className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] @2xl:mx-0 @2xl:grid @2xl:grid-cols-2 @2xl:gap-4 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0 @5xl:grid-cols-3 @5xl:gap-5 ${wideColumns(shown.length)}`}
          >
            {shown.map((car, i) => (
              <li key={car.index} className="km-pop w-[84%] min-w-0 shrink-0 snap-start @2xl:w-auto" style={{ '--km-delay': `${Math.min(i, 6) * 35}ms` } as CSSProperties}>
                <Card car={car} mode={mode} bookLabel={bookLabel} onBook={onBook} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
