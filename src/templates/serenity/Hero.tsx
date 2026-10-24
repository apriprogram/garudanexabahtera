// Hero Serenity — "foto layar penuh" (data-hero-layout="fullbleed"): foto pemandangan mengisi seluruh hero dari tepi
// ke tepi (sudut bawah membulat mulai @3xl), menu transparan menumpang di atasnya (./Header). Kiri: pil kaca, judul
// dua baris dengan baris kedua bergradasi pastel, deskripsi, tombol pil putih + tombol video berikon putar bulat.
// Kanan atas (≥ @6xl): kartu kaca kecil (ikon, judul, teks, panah). Bawah: strip empat fitur (ikon bulat + judul +
// keterangan) dan penanda "01 — 04". Lapisan gelap tipis (CSS .sr-hero-scrim) menjaga teks putih ≥ 4,5:1.
// HP: foto tetap jadi latar, lapisan lebih rata, tombol bertumpuk, fitur 2×2.
import { ArrowRight, Play } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SerenityModel } from './model';
import { SERENITY_PHOTOS } from './photos';
import { BTN, GLASS, TYPE_S } from './styles';
import { Highlighted, PillLink, SectionLabel, TitleIcon } from './ui';

function GlassCard({ m }: { m: SerenityModel }) {
  const title = text(m.hero, 'card_title');
  const body = text(m.hero, 'card_text');
  if (!title && !body) return null;
  const action = resolveAction(text(m.hero, 'card_url'), m.programsAction ?? m.startAction);
  const inner = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.16] ring-1 ring-inset ring-white/25">
        <TitleIcon title={title} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        {title && <span className="block text-[15px] font-semibold leading-snug">{title}</span>}
        {body && <span className="mt-0.5 block text-[12.5px] leading-snug text-white/85">{body}</span>}
      </span>
      {action && (
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.16] ring-1 ring-inset ring-white/25 transition-colors group-hover:bg-white/30">
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </>
  );
  const box = `group flex w-[320px] items-center gap-3.5 rounded-[22px] p-3.5 pr-3 text-white ${GLASS}`;
  return action ? (
    <ActionLink action={action} className={box}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box}>{inner}</div>
  );
}

export function Hero({ m }: { m: SerenityModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const secondaryHref = text(hero, 'secondary_url');
  // Tombol video hanya tampil bila tautannya diisi (tanpa video → tidak ada tujuan yang jujur)
  const secondary = secondaryHref ? resolveAction(secondaryHref, null) : null;
  const features = list(hero, 'features', 4).filter((item) => field(item, 'title') || field(item, 'text'));

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="fullbleed"
      data-tpl-tone="inverse"
      className="sr-hero-fallback relative isolate overflow-hidden text-white @3xl:rounded-b-[40px]"
    >
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt={SERENITY_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
          priority
          parallax={4}
          fallback="none"
          sizes="100vw"
          position="62% 50%"
          className="absolute inset-0 -z-20"
        />
      )}
      <div aria-hidden className="sr-hero-scrim absolute inset-0 -z-10" />

      <div className={`${CONTAINER} relative flex flex-col pb-7 pt-[116px] @3xl:pb-9 @3xl:pt-[148px] @5xl:min-h-[max(660px,min(calc(100svh-var(--tpl-sticky-top,0px)),920px))] @5xl:pt-[168px]`}>
        <div className="max-w-[640px] @6xl:max-w-[800px]">
          {eyebrow && (
            <Reveal variant="fade">
              <SectionLabel tone="glass">{eyebrow}</SectionLabel>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} text-balance text-white ${TYPE_S.h1}`}>
            <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" breakBefore />
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-6 max-w-[46ch] text-pretty text-white/90 ${TYPE_S.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {((m.primaryAction && primaryLabel) || (secondary && secondaryLabel)) && (
            <Reveal delay={240} className="mt-9 flex flex-col items-stretch gap-4 @xl:flex-row @xl:items-center @xl:gap-6">
              <PillLink action={m.primaryAction} label={primaryLabel} className={`${BTN.white} ${BTN.lg}`} />
              {secondary && secondaryLabel && (
                <ActionLink action={secondary} className="group inline-flex items-center gap-3 self-start rounded-full py-1 pr-3 text-[15px] font-medium text-white">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/30 backdrop-blur-md transition-colors group-hover:bg-white/25"
                  >
                    <Play className="h-4 w-4 translate-x-px fill-current" />
                  </span>
                  {secondaryLabel}
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>

        <Reveal variant="fade" delay={360} className="absolute right-5 top-[30%] hidden @2xl:right-8 @5xl:right-12 @6xl:block @min-[96rem]:right-16">
          <GlassCard m={m} />
        </Reveal>

        {features.length > 0 && (
          <div className="mt-auto flex items-end justify-between gap-10 pt-12 @3xl:pt-16">
            <ul aria-label="Yang bisa Anda temukan" className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-5 @3xl:grid-cols-4 @5xl:flex @5xl:flex-wrap @5xl:gap-x-10 @7xl:gap-x-14">
              {features.map((item, i) => {
                return (
                  // Strip selalu di tepi bawah layar saat dimuat: animasi masuk saat halaman dibuka (CSS .sr-rise),
                  // bukan saat digulir (Reveal menahan elemen di 8% terbawah layar sampai digulir)
                  <li
                    key={`${field(item, 'title')}-${i}`}
                    style={{ '--sr-delay': `${360 + stagger(i, 80)}ms` } as CSSProperties}
                    className="sr-rise flex min-w-0 items-center gap-3"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25 backdrop-blur-md @3xl:h-11 @3xl:w-11"
                    >
                      <TitleIcon title={field(item, 'title')} index={i} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      {field(item, 'title') && <span className="block text-[14px] font-semibold leading-snug">{field(item, 'title')}</span>}
                      {field(item, 'text') && <span className="block text-[12.5px] leading-snug text-white/80">{field(item, 'text')}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {features.length > 1 && (
              <div
                aria-hidden
                style={{ '--sr-delay': '700ms' } as CSSProperties}
                className="sr-rise mr-16 hidden shrink-0 items-center gap-3 pb-3 text-[12px] font-medium tabular-nums text-white/85 @5xl:flex"
              >
                <span>01</span>
                <span className="relative h-px w-24 bg-white/30">
                  <span className="absolute inset-y-0 left-0 w-1/3 bg-white" />
                </span>
                <span>{String(features.length).padStart(2, '0')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
