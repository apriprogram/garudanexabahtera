// Harga sewa (kunci `pricing`), pita putih: kepala section, lalu kiri (8 kolom) TABEL harga dari data armada — Mobil |
// 12 jam | 24 jam | Dengan sopir (12 jam) | Luar kota — dalam wadah radius 24 bercincin: baris kepala abu (mono kapital),
// baris bergaris rambut, nama Hanken + kelas mono, harga mono tabular; harga kosong "—" (+ "tidak tersedia" untuk pembaca
// layar). HP: kolom Mobil menempel (sticky) di dalam wadah yang bisa digeser mendatar sendiri (halaman tidak pernah
// bergeser) + petunjuk "Geser tabel". Catatan jujur di bawah tabel. Kanan (4 kolom): foto kabin 4:3 + daftar "Sudah
// termasuk" bercentang. Harga = contoh, dikonfirmasi admin.
import { CircleCheck } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { formatRupiah, seatsLabel, type FleetCar, type KemudiModel } from './model';
import { KEMUDI_PHOTOS } from './photos';
import { C, DISPLAY, MONO, MONO_LABEL, SECTION_PAD, WRAP } from './styles';
import { SectionHead } from './ui';

const COLUMNS: { key: 'p12' | 'p24' | 'driver' | 'out'; label: string }[] = [
  { key: 'p12', label: '12 jam' },
  { key: 'p24', label: '24 jam' },
  { key: 'driver', label: 'Dengan sopir (12 jam)' },
  { key: 'out', label: 'Luar kota' },
];

function Cell({ car, column }: { car: FleetCar; column: (typeof COLUMNS)[number]['key'] }) {
  if (column === 'out') {
    return car.out ? <>{car.out}</> : <Missing />;
  }
  const value = car[column];
  return value > 0 ? <>{formatRupiah(value)}</> : <Missing />;
}

/** Baris kecil di bawah nama mobil: kursi · transmisi. */
const sub = (car: FleetCar): string => [seatsLabel(car.seats), car.transmission].filter(Boolean).join(' · ');

function Missing() {
  return (
    <>
      <span aria-hidden className="text-[#0D1117]/60">
        —
      </span>
      <span className="sr-only">tidak tersedia</span>
    </>
  );
}

export function Pricing({ m }: { m: KemudiModel }) {
  const { pricing } = m;
  const cars = m.cars.filter((car) => car.p12 > 0 || car.p24 > 0 || car.driver > 0);
  const note = text(pricing, 'note');
  const image = text(pricing, 'image');
  const includedTitle = text(pricing, 'included_title');
  const included = list(pricing, 'included', 6)
    .map((i) => field(i, 'text'))
    .filter(Boolean);
  const aside = !!image || included.length > 0;

  return (
    <TemplateSection sectionKey="pricing" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(pricing, 'eyebrow')} index={m.index('pricing')} title={text(pricing, 'title')} subtitle={text(pricing, 'subtitle')} srTitle="Harga sewa" tone="white" />

        <div className={`mt-10 grid gap-8 @3xl:mt-12 ${aside ? '@6xl:grid-cols-12' : ''}`}>
          <Reveal className={`min-w-0 ${aside ? '@6xl:col-span-8' : ''}`}>
            <p aria-hidden className={`mb-3 text-[12px] @3xl:hidden ${MONO} ${C.muted}`}>
              Geser tabel →
            </p>
            <div className="overflow-hidden rounded-[24px] border border-[#0D1117]/[0.09]">
              {/* relative: teks sr-only ("tidak tersedia") berposisi absolut ikut terpotong di sini, bukan melebarkan halaman HP */}
              <div className="km-scroll-x relative overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <caption className="sr-only">Harga sewa per unit (contoh), dalam rupiah</caption>
                  <thead>
                    <tr className="bg-[#F2F4F7]">
                      <th scope="col" className={`sticky left-0 z-10 bg-[#F2F4F7] px-5 py-3.5 ${MONO_LABEL} text-[#0D1117]/70 @3xl:px-6`}>
                        Mobil
                      </th>
                      {COLUMNS.map((c) => (
                        <th key={c.key} scope="col" className={`px-4 py-3.5 ${MONO_LABEL} text-[#0D1117]/70`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1117]/[0.08]">
                    {cars.map((car) => (
                      <tr key={car.index} className="group">
                        <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 font-normal transition-colors group-hover:bg-[#F8F9FB] @3xl:px-6">
                          <span className={`block whitespace-nowrap ${DISPLAY} text-[16.5px] font-semibold tracking-[-0.01em] ${C.ink}`}>{car.name}</span>
                          {sub(car) && <span className={`mt-0.5 block whitespace-nowrap text-[12px] ${MONO} ${C.muted}`}>{sub(car)}</span>}
                        </th>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className={`px-4 py-4 text-[14.5px] transition-colors group-hover:bg-[#F8F9FB] ${MONO} ${C.ink}`}>
                            <Cell car={car} column={c.key} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {note && <p className={`mt-4 max-w-[70ch] text-[13.5px] leading-relaxed ${C.muted}`}>{note}</p>}
          </Reveal>

          {aside && (
            <Reveal delay={120} className="grid min-w-0 gap-4 @3xl:grid-cols-2 @6xl:col-span-4 @6xl:grid-cols-1 @6xl:content-start">
              {image && (
                <KitPhoto
                  src={image}
                  alt={KEMUDI_PHOTOS.alt(image, 'Kabin mobil yang bersih dan rapi')}
                  sizes="(min-width: 1152px) 30vw, (min-width: 768px) 50vw, 100vw"
                  fallback="none"
                  className="aspect-[4/3] rounded-[24px]"
                />
              )}
              {included.length > 0 && (
                // Tablet: kartu sebelah foto 4:3 ikut setinggi foto → isinya di tengah (tidak menyisakan ruang kosong di bawah)
                <div className="flex flex-col justify-center rounded-[24px] bg-[#F2F4F7] p-5 @3xl:p-6">
                  {includedTitle && <p className={`${DISPLAY} text-[18px] font-semibold tracking-[-0.015em] ${C.ink}`}>{includedTitle}</p>}
                  <ul className={`${includedTitle ? 'mt-3' : ''} grid gap-2.5`}>
                    {included.map((item, i) => (
                      <li key={`${item}-${i}`} className={`flex items-start gap-2.5 text-[15px] leading-snug ${C.ink}`}>
                        <CircleCheck aria-hidden className="mt-px h-[18px] w-[18px] shrink-0 text-(--km-ink)" strokeWidth={2} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
