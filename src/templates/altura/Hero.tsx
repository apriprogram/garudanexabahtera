// Hero Altura — "Diptych" (data-hero-layout="diptych"): dua panel membulat (radius 28) berdampingan di dalam gutter,
// tinggi ± min(86svh, 820px). Kiri ± 48%: FOTO menara tegak (KitPhoto priority = LCP) dengan chip lokasi kaca; kanan
// ± 52%: panel krem dengan H1 sangat besar 3 baris, lead abu, tombol pil putih + bulatan panah limau, lalu di bawah:
// lingkaran limau besar berisi angka (mis. "40") + "years of experience" dan pil gelap berfoto (tautan dari CMS: ikon
// play HANYA bila tautannya video, selain itu ikon panah agar tidak menjanjikan film yang tidak ada). Menu pil putih
// (./Header) menumpang di atas kedua panel. HP: pil menu → foto 4:5 → panel krem. Gerak: kedua panel masuk bergeser
// (transform saja, foto LCP tidak disembunyikan), lead/tombol/baris bawah muncul bertahap, angka berjalan; semua mati di
// reduced-motion & pratinjau CMS.
import { ArrowUpRight, MapPin, Play } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { AlturaModel } from './model';
import { ALTURA_PHOTOS } from './photos';
import { C, DISPLAY, OUTER, TYPE_A } from './styles';
import { PillCta } from './ui';

/** Ukuran angka di lingkaran menurut panjangnya (lingkaran 96 → 104 → 116 → 132px); "1,200+" tetap di dalam lingkaran. */
const STAT_SIZE: Record<number, string> = {
  0: '',
  1: 'text-[44px] @3xl:text-[48px] @7xl:text-[54px] @min-[96rem]:text-[62px]',
  2: 'text-[44px] @3xl:text-[48px] @7xl:text-[54px] @min-[96rem]:text-[62px]',
  3: 'text-[44px] @3xl:text-[48px] @7xl:text-[54px] @min-[96rem]:text-[62px]',
  4: 'text-[30px] @7xl:text-[38px] @min-[96rem]:text-[42px]',
  5: 'text-[22px] @3xl:text-[24px] @7xl:text-[28px] @min-[96rem]:text-[32px]',
};

function StatCircle({ value, label }: { value: string; label: string }) {
  if (!value && !label) return null;
  return (
    <p className="flex items-center gap-4">
      {value && (
        <span className="flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) @3xl:h-[104px] @3xl:w-[104px] @7xl:h-[116px] @7xl:w-[116px] @min-[96rem]:h-[132px] @min-[96rem]:w-[132px]">
          <span
            className={`${DISPLAY} max-w-full px-2 text-center font-bold leading-none tracking-[-0.05em] text-(--tpl-on-accent) ${STAT_SIZE[Math.min(value.length, 5)] ?? STAT_SIZE[3]}`}
          >
            <CountUp value={value} duration={1600} />
          </span>
        </span>
      )}
      {label && <span className={`max-w-[11ch] text-[15px] font-semibold leading-snug @7xl:text-[16px] ${C.ink}`}>{label}</span>}
    </p>
  );
}

function WatchPill({ m }: { m: AlturaModel }) {
  const label = text(m.hero, 'watch_label');
  const Icon = m.watchIsVideo ? Play : ArrowUpRight;
  const image = text(m.hero, 'watch_image');
  if (!label || !m.watchAction) return null;
  return (
    <ActionLink
      action={m.watchAction}
      data-tpl-tone="inverse"
      className="group relative isolate inline-flex h-16 min-w-[196px] max-w-full items-center justify-between gap-4 overflow-hidden rounded-full bg-(--al-deep) pl-6 pr-2 text-white @7xl:h-[72px] @7xl:min-w-[220px]"
    >
      {hasImage(image) && (
        <KitPhoto
          src={image}
          alt=""
          fallback="none"
          sizes="240px"
          className="absolute inset-0 -z-20"
          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.06]"
        />
      )}
      <span aria-hidden className="absolute inset-0 -z-10 bg-(--al-deep)/65" />
      <span className="truncate text-[15px] font-semibold">{label}</span>
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#141612] @7xl:h-14 @7xl:w-14">
        <Icon
          className={m.watchIsVideo ? 'h-4 w-4 translate-x-px fill-current' : 'h-[18px] w-[18px] transition-transform duration-500 group-hover:rotate-45'}
          strokeWidth={m.watchIsVideo ? undefined : 2}
        />
      </span>
    </ActionLink>
  );
}

export function Hero({ m }: { m: AlturaModel }) {
  const { hero } = m;
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const caption = text(hero, 'image_caption');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const statValue = text(hero, 'stat_value');
  const statLabel = text(hero, 'stat_label');
  const hasBottom = !!(statValue || statLabel || (text(hero, 'watch_label') && m.watchAction));

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="diptych" className="pt-2.5 @2xl:pt-3 @5xl:pt-4">
      <div className={OUTER}>
        <div className="grid gap-2.5 @3xl:min-h-[660px] @3xl:grid-cols-[48fr_52fr] @3xl:gap-3 @5xl:min-h-[max(680px,min(86svh,820px))] @7xl:gap-4">
          {/* Panel foto menara (LCP: eager + fetchpriority high, tidak pernah disembunyikan) */}
          <div className="al-enter-left relative min-w-0">
            <KitPhoto
              src={image}
              alt={ALTURA_PHOTOS.alt(image, m.companyName)}
              priority
              fallback="tint"
              sizes="(min-width: 768px) 48vw, 100vw"
              position="50% 38%"
              className="aspect-[4/5] max-h-[760px] w-full rounded-[24px] @2xl:aspect-[5/4] @3xl:aspect-auto @3xl:h-full @3xl:max-h-none @3xl:rounded-[28px]"
            >
              {caption && hasImage(image) && (
                <p className="absolute bottom-4 left-4 right-4 flex max-w-max items-center gap-2 rounded-full bg-white/85 px-3.5 py-2 text-[13px] font-medium text-[#141612] ring-1 ring-black/[0.06] backdrop-blur-md @5xl:bottom-6 @5xl:left-6">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{caption}</span>
                </p>
              )}
            </KitPhoto>
          </div>

          {/* Panel krem: judul, lead, tombol, lalu lingkaran angka + pil video */}
          <div className="al-enter-right flex min-w-0 flex-col rounded-[24px] bg-[#F2EFE7] px-6 pb-6 pt-10 @2xl:px-10 @2xl:pb-9 @3xl:rounded-[28px] @3xl:px-9 @3xl:pt-[112px] @5xl:px-12 @5xl:pb-10 @5xl:pt-[128px] @7xl:px-16 @7xl:pb-12 @min-[96rem]:px-20">
            <div className="min-w-0">
              <h1 className={`max-w-[13ch] text-balance ${C.ink} ${TYPE_A.h1}`}>{title}</h1>
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-6 max-w-[50ch] text-pretty @5xl:mt-7 ${C.muted} ${TYPE_A.lead}`}>
                  {subtitle}
                </Reveal>
              )}
              {primaryLabel && (
                <Reveal delay={240} className="mt-8 @5xl:mt-9">
                  <PillCta action={m.primaryAction} label={primaryLabel} variant="white" />
                </Reveal>
              )}
            </div>
            {hasBottom && (
              <Reveal delay={320} className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 @3xl:mt-auto @3xl:pt-8">
                <StatCircle value={statValue} label={statLabel} />
                <WatchPill m={m} />
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
