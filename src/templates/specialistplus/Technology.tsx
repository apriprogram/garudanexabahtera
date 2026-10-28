// Teknologi alat (kunci `technology`), halaman putih. Kartu spesifikasi: foto 4:3 (zoom halus saat disorot), chip kode
// mono + ikon, nama alat (H3), satu kalimat, lalu baris spesifikasi "Label: nilai" (dl, garis rambut). HP: rel geser
// mendatar dengan snap (kotak gulir sendiri, bisa difokus); ≥ @3xl 2 kolom, ≥ @6xl 3 kolom, ≥ @7xl satu baris (maks. 5).
// Nama alat ditulis umum, tanpa merek.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { specRows, type SpxModel } from './model';
import { SPECIALISTPLUS_PHOTOS } from './photos';
import { C, CARD, CARD_HOVER, MONO_LABEL, SECTION_PAD, TYPE_S } from './styles';
import { MedIcon, SectionHead } from './ui';

/** Kolom di layar sangat lebar: satu baris untuk ≤ 5 alat, selain itu 3 kolom (kelas utuh agar terbaca Tailwind). */
const WIDE_COLS: Record<number, string> = {
  1: '@7xl:grid-cols-3',
  2: '@7xl:grid-cols-3',
  3: '@7xl:grid-cols-3',
  4: '@7xl:grid-cols-4',
  5: '@7xl:grid-cols-5',
  6: '@7xl:grid-cols-3',
};

export function Technology({ m }: { m: SpxModel }) {
  const { technology } = m;
  const items = m.items('technology');
  if (items.length === 0) return null;
  const eyebrow = text(technology, 'eyebrow');

  return (
    <TemplateSection sectionKey="technology" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={eyebrow} code={m.code('technology')} title={text(technology, 'title')} subtitle={text(technology, 'subtitle')} srTitle={eyebrow || 'Teknologi'} />
        <Reveal className="mt-10 @5xl:mt-14">
          {/* HP: rel geser (padding kanan wadah ikut digeser agar kartu terakhir rata tepi); ≥ @3xl: kisi */}
          <ul
            aria-label={text(technology, 'title') || 'Alat diagnostik'}
            tabIndex={0}
            className={`spx-rail -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:grid-cols-2 @3xl:gap-5 @3xl:overflow-visible @3xl:px-0 @3xl:pb-0 @6xl:grid-cols-3 ${WIDE_COLS[items.length] ?? '@7xl:grid-cols-3'}`}
          >
            {items.map((item, i) => {
              const name = field(item, 'name');
              const image = field(item, 'image');
              const specs = specRows(field(item, 'specs'));
              return (
                <li key={`${name}-${i}`} className={`group flex w-[84%] shrink-0 snap-start flex-col overflow-hidden ${CARD} ${CARD_HOVER} @xl:w-[60%] @3xl:w-auto`}>
                  {hasImage(image) && (
                    <KitPhoto
                      src={image}
                      alt={SPECIALISTPLUS_PHOTOS.alt(image, `Alat ${name}`)}
                      fallback="none"
                      sizes="(min-width: 1280px) 20vw, (min-width: 1152px) 33vw, (min-width: 768px) 50vw, 84vw"
                      className="aspect-[4/3] rounded-t-[8px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center justify-between gap-3">
                      {field(item, 'code') && (
                        <span className={`rounded-[4px] bg-(--spx-navy) px-2 py-1 font-mono text-[11px] font-medium tracking-[0.1em] text-white`}>{field(item, 'code')}</span>
                      )}
                      <MedIcon name={`${field(item, 'code')} ${name}`} className="ml-auto h-[18px] w-[18px] text-(--tpl-accent-ink)" />
                    </p>
                    <h3 className={`mt-3 ${TYPE_S.h3} ${C.ink}`}>{name}</h3>
                    {field(item, 'text') && <p className={`mt-2 text-pretty ${TYPE_S.small} ${C.muted}`}>{field(item, 'text')}</p>}
                    {specs.length > 0 && (
                      <div className="mt-auto pt-5">
                      <dl className={`divide-y border-t pt-1 ${C.line} ${C.divide}`}>
                        {specs.map((row, r) => (
                          <div key={`${row.label}-${r}`} className="flex items-baseline justify-between gap-3 py-2">
                            <dt className={`shrink-0 ${MONO_LABEL} ${C.muted}`}>{row.label || 'Info'}</dt>
                            <dd className={`min-w-0 text-right text-[13.5px] font-medium leading-snug ${C.ink}`}>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
