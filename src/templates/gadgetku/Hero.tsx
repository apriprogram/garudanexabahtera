// Hero GadgetKu — "kartu gelap" (data-hero-layout="inset-card", referensi "Lanot" + "Bose"): kartu hitam membulat di
// dalam gutter halaman, foto produk berlatar gelap di sisi kanan, lapisan gelap dari kiri (CSS .gk-hero-scrim) agar
// judul putih ≥ 4,5:1. Kiri: label kaca, H1 dengan kata sorotan mint, deskripsi, tombol mint + tombol garis, dan baris
// merek HP (otomatis dari daftar tipe HP). Kanan: cincin dekoratif SVG dan dua kartu putih datar — contoh casing custom
// (menuju bagian Custom Casing) dan rating toko dengan avatar pembeli. HP: foto jadi latar rata, kartu di bawah teks.
import { ArrowUpRight } from 'lucide-react';
import type { ReactElement } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, safeImage, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { brandsOf, type GadgetkuModel } from './model';
import { GADGETKU_PHOTOS } from './photos';
import { BTN, C, TYPE_G } from './styles';
import { Highlighted, PillLink, SectionLabel, Stars } from './ui';

/** Cincin bertitik (seperti tombol "Charge" di referensi): murni dekoratif. */
function Ring({ className }: { className: string }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden focusable="false" className={className}>
      <circle cx="200" cy="200" r="198" stroke="currentColor" strokeOpacity=".16" />
      <circle cx="200" cy="200" r="150" stroke="currentColor" strokeOpacity=".1" />
      <g className="gk-ring-spin">
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="200"
            y1="14"
            x2="200"
            y2={deg % 30 === 0 ? 30 : 22}
            stroke="currentColor"
            strokeOpacity={deg % 30 === 0 ? 0.5 : 0.22}
            strokeWidth="1.5"
            transform={`rotate(${deg} 200 200)`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Kartu putih contoh casing custom: mockup casing mini berisi foto contoh. */
function CustomCard({ m }: { m: GadgetkuModel }) {
  const title = text(m.hero, 'card_title');
  const body = text(m.hero, 'card_text');
  if (!title && !body) return null;
  const action = resolveAction(text(m.hero, 'card_url'), m.customAction ?? m.startAction);
  const sample = safeImage(text(m.custom, 'image'));
  const asset = sample ? GADGETKU_PHOTOS.asset(sample) : null;
  const inner = (
    <>
      <span aria-hidden className="relative block h-[92px] w-[46px] shrink-0 rounded-[13px] bg-(--gk-on-dark) p-[3px]">
        <span className="relative block h-full w-full overflow-hidden rounded-[10px] bg-[#E9EAEE]">
          {sample && <img src={sample} srcSet={asset?.srcSet} sizes="46px" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
          <span className="absolute left-[4px] top-[4px] h-[18px] w-[18px] rounded-[6px] bg-[#0B0C0E]/85" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        {title && <span className="block text-[15px] font-semibold leading-snug text-[#0B0C0E]">{title}</span>}
        {body && <span className={`mt-1 block text-[13px] leading-snug ${C.muted}`}>{body}</span>}
      </span>
      {action && (
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-[#0B0C0E] text-white transition-transform group-hover:rotate-45">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      )}
    </>
  );
  const box = 'group flex w-full items-center gap-4 rounded-[22px] bg-white p-3.5 pr-4';
  return action ? (
    <ActionLink action={action} className={box}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box}>{inner}</div>
  );
}

/** Kartu putih rating toko + avatar pembeli (dari ulasan). */
function RatingCard({ m }: { m: GadgetkuModel }) {
  const value = text(m.hero, 'stat_value');
  const label = text(m.hero, 'stat_label');
  if (!value && !label) return null;
  const faces = list(m.testimonials, 'items', 3).filter((item) => field(item, 'name'));
  return (
    <div className="flex w-full items-center gap-4 rounded-[22px] bg-white p-4 pr-5">
      {faces.length > 0 && (
        <span aria-hidden className="flex shrink-0 -space-x-2.5">
          {faces.map((item, i) => (
            <KitAvatar key={`${field(item, 'name')}-${i}`} name={field(item, 'name')} photo={field(item, 'photo')} sizes="36px" className="h-9 w-9 ring-2 ring-white" />
          ))}
        </span>
      )}
      <span className="min-w-0">
        {value && (
          <span className="flex items-center gap-2">
            <span className={`${TYPE_G.price} text-[20px] text-[#0B0C0E]`}>{value}</span>
            <Stars value={5} className="h-3.5 w-3.5" />
          </span>
        )}
        {label && <span className={`block text-[13px] leading-snug ${C.muted}`}>{label}</span>}
      </span>
    </div>
  );
}

export function Hero({ m }: { m: GadgetkuModel }) {
  const { hero } = m;
  const title = text(hero, 'title') || m.companyName;
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const brandsLabel = text(hero, 'brands_label');
  const brands = brandsLabel ? brandsOf(m.models).slice(0, 8) : [];
  const cards = [
    (text(hero, 'card_title') || text(hero, 'card_text')) && <CustomCard key="custom" m={m} />,
    (text(hero, 'stat_value') || text(hero, 'stat_label')) && <RatingCard key="rating" m={m} />,
  ].filter((card): card is ReactElement => !!card);
  const showCards = cards.length > 0;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="inset-card" className="pt-3 @3xl:pt-5">
      <div className={CONTAINER}>
        <div data-tpl-tone="inverse" className="gk-hero-fallback relative isolate overflow-hidden rounded-[28px] text-white @3xl:rounded-[36px]">
          {hasImage(image) && (
            <KitPhoto
              src={image}
              alt={GADGETKU_PHOTOS.alt(image, `Produk ${m.companyName}`)}
              priority
              fallback="none"
              sizes="(min-width: 1680px) 1600px, 100vw"
              position="70% 30%"
              className="absolute inset-0 -z-20"
            />
          )}
          <div aria-hidden className="gk-hero-scrim absolute inset-0 -z-10" />
          <Ring className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden h-[560px] w-[560px] -translate-y-1/2 text-white @5xl:block @7xl:right-[8%]" />

          <div className="grid gap-10 px-5 pb-6 pt-10 @3xl:px-10 @3xl:pb-10 @3xl:pt-14 @5xl:min-h-[min(640px,calc(100svh-var(--tpl-sticky-top,0px)-140px))] @5xl:grid-cols-12 @5xl:gap-8 @5xl:px-14 @5xl:pb-12 @5xl:pt-16">
            <div className="flex min-w-0 flex-col @5xl:col-span-7">
              {eyebrow && (
                <Reveal variant="fade">
                  <SectionLabel tone="dark">{eyebrow}</SectionLabel>
                </Reveal>
              )}
              <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[13ch] text-balance text-white ${TYPE_G.h1}`}>
                <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" />
              </Reveal>
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-6 max-w-[46ch] text-pretty text-white/80 ${TYPE_G.lead}`}>
                  {subtitle}
                </Reveal>
              )}
              {((m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel)) && (
                <Reveal delay={240} className="mt-9 flex flex-col items-stretch gap-3 @xl:flex-row @xl:items-center">
                  <PillLink action={m.primaryAction} label={primaryLabel} className={`${BTN.glow} ${BTN.lg}`} />
                  <PillLink action={m.secondaryAction} label={secondaryLabel} arrow={false} className={`${BTN.ghostDark} ${BTN.lg}`} />
                </Reveal>
              )}
              {brands.length > 0 && (
                <Reveal delay={320} className="mt-auto pt-10 @5xl:pt-16">
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/60">{brandsLabel}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2" aria-label={brandsLabel}>
                    {brands.map((brand) => (
                      <li key={brand} className="text-[15px] font-semibold tracking-[-0.01em] text-white/90 @3xl:text-[16px]">
                        {brand}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>

            {showCards && (
              <div className="flex flex-col justify-end gap-3 @xl:flex-row @5xl:col-span-5 @5xl:flex-col @5xl:items-end @5xl:pb-1">
                {cards.map((card, i) => (
                  <Reveal key={card.key} variant="fade" delay={360 + stagger(i, 120)} className="w-full @5xl:w-[340px]">
                    {card}
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
