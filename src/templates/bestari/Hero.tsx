// Hero Bestari — "Canvas" (data-hero-layout="canvas"): SLIDER foto latar selebar layar dari tepi kiri, kanan, dan atas;
// bilah info + menu pil putih menumpang di atasnya (./Header). Slide 1 = isi hero, hingga 3 slide tambahan
// (`hero.slides`): foto berganti dengan pudar, label/judul/deskripsi ikut berganti; tombol dan tiga angka (referensi
// Bienes) tetap. Di bawah garis tipis: nomor slide "01 ── 02 ── 03" dengan bilah progres + tombol sebelumnya/
// berikutnya/jeda (bulat kaca). Berganti otomatis hanya bila gerak menyala (bukan pratinjau CMS / prefers-reduced-
// motion); berhenti saat hero disorot atau difokus; panah kiri/kanan saat fokus di kontrol; bisa digeser di HP.
// Foto slide 1 = LCP (eager + fetchpriority high) dan TIDAK dianimasikan masuk: zoom pelan & teks naik hanya untuk slide
// yang tampil setelah pergantian. Foto slide lain lazy dan baru dipasang sesudah halaman tampil.
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { heroSlides, wrapIndex, type BestariModel, type HeroSlide } from './model';
import { BESTARI_PHOTOS } from './photos';
import { DISPLAY, TYPE_B } from './styles';
import { Highlighted, PillLink } from './ui';

/** Lama satu slide saat berganti otomatis (bilah progres; CSS .bs-progress). */
const AUTOPLAY_MS = 6500;
const pad = (n: number) => String(n).padStart(2, '0');
/** Posisi fokus foto per slide demo (wadah HP tegak memotong kiri-kanan) */
const POSITIONS = ['38% 45%', '48% 50%', '55% 40%', '45% 55%'];

/** Zoom pelan per slide: `tag` bergantian "a"/"b" agar animasi diputar ulang setiap slide itu tampil lagi. */
interface Zoom {
  i: number;
  tag: 'a' | 'b';
}

function HeroStats({ m }: { m: BestariModel }) {
  const items = list(m.hero, 'stats', 3).filter((item) => field(item, 'value') || field(item, 'label'));
  if (items.length === 0) return null;
  return (
    <dl className="grid grid-cols-3 gap-3 @5xl:flex @5xl:justify-end @5xl:gap-0 @5xl:divide-x @5xl:divide-white/20">
      {items.map((item, i) => (
        <div key={`${field(item, 'label')}-${i}`} className="flex min-w-0 flex-col @5xl:px-6 @5xl:last:pr-0 @7xl:px-8">
          {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
          <dt className="order-last mt-1.5 text-[12.5px] font-medium leading-snug text-white @3xl:text-[13.5px]">{field(item, 'label')}</dt>
          <dd className={`${DISPLAY} text-[26px] font-medium leading-none tracking-[-0.03em] tabular-nums text-white @3xl:text-[34px] @6xl:text-[40px]`}>
            {field(item, 'value')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SlideControls({
  slides,
  index,
  autoplay,
  holding,
  canAutoplay,
  paused,
  onSelect,
  onTogglePause,
}: {
  slides: HeroSlide[];
  index: number;
  autoplay: boolean;
  holding: boolean;
  canAutoplay: boolean;
  paused: boolean;
  onSelect: (i: number) => void;
  onTogglePause: () => void;
}) {
  const count = slides.length;
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelect(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelect(index - 1);
    }
  };
  const round =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.24]';
  return (
    <div
      role="group"
      aria-label="Kontrol slide"
      onKeyDown={onKeyDown}
      style={{ '--bs-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="flex items-center justify-between gap-3"
    >
      <ul className="flex min-w-0 items-center gap-1 @3xl:gap-4 @6xl:gap-6">
        {slides.map((s, i) => {
          const current = i === index;
          return (
            // HP (< @3xl): hanya tombol slide aktif + "/ 04" yang tampil agar muat bersama 3 tombol bulat; bilah progres
            // (pemicu ganti slide) selalu ada di tombol aktif
            <li key={i} className={`min-w-0 ${current ? '' : 'hidden @3xl:block'}`}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={s.eyebrow ? `Slide ${i + 1} dari ${count}: ${s.eyebrow}` : `Slide ${i + 1} dari ${count}`}
                aria-current={current ? 'true' : undefined}
                className={`group flex h-11 min-w-11 max-w-full items-center gap-2.5 px-1 text-[13px] font-medium tabular-nums transition-colors duration-300 ${
                  current ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <span aria-hidden>{pad(i + 1)}</span>
                <span aria-hidden className={`relative block h-px shrink-0 overflow-hidden bg-white/30 transition-[width] duration-500 ${current ? 'w-10 @3xl:w-14' : 'w-8'}`}>
                  {current && (
                    // Bilah progres: saat animasinya selesai, slide berikutnya tampil (berhenti bila dijeda, disorot,
                    // difokus, gerak mati, atau tab di latar karena animasi CSS ikut berhenti)
                    <span
                      key={index}
                      data-run={autoplay ? 'true' : 'false'}
                      data-hold={holding ? 'true' : 'false'}
                      onAnimationEnd={() => onSelect(index + 1)}
                      className="bs-progress absolute inset-0 bg-white"
                    />
                  )}
                </span>
                <span aria-hidden className="text-white/70 @3xl:hidden">/ {pad(count)}</span>
                {s.eyebrow && (
                  <span aria-hidden className="hidden max-w-[150px] truncate text-left text-[12.5px] font-normal @6xl:block">
                    {s.eyebrow}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => onSelect(index - 1)} aria-label="Slide sebelumnya" className={round}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => onSelect(index + 1)} aria-label="Slide berikutnya" className={round}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        {canAutoplay && (
          <button type="button" onClick={onTogglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={round}>
            {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Hero({ m, overlap }: { m: BestariModel; overlap: boolean }) {
  const { hero } = m;
  const slides = heroSlides(hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ active: Zoom | null; prev: Zoom | null }>({ active: null, prev: null });
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
  const changed = zoom.active !== null;

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setWarm(true), 1800);
    return () => window.clearTimeout(timer);
  }, [count]);

  const tagOf = (i: number) => (zoom.active?.i === i ? zoom.active.tag : zoom.prev?.i === i ? zoom.prev.tag : undefined);

  const go = (i: number) => {
    const next = wrapIndex(i, count);
    setWarm(true);
    if (next === index) return;
    setZoom({ active: { i: next, tag: tagOf(next) === 'a' ? 'b' : 'a' }, prev: zoom.active && zoom.active.i !== next ? zoom.active : null });
    setActive(next);
  };

  const textBlock = (s: HeroSlide, live: boolean) => (
    <>
      {s.eyebrow && (
        <p className="bs-rise inline-flex max-w-full items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-white/90">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--bs-bright)" />
          <span className="min-w-0">{s.eyebrow}</span>
        </p>
      )}
      {live ? (
        <h1 style={{ '--bs-delay': '80ms' } as CSSProperties} className={`bs-rise ${s.eyebrow ? 'mt-5' : ''} max-w-[17ch] text-balance text-white ${TYPE_B.h1}`}>
          <Highlighted title={s.title} highlight={s.highlight} tone="photo" />
        </h1>
      ) : (
        <p className={`${s.eyebrow ? 'mt-5' : ''} max-w-[17ch] text-balance ${TYPE_B.h1}`}>
          <Highlighted title={s.title} highlight={s.highlight} tone="photo" />
        </p>
      )}
      {s.subtitle && (
        <p style={{ '--bs-delay': '160ms' } as CSSProperties} className={`bs-rise mt-5 max-w-[50ch] text-pretty text-white/85 ${TYPE_B.lead}`}>
          {s.subtitle}
        </p>
      )}
    </>
  );

  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="canvas"
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
      {/* Selebar layar dari tepi ke tepi dan sampai tepi atas; menu pil menumpang di atasnya */}
      <div className={`relative isolate overflow-hidden text-white ${hasImage(slides[0].image) ? 'bg-(--bs-deep)' : 'bs-hero-fallback'}`}>
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-active={i === index ? 'true' : 'false'}
              data-zoom={tagOf(i)}
              aria-hidden={i === index ? undefined : true}
              className={`bs-slide absolute inset-0 -z-20 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? BESTARI_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                sizes="100vw"
                position={POSITIONS[i] ?? '50% 45%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="bs-hero-scrim absolute inset-0 -z-10" />

        <div
          className={`${CONTAINER} relative flex min-h-[680px] flex-col justify-end pb-5 pt-[176px] @3xl:min-h-[740px] @3xl:pt-[172px] @5xl:min-h-[max(720px,min(100svh,960px))] ${
            overlap ? '@5xl:pb-[124px]' : '@5xl:pb-8'
          }`}
        >
          <div className="grid gap-9 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-8 @7xl:col-span-7">
              {/* Teks semua slide ditumpuk di satu sel grid: tinggi hero = teks terpanjang, jadi isi di bawahnya tidak
                  bergeser saat slide berganti. Teks slide lain tersembunyi dari pembaca layar dan bukan <h1>. Kunci aktif
                  berganti agar animasi naik (.bs-rise, hanya setelah pergantian) diputar ulang; pengumuman pembaca layar
                  ada di wilayah live terpisah di bawah yang tidak pernah dipasang ulang. */}
              <div className="grid">
                {slides.map((s, i) =>
                  i === index ? (
                    <div key={`aktif-${i}`} data-enter={changed ? 'true' : 'false'} className="col-start-1 row-start-1">
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
                <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true" data-bs-slide-status>
                  {`Slide ${index + 1} dari ${count}: ${slides[index].title}`}
                </p>
              )}
              {(primaryLabel || secondaryLabel) && (
                <div className="mt-8 flex flex-col items-stretch gap-3 @xl:flex-row @xl:items-center">
                  <PillLink action={m.primaryAction} label={primaryLabel} variant="primary" size="lg" />
                  <PillLink action={m.secondaryAction} label={secondaryLabel} variant="glass" size="lg" />
                </div>
              )}
            </div>
            <div className="min-w-0 @5xl:col-span-4 @7xl:col-span-5">
              <HeroStats m={m} />
            </div>
          </div>

          {count > 1 && (
            <div className="mt-8 border-t border-white/20 pt-3 @3xl:mt-10">
              <SlideControls
                slides={slides}
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
        </div>
      </div>
    </TemplateSection>
  );
}
