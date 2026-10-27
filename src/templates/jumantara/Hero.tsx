// Hero Jumantara — "Stories" (data-hero-layout="stories"): SLIDER foto latar selebar layar (min(88vh, 820px) di layar
// lebar) dengan lapisan kobalt-hitam yang lebih gelap di kiri. Layar lebar: tepat di bawah menu BILAH PROGRES
// BERSEGMEN ala stories (satu per slide, nomor + nama slide; segmen aktif mengisi lurus selama slide tampil, bisa diklik
// untuk melompat) + tombol sebelumnya/berikutnya/jeda persegi; teks di 7 kolom kiri, di tengah ruang sisa: chip label,
// judul, deskripsi, dua tombol persegi (sama untuk semua slide); lalu PITA EMPAT ANGKA sekolah yang menempel di tepi
// bawah foto (bening gelap, garis rambut antar-angka, angka menghitung naik). HP & tablet: foto + teks, bilah progres di
// bawah teks, lalu angka 2×2 di pita kobalt-hitam padat di bawah foto.
// Mekanik & aksesibilitas mengikuti Bestari: berganti otomatis hanya bila gerak menyala (bukan pratinjau CMS /
// prefers-reduced-motion), berhenti saat disorot, difokus, tab tersembunyi, atau hero di luar layar, punya tombol jeda,
// dan BERHENTI SENDIRI di slide pertama setelah dua putaran (WCAG 2.2.2); panah kiri/kanan saat fokus di kontrol; geser
// di HP; wilayah live tetap mengumumkan slide yang dipilih manual. Foto slide 1 = LCP (eager + fetchpriority high) dan
// TIDAK pernah dianimasikan masuk; teks naik hanya untuk slide yang tampil setelah pergantian. Foto slide lain lazy,
// dipasang sesudah halaman tampil. Tanpa Ken Burns.
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CountUp } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { useDocumentHidden, useInView } from './hooks';
import { AUTOPLAY_ROUNDS, heroSlides, slideName, wrapIndex, type HeroSlide, type JumantaraModel } from './model';
import { JUMANTARA_PHOTOS } from './photos';
import { BTN, TYPE_J } from './styles';

/** Lama satu slide saat berganti otomatis (bilah progres; CSS .jm-seg-fill). */
const AUTOPLAY_MS = 7000;
const pad = (n: number) => String(n).padStart(2, '0');
/** Posisi fokus foto per slide demo (wadah HP tegak memotong kiri-kanan) */
const POSITIONS = ['32% 62%', '52% 40%', '42% 38%', '46% 42%'];

/** Lebar judul slide: 15ch di HP, 18ch di layar lebar (judul 35–40 huruf tetap 2 baris, tinggi teks antar-slide sama). */
const TITLE_WIDTH = 'max-w-[15ch] @5xl:max-w-[18ch]';

const ROUND_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/30 bg-white/[0.06] text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/15';

/** Kolom angka per jumlah (kelas utuh agar terbaca Tailwind). */
const STAT_COLS = ['', '@3xl:grid-cols-1', '@3xl:grid-cols-2', '@3xl:grid-cols-3', '@3xl:grid-cols-4'];

/**
 * Garis rambut & jarak antar-angka: HP 2 kolom (garis kanan di kolom kiri, garis atas di baris kedua; teks kolom kiri
 * rata dengan tepi wadah), layar ≥ @3xl satu baris (angka pertama rata tepi), layar lebar di dalam pita berbingkai.
 */
const statCell = (i: number, n: number) =>
  [
    i % 2 === 0 ? 'pr-4' : 'pl-4',
    i % 2 === 0 && i < n - 1 ? 'border-r' : '',
    i >= 2 ? 'border-t' : '',
    '@3xl:border-t-0',
    i < n - 1 ? '@3xl:border-r' : '@3xl:border-r-0',
    i === 0 ? '@3xl:pl-0 @3xl:pr-6' : '@3xl:px-6',
    '@5xl:px-6',
  ].join(' ');

function HeroStats({ items, note }: { items: ListItem[]; note: string }) {
  const n = items.length;
  return (
    <div className="relative col-start-1 row-start-2">
      <div className={CONTAINER}>
        <div className="border-t border-white/10 @5xl:rounded-t-[12px] @5xl:border @5xl:border-b-0 @5xl:border-white/[0.12] @5xl:bg-[color-mix(in_srgb,var(--jm-night)_78%,transparent)] @5xl:backdrop-blur-md">
          <dl className={`grid ${n === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${STAT_COLS[n]}`}>
            {items.map((item, i) => (
              <div key={`${field(item, 'label')}-${i}`} className={`flex min-w-0 flex-col border-white/15 py-5 @5xl:py-6 ${statCell(i, n)}`}>
                {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
                <dt className="order-last mt-2 text-[13px] leading-snug text-white/80 @3xl:text-[13.5px]">{field(item, 'label')}</dt>
                <dd className={`${TYPE_J.stat} text-white`}>
                  <CountUp value={field(item, 'value')} duration={1600} />
                </dd>
              </div>
            ))}
          </dl>
          {note && <p className="border-t border-white/10 py-3.5 text-[12px] leading-snug text-white/64 @5xl:border-t-0 @5xl:px-6 @5xl:pb-4 @5xl:pt-0 @5xl:text-right">{note}</p>}
        </div>
      </div>
    </div>
  );
}

function SlideControls({
  slides,
  index,
  canAutoplay,
  paused,
  frozen,
  holding,
  onSelect,
  onAdvance,
  onTogglePause,
}: {
  slides: HeroSlide[];
  index: number;
  canAutoplay: boolean;
  paused: boolean;
  /** Isian bilah slide aktif dibekukan di tengah (dijeda saat slide ini sedang berjalan) */
  frozen: boolean;
  holding: boolean;
  onSelect: (i: number) => void;
  onAdvance: () => void;
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
  return (
    <div
      role="group"
      aria-label="Kontrol slide"
      onKeyDown={onKeyDown}
      style={{ '--jm-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      // Di DOM sebelum teks (urutan fokus: menu → kontrol slide → tombol hero, pola carousel WAI-ARIA). Layar lebar: tepat
      // di bawah menu, seperti bilah "stories"; HP & tablet: di bawah teks (order-last), di atas pita angka.
      className="jm-hero-controls order-last mt-8 flex items-end gap-4 @5xl:order-none @5xl:mb-10 @5xl:mt-0 @5xl:grid @5xl:grid-cols-12 @5xl:gap-6"
    >
      <ol className="flex min-w-0 flex-1 gap-2 @3xl:gap-3 @5xl:col-span-8">
        {slides.map((s, i) => {
          const current = i === index;
          const state = i < index ? 'done' : current ? 'active' : 'todo';
          return (
            <li key={i} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Slide ${i + 1} dari ${count}: ${slideName(s)}`}
                aria-current={current ? 'true' : undefined}
                className={`flex min-h-11 w-full min-w-0 flex-col justify-end gap-2 pb-1 text-left transition-colors duration-200 ${current ? 'text-white' : 'text-white/70 hover:text-white'}`}
              >
                <span aria-hidden className="flex min-w-0 items-baseline gap-2 text-[12px] font-semibold tabular-nums">
                  <span>{pad(i + 1)}</span>
                  <span className="hidden min-w-0 truncate text-[12.5px] font-medium @6xl:block">{slideName(s)}</span>
                </span>
                <span aria-hidden className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                  {/* Saat isian slide aktif selesai (berganti otomatis), slide berikutnya tampil; membeku di tempat bila
                      dijeda saat slide ini berjalan, disorot, difokus, atau tab tersembunyi. Slide yang dicapai saat
                      dijeda (pilih manual, geser, atau berhenti sendiri) tidak beranimasi: bilahnya penuh statis. */}
                  <span
                    data-state={state}
                    data-auto={canAutoplay && (!paused || (current && frozen)) ? 'true' : 'false'}
                    data-run={paused ? 'false' : 'true'}
                    data-hold={holding ? 'true' : 'false'}
                    onAnimationEnd={current ? onAdvance : undefined}
                    className="jm-seg-fill absolute inset-0 rounded-full bg-white"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex shrink-0 items-center gap-2 @5xl:col-span-4 @5xl:justify-end">
        <button type="button" onClick={() => onSelect(index - 1)} aria-label="Slide sebelumnya" className={ROUND_BUTTON}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => onSelect(index + 1)} aria-label="Slide berikutnya" className={ROUND_BUTTON}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        {canAutoplay && (
          <button type="button" onClick={onTogglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={ROUND_BUTTON}>
            {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Hero({ m }: { m: JumantaraModel }) {
  const { hero } = m;
  const slides = heroSlides(hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [changed, setChanged] = useState(false);
  const [paused, setPaused] = useState(false);
  // Slide yang isian bilahnya dibekukan di tengah oleh tombol jeda (null = tidak ada; slide lain saat dijeda → penuh statis)
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [rounds, setRounds] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  // Foto slide lain dimuat sesudah halaman tampil (foto pertama = LCP), atau segera saat slide dipilih
  const [warm, setWarm] = useState(false);
  const hiddenTab = useDocumentHidden();
  // Hero digulir keluar layar → bilah ditahan, agar dua putaran tidak habis tanpa dilihat
  const photoArea = useRef<HTMLDivElement>(null);
  const inView = useInView(photoArea, 0.3);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const motion = useMotionEnabled();
  const index = Math.min(active, count - 1);
  const canAutoplay = motion && count > 1;
  const autoplay = canAutoplay && !paused;
  const holding = hovering || focused || hiddenTab || !inView;
  const stats = list(hero, 'stats', 4).filter((item) => field(item, 'value') || field(item, 'label'));
  const note = text(hero, 'stats_note');

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setWarm(true), 1800);
    return () => window.clearTimeout(timer);
  }, [count]);

  const go = (i: number) => {
    const next = wrapIndex(i, count);
    setWarm(true);
    if (next === index) return;
    setChanged(true);
    setActive(next);
    setFrozenAt(null);
  };

  // Isian bilah slide aktif selesai: ke slide berikutnya; setelah dua putaran penuh berhenti di slide pertama
  const advance = () => {
    if (index === count - 1) {
      const done = rounds + 1;
      setRounds(done);
      if (done >= AUTOPLAY_ROUNDS) setPaused(true);
    }
    go(index + 1);
  };

  const togglePause = () => {
    if (paused) setRounds(0);
    setFrozenAt(paused ? null : index);
    setPaused(!paused);
  };

  const textBlock = (s: HeroSlide, live: boolean) => (
    <>
      {s.eyebrow && (
        // Ubin gelap bening (kobalt-hitam 60%, di atas lapisan gelap foto): teks putih kecil tetap ≥ 7:1 walau fotonya terang
        <p className="jm-rise inline-flex h-8 max-w-full items-center gap-2 rounded-[8px] border border-white/20 bg-[color-mix(in_srgb,var(--jm-night)_60%,transparent)] px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-(--jm-bright)" />
          <span className="truncate">{s.eyebrow}</span>
        </p>
      )}
      {live ? (
        <h1 style={{ '--jm-delay': '70ms' } as CSSProperties} className={`jm-rise ${s.eyebrow ? 'mt-6' : ''} ${TITLE_WIDTH} text-balance text-white ${TYPE_J.h1}`}>
          {s.title}
        </h1>
      ) : (
        <p className={`${s.eyebrow ? 'mt-6' : ''} ${TITLE_WIDTH} text-balance ${TYPE_J.h1}`}>{s.title}</p>
      )}
      {s.subtitle && (
        <p style={{ '--jm-delay': '140ms' } as CSSProperties} className={`jm-rise mt-5 line-clamp-4 max-w-[52ch] text-pretty text-white/85 @3xl:line-clamp-none ${TYPE_J.lead}`}>
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
      data-hero-layout="stories"
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
      className="relative isolate grid bg-(--jm-night) text-white"
    >
      {/* Foto selebar layar: di layar lebar ikut di belakang pita angka (baris 2), di HP berhenti di atasnya */}
      <div ref={photoArea} className={`relative col-start-1 row-start-1 overflow-hidden ${stats.length > 0 ? '@5xl:row-end-3' : ''} ${hasImage(slides[0].image) ? '' : 'jm-hero-fallback'}`}>
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-active={i === index ? 'true' : 'false'}
              aria-hidden={i === index ? undefined : true}
              className={`jm-slide absolute inset-0 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? JUMANTARA_PHOTOS.alt(s.image, `Suasana kegiatan di ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                // Lebar gambar yang benar-benar tampil: di HP/tablet foto 16:9 menutupi wadah tegak (± 1.170px CSS
                // pada tinggi 660px), bukan selebar layar
                sizes="(max-width: 1023px) 1200px, 100vw"
                position={POSITIONS[i] ?? '50% 45%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="jm-hero-scrim absolute inset-0" />
      </div>

      <div
        // Jarak atas = bilah menu + ruang napas, agar chip & judul (HP) atau bilah progres (layar lebar) tidak pernah
        // tertimpa menu
        className={`${CONTAINER} relative col-start-1 row-start-1 flex min-h-[max(560px,min(80svh,660px))] flex-col pb-6 pt-[104px] @3xl:min-h-[620px] @3xl:pt-[120px] @5xl:min-h-[max(520px,min(70svh,690px))] @5xl:pb-7 @5xl:pt-[128px]`}
      >
        {count > 1 && (
          <SlideControls
            slides={slides}
            index={index}
            canAutoplay={canAutoplay}
            paused={paused}
            frozen={frozenAt === index}
            holding={holding}
            onSelect={go}
            onAdvance={advance}
            onTogglePause={togglePause}
          />
        )}

        <div className="flex flex-1 flex-col justify-end @5xl:justify-center">
          <div className="grid @5xl:grid-cols-12">
            <div className="min-w-0 @5xl:col-span-8 @6xl:col-span-7">
              {/* Teks semua slide ditumpuk di satu sel grid: tinggi = teks terpanjang, isi di bawahnya tidak bergeser
                  saat slide berganti. Teks rata bawah, jadi ruang sisa slide yang lebih pendek ada di atas chip (tombol
                  tetap rapat dengan deskripsi). Teks slide lain tersembunyi dari pembaca layar dan bukan <h1>. Sel
                  min-w-0: label chip yang panjang terpotong (…), tidak melebarkan kolom & halaman di HP. */}
              <div className="grid">
                {slides.map((s, i) =>
                  i === index ? (
                    <div key={`aktif-${i}`} data-enter={changed ? 'true' : 'false'} className="col-start-1 row-start-1 min-w-0 self-end">
                      {textBlock(s, true)}
                    </div>
                  ) : (
                    <div key={`bayangan-${i}`} aria-hidden className="invisible col-start-1 row-start-1 min-w-0 self-end">
                      {textBlock(s, false)}
                    </div>
                  ),
                )}
              </div>
              {count > 1 && (
                // Wilayah live tetap: slide yang dipilih manual diumumkan (polite) saat tidak berganti otomatis; saat
                // berganti otomatis diam (off).
                <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true" data-jm-slide-status="">
                  {`Slide ${index + 1} dari ${count}: ${slides[index].title}`}
                </p>
              )}
              {(primaryLabel || secondaryLabel) && (
                <div className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:items-center">
                  {primaryLabel && (
                    <ActionLink action={m.primaryAction} className={`group ${BTN.primary} ${BTN.lg}`}>
                      <span className="truncate">{primaryLabel}</span>
                      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </ActionLink>
                  )}
                  {secondaryLabel && (
                    <ActionLink action={m.secondaryAction} className={`${BTN.ghostLight} ${BTN.lg}`}>
                      <span className="truncate">{secondaryLabel}</span>
                    </ActionLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {stats.length > 0 && <HeroStats items={stats} note={note} />}
    </TemplateSection>
  );
}
