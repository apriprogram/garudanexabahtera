// Tentang (kunci `about`, latar putih). Layar lebar 12 kolom: kiri 5 kolom foto tegak berbingkai lengkung + keterangan;
// kanan 7 kolom label → pernyataan besar (H2 serif dengan frasa miring) → cerita perusahaan → tanda tangan pendiri →
// hingga 3 angka serif besar dipisah garis rambut tegak (<CountUp>). HP: label → H2 → foto → cerita → angka bertumpuk
// (angka kiri, keterangan kanan) bergaris rambut mendatar.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, SECTION_PAD, SERIF, TYPE_S } from './styles';
import { Caption, Highlighted, Label } from './ui';

export function About({ m }: { m: SaudagarModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  const image = text(about, 'image');
  const withImage = hasImage(image);
  const founder = text(about, 'founder_name');
  const role = text(about, 'founder_role');
  const stats = list(about, 'stats', 3).filter((item) => field(item, 'value'));
  const eyebrow = text(about, 'eyebrow');
  if (!title && body.length === 0 && !withImage && stats.length === 0) return null;
  const textCols = withImage ? '@5xl:col-span-7 @5xl:col-start-6' : '@5xl:col-span-10 @5xl:col-start-1';

  return (
    <TemplateSection sectionKey="about" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-x-8 @5xl:gap-y-10 @7xl:gap-x-12`}>
        <div className={`min-w-0 @5xl:row-start-1 @5xl:self-end ${textCols}`}>
          {eyebrow && (
            <Reveal variant="fade">
              <Label>{eyebrow}</Label>
            </Reveal>
          )}
          {/* H2 tetap ada untuk pembaca layar walau pernyataan kosong */}
          <Reveal as="h2" delay={80} className={`text-pretty ${eyebrow ? 'mt-4' : ''} ${title ? '' : 'sr-only'} ${C.ink} ${TYPE_S.statement}`}>
            {title ? <Highlighted title={title} highlight={text(about, 'highlight')} /> : `Tentang ${m.companyName}`}
          </Reveal>
        </div>

        {withImage && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-5 @5xl:col-start-1 @5xl:row-start-1 @5xl:row-end-3">
            <figure className="max-w-[540px]">
              <KitPhoto
                src={image}
                alt={SAUDAGAR_PHOTOS.alt(image, text(about, 'image_caption') || `Kegiatan di gudang ${m.companyName}`)}
                zoom
                sizes="(min-width: 1024px) 38vw, 92vw"
                className={`aspect-[4/5] ${ARCH}`}
              />
              {text(about, 'image_caption') && (
                <figcaption className="mt-4">
                  <Caption>{text(about, 'image_caption')}</Caption>
                </figcaption>
              )}
            </figure>
          </Reveal>
        )}

        <div className={`min-w-0 @5xl:row-start-2 ${textCols}`}>
          {body.length > 0 && (
            <Reveal delay={120} className={`max-w-[60ch] space-y-4 ${TYPE_S.body} ${C.muted}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {(founder || role) && (
            <Reveal delay={200} className={`mt-8 flex items-center gap-4 border-t pt-6 ${C.line}`}>
              <span aria-hidden className="h-px w-8 bg-(--tpl-accent)" />
              <p className="min-w-0">
                {founder && <span className={`block ${SERIF} text-[20px] italic leading-snug ${C.ink}`}>{founder}</span>}
                {role && <span className={`block text-[13px] ${C.muted}`}>{role}</span>}
              </p>
            </Reveal>
          )}
          {stats.length > 0 && (
            <dl className={`mt-10 grid divide-y border-y @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0 @3xl:py-6 ${C.line} ${C.divide}`}>
              {stats.map((item, i) => (
                <Reveal
                  key={`${field(item, 'label')}-${i}`}
                  delay={stagger(i)}
                  className="grid min-w-0 grid-cols-[11.5rem_minmax(0,1fr)] items-center gap-4 py-5 @3xl:flex @3xl:flex-col @3xl:items-start @3xl:gap-3 @3xl:px-6 @3xl:py-1 @3xl:first:pl-0"
                >
                  <dt className={`col-start-2 row-start-1 text-pretty text-[14px] leading-snug @3xl:order-last @3xl:max-w-[18ch] ${C.muted}`}>{field(item, 'label')}</dt>
                  <dd
                    className={`col-start-1 row-start-1 ${SERIF} text-[52px] font-normal leading-[0.9] tracking-[-0.03em] @3xl:text-[60px] @5xl:text-[48px] @7xl:text-[60px] @min-[96rem]:text-[72px] ${C.ink}`}
                  >
                    <CountUp value={field(item, 'value')} />
                  </dd>
                </Reveal>
              ))}
            </dl>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
