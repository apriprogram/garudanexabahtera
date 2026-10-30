// Testimoni (kunci `testimonials`, putih) + Galeri (kunci `gallery`, pita TINTA, inverse).
// Testimoni: kepala section (label, H2, kalimat pengantar) lalu kartu pos krem yang sedikit miring (−1,5° / +1° / −0,5°,
// tegak saat disorot), perangko berlubang berisi KOTA mengapung di kanan atas kutipan (teks mengalir di sampingnya, jadi
// nama kota panjang tidak menutupi kutipan), kutipan Bricolage (kata berstrip tidak terbelah), garis alamat putus-putus,
// inisial dalam lingkaran tanpa sapaan Pak/Bu (tanpa foto: pelanggan fiktif) + nama · keterangan. 3 kolom @5xl, 2 @3xl,
// bertumpuk di HP.
// Galeri: kepala section di WRAP, lalu MOSAIK FOTO SELEBAR LAYAR tanpa tepi (celah 4px): 6 atau 8 foto membentuk persegi
// panjang penuh di kisi 4 kolom (6: tegak, lebar, 1, 1, 1, 1; 8: tegak, lebar, 1, 1, 1, tegak, lebar, 1; HP 2 kolom), jumlah
// lain kisi rata. Keterangan putih di atas gradasi gelap; zoom pelan saat disorot.
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { galleryLayout, splitHyphenated, withoutHonorific, type LawatanModel } from './model';
import { LAWATAN_PHOTOS } from './photos';
import { C, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';

const TILTS = ['-1.5deg', '1deg', '-0.5deg'];

export function Testimonials({ m }: { m: LawatanModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead
          eyebrow={text(testimonials, 'eyebrow')}
          number={m.number('testimonials')}
          title={text(testimonials, 'title')}
          subtitle={text(testimonials, 'subtitle')}
          srTitle="Testimoni"
        />
        {/* ≥ 1920px: jarak kolom 56px → kartu ≤ 560px (hanya 3 kartu, tidak ada kolom untuk ditambah) */}
        <ul className="mt-10 grid gap-6 @3xl:mt-14 @3xl:grid-cols-2 @3xl:gap-8 @5xl:grid-cols-3 @5xl:gap-10 @min-[120rem]:gap-x-14">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            const city = field(item, 'city');
            // Tablet (2 kolom) dengan jumlah ganjil: kartu terakhir di tengah, bukan sendirian di kiri
            const lastOdd = items.length % 2 === 1 && i === items.length - 1 && items.length > 1;
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                delay={stagger(i)}
                className={`min-w-0 py-2 ${lastOdd ? '@3xl:col-span-2 @3xl:w-[calc(50%-16px)] @3xl:justify-self-center @5xl:col-span-1 @5xl:w-auto @5xl:justify-self-stretch' : ''}`}
              >
                <figure
                  style={{ '--lw-tilt': TILTS[i % TILTS.length] } as CSSProperties}
                  className="lw-tilt relative flex h-full flex-col rounded-[18px] bg-[#FBF6EE] p-6 ring-1 ring-inset ring-[#1D2320]/10 @3xl:p-8"
                >
                  <blockquote className={`text-pretty ${TYPE.quote} ${C.ink}`}>
                    {/* Perangko kota: hiasan (kota juga tertulis di keterangan bawah), MENGAPUNG di kanan atas kutipan */}
                    {city && (
                      <span aria-hidden className="lw-perf float-right -mr-1 -mt-1 mb-2 ml-3 inline-block rotate-[4deg] bg-[#E6DFD1] font-sans @3xl:-mr-2 @3xl:-mt-2">
                        <span className="flex min-w-[64px] flex-col items-center rounded-[2px] bg-(--tpl-accent) px-2.5 py-2 text-center text-(--tpl-on-accent)">
                          <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.16em]">Dari</span>
                          <span className="mt-1 text-[11.5px] font-bold uppercase leading-none tracking-[0.08em]">{city}</span>
                        </span>
                      </span>
                    )}
                    {/* Baris ≤ 44ch di kartu sangat lebar (≥ 2400px) tanpa menggeser perangko dari sudut kartu */}
                    <span className="block max-w-[44ch]">
                      {splitHyphenated(field(item, 'quote')).map((part, k) =>
                        k % 2 === 1 ? (
                          <span key={k} className="whitespace-nowrap">
                            {part}
                          </span>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  </blockquote>
                  {(name || role) && (
                    <figcaption className="mt-auto pt-6">
                      <span className={`flex items-center gap-3 border-t border-dashed pt-5 ${C.line}`}>
                        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[14px] font-bold text-(--lw-ink) ring-1 ring-inset ring-[#1D2320]/10">
                          {initials(withoutHonorific(name || role), '?')}
                        </span>
                        <span className="min-w-0 text-[14px] leading-snug">
                          {name && <span className={`block font-semibold ${C.ink}`}>{name}</span>}
                          {(role || city) && <span className={`block ${C.muted}`}>{[role, city].filter(Boolean).join(' · ')}</span>}
                        </span>
                      </span>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

const SPAN = { tall: 'row-span-2', wide: 'col-span-2', one: '' } as const;

export function Gallery({ m }: { m: LawatanModel }) {
  const { gallery } = m;
  const items = m.items('gallery');
  const layout = galleryLayout(items.length);
  // 6 & 8 foto: mosaik 4 kolom tanpa lubang (HP 2 kolom); jumlah lain kisi rata
  const mosaic = items.length === 6 || items.length === 8;
  const cols = mosaic ? 'grid-cols-2 @5xl:grid-cols-4' : items.length <= 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-2 @3xl:grid-cols-3' : 'grid-cols-2 @5xl:grid-cols-4';
  return (
    <TemplateSection sectionKey="gallery" data-tpl-tone="inverse" className={`bg-[#1D2320] pt-16 @3xl:pt-24 @5xl:pt-28 ${C.onDark}`}>
      <div className={WRAP}>
        <SectionHead tone="dark" eyebrow={text(gallery, 'eyebrow')} number={m.number('gallery')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} srTitle="Galeri" />
      </div>
      <Reveal className="mt-10 @3xl:mt-14">
        <ul className={`grid auto-rows-[44cqw] gap-1 [grid-auto-flow:dense] @3xl:auto-rows-[30cqw] @5xl:auto-rows-[clamp(190px,18cqw,340px)] ${cols}`}>
          {items.map((item, i) => {
            const span = layout[i] ?? 'one';
            const caption = field(item, 'caption');
            const image = field(item, 'image');
            return (
              <li key={`${image}-${i}`} className={`min-w-0 ${SPAN[span]}`}>
                <figure className="group relative h-full w-full overflow-hidden">
                  <KitPhoto
                    src={image}
                    alt={LAWATAN_PHOTOS.alt(image, caption || `Foto perjalanan rombongan ${i + 1}`)}
                    sizes={span === 'wide' ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                    className="absolute inset-0"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  {caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 via-black/30 to-transparent px-3 pb-2.5 pt-10 text-[12.5px] font-semibold leading-snug text-white @3xl:px-4 @3xl:pb-3.5 @3xl:text-[13.5px]">
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
