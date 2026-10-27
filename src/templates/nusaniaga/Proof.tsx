// Keunggulan (kunci `advantages`) + Testimoni (kunci `testimonials`).
// Keunggulan: pita abu. Kepala section, lalu SATU kartu angka 2×2 (chip satuan tint → angka besar Manrope tinta yang
// menghitung naik → keterangan; sel dipisah garis rambut) di samping foto 16:10 setinggi kartu, lalu alasan dalam 4 kolom
// bergaris atas. Tanpa foto → kartu angka selebar penuh dalam satu baris 4 kolom; 1–3 angka → satu baris.
// Testimoni: putih. SATU kartu "buku referensi": baris bergaris rambut berisi orang (foto, nama, jabatan) → kutipan →
// label produk yang dibeli.
import { Reveal, CountUp } from '../shared/Animated';
import { CONTAINER, SECTION_GAP } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { advantageItems, statItems, type NusaNiagaModel } from './model';
import { NUSANIAGA_PHOTOS } from './photos';
import { C, CARD, DIVIDE, GRID, ICON_BOX, LINE, SECTION_PAD, TAG, TYPE_N, UNIT_CHIP } from './styles';
import { PhotoRing, SectionHead, TitleIcon } from './ui';

/** Kelas sel angka per jumlah angka & tata letak: garis rambut kanan/atas di antara sel, bukan di tepi kartu. */
function statCell(i: number, count: number, wide: boolean): string {
  if (count === 4 && !wide) {
    // 2×2: sel kiri bergaris kanan, baris kedua bergaris atas
    return `${i % 2 === 0 ? 'border-r' : ''} ${i >= 2 ? 'border-t' : ''}`;
  }
  // Satu baris (1–3 angka, atau 4 angka selebar penuh): garis kanan kecuali sel terakhir; HP 4 angka → 2×2
  if (count === 4) return `${i % 2 === 0 ? 'border-r' : ''} ${i >= 2 ? 'border-t @5xl:border-t-0' : ''} ${i === 1 ? '@5xl:border-r' : ''}`;
  return i < count - 1 ? 'border-b @xl:border-b-0 @xl:border-r' : '';
}

function statGrid(count: number, wide: boolean): string {
  if (count === 4) return wide ? 'grid-cols-2 @5xl:grid-cols-4' : 'grid-cols-2';
  if (count === 3) return 'grid-cols-1 @xl:grid-cols-3';
  if (count === 2) return 'grid-cols-1 @xl:grid-cols-2';
  return 'grid-cols-1';
}

export function Advantages({ m }: { m: NusaNiagaModel }) {
  const { advantages } = m;
  const title = text(advantages, 'title');
  const image = text(advantages, 'image');
  const items = advantageItems(advantages);
  const stats = statItems(advantages);
  const withPhoto = hasImage(image);
  const wide = !withPhoto;

  return (
    <TemplateSection sectionKey="advantages" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(advantages, 'eyebrow')} title={title} srTitle="Keunggulan" subtitle={text(advantages, 'subtitle')} />

        {(stats.length > 0 || withPhoto) && (
          <div className={`${GRID} gap-y-5 @5xl:items-stretch ${SECTION_GAP}`}>
            {stats.length > 0 && (
              <Reveal className={`min-w-0 ${CARD} ${withPhoto ? '@5xl:col-[1/7]' : '@5xl:col-span-12'}`}>
                <dl className={`grid h-full ${statGrid(stats.length, wide)}`}>
                  {stats.map((stat, i) => {
                    const unit = field(stat, 'unit');
                    const label = field(stat, 'label');
                    return (
                      <div key={`${field(stat, 'value')}-${i}`} className={`flex min-w-0 flex-col p-6 @5xl:p-8 ${LINE} ${statCell(i, stats.length, wide)}`}>
                        <dt className="order-3 mt-3 max-w-[28ch] text-[14px] leading-snug text-[#4D5562]">{label || unit}</dt>
                        {unit && (
                          <dd aria-hidden className="order-1">
                            <span className={UNIT_CHIP}>{unit}</span>
                          </dd>
                        )}
                        <dd className={`order-2 ${unit ? 'mt-5' : ''} ${C.ink} ${TYPE_N.stat}`}>
                          <CountUp value={field(stat, 'value')} />
                          {unit && <span className="sr-only"> {unit}</span>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Reveal>
            )}
            {withPhoto && (
              <Reveal delay={120} className={`min-w-0 ${stats.length > 0 ? '@5xl:col-[7/13]' : '@5xl:col-span-12'}`}>
                <KitPhoto
                  src={image}
                  alt={NUSANIAGA_PHOTOS.alt(image, title)}
                  fallback="none"
                  zoom
                  className={`aspect-[16/10] rounded-2xl ${stats.length > 0 ? '@5xl:aspect-auto @5xl:h-full @5xl:min-h-[340px]' : ''}`}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                >
                  <PhotoRing />
                </KitPhoto>
              </Reveal>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-14 grid gap-x-8 gap-y-10 @3xl:grid-cols-2 @5xl:mt-16 @5xl:grid-cols-4 @7xl:gap-x-12">
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i)} className="border-t border-[#141821]/[0.12] pt-6">
                <span aria-hidden className={ICON_BOX}>
                  <TitleIcon title={field(item, 'title')} />
                </span>
                <h3 className={`mt-5 ${C.ink} ${TYPE_N.h3}`}>{field(item, 'title')}</h3>
                {field(item, 'description') && <p className={`mt-2.5 ${TYPE_N.body} ${C.muted}`}>{field(item, 'description')}</p>}
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

export function Testimonials({ m }: { m: NusaNiagaModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');

  return (
    <TemplateSection sectionKey="testimonials" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(testimonials, 'eyebrow')}
          title={text(testimonials, 'title')}
          srTitle="Testimoni"
          subtitle={text(testimonials, 'subtitle')}
        />
        <Reveal className={`${CARD} ${SECTION_GAP}`}>
          <ul className={`divide-y ${DIVIDE}`}>
            {items.map((item, i) => {
              const name = field(item, 'name');
              const role = field(item, 'role');
              const purchase = field(item, 'purchase');
              return (
                <li key={`${name}-${i}`} className="grid gap-5 px-5 py-7 @3xl:px-8 @5xl:py-9 @6xl:grid-cols-12 @6xl:gap-8">
                  {(name || role) && (
                    <div className="flex min-w-0 items-center gap-4 @6xl:col-span-3 @6xl:items-start">
                      <KitAvatar name={name || 'Klien'} photo={field(item, 'photo')} className="h-14 w-14" sizes="56px" />
                      <p className="min-w-0">
                        {name && <span className={`block text-[15px] font-semibold leading-snug ${C.ink}`}>{name}</span>}
                        {role && <span className={`mt-0.5 block text-[13.5px] leading-snug ${C.muted}`}>{role}</span>}
                      </p>
                    </div>
                  )}
                  <blockquote className={`min-w-0 ${name || role ? '@6xl:col-span-6' : '@6xl:col-span-9'}`}>
                    <p className={`text-pretty ${C.ink} ${TYPE_N.quote}`}>
                      <span aria-hidden className="text-(--nn-ink)">“</span>
                      {field(item, 'quote')}
                      <span aria-hidden className="text-(--nn-ink)">”</span>
                    </p>
                  </blockquote>
                  {purchase && (
                    <div className="min-w-0 @6xl:col-span-3 @6xl:flex @6xl:items-start @6xl:justify-end @6xl:pt-1">
                      <p className={`${TAG} @6xl:text-right`}>{purchase}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
