// Hero TaniMakmur — "ladang" (data-hero-layout="field"), mengikuti referensi pemilik: foto ladang hijau tua selebar
// layar dengan lapisan hijau (CSS .tm-hero-scrim) dan dua garis diagonal tipis; kiri judul putih sangat besar; tengah
// foto BULAT dalam bingkai garis + cincin, dengan lingkaran ajakan warna aksen menumpang di sudutnya; kanan kartu
// kutipan kecil bergaris aksen; bawah keterangan + kartu angka (angka pertama di kartu krem). Di bawah hero: strip
// keunggulan berjalan pada bidang hijau paling gelap (berhenti saat disorot; gerak mati → daftar statis).
// HP: foto tetap latar, foto bulat & kartu kutipan disembunyikan, ajakan jadi tombol pil; angka bertumpuk.
import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Marquee, Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { FieldLines } from './marks';
import type { TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { BTN, TYPE_T } from './styles';
import { Highlighted, PillLink, SectionLabel, TitleIcon } from './ui';

/** Lingkaran ajakan warna aksen (referensi: tombol bulat kuning "EXPLORE"). */
function CtaCircle({ m, className = '' }: { m: TaniModel; className?: string }) {
  const label = text(m.hero, 'primary_label');
  if (!m.primaryAction || !label) return null;
  return (
    <ActionLink
      action={m.primaryAction}
      className={`group flex h-[124px] w-[124px] flex-col items-center justify-center gap-1 rounded-full bg-(--tpl-accent) p-4 text-center text-[13px] font-semibold uppercase leading-tight tracking-[0.08em] text-(--tpl-on-accent) transition-[background-color,scale] duration-300 hover:scale-[1.04] hover:bg-(--tpl-accent-hover) @7xl:h-[140px] @7xl:w-[140px] @7xl:text-[14px] ${className}`}
    >
      <span className="line-clamp-2">{label}</span>
      <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </ActionLink>
  );
}

/** Foto bulat dalam bingkai garis tipis + cincin, lingkaran ajakan di kiri bawah. */
function Spot({ m, image }: { m: TaniModel; image: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] @7xl:max-w-[380px]">
      <div aria-hidden className="absolute -inset-5 border border-white/25 @7xl:-inset-7" />
      <div aria-hidden className="absolute left-1/2 top-[-12%] h-[124%] w-px bg-white/20" />
      <div aria-hidden className="absolute left-[-12%] top-1/2 h-px w-[124%] bg-white/20" />
      <div aria-hidden className="absolute inset-[4%] rounded-full border border-white/30" />
      <KitPhoto
        src={image}
        alt={TANI_PHOTOS.alt(image, `Tanaman dari ${m.companyName}`)}
        fallback="none"
        sizes="(min-width: 1152px) 380px, 340px"
        className="absolute inset-[11%] rounded-full"
      />
      <CtaCircle m={m} className="absolute -bottom-6 -left-6 @7xl:-left-9" />
    </div>
  );
}

function QuoteCard({ m }: { m: TaniModel }) {
  const image = text(m.hero, 'card_image');
  const quote = text(m.hero, 'card_quote');
  const name = text(m.hero, 'card_name');
  if (!quote && !name) return null;
  return (
    <figure className="relative w-full max-w-[300px] overflow-hidden rounded-[20px] bg-[#13260E]/60 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      {/* Garis aksen tegak di tepi kiri kartu (referensi: garis kuning di samping kartu foto) */}
      <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-[3px] bg-(--tpl-accent)" />
      {hasImage(image) && <KitPhoto src={image} alt="" fallback="none" sizes="300px" className="aspect-[4/3]" />}
      <figcaption className="p-4 pl-5">
        {quote && <blockquote className="text-[15px] font-medium leading-snug text-white">“{quote}”</blockquote>}
        {name && <p className="mt-2 text-[12.5px] leading-snug text-white/80">{name}</p>}
      </figcaption>
    </figure>
  );
}

function Ticker({ m }: { m: TaniModel }) {
  const items = list(m.hero, 'ticker', 8)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="bg-[#13260E] py-4 text-white @3xl:py-5">
      <Marquee
        label="Keunggulan toko"
        duration={38}
        gap={44}
        itemClassName="gap-3 text-[14px] font-medium tracking-[0.02em] text-white/90 @3xl:text-[15px]"
        staticClassName={`${CONTAINER} flex flex-wrap items-center justify-center gap-x-8 gap-y-3`}
      >
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="inline-flex items-center gap-3">
            <TitleIcon title={label} index={i} className="h-[18px] w-[18px] text-(--tm-glow)" />
            {label}
          </span>
        ))}
      </Marquee>
    </div>
  );
}

export function Hero({ m }: { m: TaniModel }) {
  const { hero } = m;
  const image = text(hero, 'image');
  const spot = text(hero, 'spot_image');
  const withSpot = hasImage(spot);
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const secondaryLabel = text(hero, 'secondary_label');
  const statsLabel = text(hero, 'stats_label');
  const stats = list(hero, 'stats', 3).filter((item) => field(item, 'value'));
  const quoteShown = !!(text(hero, 'card_quote') || text(hero, 'card_name'));
  const primaryLabel = text(hero, 'primary_label');
  const isWa = m.secondaryAction?.kind === 'external' && /wa\.me/.test(m.secondaryAction.href);

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="field" data-tpl-tone="inverse" className="relative isolate text-white">
      <div className="tm-hero-fallback relative isolate overflow-hidden">
        {hasImage(image) && (
          <KitPhoto
            src={image}
            alt={TANI_PHOTOS.alt(image, `Kebun ${m.companyName}`)}
            priority
            parallax={4}
            fallback="none"
            sizes="100vw"
            position="50% 60%"
            className="absolute inset-0 -z-20"
          />
        )}
        <div aria-hidden className="tm-hero-scrim absolute inset-0 -z-10" />
        <FieldLines className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full text-white/[0.16] @5xl:block" />

        <div
          className={`${CONTAINER} relative flex flex-col pb-8 pt-[108px] @3xl:pb-10 @3xl:pt-[136px] @5xl:min-h-[max(680px,min(calc(100svh-var(--tpl-sticky-top,0px)-64px),900px))] @5xl:pt-[132px]`}
        >
          <div className="grid items-start gap-10 @3xl:grid-cols-12 @3xl:gap-8">
            <div className={`min-w-0 ${withSpot ? '@3xl:col-span-7 @6xl:col-span-5' : '@3xl:col-span-9 @6xl:col-span-7'}`}>
              {eyebrow && (
                <Reveal variant="fade">
                  <SectionLabel tone="dark">{eyebrow}</SectionLabel>
                </Reveal>
              )}
              <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[11ch] text-balance text-white ${TYPE_T.h1}`}>
                <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" />
              </Reveal>
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-6 max-w-[48ch] text-pretty text-white/90 ${TYPE_T.lead}`}>
                  {subtitle}
                </Reveal>
              )}
              <Reveal delay={240} className="mt-8 flex flex-col items-start gap-4 @xl:flex-row @xl:items-center @xl:gap-6">
                {/* Tanpa foto bulat (atau di HP) ajakan utama tampil sebagai tombol pil */}
                <PillLink
                  action={m.primaryAction}
                  label={primaryLabel}
                  className={`${BTN.accent} ${BTN.lg} ${withSpot ? '@3xl:hidden' : ''}`}
                />
                {m.secondaryAction && secondaryLabel && (
                  <ActionLink action={m.secondaryAction} className="group inline-flex min-h-11 items-center gap-2.5 text-[15px] font-semibold text-white">
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.12] ring-1 ring-inset ring-white/25 transition-colors group-hover:bg-white/20">
                      {isWa ? <WhatsAppIcon className="h-[18px] w-[18px]" /> : <ArrowUpRight className="h-[18px] w-[18px]" />}
                    </span>
                    <span className="underline decoration-white/40 underline-offset-4 transition-colors group-hover:decoration-(--tpl-accent)">{secondaryLabel}</span>
                  </ActionLink>
                )}
              </Reveal>
            </div>

            {withSpot && (
              <Reveal variant="scale" delay={200} className="hidden min-w-0 @3xl:col-span-5 @3xl:block @3xl:pt-6 @6xl:col-span-4 @6xl:pt-10">
                <Spot m={m} image={spot} />
              </Reveal>
            )}

            {quoteShown && (
              <Reveal variant="fade" delay={360} className="hidden min-w-0 @6xl:col-span-3 @6xl:flex @6xl:justify-end @6xl:pt-24">
                <QuoteCard m={m} />
              </Reveal>
            )}
          </div>

          {(statsLabel || stats.length > 0) && (
            <div className="mt-auto grid gap-5 pt-12 @3xl:grid-cols-12 @3xl:items-end @3xl:gap-6 @5xl:pt-10">
              {statsLabel && (
                <p className="max-w-[18ch] text-[20px] font-medium leading-tight tracking-[-0.01em] text-white @3xl:col-span-3 @5xl:text-[22px]">{statsLabel}</p>
              )}
              {stats.length > 0 && (
                <ul className={`grid gap-3 @xl:grid-cols-3 @3xl:gap-4 ${statsLabel ? '@3xl:col-span-9' : '@3xl:col-span-12'}`}>
                  {stats.map((item, i) => (
                    // Selalu di tepi bawah layar saat dimuat: animasi masuk saat halaman dibuka (CSS .tm-rise)
                    <li
                      key={`${field(item, 'value')}-${i}`}
                      style={{ '--tm-delay': `${420 + stagger(i, 90)}ms` } as CSSProperties}
                      className={`tm-rise flex items-center gap-4 rounded-[18px] p-5 @xl:min-h-[132px] @xl:flex-col @xl:items-start @xl:justify-between @3xl:min-h-[140px] @3xl:p-6 ${
                        i === 0 ? 'bg-[#F6F2E3] text-[#18230F]' : 'border-t border-white/35 bg-[#13260E]/35 backdrop-blur-sm'
                      }`}
                    >
                      <span className={`shrink-0 ${TYPE_T.stat} ${i === 0 ? 'text-[#1E3A16]' : 'text-white'}`}>{field(item, 'value')}</span>
                      {field(item, 'label') && (
                        <span className={`max-w-[26ch] text-[14px] leading-snug ${i === 0 ? 'text-[#535E47]' : 'text-white/85'}`}>{field(item, 'label')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      <Ticker m={m} />
    </TemplateSection>
  );
}
