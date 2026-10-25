// Fasilitas (kunci `facilities`) + galeri (kunci `gallery`).
// Fasilitas: kartu foto besar membulat 2×2 (referensi Bose/Porsche) dengan chip ikon + nama di atas dan keterangan di
// bawah di atas gradasi gelap tipis; foto memperbesar pelan saat disorot. Galeri: kisi bento (foto ke-1 & ke-3 tegak
// setinggi dua baris, lainnya mendatar) dengan keterangan <figcaption>, plus tombol ke galeri lengkap (mis. Instagram).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeUrl, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { CakrawalaModel } from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { BTN, DISPLAY, SECTION_PAD } from './styles';
import { PillLink, SectionHead, TitleIcon } from './ui';

export function Facilities({ m }: { m: CakrawalaModel }) {
  const { facilities } = m;
  const items = list(facilities, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="facilities" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(facilities, 'eyebrow')} title={text(facilities, 'title')} subtitle={text(facilities, 'subtitle')} />
        <ul className={`mt-10 grid gap-3 @3xl:mt-14 @3xl:grid-cols-2 @3xl:gap-4 ${items.length === 4 ? '@6xl:grid-cols-4' : items.length % 3 === 0 ? '@6xl:grid-cols-3' : ''}`}>
          {items.map((item, i) => {
            const title = field(item, 'title');
            const image = field(item, 'image');
            return (
              <Reveal
                as="li"
                key={`${title}-${i}`}
                delay={stagger(i, 70)}
                data-tpl-tone="inverse"
                className="group relative isolate flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[22px] bg-(--ck-deep) p-4 text-white @3xl:p-5 @6xl:aspect-[4/5]"
              >
                {hasImage(image) && (
                  <KitPhoto
                    src={image}
                    alt={CAKRAWALA_PHOTOS.alt(image, title)}
                    sizes="(min-width: 1152px) 25vw, (min-width: 768px) 48vw, 92vw"
                    fallback="none"
                    className="absolute inset-0 -z-20"
                    imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                  />
                )}
                <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(4_10_28/0.35)_0%,transparent_30%,transparent_45%,rgb(4_10_28/0.82)_100%)]" />
                <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-(--ck-ink)">
                  <TitleIcon title={title} index={i} className="h-5 w-5" />
                </span>
                <div className="max-w-[46ch]">
                  <h3 className={`${DISPLAY} text-[20px] font-semibold leading-snug tracking-[-0.02em] @3xl:text-[22px]`}>{title}</h3>
                  {field(item, 'text') && <p className="mt-1.5 text-[14px] leading-relaxed text-white/85">{field(item, 'text')}</p>}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

/** Tata letak bento galeri (layar lebar, 4 kolom): foto ke-1 & ke-3 tegak 2 baris, lainnya mendatar. */
const BENTO = [
  '@3xl:col-span-1 @3xl:row-span-2',
  '@3xl:col-span-2',
  '@3xl:col-span-1 @3xl:row-span-2',
  '@3xl:col-span-2',
];

export function Gallery({ m }: { m: CakrawalaModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 8).filter((item) => hasImage(field(item, 'image')));
  if (items.length === 0) return null;
  const buttonLabel = text(gallery, 'button_label');
  const buttonUrl = safeUrl(text(gallery, 'button_url'));
  const button = buttonLabel && buttonUrl && (
    <PillLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} dot="ink" className={`${BTN.outline} ${BTN.md}`} />
  );

  return (
    <TemplateSection sectionKey="gallery" className={`pb-14 @3xl:pb-20 @5xl:pb-24`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} aside={button || undefined} />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:auto-rows-[200px] @3xl:grid-cols-4 @3xl:gap-4 @6xl:auto-rows-[240px]">
          {items.map((item, i) => {
            const caption = field(item, 'caption');
            const tall = i % 4 === 0 || i % 4 === 2;
            return (
              <Reveal as="li" key={`${field(item, 'image')}-${i}`} delay={stagger(i, 60)} className={i < 4 ? BENTO[i] : '@3xl:col-span-2'}>
                <figure className="relative h-full">
                  <KitPhoto
                    src={field(item, 'image')}
                    alt={CAKRAWALA_PHOTOS.alt(field(item, 'image'), caption || `Kegiatan di ${m.companyName}`)}
                    sizes={tall ? '(min-width: 768px) 24vw, 46vw' : '(min-width: 768px) 48vw, 46vw'}
                    className="aspect-square h-full rounded-[20px] @3xl:aspect-auto"
                  />
                  {caption && (
                    <figcaption className="absolute inset-x-2 bottom-2 rounded-[12px] bg-[#0D1830]/65 px-3 py-2 text-[12.5px] font-medium leading-snug text-white backdrop-blur-md @3xl:inset-x-3 @3xl:bottom-3">
                      {caption}
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
