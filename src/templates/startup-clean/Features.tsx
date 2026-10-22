// Fitur (section `services`) sebagai bento 6 kolom: kartu abu muda membulat 28px, foto opsional di dalam kartu.
// Susunan dihitung bentoSlots() agar baris selalu penuh untuk 1–9 kartu, dengan atau tanpa foto (situs lama).
import {
  BarChart3,
  Boxes,
  Headphones,
  QrCode,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { photoAlt } from '../shared/assets';
import { CONTAINER, FONT_DISPLAY, SECTION_GAP, SECTION_Y } from '../shared/layout';
import type { CompanyProfileModel } from '../shared/model';
import { stagger } from '../shared/motion';
import { Photo } from '../shared/Photo';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import type { ListItem } from '../types';
import { H3, ICON_TINT, PHOTO_HOVER, bentoClasses, bentoSlots, type BentoSlot } from './styles';
import { SectionHeader } from './ui';

const FEATURE_ICONS: LucideIcon[] = [Zap, Boxes, BarChart3, Store, QrCode, ShoppingBag, Headphones, ShieldCheck, Rocket];

const CARD = 'group flex h-full flex-col overflow-hidden rounded-[28px] bg-alt ring-1 ring-inset ring-black/[0.04]';

const SIZES: Record<BentoSlot, string> = {
  solo: '(min-width: 1024px) 50vw, 100vw',
  lead: '(min-width: 1024px) 36vw, (min-width: 672px) 90vw, 100vw',
  tall: '(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw',
  side: '(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw',
  wide: '(min-width: 1024px) 60vw, (min-width: 672px) 45vw, 100vw',
  third: '(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw',
  half: '(min-width: 1024px) 45vw, (min-width: 672px) 45vw, 100vw',
  full: '(min-width: 1024px) 50vw, (min-width: 672px) 90vw, 100vw',
};

function FeatureCard({ item, index, slot }: { item: ListItem; index: number; slot: BentoSlot }) {
  const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
  const title = field(item, 'title') || `Fitur ${index + 1}`;
  const description = field(item, 'description');
  const image = field(item, 'image');
  const withImage = hasImage(image);
  const big = slot === 'lead' || slot === 'solo';
  const tall = slot === 'tall';
  // Kartu lebar berfoto: teks kiri, foto besar kanan (@6xl, cukup lebar untuk dua kolom); bertumpuk di bawahnya
  const split = withImage && (big || slot === 'wide' || slot === 'full');
  // Kartu kecil berfoto: foto di samping teks mulai wadah 1344px (kartu ≥ 430px), jadi tinggi baris bento seimbang
  const inline = withImage && !split && !tall;

  const copy = (
    <div className={`min-w-0 ${big ? '@6xl:max-w-[34ch]' : ''} ${inline ? '@min-[84rem]:flex-1' : ''}`}>
      <span className={`${ICON_TINT} ${big ? 'h-12 w-12' : 'h-11 w-11'}`}>
        <Icon className={big ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden />
      </span>
      <h3 className={`mt-6 ${big ? `${FONT_DISPLAY} text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-fg @3xl:text-[26px] @7xl:text-[30px]` : H3}`}>
        {title}
      </h3>
      {description && (
        <p className={`mt-2.5 max-w-[60ch] leading-relaxed text-muted ${big ? 'text-[15px] @3xl:text-[17px]' : 'text-[15px]'}`}>{description}</p>
      )}
    </div>
  );

  const photo = withImage && (
    <Photo
      src={image}
      alt={photoAlt(image, title)}
      sizes={SIZES[slot]}
      zoom
      imgClassName={PHOTO_HOVER}
      className={
        split
          ? 'mt-8 aspect-[16/10] rounded-[20px] @6xl:mt-0 @6xl:aspect-auto @6xl:min-h-[280px] @7xl:min-h-[320px]'
          : tall
            ? 'aspect-[16/10] rounded-[20px] @5xl:aspect-auto @5xl:min-h-[260px] @5xl:flex-1'
            : 'aspect-[16/10] rounded-[20px] @5xl:aspect-[2/1] @min-[84rem]:aspect-auto @min-[84rem]:min-h-[150px] @min-[84rem]:flex-1'
      }
    />
  );

  if (split) {
    return (
      <article className={`${CARD} p-6 @3xl:p-8 @6xl:grid @6xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @6xl:items-stretch @6xl:gap-8 @6xl:p-3 @6xl:pl-9`}>
        <div className="@6xl:flex @6xl:flex-col @6xl:justify-center @6xl:py-6">{copy}</div>
        {photo}
      </article>
    );
  }

  return (
    <article className={`${CARD} p-6 @3xl:p-8 ${inline ? '@min-[84rem]:flex-row @min-[84rem]:gap-6' : ''}`}>
      {copy}
      {/* Kartu tinggi: foto mengisi sisa tinggi · kartu kecil: foto di dasar kartu, di samping teks di layar lebar */}
      {photo && (
        <div className={tall ? 'mt-8 flex flex-col @5xl:flex-1' : 'mt-auto flex flex-col pt-8 @min-[84rem]:mt-0 @min-[84rem]:w-[38%] @min-[84rem]:shrink-0 @min-[84rem]:pt-0'}>{photo}</div>
      )}
    </article>
  );
}

export function Features({ m }: { m: CompanyProfileModel }) {
  const { services } = m;
  const items = list(services, 'items', 9);
  if (items.length === 0) return null;
  const slots = bentoSlots(items.length, hasImage(field(items[1], 'image')));
  const spans = bentoClasses(slots);

  return (
    <TemplateSection sectionKey="services" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHeader eyebrow={text(services, 'eyebrow')} title={text(services, 'title')} subtitle={text(services, 'subtitle')} />
        <ul className={`${SECTION_GAP} grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-6 @5xl:gap-5`}>
          {items.map((item, i) => (
            <Reveal as="li" key={i} delay={stagger(i)} className={`min-w-0 ${spans[i]}`}>
              <FeatureCard item={item} index={i} slot={slots[i]} />
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
