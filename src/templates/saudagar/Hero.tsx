// Hero Saudagar — "Triptych" (data-hero-layout="triptych"): di atas kertas krem, label serif miring, judul Fraunces
// besar di tengah dengan satu frasa miring, deskripsi, pil tinta + tautan berpanah; di bawahnya tiga foto tegak 4:5
// berbingkai lengkung seperti tiga pintu pasar. Foto TENGAH = `hero.image` (LCP: eager + fetchpriority high, TIDAK
// pernah disembunyikan atau dipudarkan; hanya parallax transform), dua foto samping opsional (lazy, fallback none) yang
// naik bergantian saat gerak menyala (CSS .sg-rise di ./saudagar.css). Kolom samping lebih sempit → lengkung lebih
// pendek, dasar rata → siluet berundak. Keterangan asal kecil di bawah tiap lengkung.
// HP 390: label → judul → lengkung tengah selebar layar → dua lengkung samping berdampingan → deskripsi → tombol.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, TYPE_S } from './styles';
import { ArrowLink, Caption, Highlighted, InkPill, Label } from './ui';

const SIDE_SIZES = '(min-width: 1280px) 360px, (min-width: 768px) 30vw, 46vw';

function SideArch({ src, caption, alt, delay }: { src: string; caption: string; alt: string; delay: number }) {
  return (
    <Reveal as="figure" variant="fade" delay={delay} className="sg-rise min-w-0">
      <div className="sg-arch">
        <KitPhoto src={src} alt={alt} sizes={SIDE_SIZES} fallback="none" className={`aspect-[4/5] ${ARCH}`} />
      </div>
      {caption && (
        <figcaption className="mt-3 @3xl:mt-4">
          <Caption center>{caption}</Caption>
        </figcaption>
      )}
    </Reveal>
  );
}

export function Hero({ m }: { m: SaudagarModel }) {
  const { hero } = m;
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const left = text(hero, 'image_left');
  const right = text(hero, 'image_right');
  const hasLeft = hasImage(left);
  const hasRight = hasImage(right);
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const hasButtons = (m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel);
  const caption = text(hero, 'caption');
  const sides = Number(hasLeft) + Number(hasRight);

  // Kolom: tiga lengkung (tengah 1.15fr), dua (samping + tengah), atau tengah saja (maks. 440px)
  const grid =
    sides === 2
      ? 'max-w-[1180px] grid-cols-2 @3xl:grid-cols-[1fr_1.15fr_1fr]'
      : sides === 1
        ? `max-w-[820px] grid-cols-2 ${hasLeft ? '@3xl:grid-cols-[1fr_1.15fr]' : '@3xl:grid-cols-[1.15fr_1fr]'}`
        : 'max-w-[440px] grid-cols-1';
  // HP: lengkung tengah selebar penuh di baris pertama; satu foto samping → setengah lebar di tengah
  const middleCell = sides > 0 ? 'col-span-2 order-first @3xl:order-none @3xl:col-span-1' : '';
  const sideCell = sides === 1 ? 'col-span-2 mx-auto w-1/2 @3xl:col-span-1 @3xl:mx-0 @3xl:w-auto' : '';

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="triptych" className="bg-[#F7F2E8] pb-16 @5xl:pb-24">
      <div className={`${CONTAINER} flex flex-col pt-10 @5xl:pt-14`}>
        {text(hero, 'eyebrow') && (
          <Reveal variant="fade" className="order-1 text-center">
            <Label>{text(hero, 'eyebrow')}</Label>
          </Reveal>
        )}
        <Reveal as="h1" delay={80} className={`order-2 mx-auto mt-4 max-w-[22ch] text-balance text-center @3xl:mt-5 ${C.ink} ${TYPE_S.h1}`}>
          <Highlighted title={title} highlight={text(hero, 'highlight')} />
        </Reveal>
        {subtitle && (
          <Reveal as="p" delay={160} className={`order-4 mx-auto mt-8 max-w-[56ch] text-balance text-center @3xl:order-3 @3xl:mt-6 @5xl:max-w-[68ch] ${TYPE_S.lead} ${C.muted}`}>
            {subtitle}
          </Reveal>
        )}
        {hasButtons && (
          <Reveal delay={240} className="order-5 mt-7 flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @xl:justify-center @xl:gap-7 @3xl:order-4 @3xl:mt-8">
            <InkPill action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
            <ArrowLink action={m.secondaryAction} label={secondaryLabel} className="self-center" />
          </Reveal>
        )}

        <div className={`order-3 mx-auto mt-9 grid w-full items-end gap-x-3 gap-y-6 @3xl:order-5 @3xl:mt-12 @3xl:gap-x-6 @5xl:mt-14 @6xl:gap-x-8 ${grid}`}>
          {hasLeft && (
            <div className={`min-w-0 ${sideCell}`}>
              <SideArch src={left} caption={text(hero, 'caption_left')} alt={SAUDAGAR_PHOTOS.alt(left, text(hero, 'caption_left') || `Hasil bumi dari kebun mitra ${m.companyName}`)} delay={240} />
            </div>
          )}
          {/* Lengkung tengah = LCP: di luar <Reveal>, tanpa pudar/klip; hanya parallax (transform) saat gerak menyala */}
          <figure className={`min-w-0 ${middleCell}`}>
            <KitPhoto
              src={image}
              alt={SAUDAGAR_PHOTOS.alt(image, caption || `Hasil bumi dari kebun mitra ${m.companyName}`)}
              priority
              parallax
              sizes="(min-width: 1280px) 420px, (min-width: 768px) 38vw, 92vw"
              className={`aspect-[4/5] ${ARCH}`}
            />
            {caption && (
              <figcaption className="mt-3 @3xl:mt-4">
                <Reveal variant="fade" delay={480}>
                  <Caption serif center>
                    {caption}
                  </Caption>
                </Reveal>
              </figcaption>
            )}
          </figure>
          {hasRight && (
            <div className={`min-w-0 ${sideCell}`}>
              <SideArch src={right} caption={text(hero, 'caption_right')} alt={SAUDAGAR_PHOTOS.alt(right, text(hero, 'caption_right') || `Hasil bumi dari kebun mitra ${m.companyName}`)} delay={360} />
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
