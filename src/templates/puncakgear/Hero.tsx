// Hero PuncakGear — "poster puncak" (data-hero-layout="summit"): foto pendaki selebar layar dari tepi ke tepi, menu
// transparan menumpang di atasnya (./Header). Kiri atas label kecil, lalu judul HURUF KAPITAL raksasa yang boleh
// menimpa foto, kalimat pendek, tombol pil hijau limau bergaris luar + tautan kedua. Kanan atas keterangan kecil
// (mis. lokasi basecamp), kanan tengah kartu produk putih kecil. Bawah: kalimat besar + tautan aksen, garis tegak,
// dan satu angka besar. Lapisan gelap tipis (CSS .pg-hero-scrim) menjaga teks putih ≥ 4,5:1 di atas langit & awan.
// HP: foto tetap jadi latar, kartu produk menjadi baris ringkas di bawah tombol, kalimat & angka bertumpuk.
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { BTN, DISPLAY, TYPE_P } from './styles';
import { PillLink, SectionLabel } from './ui';

function ProductCard({ m }: { m: PuncakModel }) {
  const title = text(m.hero, 'card_title');
  if (!title) return null;
  const price = text(m.hero, 'card_price');
  const image = text(m.hero, 'card_image');
  const action = resolveAction(text(m.hero, 'card_url'), m.productsAction ?? m.startAction);
  const inner = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[14px] font-semibold leading-snug text-[#0E1512]">{title}</span>
        {action && <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-[#0E1512] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
      </span>
      {hasImage(image) && (
        <div className="relative mt-3 aspect-square overflow-hidden rounded-[14px] bg-[#E9ECE6] @max-5xl:hidden">
          <KitPhoto src={image} alt="" fallback="none" sizes="200px" className="absolute inset-0" />
        </div>
      )}
      {price && <span className="mt-3 block text-[15px] font-semibold tabular-nums text-[#0E1512]">{price}</span>}
    </>
  );
  const box = 'group block w-full rounded-[18px] bg-white p-3.5 text-left @5xl:w-[212px]';
  return action ? (
    <ActionLink action={action} className={box} aria-label={`${title}${price ? `, ${price}` : ''}`}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box}>{inner}</div>
  );
}

export function Hero({ m }: { m: PuncakModel }) {
  const { hero } = m;
  const image = text(hero, 'image');
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const sideLabel = text(hero, 'side_label');
  const sideText = text(hero, 'side_text');
  const statement = text(hero, 'statement');
  const statementLabel = text(hero, 'statement_label');
  const statementAction = resolveAction(text(hero, 'statement_url'), m.guidesAction);
  const statValue = text(hero, 'stat_value');
  const statLabel = text(hero, 'stat_label');
  const hasBottom = !!(statement || (statementAction && statementLabel) || statValue || statLabel);

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="summit" data-tpl-tone="inverse" className="pg-hero-fallback relative isolate overflow-hidden text-white">
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={PUNCAK_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
          priority
          parallax={4}
          fallback="none"
          sizes="100vw"
          position="50% 38%"
          className="absolute inset-0 -z-20"
        />
      )}
      <div aria-hidden className="pg-hero-scrim absolute inset-0 -z-10" />

      <div
        className={`${CONTAINER} relative flex flex-col pb-7 pt-[100px] @3xl:pb-10 @3xl:pt-[124px] @5xl:min-h-[max(700px,min(calc(100svh-var(--tpl-sticky-top,0px)),980px))] @5xl:pt-[136px]`}
      >
        <div className="flex items-start justify-between gap-6">
          {eyebrow ? (
            <Reveal variant="fade">
              <SectionLabel tone="dark">{eyebrow}</SectionLabel>
            </Reveal>
          ) : (
            <span />
          )}
          {(sideLabel || sideText) && (
            <Reveal variant="fade" delay={120} className="hidden text-right @3xl:block">
              {sideLabel && <p className="text-[13px] text-white/70">{sideLabel}</p>}
              {sideText && <p className={`mt-1 text-[15px] tracking-[-0.01em] text-white ${DISPLAY}`}>{sideText}</p>}
            </Reveal>
          )}
        </div>

        <div className="mt-6 grid gap-8 @3xl:mt-8 @5xl:grid-cols-12 @5xl:items-end">
          <div className="min-w-0 @5xl:col-span-9">
            <Reveal as="h1" delay={80} className={`max-w-[11ch] text-balance text-white ${TYPE_P.mega}`}>
              {title}
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className="mt-5 max-w-[30ch] text-pretty text-[16px] leading-snug text-white/90 @3xl:mt-6 @3xl:text-[18px]">
                {subtitle}
              </Reveal>
            )}
            {((m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel)) && (
              <Reveal delay={240} className="mt-8 flex flex-col items-start gap-5 @xl:flex-row @xl:items-center @xl:gap-7 @3xl:mt-10">
                <PillLink action={m.primaryAction} label={primaryLabel} className={`${BTN.accent} ${BTN.lg} uppercase tracking-[0.06em]`} />
                <PillLink
                  action={m.secondaryAction}
                  label={secondaryLabel}
                  className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-white underline decoration-white/40 decoration-1 underline-offset-[6px] transition-colors hover:decoration-white"
                />
              </Reveal>
            )}
          </div>
          <Reveal variant="fade" delay={320} className="min-w-0 max-w-[340px] @5xl:col-span-3 @5xl:max-w-none @5xl:justify-self-end">
            <ProductCard m={m} />
          </Reveal>
        </div>

        {hasBottom && (
          <div className="pg-rise mt-auto grid gap-6 pt-12 @3xl:pt-16 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10" style={{ ['--pg-delay' as string]: '420ms' }}>
            <div className="min-w-0 @5xl:col-span-8">
              {statement && <p className={`max-w-[26ch] text-balance text-[24px] leading-[1.15] tracking-[-0.02em] text-white @3xl:text-[30px] @6xl:text-[34px] ${DISPLAY} font-medium`}>{statement}</p>}
              {statementAction && statementLabel && (
                <ActionLink
                  action={statementAction}
                  className="group mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-(--pg-glow)"
                >
                  {statementLabel}
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </ActionLink>
              )}
            </div>
            {(statValue || statLabel) && (
              <div className="flex items-end gap-4 border-t border-white/25 pt-5 @5xl:col-span-4 @5xl:mr-16 @5xl:justify-self-end @5xl:border-l @5xl:border-t-0 @5xl:pl-10 @5xl:pt-0">
                <p>
                  {statValue && <span className={`block text-[44px] leading-none tracking-[-0.03em] text-white tabular-nums @3xl:text-[56px] ${DISPLAY}`}>{statValue}</span>}
                  {statLabel && <span className="mt-2 block text-[14px] text-white/85">{statLabel}</span>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
