// Hero Serenity — slider "foto layar penuh" (data-hero-layout="fullbleed"): foto mengisi seluruh hero dari tepi ke tepi
// (sudut bawah membulat mulai @3xl), menu transparan menumpang di atasnya (./Header). Slide pertama = isi hero, hingga
// 3 slide tambahan (`hero.slides`): foto berganti dengan pudar, label/judul/deskripsi ikut berganti; tombol, kartu kaca,
// dan strip fitur tetap. Kontrol "01 — 04" = tombol per slide + bilah progres + tombol jeda; berganti otomatis hanya
// bila gerak menyala (bukan pratinjau CMS / prefers-reduced-motion), berhenti saat kontrol disorot atau hero difokus,
// dan bisa digeser di HP. Lapisan gelap tipis (CSS .sr-hero-scrim) menjaga teks putih ≥ 4,5:1.
// HP: foto tetap jadi latar, lapisan lebih rata, tombol bertumpuk, fitur 2×2, kontrol slide di bawah fitur.
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger, useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { heroSlides, type SerenityModel } from './model';
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

/** Lama satu slide saat berganti otomatis (bilah progres di kontrol slide; CSS .sr-progress). */
const AUTOPLAY_MS = 6500;
const pad = (n: number) => String(n).padStart(2, '0');

function SlideControls({
  count,
  index,
  autoplay,
  holding,
  canAutoplay,
  paused,
  onSelect,
  onNext,
  onTogglePause,
  onHold,
}: {
  count: number;
  index: number;
  autoplay: boolean;
  holding: boolean;
  canAutoplay: boolean;
  paused: boolean;
  onSelect: (i: number) => void;
  onNext: () => void;
  onTogglePause: () => void;
  onHold: (hold: boolean) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Kontrol slide"
      onMouseEnter={() => onHold(true)}
      onMouseLeave={() => onHold(false)}
      style={{ '--sr-delay': '700ms', '--sr-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="sr-rise flex shrink-0 items-center gap-2 text-[12px] font-medium tabular-nums text-white/85 @5xl:mr-16"
    >
      <span aria-hidden>{pad(index + 1)}</span>
      <div className="flex items-center">
        {Array.from({ length: count }, (_, i) => {
          const current = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Slide ${i + 1} dari ${count}`}
              aria-current={current ? 'true' : undefined}
              className="group flex h-11 items-center px-1"
            >
              <span
                className={`relative block h-[3px] overflow-hidden rounded-full transition-[width,background-color] duration-500 ${
                  current ? 'w-12 bg-white/35' : 'w-5 bg-white/35 group-hover:bg-white/60'
                }`}
              >
                {current && (
                  // Bilah progres: saat animasinya selesai, slide berikutnya tampil (otomatis berhenti bila dijeda,
                  // disorot, gerak mati, atau tab di latar karena animasi CSS ikut berhenti)
                  <span
                    key={index}
                    data-run={autoplay ? 'true' : 'false'}
                    data-hold={holding ? 'true' : 'false'}
                    onAnimationEnd={onNext}
                    className="sr-progress absolute inset-y-0 left-0 rounded-full bg-white"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <span aria-hidden>{pad(count)}</span>
      {canAutoplay && (
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'}
          className="ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/25"
        >
          {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
        </button>
      )}
    </div>
  );
}

export function Hero({ m }: { m: SerenityModel }) {
  const { hero } = m;
  const slides = heroSlides(hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  // Foto slide lain dimuat sesudah halaman tampil (foto pertama = LCP), atau segera saat slide dipilih
  const [warm, setWarm] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const motion = useMotionEnabled();
  const index = Math.min(active, count - 1);
  const canAutoplay = motion && count > 1;
  const autoplay = canAutoplay && !paused;
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const secondaryHref = text(hero, 'secondary_url');
  // Tombol video hanya tampil bila tautannya diisi (tanpa video → tidak ada tujuan yang jujur)
  const secondary = secondaryHref ? resolveAction(secondaryHref, null) : null;
  const features = list(hero, 'features', 4).filter((item) => field(item, 'title') || field(item, 'text'));

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setWarm(true), 1800);
    return () => window.clearTimeout(timer);
  }, [count]);

  const go = (i: number) => {
    setWarm(true);
    setActive(((i % count) + count) % count);
  };

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="fullbleed"
      data-tpl-tone="inverse"
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? `Sorotan ${m.companyName}` : undefined}
      onFocus={() => setHolding(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHolding(false);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = t ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        const t = e.changedTouches[0];
        if (!start || !t || count < 2) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Geser mendatar yang jelas (bukan gulir halaman) → slide berikut/sebelumnya
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
      className="sr-hero-fallback relative isolate overflow-hidden text-white @3xl:rounded-b-[40px]"
    >
      {slides.map((s, i) =>
        hasImage(s.image) && (i === 0 || i === index || warm) ? (
          <div
            key={`${s.image}-${i}`}
            aria-hidden={i === index ? undefined : true}
            className={`absolute inset-0 -z-20 transition-opacity duration-1000 ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
          >
            <KitPhoto
              src={s.image}
              alt={i === index ? SERENITY_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
              priority={i === 0}
              parallax={4}
              fallback="none"
              sizes="100vw"
              position="62% 50%"
              className="absolute inset-0"
            />
          </div>
        ) : null,
      )}
      <div aria-hidden className="sr-hero-scrim absolute inset-0 -z-10" />

      <div className={`${CONTAINER} relative flex flex-col pb-7 pt-[116px] @3xl:pb-9 @3xl:pt-[148px] @5xl:min-h-[max(660px,min(calc(100svh-var(--tpl-sticky-top,0px)),920px))] @5xl:pt-[168px]`}>
        <div className="max-w-[640px] @6xl:max-w-[800px]">
          {/* Teks semua slide ditumpuk di satu sel grid: tinggi hero = teks terpanjang, jadi isi halaman di bawahnya tidak
              bergeser saat slide berganti. Slide aktif dipasang ulang per slide sehingga Reveal memunculkannya lagi. */}
          <div className="grid">
            {slides.map((s, i) =>
              i === index ? (
                <div key={`aktif-${i}`} className="col-start-1 row-start-1" aria-live={count > 1 && !autoplay ? 'polite' : undefined}>
                  {s.eyebrow && (
                    <Reveal variant="fade">
                      <SectionLabel tone="glass">{s.eyebrow}</SectionLabel>
                    </Reveal>
                  )}
                  <Reveal as="h1" delay={80} className={`${s.eyebrow ? 'mt-6' : ''} text-balance text-white ${TYPE_S.h1}`}>
                    <Highlighted title={s.title} highlight={s.highlight} tone="dark" breakBefore />
                  </Reveal>
                  {s.subtitle && (
                    <Reveal as="p" delay={160} className={`mt-6 max-w-[46ch] text-pretty text-white/90 ${TYPE_S.lead}`}>
                      {s.subtitle}
                    </Reveal>
                  )}
                </div>
              ) : (
                <div key={`bayangan-${i}`} aria-hidden className="invisible col-start-1 row-start-1">
                  {s.eyebrow && <SectionLabel tone="glass">{s.eyebrow}</SectionLabel>}
                  <div className={`${s.eyebrow ? 'mt-6' : ''} text-balance ${TYPE_S.h1}`}>
                    <Highlighted title={s.title} highlight={s.highlight} tone="dark" breakBefore />
                  </div>
                  {s.subtitle && <p className={`mt-6 max-w-[46ch] text-pretty ${TYPE_S.lead}`}>{s.subtitle}</p>}
                </div>
              ),
            )}
          </div>
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

        {(features.length > 0 || count > 1) && (
          <div className="mt-auto flex flex-col gap-6 pt-12 @3xl:pt-16 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-10">
            {features.length > 0 && (
              <ul aria-label="Yang bisa Anda temukan" className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-5 @3xl:grid-cols-4 @5xl:flex @5xl:flex-wrap @5xl:gap-x-10 @7xl:gap-x-14">
                {features.map((item, i) => (
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
                ))}
              </ul>
            )}
            {count > 1 && (
              <SlideControls
                count={count}
                index={index}
                autoplay={autoplay}
                holding={holding}
                canAutoplay={canAutoplay}
                paused={paused}
                onSelect={go}
                onNext={() => go(index + 1)}
                onTogglePause={() => setPaused((p) => !p)}
                onHold={setHolding}
              />
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
