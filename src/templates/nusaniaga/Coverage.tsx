// Jangkauan (kunci `coverage`), putih. Baris atas: foto 16:10 radius 16 di kolom 1–6 dengan parallax ringan
// (SATU-SATUNYA parallax di halaman) dan kepala section di kolom 8–12. Di bawahnya "buku negara asal" selebar penuh:
// sel bergaris rambut atas (lencana kode negara → nama negara + produknya), 4 kolom di layar lebar, lalu area pengantaran
// sebagai label garis tipis. Tanpa foto → kepala section terbelah (judul kiri, deskripsi kanan). Chip negara di hero
// menuju ke sini. HP: foto → label → H2 → deskripsi → negara → area.
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_GAP } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitList, type NusaNiagaModel } from './model';
import { NUSANIAGA_PHOTOS } from './photos';
import { C, CODE_BADGE, DISPLAY, GRID, PHOTO, SECTION_PAD } from './styles';
import { PhotoRing, SectionHead } from './ui';

export function Coverage({ m }: { m: NusaNiagaModel }) {
  const { coverage } = m;
  const title = text(coverage, 'title');
  const image = text(coverage, 'image');
  const origins = m.items('coverage');
  const originsLabel = text(coverage, 'origins_label');
  const areasLabel = text(coverage, 'areas_label');
  const areas = splitList(text(coverage, 'areas'));
  const withPhoto = hasImage(image);
  const head = (
    <SectionHead
      layout={withPhoto ? 'stack' : 'split'}
      eyebrow={text(coverage, 'eyebrow')}
      title={title}
      srTitle="Jangkauan"
      subtitle={text(coverage, 'subtitle')}
    />
  );

  return (
    <TemplateSection sectionKey="coverage" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        {withPhoto ? (
          <div className={`${GRID} gap-y-10 @5xl:items-center`}>
            <div className="min-w-0 @5xl:col-[1/7]">
              <KitPhoto src={image} alt={NUSANIAGA_PHOTOS.alt(image, title)} fallback="none" parallax className={PHOTO} sizes="(min-width: 1024px) 50vw, 100vw">
                <PhotoRing />
              </KitPhoto>
            </div>
            <div className="min-w-0 @5xl:col-[8/13]">{head}</div>
          </div>
        ) : (
          head
        )}

        {origins.length > 0 && (
          <div className={SECTION_GAP}>
            {originsLabel && <p className={`text-[13px] font-medium ${C.subtle}`}>{originsLabel}</p>}
            <ul className={`grid gap-x-8 @xl:grid-cols-2 @5xl:grid-cols-4 @7xl:gap-x-12 ${originsLabel ? 'mt-4' : ''}`}>
              {origins.map((item, i) => {
                const code = field(item, 'code').slice(0, 3).toUpperCase();
                const products = field(item, 'products');
                return (
                  <Reveal
                    as="li"
                    key={`${field(item, 'country')}-${i}`}
                    delay={stagger(i % 4, 60)}
                    className="grid grid-cols-[auto_1fr] items-start gap-x-4 border-t border-[#141821]/[0.12] py-5"
                  >
                    <span aria-hidden className={`${CODE_BADGE} mt-0.5 ${code ? '' : 'invisible'}`}>
                      {code || '·'}
                    </span>
                    <span className="min-w-0">
                      <span className={`block ${DISPLAY} text-[17px] font-bold leading-snug tracking-[-0.015em] ${C.ink}`}>{field(item, 'country')}</span>
                      {products && <span className={`mt-1 block text-[14px] leading-snug ${C.muted}`}>{products}</span>}
                    </span>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        )}

        {areas.length > 0 && (
          <Reveal className={`flex flex-col gap-3 @5xl:flex-row @5xl:items-center @5xl:gap-8 ${origins.length > 0 ? 'mt-8' : SECTION_GAP}`}>
            {areasLabel && <p className={`shrink-0 text-[13px] font-medium ${C.subtle}`}>{areasLabel}</p>}
            <ul className="flex flex-wrap gap-2">
              {areas.map((area, i) => (
                <li
                  key={`${area}-${i}`}
                  className={`inline-flex h-9 items-center rounded-full px-3.5 text-[14px] ring-1 ring-inset ring-[#141821]/[0.12] ${C.ink}`}
                >
                  {area}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
