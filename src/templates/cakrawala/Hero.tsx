// Hero Cakrawala — "Horizon" (data-hero-layout="horizon"): SLIDER foto latar di dalam bingkai membulat (inset) di halaman
// putih; menu pil menumpang di atasnya (./Header). Slide 1 = isi hero, hingga 3 slide tambahan (`hero.slides`): foto
// berganti dengan pudar + zoom pelan, label/judul/deskripsi ikut berganti; tombol, foto alumni, dan kartu info tetap.
// Kontrol "01 02 03 04" (tombol per slide + bilah progres) dengan tombol sebelumnya/berikutnya dan jeda: vertikal di
// kanan (referensi Negmar) pada layar lebar, mendatar di bawah tombol pada HP. Berganti otomatis hanya bila gerak
// menyala (bukan pratinjau CMS / prefers-reduced-motion); berhenti saat hero disorot atau difokus; tombol panah kiri/
// kanan saat fokus di kontrol; bisa digeser di HP. Foto slide 1 = LCP (eager + fetchpriority high), foto lain lazy.
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { useMotionEnabled } from '../shared/motion';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { heroSlides, wrapIndex, type CakrawalaModel, type HeroSlide } from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { BTN, GLASS, INSET, INSET_PAD, TYPE_C } from './styles';
import { ArrowDot, Highlighted, PillLink } from './ui';

/** Lama satu slide saat berganti otomatis (bilah progres; CSS .ck-progress). */
const AUTOPLAY_MS = 6500;
const pad = (n: number) => String(n).padStart(2, '0');
/** Posisi fokus foto per slide demo (wadah HP tegak memotong kiri-kanan) */
const POSITIONS = ['58% 40%', '55% 30%', '42% 40%', '70% 40%'];

function InfoCard({ m }: { m: CakrawalaModel }) {
  const eyebrow = text(m.hero, 'card_eyebrow');
  const title = text(m.hero, 'card_title');
  const body = text(m.hero, 'card_text');
  const label = text(m.hero, 'card_label');
  if (!title && !body) return null;
  const action = m.linkOr(text(m.hero, 'card_url'), m.ppdbAction);
  return (
    <div className={`w-full rounded-[20px] p-4 text-white @xl:max-w-[340px] @3xl:p-5 ${GLASS}`}>
      {eyebrow && (
        <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/85">
          <span aria-hidden className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-[#4ADE80]" />
          </span>
          {eyebrow}
        </p>
      )}
      {title && <p className="mt-2 text-[17px] font-semibold leading-snug @3xl:text-[18px]">{title}</p>}
      {body && <p className="mt-1 text-[13.5px] leading-snug text-white/80">{body}</p>}
      {action && label && (
        <ActionLink action={action} className="group mt-4 flex items-center justify-between gap-3 rounded-full bg-white py-1 pl-4 pr-1 text-[14px] font-semibold text-[#0D1830]">
          <span className="truncate">{label}</span>
          <ArrowDot variant="accent" className="h-8 w-8" />
        </ActionLink>
      )}
    </div>
  );
}

function Trust({ m }: { m: CakrawalaModel }) {
  const label = text(m.hero, 'trust_text');
  if (!label) return null;
  const people = list(m.testimonials, 'items', 4).filter((item) => hasImage(field(item, 'photo')));
  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-[20px] bg-white/[0.12] py-1 pl-1 pr-4 ring-1 ring-inset ring-white/20 backdrop-blur-md">
      {people.length > 0 && (
        <span className="flex shrink-0 -space-x-2" aria-hidden>
          {people.slice(0, 3).map((item, i) => (
            <KitAvatar key={`${field(item, 'name')}-${i}`} name={field(item, 'name')} photo={field(item, 'photo')} sizes="32px" className="h-8 w-8 ring-2 ring-white/80" />
          ))}
        </span>
      )}
      <span className={`line-clamp-2 min-w-0 py-0.5 text-[13px] font-medium leading-snug text-white/90 ${people.length ? '' : 'pl-3'}`}>{label}</span>
    </div>
  );
}

function SlideControls({
  count,
  index,
  autoplay,
  holding,
  canAutoplay,
  paused,
  onSelect,
  onTogglePause,
}: {
  count: number;
  index: number;
  autoplay: boolean;
  holding: boolean;
  canAutoplay: boolean;
  paused: boolean;
  onSelect: (i: number) => void;
  onTogglePause: () => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelect(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelect(index - 1);
    }
  };
  const round = `flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${GLASS} transition-colors hover:bg-white/25`;
  return (
    <div
      role="group"
      aria-label="Kontrol slide"
      onKeyDown={onKeyDown}
      style={{ '--ck-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="flex items-center gap-1 @6xl:flex-col @6xl:gap-2"
    >
      <button type="button" onClick={() => onSelect(index - 1)} aria-label="Slide sebelumnya" className={round}>
        <ChevronLeft className="h-5 w-5 @6xl:rotate-90" aria-hidden />
      </button>
      <ul className="flex items-center @6xl:flex-col @6xl:py-2">
        {Array.from({ length: count }, (_, i) => {
          const current = i === index;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Slide ${i + 1} dari ${count}`}
                aria-current={current ? 'true' : undefined}
                className={`group flex h-11 min-w-11 flex-col items-center justify-center gap-1.5 px-1.5 text-[13px] font-semibold tabular-nums transition-colors @6xl:h-12 ${
                  current ? 'text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                <span aria-hidden>{pad(i + 1)}</span>
                <span aria-hidden className={`relative block h-[2px] overflow-hidden rounded-full bg-white/30 transition-[width] duration-500 ${current ? 'w-7' : 'w-3'}`}>
                  {current && (
                    // Bilah progres: saat animasinya selesai, slide berikutnya tampil (berhenti bila dijeda, disorot,
                    // difokus, gerak mati, atau tab di latar karena animasi CSS ikut berhenti)
                    <span
                      key={index}
                      data-run={autoplay ? 'true' : 'false'}
                      data-hold={holding ? 'true' : 'false'}
                      onAnimationEnd={() => onSelect(index + 1)}
                      className="ck-progress absolute inset-y-0 left-0 rounded-full bg-white"
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => onSelect(index + 1)} aria-label="Slide berikutnya" className={round}>
        <ChevronRight className="h-5 w-5 @6xl:rotate-90" aria-hidden />
      </button>
      {canAutoplay && (
        <button type="button" onClick={onTogglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={`${round} ml-1 @6xl:ml-0 @6xl:mt-2`}>
          {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
        </button>
      )}
    </div>
  );
}

export function Hero({ m, overlap }: { m: CakrawalaModel; overlap: boolean }) {
  const { hero } = m;
  const slides = heroSlides(hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  // Foto slide lain dimuat sesudah halaman tampil (foto pertama = LCP), atau segera saat slide dipilih
  const [warm, setWarm] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const motion = useMotionEnabled();
  const index = Math.min(active, count - 1);
  const canAutoplay = motion && count > 1;
  const autoplay = canAutoplay && !paused;
  const holding = hovering || focused;
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setWarm(true), 1800);
    return () => window.clearTimeout(timer);
  }, [count]);

  const go = (i: number) => {
    setWarm(true);
    setActive(wrapIndex(i, count));
  };

  const textBlock = (s: HeroSlide, live: boolean) => (
    <>
      {s.eyebrow && (
        <p className="ck-rise inline-flex max-w-full items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/90">
          <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-(--ck-bright)" />
          <span className="min-w-0">{s.eyebrow}</span>
        </p>
      )}
      {live ? (
        <h1 style={{ '--ck-delay': '80ms' } as CSSProperties} className={`ck-rise ${s.eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance text-white ${TYPE_C.h1}`}>
          <Highlighted title={s.title} highlight={s.highlight} tone="photo" />
        </h1>
      ) : (
        <p className={`${s.eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance ${TYPE_C.h1}`}>
          <Highlighted title={s.title} highlight={s.highlight} tone="photo" />
        </p>
      )}
      {s.subtitle && (
        <p style={{ '--ck-delay': '160ms' } as CSSProperties} className={`ck-rise mt-5 max-w-[52ch] text-pretty text-white/85 ${TYPE_C.lead}`}>
          {s.subtitle}
        </p>
      )}
    </>
  );

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="horizon"
      data-tpl-tone="inverse"
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? `Sorotan ${m.companyName}` : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
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
    >
      {/* Selebar layar dari tepi ke tepi, tanpa bingkai & sudut membulat (pemilik 2026-10-25) */}
      <div className={`relative isolate overflow-hidden text-white ${hasImage(slides[0].image) ? 'bg-(--ck-deep)' : 'ck-hero-fallback'}`}>
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-active={i === index ? 'true' : 'false'}
              aria-hidden={i === index ? undefined : true}
              className={`ck-slide absolute inset-0 -z-20 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? CAKRAWALA_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                sizes="100vw"
                position={POSITIONS[i] ?? '50% 40%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="ck-hero-scrim absolute inset-0 -z-10" />

        {/* Isi sejajar dengan isi header (max-w 1680 + INSET + INSET_PAD) */}
        <div className={`mx-auto max-w-[1680px] ${INSET}`}>
        <div
          className={`relative flex min-h-[620px] flex-col justify-end gap-8 pb-7 pt-[104px] @3xl:min-h-[680px] @3xl:pt-[128px] @5xl:min-h-[max(640px,min(calc(100svh-96px),860px))] @6xl:pr-28 ${
            overlap ? '@5xl:pb-[136px]' : '@5xl:pb-14'
          } ${INSET_PAD}`}
        >
          <div className="max-w-[760px]">
            <div className="mb-6">
              <Trust m={m} />
            </div>
            {/* Teks semua slide ditumpuk di satu sel grid: tinggi hero = teks terpanjang, jadi isi di bawahnya tidak
                bergeser saat slide berganti. Teks slide lain tersembunyi dari pembaca layar dan bukan <h1>. Kunci
                aktif/bayangan sengaja berganti agar animasi masuk (.ck-rise) diputar ulang; karena itu pengumuman
                pembaca layar ada di wilayah live terpisah di bawah yang tidak pernah dipasang ulang. */}
            <div className="grid">
              {slides.map((s, i) =>
                i === index ? (
                  <div key={`aktif-${i}`} className="col-start-1 row-start-1">
                    {textBlock(s, true)}
                  </div>
                ) : (
                  <div key={`bayangan-${i}`} aria-hidden className="invisible col-start-1 row-start-1">
                    {textBlock(s, false)}
                  </div>
                ),
              )}
            </div>
            {count > 1 && (
              // Wilayah live tetap: slide yang dipilih manual diumumkan (polite) saat tidak berganti otomatis
              // (dijeda, hero difokus/disorot, gerak mati, pratinjau CMS); saat berganti otomatis diam (off).
              <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true" data-ck-slide-status>
                {`Slide ${index + 1} dari ${count}: ${slides[index].title}`}
              </p>
            )}
            {((m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel)) && (
              <div className="mt-8 flex flex-col items-stretch gap-3 @xl:flex-row @xl:items-center">
                <PillLink action={m.primaryAction} label={primaryLabel} dot="accent" className={`${BTN.white} ${BTN.lg} justify-between`} />
                <PillLink action={m.secondaryAction} label={secondaryLabel} dot="soft" className={`${BTN.glass} ${BTN.lg} justify-between`} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 @5xl:flex-row @5xl:items-end @5xl:justify-between">
            {count > 1 && (
              <div className="@6xl:absolute @6xl:right-6 @6xl:top-1/2 @6xl:-translate-y-1/2 @min-[96rem]:right-10">
                <SlideControls
                  count={count}
                  index={index}
                  autoplay={autoplay}
                  holding={holding}
                  canAutoplay={canAutoplay}
                  paused={paused}
                  onSelect={go}
                  onTogglePause={() => setPaused((p) => !p)}
                />
              </div>
            )}
            <div className="@5xl:ml-auto">
              <InfoCard m={m} />
            </div>
          </div>
        </div>
        </div>
      </div>
    </TemplateSection>
  );
}
