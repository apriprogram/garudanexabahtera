// Fitur — bento "sederhana, cepat, tanpa ribet" (brief §3.4 #4, §4.3): judul terpusat, kartu abu #F1F3F2 radius 24
// TANPA ring. Grid 12 kolom: 2 kartu besar (teks + foto), kartu lebar dengan peta titik Indonesia (orisinal) + kartu
// angka berwarna utama, dan kartu samping. Kartu tanpa foto memakai tumpukan kartu dekoratif. HP: satu kolom.
import type { ReactNode } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { IndonesiaMap } from './marks';
import { bentoLayout, splitStat, type BentoKind, type FinovaModel } from './model';
import { FINOVA_PHOTOS } from './photos';
import { C, CARD, SECTION_F, TYPE_F } from './styles';
import { SectionChip } from './ui';

const SPAN: Record<BentoKind, string> = {
  half: '@4xl:col-span-6',
  wide: '@4xl:col-span-12 @6xl:col-span-8',
  side: '@4xl:col-span-12 @6xl:col-span-4',
  full: '@4xl:col-span-12',
};

/** Tumpukan kartu dekoratif untuk kartu tanpa foto (tanpa teks). */
const CardStack = () => (
  <div aria-hidden className="relative mt-8 h-40 @3xl:h-48">
    <div className="absolute left-[8%] top-6 h-[70%] w-[62%] -rotate-6 rounded-2xl bg-(--fin-mint) ring-1 ring-inset ring-black/5" />
    <div className="absolute left-[20%] top-2 h-[70%] w-[62%] rotate-3 rounded-2xl bg-(--tpl-accent)">
      <span className="absolute left-5 top-5 h-6 w-8 rounded-md bg-(--fin-hl)" />
      <span className="absolute bottom-5 left-5 h-2 w-[46%] rounded-full bg-white/30" />
    </div>
  </div>
);

function StatCard({ m, className = '' }: { m: FinovaModel; className?: string }) {
  const value = text(m.services, 'stat_value');
  const label = text(m.services, 'stat_label');
  if (!value && !label) return null;
  const { number, unit } = splitStat(value);
  return (
    <div data-tpl-tone="inverse" className={`rounded-[20px] bg-(--tpl-accent) p-5 text-(--tpl-on-accent) @3xl:p-6 ${className}`}>
      {number && (
        <p className="text-[44px] font-medium leading-none tracking-[-0.05em] @3xl:text-[52px]">
          <CountUp value={number} />
          {unit && <sup className="ml-0.5 align-super text-[0.42em] tracking-normal">{unit}</sup>}
        </p>
      )}
      {label && <p className="mt-2 max-w-[18ch] text-[14px] leading-snug opacity-90">{label}</p>}
    </div>
  );
}

function FeatureCard({ m, item, kind, index }: { m: FinovaModel; item: ListItem; kind: BentoKind; index: number }) {
  const title = field(item, 'title');
  const description = field(item, 'description');
  const image = field(item, 'image');
  const photo = hasImage(image);
  const wideLayout = kind === 'wide' || kind === 'full';
  const mapCard = wideLayout && index === 2;

  // Kartu lebar: judul & deskripsi berdampingan di atas, visual selebar kartu di bawah
  const copy = (
    <div className={`min-w-0 ${wideLayout ? '@3xl:grid @3xl:grid-cols-2 @3xl:items-end @3xl:gap-8' : ''}`}>
      {title && <h3 className={`max-w-[22ch] text-[#0B0F0E] ${TYPE_F.h3}`}>{title}</h3>}
      {description && <p className={`mt-3 max-w-[46ch] ${TYPE_F.body} ${C.muted} ${wideLayout ? '@3xl:mt-0' : ''}`}>{description}</p>}
    </div>
  );

  let visual: ReactNode;
  if (mapCard && !photo) {
    visual = (
      <div className="relative @3xl:pr-[150px] @6xl:pr-[170px]">
        <IndonesiaMap className="w-full text-(--tpl-accent)" />
        <StatCard m={m} className="mt-4 @3xl:absolute @3xl:bottom-0 @3xl:right-0 @3xl:mt-0 @3xl:w-[200px]" />
      </div>
    );
  } else if (photo) {
    visual = (
      <div className={`relative ${kind === 'side' ? 'flex flex-1 flex-col' : ''}`}>
        <KitPhoto
          src={image}
          alt={FINOVA_PHOTOS.alt(image, title)}
          fallback="none"
          zoom
          sizes={wideLayout ? '(min-width: 1024px) 60vw, 100vw' : kind === 'side' ? '(min-width: 1152px) 30vw, 100vw' : '(min-width: 896px) 46vw, 100vw'}
          className={`${wideLayout ? 'aspect-[16/10] @3xl:aspect-[21/9]' : kind === 'side' ? 'aspect-[16/10] @3xl:aspect-[21/9] @6xl:aspect-auto @6xl:min-h-[200px] @6xl:flex-1' : 'aspect-[16/10]'} rounded-[18px]`}
          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.03]"
        />
        {mapCard && <StatCard m={m} className="mt-4 @3xl:absolute @3xl:bottom-4 @3xl:right-4 @3xl:mt-0 @3xl:w-[200px]" />}
      </div>
    );
  } else {
    visual = <CardStack />;
  }

  return (
    <Reveal as="li" delay={stagger(index)} className={`group ${CARD.bento} flex flex-col overflow-hidden p-6 @3xl:p-8 ${SPAN[kind]}`}>
      {copy}
      <div className={`mt-auto flex flex-col pt-8 ${kind === 'side' ? 'flex-1' : ''}`}>{visual}</div>
    </Reveal>
  );
}

export function Features({ m }: { m: FinovaModel }) {
  const { services } = m;
  const items = list(services, 'items', 4).filter((item) => field(item, 'title') || field(item, 'description') || field(item, 'image'));
  const kinds = bentoLayout(items.length);
  const eyebrow = text(services, 'eyebrow');
  const title = text(services, 'title');
  const subtitle = text(services, 'subtitle');

  return (
    <TemplateSection sectionKey="services" className={SECTION_F}>
      <div className={CONTAINER}>
        <div className="mx-auto max-w-[720px] text-center">
          {eyebrow && (
            <Reveal>
              <SectionChip>{eyebrow}</SectionChip>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} text-balance text-[#0B0F0E] ${TYPE_F.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mx-auto mt-5 max-w-[58ch] ${TYPE_F.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
        </div>
        {items.length > 0 && (
          <ul className="mt-12 grid gap-4 @3xl:mt-16 @4xl:grid-cols-12 @5xl:gap-5">
            {items.map((item, i) => (
              <FeatureCard key={`${field(item, 'title')}-${i}`} m={m} item={item} kind={kinds[i]} index={i} />
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
