// Hero Madani — slider foto latar di dalam BINGKAI MEMBULAT (data-hero-layout="framed-slider"): foto mengisi bingkai
// yang menjorok dari tepi halaman, menu pil menumpang di atasnya (./Header). Slide pertama = isi hero, hingga 3 slide
// tambahan (`hero.slides`): foto berganti dengan pudar, label/judul/deskripsi ikut berganti; tombol dan kartu info tetap.
// Kontrol: tombol sebelumnya/berikutnya, penghitung "01 / 04", titik per slide dengan bilah progres, dan tombol jeda.
// Berganti otomatis hanya bila gerak menyala (bukan pratinjau CMS / prefers-reduced-motion), berhenti saat kursor di
// atas hero atau fokus di dalamnya, bisa digeser di HP, dan panah kiri/kanan saat fokus di kontrol slide. Slide aktif
// = role group "slide" berlabel "n dari m"; pergantian oleh pengunjung diumumkan lewat wilayah aria-live yang tetap.
// Lapisan gelap warna tema tua (CSS .md-hero-scrim) menjaga teks putih ≥ 4,5:1.
import { ArrowLeft, ArrowRight, CalendarDays, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { heroSlides, type MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { GLASS, TYPE_M } from './styles';
import { ArrowLink, Highlighted } from './ui';

/** Lama satu slide saat berganti otomatis (bilah progres titik aktif; CSS .md-progress). */
const AUTOPLAY_MS = 6500;
const pad = (n: number) => String(n).padStart(2, '0');
const ROUND =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md transition-colors hover:bg-white/25';

function InfoCard({ m }: { m: MadaniModel }) {
  const { hero } = m;
  const label = text(hero, 'card_label');
  const title = text(hero, 'card_title');
  const body = text(hero, 'card_text');
  const badge = text(hero, 'card_badge');
  if (!title && !body) return null;
  const action = resolveAction(text(hero, 'card_url'), m.ppdbAction);
  const inner = (
    <>
      <span className="flex items-center justify-between gap-3">
        {label && <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/75">{label}</span>}
        {badge && <span className="inline-flex h-6 items-center rounded-full bg-(--md-hl) px-2.5 text-[11.5px] font-semibold text-(--md-on-hl)">{badge}</span>}
      </span>
      <span className="mt-3 flex items-center gap-3.5">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25">
          <CalendarDays className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          {title && <span className="block text-[16px] font-semibold leading-snug">{title}</span>}
          {body && <span className="mt-0.5 block text-[13px] leading-snug text-white/85">{body}</span>}
        </span>
        {action && (
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-(--md-deep) transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </span>
    </>
  );
  const box = `group block w-full rounded-[22px] p-4 text-white ${GLASS}`;
  return action ? (
    <ActionLink action={action} className={box}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box}>{inner}</div>
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
  onNext,
  onTogglePause,
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
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSelect(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelect(index - 1);
    }
  };
  return (
    <div
      role="group"
      aria-label="Kontrol slide"
      onKeyDown={onKeyDown}
      style={{ '--md-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="flex items-center gap-2"
    >
      <button type="button" onClick={() => onSelect(index - 1)} aria-label="Slide sebelumnya" className={ROUND}>
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <div className="flex min-w-0 items-center gap-1.5 px-1">
        <span aria-hidden className="text-[13px] font-semibold tabular-nums text-white">
          {pad(index + 1)}
          <span className="text-white/60"> / {pad(count)}</span>
        </span>
        <div className="ml-1 flex items-center">
          {Array.from({ length: count }, (_, i) => {
            const current = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Slide ${i + 1} dari ${count}`}
                aria-current={current ? 'true' : undefined}
                className="group/dot flex h-11 items-center px-1.5"
              >
                <span
                  className={`relative block h-[5px] overflow-hidden rounded-full transition-[width,background-color] duration-500 ${
                    current ? 'w-9 bg-white/35' : 'w-[5px] bg-white/45 group-hover/dot:bg-white/80'
                  }`}
                >
                  {current && (
                    // Bilah progres: saat animasinya selesai, slide berikutnya tampil (berhenti bila dijeda, disorot,
                    // gerak mati, atau tab di latar karena animasi CSS ikut berhenti)
                    <span
                      key={index}
                      data-run={autoplay ? 'true' : 'false'}
                      data-hold={holding ? 'true' : 'false'}
                      onAnimationEnd={onNext}
                      className="md-progress absolute inset-y-0 left-0 rounded-full bg-(--md-hl)"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={() => onSelect(index + 1)} aria-label="Slide berikutnya" className={ROUND}>
        <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
      </button>
      {canAutoplay && (
        <button type="button" onClick={onTogglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={ROUND}>
          {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
        </button>
      )}
    </div>
  );
}

export function Hero({ m }: { m: MadaniModel }) {
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

  // Pengumuman pembaca layar untuk pergantian slide oleh pengunjung (tombol, titik, panah, geser) di wilayah aria-live
  // yang TETAP terpasang. Pergantian otomatis tidak diumumkan (pola carousel WAI-ARIA).
  const [announcement, setAnnouncement] = useState('');

  const go = (i: number, byUser = false) => {
    const next = ((i % count) + count) % count;
    setWarm(true);
    setActive(next);
    if (byUser) setAnnouncement(`Slide ${next + 1} dari ${count}: ${slides[next].title}`);
  };

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="framed-slider"
      data-tpl-tone="inverse"
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? `Sorotan ${m.companyName}` : undefined}
    >
      <div
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
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1), true);
        }}
        // Selebar layar dari tepi ke tepi, tanpa sudut membulat (pemilik 2026-10-25)
        className="md-hero-fallback relative isolate overflow-hidden text-white"
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
                alt={i === index ? MADANI_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                sizes="100vw"
                position="50% 35%"
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="md-hero-scrim absolute inset-0 -z-10" />

        <div className="relative mx-auto flex min-h-[640px] w-full max-w-[1680px] flex-col px-5 pb-6 pt-[112px] @2xl:px-8 @3xl:min-h-[660px] @3xl:pb-8 @3xl:pt-[136px] @5xl:min-h-[max(640px,min(calc(100svh-var(--tpl-sticky-top,0px)-40px),860px))] @5xl:px-12 @5xl:pb-10 @min-[96rem]:px-16">
          <div className="mt-auto grid gap-8 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-8 @7xl:col-span-7">
              {/* Teks semua slide ditumpuk di satu sel grid: tinggi hero = teks terpanjang, jadi isi halaman di bawahnya
                  tidak bergeser saat slide berganti. Slide aktif dipasang ulang per slide sehingga Reveal memunculkannya lagi. */}
              <div className="grid">
                {slides.map((s, i) =>
                  i === index ? (
                    <div
                      key={`aktif-${i}`}
                      role={count > 1 ? 'group' : undefined}
                      aria-roledescription={count > 1 ? 'slide' : undefined}
                      aria-label={count > 1 ? `${i + 1} dari ${count}` : undefined}
                      className="col-start-1 row-start-1 self-end"
                    >
                      {s.eyebrow && (
                        <Reveal variant="fade">
                          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.12] py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium leading-snug ring-1 ring-inset ring-white/25 backdrop-blur-md">
                            <span aria-hidden className="md-pulse h-2 w-2 shrink-0 rounded-full bg-(--md-hl)" />
                            <span className="min-w-0">{s.eyebrow}</span>
                          </p>
                        </Reveal>
                      )}
                      <Reveal as="h1" delay={80} className={`${s.eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-white ${TYPE_M.h1}`}>
                        <Highlighted title={s.title} highlight={s.highlight} tone="dark" />
                      </Reveal>
                      {s.subtitle && (
                        <Reveal as="p" delay={160} className={`mt-5 max-w-[54ch] text-pretty text-white/90 ${TYPE_M.lead}`}>
                          {s.subtitle}
                        </Reveal>
                      )}
                    </div>
                  ) : (
                    <div key={`bayangan-${i}`} aria-hidden className="invisible col-start-1 row-start-1 self-end">
                      {s.eyebrow && <p className="inline-flex py-1.5 text-[13px]">{s.eyebrow}</p>}
                      <div className={`${s.eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance ${TYPE_M.h1}`}>{s.title}</div>
                      {s.subtitle && <p className={`mt-5 max-w-[54ch] text-pretty ${TYPE_M.lead}`}>{s.subtitle}</p>}
                    </div>
                  ),
                )}
              </div>
              {count > 1 && (
                <p data-slide-status="" className="sr-only" aria-live="polite" aria-atomic="true">
                  {announcement}
                </p>
              )}
              {((m.primaryAction && primaryLabel) || (m.secondaryAction && secondaryLabel)) && (
                <Reveal delay={240} className="mt-8 flex flex-col items-stretch gap-3 @md:flex-row @md:items-center">
                  <ArrowLink action={m.primaryAction} label={primaryLabel} variant="hl" className="justify-between @md:justify-center" />
                  <ArrowLink action={m.secondaryAction} label={secondaryLabel} variant="glass" className="justify-between @md:justify-center" />
                </Reveal>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-4 @5xl:col-span-4 @5xl:items-end @7xl:col-span-5">
              {count > 1 && (
                <SlideControls
                  count={count}
                  index={index}
                  autoplay={autoplay}
                  holding={holding}
                  canAutoplay={canAutoplay}
                  paused={paused}
                  onSelect={(i) => go(i, true)}
                  onNext={() => go(index + 1)}
                  onTogglePause={() => setPaused((p) => !p)}
                />
              )}
              <Reveal variant="fade" delay={320} className="hidden w-full max-w-[380px] @5xl:block">
                <InfoCard m={m} />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
