// Layanan (kunci `services`) + Produk (kunci `products`).
// Layanan: pita abu, kartu putih radius 16 bergaris aksen 3px di atas: kotak ikon (dipilih dari nama layanan) atau foto
// 16:10 opsional → judul → deskripsi → poin bertitik aksen di bawah garis rambut (rata bawah, tinggi kartu sama).
// Produk: putih, BUKAN kartu: foto 16:10 radius 16 (zoom saat muncul, membesar pelan saat disorot) → label jenis
// berbingkai + negara asal → judul → deskripsi → baris kemasan/MOQ. HP: rel geser snap (satu Reveal untuk seluruh rel).
// Di bawahnya catatan + tombol "Minta data teknis" ke formulir penawaran.
import { Globe, Package } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_GAP } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pointLines, type NusaNiagaModel } from './model';
import { NUSANIAGA_PHOTOS } from './photos';
import { C, CARD, ICON_BOX, LINE, PHOTO, SECTION_PAD, TAG, TYPE_N } from './styles';
import { PhotoRing, PillLink, SectionHead, TitleIcon } from './ui';

export function Services({ m }: { m: NusaNiagaModel }) {
  const { services } = m;
  const items = m.items('services');

  return (
    <TemplateSection sectionKey="services" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(services, 'eyebrow')} title={text(services, 'title')} srTitle="Layanan" subtitle={text(services, 'subtitle')} />
        <ul className={`grid gap-4 @3xl:grid-cols-2 @3xl:gap-5 @5xl:grid-cols-3 @7xl:gap-6 ${SECTION_GAP}`}>
          {items.map((item, i) => {
            const name = field(item, 'title');
            const image = field(item, 'image');
            const points = pointLines(field(item, 'points'));
            const description = field(item, 'description');
            const withPhoto = hasImage(image);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className={`flex flex-col ${CARD}`}>
                {withPhoto && (
                  <KitPhoto
                    src={image}
                    alt={NUSANIAGA_PHOTOS.alt(image, name)}
                    fallback="none"
                    className="aspect-[16/10]"
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                )}
                <div className="flex flex-1 flex-col p-7 @5xl:p-8">
                  {!withPhoto && (
                    <span aria-hidden className={ICON_BOX}>
                      <TitleIcon title={name} />
                    </span>
                  )}
                  <h3 className={`${withPhoto ? '' : 'mt-6'} ${C.ink} ${TYPE_N.h3}`}>{name}</h3>
                  {description && <p className={`mt-2.5 ${TYPE_N.body} ${C.muted}`}>{description}</p>}
                  {points.length > 0 && (
                    <div className="mt-auto pt-6">
                      <ul className={`grid gap-2.5 border-t pt-5 ${LINE}`}>
                        {points.map((point, j) => (
                          <li key={`${point}-${j}`} className={`flex items-start gap-3 text-[14px] leading-snug ${C.ink}`}>
                            <span aria-hidden className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-(--tpl-accent)" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Products({ m }: { m: NusaNiagaModel }) {
  const { products } = m;
  const items = m.items('products');
  const note = text(products, 'note');
  const dataAction = m.quoteAction;

  return (
    <TemplateSection sectionKey="products" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(products, 'eyebrow')} title={text(products, 'title')} srTitle="Produk" subtitle={text(products, 'subtitle')} />
        {/* Satu Reveal untuk seluruh rel (bukan per item: item di luar layar rel tidak boleh tetap tersembunyi) */}
        <Reveal delay={120} className={SECTION_GAP}>
          <div
            role="region"
            aria-label="Daftar produk"
            tabIndex={0}
            className="nn-rail -mx-5 snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5 @2xl:mx-0 @2xl:overflow-visible @2xl:px-0"
          >
            <ul className="flex gap-4 @2xl:grid @2xl:grid-cols-2 @2xl:gap-x-6 @2xl:gap-y-12 @5xl:grid-cols-3 @5xl:gap-x-8 @5xl:gap-y-14">
              {items.map((item, i) => {
                const name = field(item, 'name');
                const image = field(item, 'image');
                const kind = field(item, 'kind');
                const origin = field(item, 'origin');
                const spec = field(item, 'spec');
                const description = field(item, 'description');
                return (
                  <li key={`${name}-${i}`} className="w-[84%] shrink-0 snap-start @2xl:w-auto">
                    <article className="group flex h-full flex-col">
                      {hasImage(image) && (
                        <KitPhoto
                          src={image}
                          alt={NUSANIAGA_PHOTOS.alt(image, name)}
                          fallback="none"
                          zoom
                          className={`${PHOTO} mb-5`}
                          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                          sizes="(min-width: 1024px) 33vw, (min-width: 672px) 50vw, 84vw"
                        >
                          <PhotoRing />
                        </KitPhoto>
                      )}
                      {(kind || origin) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          {kind && <p className={TAG}>{kind}</p>}
                          {origin && (
                            <p className={`inline-flex min-w-0 items-center gap-1.5 text-[13.5px] ${C.subtle}`}>
                              <Globe aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                              <span className="min-w-0">{origin}</span>
                            </p>
                          )}
                        </div>
                      )}
                      <h3 className={`${kind || origin ? 'mt-3.5' : ''} ${C.ink} ${TYPE_N.h3}`}>{name}</h3>
                      {description && <p className={`mt-2 line-clamp-3 ${TYPE_N.body} ${C.muted}`}>{description}</p>}
                      {spec && (
                        <div className="mt-auto pt-4">
                          <p className={`flex items-center gap-2 border-t pt-4 text-[14px] font-medium ${LINE} ${C.ink}`}>
                            <Package aria-hidden className="h-4 w-4 shrink-0 text-(--nn-ink)" strokeWidth={1.8} />
                            <span className="min-w-0">{spec}</span>
                          </p>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
        {(note || dataAction) && (
          <Reveal className={`mt-10 flex flex-col items-start gap-5 border-t pt-8 @3xl:flex-row @3xl:items-center @3xl:justify-between @5xl:mt-14 ${LINE}`}>
            {note && <p className={`max-w-[70ch] text-[14px] leading-relaxed ${C.muted}`}>{note}</p>}
            <PillLink action={dataAction} label="Minta data teknis" variant="outline" className="w-full shrink-0 @xl:w-auto" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
