// Testimoni (kunci `testimonials`, abu hangat) + Galeri (kunci `gallery`).
// Testimoni: kartu putih radius 10 — chip perjalanan ("Dieng · 3 bus"), kutipan, garis lajur, monogram inisial (kotak
// tinta + huruf amber; tanpa foto: nama pelanggan fiktif), nama, peran & kota. HP: rel geser (kartu 84%), ≥ @5xl kisi.
// Galeri: kepala section di dalam wadah, lalu STRIP FOTO SELEBAR LAYAR (tanpa jarak tepi): foto tegak 4:5 berjajar
// dengan celah 2px, keterangan muncul saat disorot/difokus (selalu tampil di layar sentuh, gerak mati, kurangi gerak);
// HP: rel geser (foto 72%). Reveal membungkus rel/strip, bukan tiap kartu.
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { monogram, type LajurModel } from './model';
import { LAJUR_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD, WRAP } from './styles';
import { LiveryBars, SectionHead } from './ui';

const COLS: Record<number, string> = { 1: '@5xl:grid-cols-1', 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3' };

export function Testimonials({ m }: { m: LajurModel }) {
  const section = m.testimonials;
  const items = m.items('testimonials');
  const single = items.length === 1;
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.testimonials} title={text(section, 'title')} srTitle="Testimoni" />
        <Reveal className="mt-10 @3xl:mt-12">
          <ul
            aria-label="Testimoni pelanggan"
            className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-0 @5xl:grid @5xl:gap-5 @5xl:overflow-visible @5xl:px-0 @5xl:pb-0 ${COLS[Math.min(items.length, 3)] ?? '@5xl:grid-cols-3'}`}
          >
            {items.map((item, i) => {
              const name = field(item, 'name');
              const role = field(item, 'role');
              const trip = field(item, 'trip');
              return (
                <li key={`${name}-${i}`} className={`min-w-0 shrink-0 snap-start ${single ? 'w-full' : 'w-[84%] @2xl:w-[46%]'} @5xl:w-auto`}>
                  <figure className={`${CARD} flex h-full flex-col p-5 @3xl:p-7`}>
                    <div className="flex items-center justify-between gap-4">
                      <LiveryBars className="h-3 w-[22px]" />
                      {trip && <p className="rounded-[6px] bg-[#F3F2EE] px-2.5 py-1 text-[12.5px] font-semibold text-[#14161A]">{trip}</p>}
                    </div>
                    {/* Panjang baris kutipan ≤ 52ch: kartu selebar ±800px di layar 2560 tidak menjadi satu baris panjang */}
                    <blockquote className={`mt-5 max-w-[52ch] text-pretty text-[16px] leading-relaxed @3xl:text-[17px] ${C.ink}`}>{field(item, 'quote')}</blockquote>
                    {(name || role) && (
                      <figcaption className="mt-auto pt-6">
                        <span aria-hidden className="lj-lane-line mb-5 block h-[2px]" />
                        <span className="flex items-center gap-3">
                          <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#14161A] ${DISPLAY} text-[14px] font-bold text-(--lj-bright)`}>
                            {monogram(name || role)}
                          </span>
                          <span className="min-w-0 text-[14px] leading-snug">
                            {name && <span className={`block font-semibold ${C.ink}`}>{name}</span>}
                            {role && <span className={`mt-0.5 block ${C.muted}`}>{role}</span>}
                          </span>
                        </span>
                      </figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function Gallery({ m }: { m: LajurModel }) {
  const section = m.gallery;
  const items = m.items('gallery');
  const n = items.length;
  // 1–2 foto: tegak 4:5 selebar layar/setengah layar terlalu tinggi → pita 21:9 (1 foto) / 3:2 (2 foto) mulai @3xl;
  // sizes mengikuti jumlah kolom supaya varian foto yang dimuat cukup tajam
  const shape = n === 1 ? '@3xl:aspect-[21/9]' : n === 2 ? '@3xl:aspect-[3/2]' : '';
  const sizes = `(min-width: 768px) ${Math.ceil(100 / Math.max(1, n))}vw, ${n === 1 ? '100vw' : '72vw'}`;
  return (
    <TemplateSection sectionKey="gallery" className={`pt-16 @3xl:pt-24 @5xl:pt-28 ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.gallery} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Galeri" />
      </div>
      <Reveal className="mt-10 @3xl:mt-12">
        <ul
          aria-label="Galeri foto perjalanan"
          className="flex snap-x snap-mandatory gap-[2px] overflow-x-auto [scrollbar-width:none] @3xl:grid @3xl:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item, i) => {
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            return (
              <li key={`${image}-${i}`} className={`min-w-0 shrink-0 snap-start @3xl:w-auto ${n === 1 ? 'w-full' : 'w-[72%] @2xl:w-[44%]'}`}>
                <figure
                  tabIndex={caption ? 0 : undefined}
                  className={`lj-shot group relative aspect-[4/5] overflow-hidden bg-[#14161A] focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white ${shape}`}
                >
                  <KitPhoto
                    src={image}
                    alt={LAJUR_PHOTOS.alt(image, caption || `Foto perjalanan ${i + 1}`)}
                    sizes={sizes}
                    className="absolute inset-0"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  {caption && (
                    <figcaption className="lj-shot-cap absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(20_22_26/0.88),rgb(20_22_26/0))] px-4 pb-4 pt-14 text-[14px] font-medium leading-snug text-white @5xl:px-5 @5xl:pb-5">
                      {caption}
                    </figcaption>
                  )}
                </figure>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </TemplateSection>
  );
}
