// Asal & pasar tujuan (kunci `markets`, latar putih). Layar lebar (@7xl): kiri 5 kolom label → H2 → deskripsi → "Asal
// komoditas" berupa foto bulat 72px (tanpa foto → lingkaran kraft bersimbol) + nama serif + komoditas, dua kolom; kanan
// 7 kolom (garis rambut tegak di kiri) "Pasar tujuan": baris negara serif · pelabuhan · komoditas · Incoterm (teks
// tinta tema), lalu catatan pelabuhan. Laptop kecil & tablet: bertumpuk (asal 4 / 2 kolom, lalu tabel tujuan selebar
// penuh) agar nama negara dan pelabuhan tidak terlipat. HP: asal satu kolom (foto bulat kiri, teks kanan), lalu tujuan
// dua baris per negara. Tanpa asal → tujuan selebar penuh; tanpa tujuan → asal selebar penuh (4 kolom).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { SaudagarMark } from './marks';
import { marketDestinations, marketOrigins, type SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { C, SECTION_PAD, SERIF } from './styles';
import { SectionHead } from './ui';

const SUBHEAD = `${SERIF} text-[21px] italic font-normal leading-snug ${C.ink}`;

export function Markets({ m }: { m: SaudagarModel }) {
  const { markets } = m;
  const origins = marketOrigins(markets);
  const destinations = marketDestinations(markets);
  if (origins.length === 0 && destinations.length === 0) return null;
  const originsTitle = text(markets, 'origins_title');
  const destinationsTitle = text(markets, 'destinations_title');
  const portNote = text(markets, 'port_note');
  const both = origins.length > 0 && destinations.length > 0;

  const head = <SectionHead eyebrow={text(markets, 'eyebrow')} title={text(markets, 'title') || 'Asal & pasar tujuan'} subtitle={text(markets, 'subtitle')} />;

  const originList = origins.length > 0 && (
    <div className="mt-12">
      {originsTitle && <h3 className={SUBHEAD}>{originsTitle}</h3>}
      <ul className={`grid gap-x-5 gap-y-5 @xl:grid-cols-2 @xl:gap-y-8 @3xl:gap-x-6 @5xl:grid-cols-4 ${both ? '@7xl:grid-cols-2' : ''} ${originsTitle ? 'mt-6' : ''}`}>
        {origins.map((item, i) => {
          const image = field(item, 'image');
          return (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i)} className="flex min-w-0 items-center gap-4 @xl:items-start @5xl:gap-3.5">
              {hasImage(image) ? (
                <KitPhoto
                  src={image}
                  alt={SAUDAGAR_PHOTOS.alt(image, `${field(item, 'commodity') || 'Hasil bumi'} dari ${field(item, 'name')}`)}
                  sizes="72px"
                  fallback="none"
                  className="aspect-square w-[72px] shrink-0 rounded-full"
                />
              ) : (
                <span aria-hidden className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#EFE6D3] text-(--sg-ink)">
                  <SaudagarMark className="h-7 w-7" />
                </span>
              )}
              <div className="min-w-0 @xl:pt-2">
                <p className={`text-pretty ${SERIF} text-[20px] font-normal leading-snug tracking-[-0.01em] @5xl:text-[19px] ${C.ink}`}>{field(item, 'name')}</p>
                {field(item, 'commodity') && <p className={`mt-0.5 text-[13.5px] leading-snug ${C.muted}`}>{field(item, 'commodity')}</p>}
              </div>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );

  const destinationList = destinations.length > 0 && (
    <div>
      {destinationsTitle && <h3 className={SUBHEAD}>{destinationsTitle}</h3>}
      <ul className={`divide-y border-y ${destinationsTitle ? 'mt-6' : ''} ${C.line} ${C.divide}`}>
        {destinations.map((item, i) => (
          <Reveal
            as="li"
            key={`${field(item, 'country')}-${i}`}
            delay={stagger(i, 60)}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_5rem]"
          >
            <p className={`col-start-1 row-start-1 ${SERIF} text-[22px] font-normal leading-snug tracking-[-0.01em] ${C.ink}`}>{field(item, 'country')}</p>
            {field(item, 'terms') && (
              <p className="col-start-2 row-start-1 text-right text-[13px] font-medium text-(--sg-ink) @3xl:col-start-4">{field(item, 'terms')}</p>
            )}
            {(field(item, 'port') || field(item, 'commodities')) && (
              <p className="col-span-2 row-start-2 text-[14px] leading-snug @3xl:contents">
                {field(item, 'port') && <span className={`@3xl:col-start-2 @3xl:row-start-1 ${C.muted}`}>{field(item, 'port')}</span>}
                {field(item, 'port') && field(item, 'commodities') && (
                  <span aria-hidden className={`@3xl:hidden ${C.muted}`}>
                    {' · '}
                  </span>
                )}
                {field(item, 'commodities') && <span className={`@3xl:col-start-3 @3xl:row-start-1 ${C.ink}`}>{field(item, 'commodities')}</span>}
              </p>
            )}
          </Reveal>
        ))}
      </ul>
      {portNote && <p className={`mt-5 max-w-[60ch] text-[13px] leading-relaxed ${C.muted}`}>{portNote}</p>}
    </div>
  );

  return (
    <TemplateSection sectionKey="markets" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-12 @7xl:grid-cols-12`}>
        {both ? (
          <>
            <div className="min-w-0 @7xl:col-span-5">
              {head}
              {originList}
            </div>
            <div className={`min-w-0 @7xl:col-span-7 @7xl:border-l @7xl:pl-12 ${C.line}`}>{destinationList}</div>
          </>
        ) : (
          <div className="min-w-0 @7xl:col-span-12">
            {head}
            {originList}
            {destinations.length > 0 && <div className="mt-12">{destinationList}</div>}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
