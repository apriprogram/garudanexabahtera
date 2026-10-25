// Hero GlowStory — "kolase" (data-hero-layout="collage"), meniru katalog keramik referensi pemilik: kiri label mono,
// judul serif besar dengan satu kata MIRING terakota, deskripsi, tombol pil terakota + tautan bergaris bawah; kanan
// kolase foto membulat — satu foto tegak besar (foto LCP, satu-satunya yang eager) dengan kartu produk unggulan putih
// di sudut bawah, dua foto kecil bertumpuk, dan lencana rating gelap di atas. Ranting garis tipis sebagai dekorasi.
// HP: teks dulu, lalu kolase 2 kolom (foto besar kiri, dua foto kecil kanan). Foto selalu w-full: aspect-ratio + tinggi
// baris yang direntangkan tidak boleh menentukan lebar (foto besar melebar keluar kolom di HP).
import { ArrowRight, Star } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Sprig } from './marks';
import type { GlowModel } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { BTN, C, MONO, SERIF, TYPE_G } from './styles';
import { Eyebrow, Highlighted, PillLink } from './ui';

function FeaturedCard({ m }: { m: GlowModel }) {
  const { hero } = m;
  const name = text(hero, 'featured_name');
  if (!name) return null;
  const label = text(hero, 'featured_label');
  const price = text(hero, 'featured_price');
  const action = resolveAction(text(hero, 'featured_url'), m.productsAction);
  const inner = (
    <>
      {label && <span className={`block ${MONO} text-[10.5px] ${C.muted}`}>{label}</span>}
      <span className={`mt-1 block ${SERIF} text-[17px] leading-tight text-[#2B211C] @xl:text-[19px] @3xl:text-[21px]`}>{name}</span>
      {price && <span className="mt-1.5 block text-[13px] font-medium text-(--gs-accent-text)">{price}</span>}
    </>
  );
  const box = 'absolute bottom-3 left-3 right-3 max-w-[230px] rounded-[18px] bg-[#FCFAF6]/95 p-3.5 backdrop-blur-md @3xl:bottom-4 @3xl:left-4 @3xl:p-4';
  return action ? (
    <ActionLink action={action} className={`group block ${box}`}>
      {inner}
      <ArrowRight aria-hidden className="absolute right-3.5 top-3.5 h-4 w-4 text-[#2B211C]/60 transition-transform group-hover:translate-x-0.5" />
    </ActionLink>
  ) : (
    <div className={box}>{inner}</div>
  );
}

function RatingBadge({ m }: { m: GlowModel }) {
  const value = text(m.hero, 'rating_value');
  if (!value) return null;
  const label = text(m.hero, 'rating_label');
  return (
    <div className="absolute -top-4 right-3 z-10 flex items-center gap-2.5 rounded-[16px] bg-[#2B211C] px-3.5 py-2 text-[#F6F1EA] @3xl:right-5">
      <span className={`${SERIF} text-[28px] leading-none`}>{value}</span>
      <span className="flex flex-col">
        <span aria-hidden className="flex gap-0.5 text-(--gs-accent-light)">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3 w-3 fill-current" strokeWidth={0} />
          ))}
        </span>
        {label && <span className="mt-0.5 text-[11px] leading-none text-[#F6F1EA]/75">{label}</span>}
      </span>
    </div>
  );
}

export function Hero({ m }: { m: GlowModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const image2 = text(hero, 'image_2');
  const image3 = text(hero, 'image_3');
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const side = [image2, image3].filter(hasImage);
  const withMain = hasImage(image);
  const collage = withMain || side.length > 0;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="collage" className="relative isolate overflow-hidden pb-12 pt-8 @3xl:pb-20 @3xl:pt-12 @5xl:pt-16">
      <Sprig className="pointer-events-none absolute -left-6 top-24 -z-10 hidden h-[300px] w-auto text-[#2B211C]/10 @5xl:block" />
      <div className={`${CONTAINER} grid items-center gap-10 ${collage ? '@5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16' : ''}`}>
        <div className={`min-w-0 ${collage ? '@5xl:col-span-5' : 'mx-auto max-w-[820px] text-center'}`}>
          {eyebrow && (
            <Reveal variant="fade">
              <Eyebrow className={collage ? '' : 'justify-center'}>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5' : ''} text-balance ${C.ink} ${TYPE_G.h1}`}>
            <Highlighted title={title} highlight={text(hero, 'highlight')} />
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-6 max-w-[44ch] text-pretty ${collage ? '' : 'mx-auto'} ${TYPE_G.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {((m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel)) && (
            <Reveal delay={240} className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 ${collage ? '' : 'justify-center'}`}>
              <PillLink action={m.primaryAction} label={primaryLabel} className={`${BTN.accent} ${BTN.lg}`} />
              {m.secondaryAction && secondaryLabel && (
                <ActionLink
                  action={m.secondaryAction}
                  className="group inline-flex min-h-11 items-center gap-2 border-b border-[#2B211C]/30 text-[15px] font-medium text-[#2B211C] transition-colors hover:border-[#2B211C]"
                >
                  {secondaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>

        {collage && (
          <div className="relative min-w-0 pt-4 @5xl:col-span-7">
            <div className={`grid gap-2.5 @3xl:gap-4 ${withMain && side.length > 0 ? 'grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
              {withMain && (
                <Reveal variant="scale" className={`relative ${side.length > 1 ? 'row-span-2' : ''}`}>
                  <KitPhoto
                    src={image}
                    alt={GLOWSTORY_PHOTOS.alt(image, `Produk ${m.companyName}`)}
                    priority
                    fallback="none"
                    sizes="(min-width: 1024px) 34vw, 58vw"
                    className="aspect-[4/5] h-full w-full rounded-[22px] @3xl:rounded-[28px]"
                  />
                  <FeaturedCard m={m} />
                </Reveal>
              )}
              {side.map((src, i) => (
                <Reveal key={`${src}-${i}`} variant="scale" delay={120 + i * 100} className="relative min-h-0">
                  <KitPhoto
                    src={src}
                    alt={GLOWSTORY_PHOTOS.alt(src, `Produk ${m.companyName}`)}
                    fallback="none"
                    sizes="(min-width: 1024px) 24vw, 40vw"
                    className={`h-full w-full rounded-[22px] @3xl:rounded-[28px] ${side.length > 1 ? 'aspect-[4/5] @xl:aspect-[4/3.6]' : 'aspect-[4/5]'}`}
                  />
                </Reveal>
              ))}
            </div>
            <RatingBadge m={m} />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
