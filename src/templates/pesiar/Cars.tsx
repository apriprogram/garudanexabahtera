// Mobil & sopir (kunci `cars`, pita PUTIH): kepala section, lalu satu kolom per kelas mobil (3 di layar lebar, 2 di
// tablet, bertumpuk di HP): gambar GARIS tampak samping (./vehicles; tergambar sekali saat masuk layar) di atas garis
// lantai — atau foto mobil pembeli bila diisi — nama kelas Playfair + "atau setara", chip penumpang & koper, harga
// "Mulai … / 10 jam" per mobil + harga per jam tambahan, lalu catatan harga contoh di bawah kisi (CMS `note`). Di
// bawahnya "Sopir kami": monogram inisial Playfair miring di lingkaran hijau tua (tanpa foto wajah: nama sopir fiktif)
// dengan bahasa yang dikuasai. Kelas mobil, bukan merek.
import { Briefcase, Languages, Users } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { NBSP, formatPriceShort, type PesiarModel } from './model';
import { PESIAR_PHOTOS } from './photos';
import { C, SECTION_PAD, SERIF, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';
import { LineCar } from './vehicles';

const COLS: Record<number, string> = { 1: '', 2: '@2xl:grid-cols-2', 3: '@2xl:grid-cols-2 @5xl:grid-cols-3', 4: '@2xl:grid-cols-2 @6xl:grid-cols-4' };
/** Baris sopir di layar sangat lebar: kolom sebanyak sopir (5–6), 4 sopir tetap 4 kolom selebar penuh (tanpa sisa kanan) */
const DRIVER_COLS: Record<number, string> = { 5: '@min-[96rem]:grid-cols-5', 6: '@min-[96rem]:grid-cols-6' };

export function Cars({ m }: { m: PesiarModel }) {
  const { carsSection } = m;
  const cars = m.cars;
  const drivers = list(carsSection, 'drivers', 6).filter((d) => field(d, 'name'));
  const driversTitle = text(carsSection, 'drivers_title');
  const note = text(carsSection, 'note');
  return (
    <TemplateSection sectionKey="cars" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead number={m.number('cars')} eyebrow={text(carsSection, 'eyebrow')} title={text(carsSection, 'title')} subtitle={text(carsSection, 'subtitle')} srTitle="Mobil & sopir" />
        {/* ≥ 1920px: jarak kolom 56px → tiga kolom ± 560px (tidak melebar terus) */}
        <ul className={`mt-12 grid gap-x-6 gap-y-12 @3xl:mt-16 @5xl:gap-x-8 @min-[120rem]:gap-x-14 ${COLS[Math.min(cars.length, 4)] ?? ''}`}>
          {cars.map((car, i) => {
            const price = formatPriceShort(car.price);
            const overtime = formatPriceShort(car.overtime);
            // Tablet (2 kolom) dengan 3 mobil: mobil ketiga selebar dua kolom (gambar kiri, keterangan kanan), tanpa lubang
            const wideLast = cars.length === 3 && i === 2;
            return (
              <Reveal
                as="li"
                key={`${car.name}-${i}`}
                delay={stagger(i)}
                className={`min-w-0 ${wideLast ? '@2xl:col-span-2 @2xl:grid @2xl:grid-cols-2 @2xl:items-center @2xl:gap-x-6 @5xl:col-span-1 @5xl:block' : ''}`}
              >
                {hasImage(car.image) ? (
                  <KitPhoto
                    src={car.image}
                    alt={PESIAR_PHOTOS.alt(car.image, `Foto mobil ${car.name}`)}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/7] w-full rounded-[28px]"
                  />
                ) : (
                  <div className="flex aspect-[16/7] items-end justify-center rounded-[28px] bg-[#F5EFE6] px-4 pb-2 pt-4">
                    <LineCar kind={car.kind} className="w-[94%] max-w-[440px]" />
                  </div>
                )}
                <div className={`mt-6 min-w-0 ${wideLast ? '@2xl:mt-0 @5xl:mt-6' : ''}`}>
                  <h3 className={`${TYPE.h3} ${C.ink}`}>
                    {car.name}
                    <span className={`ml-2 ${SERIF} text-[16px] font-medium italic ${C.muted}`}>atau setara</span>
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {car.seats > 0 && (
                      <li className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F5EFE6] px-3.5 text-[13.5px] font-medium ${C.ink}`}>
                        <Users aria-hidden className="h-4 w-4" strokeWidth={1.7} />
                        {car.seats}
                        {NBSP}penumpang
                      </li>
                    )}
                    {car.luggage && (
                      <li className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F5EFE6] px-3.5 text-[13.5px] font-medium ${C.ink}`}>
                        <Briefcase aria-hidden className="h-4 w-4" strokeWidth={1.7} />
                        {car.luggage}
                      </li>
                    )}
                  </ul>
                  {price && (
                    <p className={`mt-5 border-t pt-4 text-[14px] ${C.line} ${C.muted}`}>
                      Mulai <span className={`text-[22px] font-semibold tabular-nums ${C.ink}`}>{price}</span> / {m.settings.baseHours}
                      {NBSP}jam
                      {overtime && (
                        <span className="block pt-1">
                          Jam tambahan <span className={`font-semibold tabular-nums ${C.ink}`}>{overtime}</span> / jam
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mt-10 max-w-[70ch] ${TYPE.small} ${C.muted}`}>{note}</p>}

        {drivers.length > 0 && (
          <div className={`mt-16 border-t pt-10 @3xl:mt-20 @3xl:pt-12 ${C.line}`}>
            <h3 className={`${TYPE.h3} ${C.ink}`}>{driversTitle || 'Sopir kami'}</h3>
            <ul className={`mt-6 grid grid-cols-1 gap-x-6 gap-y-5 @xl:grid-cols-2 @7xl:grid-cols-4 ${DRIVER_COLS[drivers.length] ?? ''}`}>
              {drivers.map((d, i) => (
                <Reveal as="li" key={`${field(d, 'name')}-${i}`} delay={stagger(i, 60)} className="flex min-w-0 items-center gap-3.5">
                  <span aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#17332B] ${SERIF} text-[21px] font-medium italic text-[#F5EFE6]`}>
                    {initials(field(d, 'name'), '?')}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[15.5px] font-semibold leading-snug ${C.ink}`}>{field(d, 'name')}</span>
                    {field(d, 'languages') && (
                      <span className={`mt-0.5 flex items-start gap-1.5 text-[13px] leading-snug ${C.muted}`}>
                        <Languages aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                        {/* Bahasa boleh dua baris (4 kolom di ± 1024px): tidak dipotong "…" */}
                        <span className="min-w-0 text-pretty">{field(d, 'languages')}</span>
                      </span>
                    )}
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
