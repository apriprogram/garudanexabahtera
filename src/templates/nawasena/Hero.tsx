// Hero Nawasena — "Ken Burns" (data-hero-layout="kenburns"): SLIDER foto latar selebar layar setinggi layar (min.
// 640px) di bawah lapisan navy (./nawasena.css .nw-hero-scrim), header transparan menumpang di atasnya. Judul serif besar,
// deskripsi, dan dua tombol DI TENGAH; teks slide berganti, tombol tetap. Di tepi kanan: rel nomor slide tegak "01 02 03
// 04" dengan garis progres tipis + tombol sebelumnya/berikutnya/jeda persegi; di HP rel itu menjadi baris di bawah tengah.
// Foto aktif membesar pelan 1 → 1,06 (Ken Burns), pergantian memudar 1 detik. Langsung di bawah foto: strip pengumuman
// (label + <Marquee> 5 pengumuman terbaru + jeda + "Lihat semua").
// Mekanisme & aksesibilitas sama dengan bestari/Hero.tsx (disalin, tidak diimpor): berganti otomatis hanya bila gerak
// menyala (bukan pratinjau CMS / prefers-reduced-motion) dan > 1 slide; berhenti saat hero disorot atau difokus, saat
// hero di luar layar, dengan tombol jeda, dan di tab latar (animasi CSS berhenti); berhenti sendiri di slide 1 setelah
// dua putaran (WCAG 2.2.2); panah kiri/kanan/atas/bawah di rel; geser di HP; wilayah live sopan saat tidak berganti
// otomatis. Foto slide 1 = LCP (eager + fetchpriority high), TIDAK dianimasikan masuk: zoom dan
// teks naik hanya untuk slide yang tampil setelah pergantian. Foto slide lain lazy dan baru dipasang sesudah halaman tampil.
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Megaphone, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Marquee } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { useSitePosts } from '../shared/posts/hooks';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { hasImage, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useInView } from './hooks';
import { heroSlides, tickerItems, wrapIndex, type HeroSlide, type NawasenaModel, type TickerItem } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { SQUARE, TYPE_N } from './styles';
import { ButtonLink, TextLink } from './ui';

/** Lama satu slide saat berganti otomatis (garis progres; CSS .nw-progress). */
const AUTOPLAY_MS = 7000;
/** Putaran penuh sebelum slider berhenti sendiri (WCAG 2.2.2). */
const MAX_CYCLES = 2;
/** Foto slide lain dipasang setelah jeda ini (foto pertama = LCP). */
const WARM_MS = 1800;
const pad = (n: number) => String(n).padStart(2, '0');
/** Posisi fokus foto per slide demo (wadah HP tegak memotong kiri-kanan) */
const POSITIONS = ['50% 40%', '20% 45%', '52% 40%', '50% 35%'];

/** Zoom Ken Burns per slide: `tag` bergantian "a"/"b" agar animasi diputar ulang setiap slide itu tampil lagi. */
interface Zoom {
  i: number;
  tag: 'a' | 'b';
}

function SlideRail({
  slides,
  index,
  autoplay,
  holding,
  canAutoplay,
  paused,
  onSelect,
  onAdvance,
  onTogglePause,
}: {
  slides: HeroSlide[];
  index: number;
  autoplay: boolean;
  holding: boolean;
  canAutoplay: boolean;
  paused: boolean;
  onSelect: (i: number) => void;
  /** Garis progres penuh (berganti otomatis; dihitung putarannya, beda dengan pilihan manual) */
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
      style={{ '--nw-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      // HP: baris di bawah tengah [‹] 01 02 03 04 [›] [❚❚]; layar lebar: rel tegak di tepi kanan (sejajar CONTAINER)
      className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 @3xl:bottom-auto @3xl:left-auto @3xl:right-8 @3xl:top-1/2 @3xl:-translate-y-1/2 @3xl:translate-x-0 @3xl:flex-col @3xl:gap-2 @5xl:right-[max(3rem,calc((100%-1680px)/2+3rem))] @min-[96rem]:right-[max(4rem,calc((100%-1680px)/2+4rem))]"
    >
      <button type="button" onClick={() => onSelect(index - 1)} aria-label="Slide sebelumnya" className={SQUARE.dark}>
        <ChevronLeft className="h-5 w-5 @3xl:hidden" aria-hidden />
        <ChevronUp className="hidden h-5 w-5 @3xl:block" aria-hidden />
      </button>
      <ol className="flex items-center @3xl:flex-col @3xl:items-start @3xl:gap-1 @3xl:py-1">
        {slides.map((s, i) => {
          const current = i === index;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Slide ${i + 1} dari ${count}: ${s.title}`}
                aria-current={current ? 'true' : undefined}
                className={`flex h-11 w-11 flex-col items-center justify-center gap-1.5 font-mono text-[13px] font-medium tabular-nums transition-colors duration-300 @3xl:w-auto @3xl:flex-row @3xl:justify-start @3xl:gap-3 @3xl:pr-1 ${
                  // Nomor tidak aktif putih 90% (≥ 4,5:1 di atas piksel foto terang di tepi kanan, lihat .nw-hero-scrim)
                  current ? 'font-semibold text-white' : 'text-white/90 hover:text-white'
                }`}
              >
                <span aria-hidden>{pad(i + 1)}</span>
                {/* Jalur progres: HP mendatar 24px di bawah nomor aktif; layar lebar tegak 36px di kiri setiap nomor */}
                <span
                  aria-hidden
                  className={`relative block h-[2px] w-6 overflow-hidden bg-white/25 @3xl:order-first @3xl:h-9 @3xl:w-[2px] ${current ? '' : 'invisible @3xl:visible'}`}
                >
                  {current && (
                    // Saat animasinya selesai, slide berikutnya tampil (berhenti bila dijeda, disorot, difokus, hero di luar
                    // layar, gerak mati, atau tab di latar karena animasi CSS ikut berhenti)
                    <span
                      key={index}
                      data-run={autoplay ? 'true' : 'false'}
                      data-hold={holding ? 'true' : 'false'}
                      onAnimationEnd={onAdvance}
                      className="nw-progress absolute inset-0 bg-white"
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => onSelect(index + 1)} aria-label="Slide berikutnya" className={SQUARE.dark}>
        <ChevronRight className="h-5 w-5 @3xl:hidden" aria-hidden />
        <ChevronDown className="hidden h-5 w-5 @3xl:block" aria-hidden />
      </button>
      {canAutoplay && (
        <button type="button" onClick={onTogglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={`${SQUARE.dark} @3xl:mt-2`}>
          {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
        </button>
      )}
    </div>
  );
}

/** Satu pengumuman di strip: "23 Okt 2026 · Judul" (tulisan → tautan ke halaman pengumuman). Strip sempit (HP): tanggal
 *  disembunyikan agar judul yang terbaca lebih panjang. */
function TickerEntry({ item, diamond = false }: { item: TickerItem; diamond?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[14px] text-white/[0.86] @xl:gap-3">
      {diamond && <span aria-hidden className="h-1 w-1 shrink-0 rotate-45 bg-(--nw-bright)" />}
      {item.date && <span className="hidden shrink-0 font-mono text-[12.5px] text-white/[0.72] @xl:inline">{item.date}</span>}
      {item.date && (
        <span aria-hidden className="hidden text-white/[0.72] @xl:inline">
          ·
        </span>
      )}
      {item.path ? (
        <SiteLink path={item.path} className="truncate underline-offset-4 hover:text-white hover:underline">
          {item.title}
        </SiteLink>
      ) : (
        <span className="truncate">{item.title}</span>
      )}
    </span>
  );
}

/**
 * Strip pengumuman di bawah foto hero: label warna tema, maks. 5 pengumuman terbaru berjalan pelan (satu-satunya gerak
 * tanpa henti; berhenti saat disorot/difokus atau dijeda), "Lihat semua". Gerak mati / dijeda → satu baris pengumuman
 * terbaru. Tidak dirender bila label kosong, section Pengumuman tersembunyi, atau belum ada pengumuman.
 */
function Ticker({ m }: { m: NawasenaModel }) {
  const motion = useMotionEnabled();
  const posts = useSitePosts('pengumuman');
  const [paused, setPaused] = useState(false);
  const label = text(m.hero, 'ticker_label');
  const linkLabel = text(m.hero, 'ticker_link_label');
  const items = tickerItems(m.items('announcements'));
  if (!label || !m.shown('announcements') || items.length === 0) return null;
  const all: LinkAction = posts ? { kind: 'site', path: '/pengumuman' } : { kind: 'section', target: 'announcements' };
  const running = motion && !paused && items.length > 1;
  return (
    <div className="h-[52px] border-t border-white/10 bg-(--nw-navy)">
      {/* Layar lebar: strip ini tepat di tepi bawah layar pertama, jadi ujung kanannya diberi ruang 96px untuk tombol
          WhatsApp melayang Shell (56px, 32px dari tepi) agar "Lihat semua" tidak tertutup */}
      <div className="mx-auto flex h-full w-full max-w-[1680px] items-center gap-3 px-5 @2xl:px-8 @3xl:gap-5 @3xl:pr-24 @5xl:pl-12 @min-[96rem]:pl-16">
        <p
          data-tpl-tone={m.accentTone}
          className="inline-flex h-7 shrink-0 items-center gap-2 rounded-[4px] bg-(--tpl-accent) px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--tpl-on-accent) @xl:px-2.5"
        >
          <Megaphone aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only @xl:not-sr-only">{label}</span>
        </p>
        {/* Tepi strip berjalan memudar 28px, jadi teks tidak terpotong tajam di samping label */}
        <div className={`min-w-0 flex-1 ${running ? '[mask-image:linear-gradient(90deg,transparent,#000_28px,#000_calc(100%-28px),transparent)]' : ''}`}>
          {running ? (
            <Marquee label="Pengumuman terbaru" duration={Math.max(40, 12 * items.length)} gap={48} staticClassName="flex">
              {items.map((item, i) => (
                <TickerEntry key={`${item.title}-${i}`} item={item} diamond />
              ))}
            </Marquee>
          ) : (
            <p className="flex min-w-0">
              <TickerEntry item={items[0]} />
            </p>
          )}
        </div>
        {motion && items.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Putar pengumuman berjalan' : 'Jeda pengumuman berjalan'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-white/[0.86] transition-colors duration-300 hover:bg-white/10 hover:text-white"
          >
            {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
          </button>
        )}
        {linkLabel && (
          <span className="hidden shrink-0 @3xl:block">
            <TextLink action={all} label={linkLabel} tone="navy" ariaLabel={`${linkLabel} pengumuman`} />
          </span>
        )}
        <ActionLink
          action={all}
          aria-label={linkLabel ? `${linkLabel} pengumuman` : 'Lihat semua pengumuman'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-white ring-1 ring-inset ring-white/25 @3xl:hidden"
        >
          <ArrowRight aria-hidden className="h-4 w-4" />
        </ActionLink>
      </div>
    </div>
  );
}

export function Hero({ m }: { m: NawasenaModel }) {
  const { hero } = m;
  const slides = heroSlides(hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ active: Zoom | null; prev: Zoom | null }>({ active: null, prev: null });
  const [paused, setPaused] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  // Foto slide lain dimuat sesudah halaman tampil (foto pertama = LCP), atau segera saat slide dipilih
  const [warm, setWarm] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const motion = useMotionEnabled();
  // Hero di luar layar → berhenti (putaran tidak habis tanpa dilihat)
  const inView = useInView(stage, 0.3);
  const index = Math.min(active, count - 1);
  const canAutoplay = motion && count > 1;
  const autoplay = canAutoplay && !paused;
  const holding = hovering || focused || !inView;
  const changed = zoom.active !== null;

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setTimeout(() => setWarm(true), WARM_MS);
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

  /** Garis progres penuh → slide berikutnya; setelah MAX_CYCLES putaran kembali ke slide 1 lalu berhenti sendiri. */
  const advance = () => {
    if (wrapIndex(index + 1, count) === 0) {
      const done = cycles + 1;
      if (done >= MAX_CYCLES) {
        setPaused(true);
        setCycles(0);
      } else setCycles(done);
    }
    go(index + 1);
  };

  const togglePause = () => {
    setPaused((p) => !p);
    setCycles(0);
  };

  const textBlock = (s: HeroSlide, live: boolean) => (
    <>
      {s.eyebrow && (
        // Label kecil (12,5px) putih penuh: ≥ 4,5:1 juga di atas seragam terang pada foto slide
        <p className="nw-rise flex items-center justify-center gap-3 text-[12.5px] font-semibold uppercase leading-snug tracking-[0.18em] text-white">
          <span aria-hidden className="hidden h-px w-6 shrink-0 bg-white/50 @xl:block" />
          {/* Pemisah "·" tidak pernah membuka baris baru: spasi sebelum titik tengah tidak boleh putus */}
          <span className="min-w-0 text-balance">{s.eyebrow.replace(/ ([·|•–—]) /g, ' $1 ')}</span>
          <span aria-hidden className="hidden h-px w-6 shrink-0 bg-white/50 @xl:block" />
        </p>
      )}
      {live ? (
        <h1 style={{ '--nw-delay': '80ms' } as CSSProperties} className={`nw-rise mx-auto max-w-[19ch] text-balance text-white ${s.eyebrow ? 'mt-5 @3xl:mt-6' : ''} ${TYPE_N.h1}`}>
          {s.title}
        </h1>
      ) : (
        <p className={`mx-auto max-w-[19ch] text-balance ${s.eyebrow ? 'mt-5 @3xl:mt-6' : ''} ${TYPE_N.h1}`}>{s.title}</p>
      )}
      {s.subtitle && (
        <p style={{ '--nw-delay': '160ms' } as CSSProperties} className={`nw-rise mx-auto mt-5 max-w-[56ch] text-balance text-white/90 @3xl:mt-6 ${TYPE_N.lead}`}>
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
      data-hero-layout="kenburns"
      data-tpl-tone="inverse"
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? `Sorotan ${m.companyName}` : undefined}
      className="bg-(--nw-navy) text-white"
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
      {/* Panggung foto selebar layar sampai tepi atas; header transparan menumpang di atasnya */}
      <div ref={stage} className={`relative isolate overflow-hidden ${hasImage(slides[0].image) ? 'bg-(--nw-navy)' : 'nw-hero-fallback'}`}>
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-active={i === index ? 'true' : 'false'}
              data-zoom={tagOf(i)}
              // Dijeda / disorot / difokus → zoom Ken Burns ikut berhenti (bukan hanya garis progres)
              data-hold={paused || holding ? 'true' : 'false'}
              aria-hidden={i === index ? undefined : true}
              className={`nw-slide absolute inset-0 -z-20 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? NAWASENA_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                // Lebar gambar yang benar-benar tampil: di HP foto 16:9 menutupi wadah tegak 640px (± 1.140px CSS), di
                // tablet lebih lebar lagi, bukan selebar layar. Biaya: HP DPR ≥ 2 memuat file 1920 (± 110 KB) alih-alih
                // 800 (± 30 KB), juga untuk slide lain yang dimuat sesudahnya
                sizes="(max-width: 1023px) 1150px, 100vw"
                position={POSITIONS[i] ?? '50% 45%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="nw-hero-scrim absolute inset-0 -z-10" />

        <div
          // Jarak atas = tinggi header + 48px; bawah HP = ruang baris kontrol slide
          className={`${CONTAINER} relative flex min-h-[640px] flex-col items-center justify-center pt-[112px] text-center @3xl:min-h-[max(640px,min(calc(100svh-52px-var(--tpl-sticky-top,0px)),980px))] @3xl:px-24 @3xl:pb-20 @3xl:pt-[128px] @5xl:pt-[136px] ${
            count > 1 ? 'pb-[104px]' : 'pb-16'
          }`}
        >
          {/* Teks semua slide ditumpuk di satu sel grid: tinggi = teks terpanjang, jadi tombol tidak bergeser saat slide
              berganti. Teks slide lain tersembunyi dari pembaca layar dan bukan <h1>. Kunci aktif berganti agar animasi
              naik (.nw-rise, hanya setelah pergantian) diputar ulang; pengumuman pembaca layar ada di wilayah live
              terpisah yang tidak pernah dipasang ulang. */}
          <div className="grid w-full max-w-[920px]">
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
            // Wilayah live tetap: slide yang dipilih manual diumumkan (polite) saat tidak berganti otomatis; saat berganti
            // otomatis diam (off).
            <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true" data-nw-slide-status>
              {`Slide ${index + 1} dari ${count}: ${slides[index].title}`}
            </p>
          )}
          {(primaryLabel || secondaryLabel) && (
            <div className="mt-9 flex w-full max-w-[420px] flex-col items-stretch gap-3 @xl:w-auto @xl:max-w-none @xl:flex-row @xl:items-center @xl:justify-center">
              <ButtonLink action={m.primaryAction} label={primaryLabel} variant="primary" size="lg" />
              <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="outlineWhite" size="lg" />
            </div>
          )}
        </div>

        {count > 1 && (
          <SlideRail
            slides={slides}
            index={index}
            autoplay={autoplay}
            holding={holding}
            canAutoplay={canAutoplay}
            paused={paused}
            onSelect={go}
            onAdvance={advance}
            onTogglePause={togglePause}
          />
        )}
      </div>
      <Ticker m={m} />
    </TemplateSection>
  );
}
