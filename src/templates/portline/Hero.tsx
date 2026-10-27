// Hero Portline — "Harbor" (data-hero-layout="harbor"): SLIDER foto selebar layar sampai tepi atas, header dua lapis
// transparan di atasnya (./Header). Lapisan navy dari kiri; kiri: judul KAPITAL 2–3 baris, deskripsi, tautan
// "About Quaymoor >"; kanan: INDEKS VERTIKAL bernomor 01 / 02 / 03 dengan garis yang berjalan (klik untuk ganti slide,
// berganti otomatis pelan di semua lebar, berhenti saat disorot/difokus/dijeda dan bila gerak mati); lingkaran radar
// konsentris tipis di sekitar objek foto. Di bawah, masih di dalam hero dan dipisah garis tipis: deret logo perusahaan
// grup putih satu warna + label layanan di kanan. HP: foto 4:5 dengan judul di atasnya, indeks jadi angka mendatar, logo jadi Marquee.
// Foto slide 1 = LCP (eager + fetchpriority high) dan TIDAK dianimasikan masuk; zoom & teks naik hanya setelah
// pergantian. Foto slide lain lazy dan baru dipasang sesudah halaman tampil.
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Marquee } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { CompanyGlyph } from './marks';
import { glyphIndex, heroSlides, wrapIndex, type HeroSlide, type PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { TYPE_P } from './styles';
import { TextLink } from './ui';

/** Lama satu slide saat berganti otomatis (garis indeks; CSS .pl-progress-*). */
const AUTOPLAY_MS = 7000;
const pad = (n: number) => String(n).padStart(2, '0');
/** Posisi fokus foto per slide demo (wadah HP tegak memotong kiri-kanan): objek utama di kanan-tengah */
const POSITIONS = ['62% 50%', '72% 40%', '62% 45%', '60% 50%'];
/** Pusat lingkaran radar (persen lebar/tinggi hero) per slide: di sekitar kapal / derek pada foto demo */
const RADAR = [
  [63, 50],
  [72, 34],
  [66, 44],
  [66, 48],
] as const;

interface Zoom {
  i: number;
  tag: 'a' | 'b';
}

/** Lingkaran radar konsentris (dekoratif). */
function Radar({ at }: { at: readonly [number, number] }) {
  const rings = [
    [170, 0],
    [320, 1.2],
    [500, 2.4],
    [700, 3.6],
  ] as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] hidden overflow-hidden @3xl:block">
      {rings.map(([size, delay]) => (
        <span
          key={size}
          className="pl-ring absolute"
          style={
            {
              left: `${at[0]}%`,
              top: `${at[1]}%`,
              width: size,
              height: size,
              transform: 'translate(-50%, -50%)',
              '--pl-ring-delay': `${delay}s`,
            } as CSSProperties
          }
        />
      ))}
      {/* Titik pusat + garis bidik tipis */}
      <span className="absolute h-2 w-2 rounded-full bg-white/80" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%, -50%)' }} />
      <span className="absolute h-px w-[760px] bg-linear-to-r from-transparent via-white/25 to-transparent" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%, -50%)' }} />
      <span className="absolute h-[760px] w-px bg-linear-to-b from-transparent via-white/25 to-transparent" style={{ left: `${at[0]}%`, top: `${at[1]}%`, transform: 'translate(-50%, -50%)' }} />
    </div>
  );
}

/** Deret logo perusahaan grup: logo unggahan (putih satu warna) atau simbol bawaan + nama. */
function Companies({ m, motion }: { m: PortlineModel; motion: boolean }) {
  const items = list(m.hero, 'companies', 6).filter((item) => field(item, 'name') || hasImage(field(item, 'logo')));
  if (items.length === 0) return null;
  /** `wrap`: daftar statis (gerak mati, pratinjau CMS) boleh membungkus nama panjang; Marquee tetap satu baris. */
  const lockups = (wrap: boolean) =>
    items.map((item, i) => {
      const name = field(item, 'name');
      const logo = safeImage(field(item, 'logo'));
      // Simbol + nama sebagai lockup dua baris: kata pertama kecil di atas (mis. "QUAYMOOR"), sisanya di bawah
      const [first, ...rest] = name.split(/\s+/);
      return logo ? (
        <img key={`${name}-${i}`} src={logo} alt={name} loading="lazy" decoding="async" className="h-8 w-auto max-w-[160px] object-contain brightness-0 invert" />
      ) : (
        <span key={`${name}-${i}`} className={`inline-flex items-center gap-2.5 text-white ${wrap ? 'min-w-0 max-w-full' : ''}`}>
          <CompanyGlyph index={glyphIndex(name, i)} className="h-7 w-7 shrink-0" />
          <span className={`flex min-w-0 flex-col uppercase leading-none ${wrap ? '[overflow-wrap:anywhere]' : 'whitespace-nowrap'}`}>
            {rest.length > 0 && <span className="text-[10px] font-semibold tracking-[0.24em] text-white/80">{first}</span>}
            <span className={`${rest.length > 0 ? 'mt-1' : ''} font-[family-name:var(--tpl-font-display)] text-[15px] font-bold tracking-[0.06em] ${wrap ? 'leading-[1.1]' : ''}`}>
              {rest.length > 0 ? rest.join(' ') : first}
            </span>
          </span>
        </span>
      );
    });
  const logos = lockups(false);
  return (
    <div className="min-w-0 flex-1">
      {/* HP & tablet: strip berjalan (gerak mati → daftar statis yang membungkus) */}
      <div className="@6xl:hidden">
        {motion ? (
          <Marquee label={m.ui.groupCompanies} duration={36} gap={40}>
            {logos}
          </Marquee>
        ) : (
          // HP sempit: satu kolom (nama panjang tidak menabrak kolom sebelah); @md: dua kolom; @xl: membungkus mendatar
          <ul aria-label={m.ui.groupCompanies} className="grid grid-cols-1 items-center gap-x-6 gap-y-4 @md:grid-cols-2 @md:gap-y-5 @xl:flex @xl:flex-wrap @xl:gap-x-10">
            {lockups(true).map((logo, i) => (
              <li key={i} className="min-w-0">
                {logo}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul aria-label={m.ui.groupCompanies} className="hidden flex-wrap items-center gap-x-9 gap-y-4 @6xl:flex @7xl:gap-x-12">
        {logos.map((logo, i) => (
          <li key={i} className="opacity-90 transition-opacity duration-300 hover:opacity-100">
            {logo}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SlideIndex({
  m,
  slides,
  index,
  autoplay,
  holding,
  canAutoplay,
  paused,
  onSelect,
  onTogglePause,
}: {
  m: PortlineModel;
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
    const next = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1 } as Record<string, number>;
    if (!(e.key in next)) return;
    e.preventDefault();
    onSelect(next[e.key]);
  };
  const progress = (vertical: boolean) => (
    // Garis berjalan: saat animasinya selesai, slide berikutnya tampil (berhenti bila dijeda, disorot, difokus, gerak
    // mati, atau tab di latar karena animasi CSS ikut berhenti)
    <span
      key={`${index}-${vertical ? 'y' : 'x'}`}
      data-run={autoplay ? 'true' : 'false'}
      data-hold={holding ? 'true' : 'false'}
      // Hanya garis yang tampil yang beranimasi (yang lain display:none), jadi tepat satu garis memicu slide berikutnya:
      // mendatar di bawah @6xl (HP, tablet, laptop kecil), tegak di layar lebar
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onSelect(index + 1);
      }}
      className={`absolute inset-0 bg-white ${vertical ? 'pl-progress-y' : 'pl-progress-x'}`}
    />
  );
  return (
    <div
      role="group"
      aria-label={m.ui.slideControls}
      onKeyDown={onKeyDown}
      style={{ '--pl-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="flex items-center gap-3 @6xl:flex-col @6xl:items-end @6xl:gap-5"
    >
      <ol className="flex items-center gap-1 @6xl:flex-col @6xl:items-end @6xl:gap-1">
        {slides.map((s, i) => {
          const current = i === index;
          return (
            <li key={i} className="flex items-center @6xl:items-stretch">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={s.label ? `${m.ui.slide(i + 1, count)}: ${s.label}` : m.ui.slide(i + 1, count)}
                aria-current={current ? 'true' : undefined}
                className={`group flex min-h-11 min-w-11 items-center gap-3 px-1 transition-colors duration-300 @6xl:flex-row-reverse @6xl:gap-4 ${current ? 'text-white' : 'text-white/80 hover:text-white'}`}
              >
                {/* Garis indeks: mendatar di HP, tegak di layar lebar (berjalan pada slide aktif) */}
                <span aria-hidden className={`relative block overflow-hidden bg-white/30 @6xl:hidden ${current ? 'h-[2px] w-10' : 'h-px w-5'}`}>
                  {current && progress(false)}
                </span>
                <span aria-hidden className={`relative hidden w-[2px] overflow-hidden bg-white/30 @6xl:block ${current ? 'h-16' : 'h-8'}`}>
                  {current && progress(true)}
                </span>
                <span aria-hidden className={`font-[family-name:var(--tpl-font-display)] font-bold tabular-nums transition-[font-size] duration-300 ${current ? 'text-[22px] @6xl:text-[40px]' : 'text-[14px] @6xl:text-[18px]'} leading-none`}>
                  {pad(i + 1)}
                </span>
                {current && s.label && (
                  <span aria-hidden className="hidden max-w-[150px] truncate text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white @6xl:block">
                    {s.label}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {canAutoplay && (
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? m.ui.playSlides : m.ui.pauseSlides}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ring-1 ring-inset ring-white/35 transition-colors duration-300 hover:bg-white/15"
        >
          {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
        </button>
      )}
    </div>
  );
}

export function Hero({ m }: { m: PortlineModel }) {
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
  const slide = slides[index];

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

  /** Teks semua slide ditumpuk di satu sel grid: tinggi = teks terpanjang, jadi isi di bawahnya tidak bergeser saat
   *  slide berganti. Teks slide lain tersembunyi dari pembaca layar, kecuali H1 (`keepFirst`). */
  const stack = (render: (s: HeroSlide, live: boolean, i: number) => ReactNode, className = '', keepFirst = false) => (
    <div className={`grid ${className}`}>
      {slides.map((s, i) =>
        i === index ? (
          <div key={`aktif-${i}`} data-enter={changed ? 'true' : 'false'} className="col-start-1 row-start-1">
            {render(s, true, i)}
          </div>
        ) : keepFirst && i === 0 ? (
          // H1 halaman TETAP judul slide 1 (tidak berganti tiap slide): saat slide lain tampil, H1 hanya disembunyikan
          // secara visual dan tetap terbaca pembaca layar & mesin pencari
          <div key={`bayangan-${i}`} className="pointer-events-none col-start-1 row-start-1 opacity-0">
            {render(s, false, i)}
          </div>
        ) : (
          <div key={`bayangan-${i}`} aria-hidden className="invisible col-start-1 row-start-1">
            {render(s, false, i)}
          </div>
        ),
      )}
    </div>
  );
  const titleOf = (s: HeroSlide, live: boolean, i: number) =>
    i === 0 ? (
      <h1 className={`${live ? 'pl-rise' : ''} max-w-[15ch] text-balance text-white @6xl:max-w-[16ch] ${TYPE_P.h1}`}>{s.title}</h1>
    ) : (
      <p className={`${live ? 'pl-rise text-white' : ''} max-w-[15ch] text-balance @6xl:max-w-[16ch] ${TYPE_P.h1}`}>{s.title}</p>
    );
  const leadOf = (s: HeroSlide) =>
    s.subtitle ? (
      <p style={{ '--pl-delay': '120ms' } as CSSProperties} className={`pl-rise max-w-[52ch] text-pretty text-white/90 ${TYPE_P.lead}`}>
        {s.subtitle}
      </p>
    ) : null;
  const hasLead = slides.some((s) => s.subtitle);
  const linkLabel = m.heroLink ? text(hero, 'link_label') : '';

  const serviceLabel = text(hero, 'service_label');

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="harbor"
      data-tpl-tone="inverse"
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? m.companyName : undefined}
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
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
      className="bg-(--pl-deep)"
    >
      {/* Area foto: selebar layar sampai tepi atas; HP 4:5 (judul di atas foto), layar lebar setinggi layar */}
      <div className={`relative isolate overflow-hidden text-white ${hasImage(slides[0].image) ? 'bg-(--pl-deep)' : 'pl-hero-fallback'}`}>
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-zoom={tagOf(i)}
              aria-hidden={i === index ? undefined : true}
              className={`pl-slide absolute inset-0 -z-20 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? PORTLINE_PHOTOS.alt(s.image, `${s.label || m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                sizes="100vw"
                position={POSITIONS[i] ?? '60% 50%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="pl-hero-scrim absolute inset-0 -z-10" />
        <Radar at={RADAR[index] ?? RADAR[0]} />
        {/* Kisi titik dekoratif di kanan atas (gaya peta laut) */}
        <div aria-hidden className="pl-dots pointer-events-none absolute right-[4%] top-[150px] -z-[4] hidden h-24 w-32 text-white/35 @6xl:block" />

        <div
          // Jarak atas = header (HP 64px; layar lebar bilah utilitas + menu ± 112px) + ruang napas. HP: area foto ± 4:5
          // dengan judul di atas foto; deskripsi & tautan pindah ke bawah foto agar tetap terbaca.
          className={`${CONTAINER} relative flex min-h-[min(125cqw,620px)] flex-col justify-end pb-6 pt-[100px] @3xl:min-h-[640px] @3xl:pb-10 @3xl:pt-[140px] @6xl:min-h-[max(640px,min(calc(100svh-var(--tpl-sticky-top,0px)-112px),860px))] @6xl:justify-center @6xl:pb-16 @6xl:pt-[176px]`}
        >
          <div className="grid gap-6 @3xl:gap-8 @6xl:grid-cols-12 @6xl:items-center">
            <div className="min-w-0 @6xl:col-span-8 @7xl:col-span-7">
              {stack(titleOf, '', true)}
              {hasLead && stack(leadOf, 'mt-6 hidden @3xl:grid')}
              {count > 1 && (
                <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true">
                  {`${m.ui.slide(index + 1, count)}: ${slide.title}`}
                </p>
              )}
              {linkLabel && (
                <div className="mt-8 hidden @3xl:block">
                  <TextLink action={m.heroLink} label={linkLabel} tone="dark" />
                </div>
              )}
            </div>
            {count > 1 && (
              <div className="min-w-0 @6xl:col-span-4 @6xl:justify-self-end @7xl:col-span-5">
                <SlideIndex
                  m={m}
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
      </div>

      {/* HP: deskripsi & tautan di bawah foto (layar lebar: di atas foto) */}
      {(hasLead || linkLabel) && (
        <div className={`${CONTAINER} pb-8 pt-6 text-white @3xl:hidden`}>
          {hasLead && stack(leadOf)}
          {linkLabel && (
            <div className="mt-5">
              <TextLink action={m.heroLink} label={linkLabel} tone="dark" />
            </div>
          )}
        </div>
      )}

      {/* Deret perusahaan grup + label layanan: masih di dalam hero, dipisah garis tipis */}
      {(list(hero, 'companies', 6).length > 0 || serviceLabel) && (
        <div className="bg-(--pl-deep) text-white">
          <div className={CONTAINER}>
            <div className="flex flex-col gap-5 border-t border-white/15 py-6 @6xl:flex-row @6xl:items-center @6xl:gap-10 @6xl:py-7">
              <Companies m={m} motion={motion} />
              {serviceLabel &&
                (m.serviceAction ? (
                  <ActionLink
                    action={m.serviceAction}
                    className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-[12.5px] font-semibold uppercase tracking-[0.12em] text-(--pl-bright) @6xl:self-center"
                  >
                    <span className="underline decoration-current/40 underline-offset-[6px] group-hover:decoration-current">{serviceLabel}</span>
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </ActionLink>
                ) : (
                  <p className="shrink-0 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-(--pl-bright)">{serviceLabel}</p>
                ))}
            </div>
          </div>
        </div>
      )}
    </TemplateSection>
  );
}
