// Hero Pradipta — "Thumbs" (data-hero-layout="thumbs"): SLIDER foto latar selebar layar (tepi ke tepi, sudut siku) tepat
// di bawah header putih. Teks TIDAK menumpang di foto: chip, judul, deskripsi, dan dua tombol ada di KARTU PUTIH di kiri
// bawah (radius 24, tanpa bayangan); teks slide ditumpuk di satu sel agar tinggi kartu tetap. Kanan bawah: penghitung
// "01 / 04", tombol sebelumnya/berikutnya/jeda, lalu deret THUMBNAIL foto berketerangan yang menjadi tombol slide; yang
// aktif bercincin putih dan bilah progresnya terisi selama 7 detik. Gradasi biru malam lembut hanya di sepertiga bawah
// foto (di bawah teks putih). HP/tablet: satu DOM yang sama — foto 6:5 di atas (cukup pendek agar judul dan tombol
// pertama masuk layar pertama HP), kartu putih menumpang 32px di tepi bawahnya, lalu tombol bernomor + bilah progres +
// tombol bulat langit.
// Mekanik & aksesibilitas mengikuti Bestari: berganti otomatis hanya bila gerak menyala (bukan pratinjau CMS /
// prefers-reduced-motion), berhenti saat hero disorot/difokus/dijeda, di luar layar, atau tab tersembunyi, BERHENTI SENDIRI setelah dua
// putaran (kembali ke slide 1, tombol putar tampil); panah keyboard di kontrol; geser di HP; wilayah live sopan untuk
// pergantian manual. Foto slide 1 = LCP (eager + fetchpriority high) dan TIDAK dianimasikan masuk; foto slide lain &
// thumbnail lazy dan baru dipasang sesudah foto slide 1 selesai dimuat. Foto berganti dengan pudar 800ms tanpa zoom.
import { ChevronLeft, ChevronRight, MapPin, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { hasImage } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useInView, usePageHidden } from './hooks';
import { heroSlides, pad2, wrapIndex, type HeroSlide, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { C, DISPLAY, TYPE_P } from './styles';
import { PillLink } from './ui';

/** Lama satu slide saat berganti otomatis (bilah progres; CSS .pd-progress). */
const AUTOPLAY_MS = 7000;
/** Putaran penuh sebelum slider berhenti sendiri (WCAG 2.2.2). */
const MAX_CYCLES = 2;
/**
 * Posisi fokus foto per slide demo. HP 6:5 hanya memperlihatkan ±68% lebar foto 16:9: slide 1 digeser ke guru & murid
 * (x 30–75% foto), slide 4 ke pemain voli yang melompat (x 50–75%); layar lebar memakai lebar penuh foto (kartu putih
 * menutup ±45% kiri bawah, jadi subjek foto demo ada di separuh kanan).
 */
const POSITIONS = ['54% 40%', '54% 45%', '50% 30%', '73% 30%'];

/** Kelas tombol kontrol: bulat langit di bawah kartu (HP), kaca putih di atas foto (layar lebar). */
const ROUND_CTRL =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink) transition-colors duration-200 hover:bg-(--pd-ring) focus-visible:outline-(--pd-ink) @5xl:bg-white/[0.14] @5xl:text-white @5xl:ring-1 @5xl:ring-inset @5xl:ring-white/35 @5xl:backdrop-blur-md @5xl:hover:bg-white/[0.26] @5xl:focus-visible:outline-white';

function SlideText({ slide, live, first }: { slide: HeroSlide; live: boolean; first: boolean }) {
  const delay = (ms: number) => ({ '--pd-delay': `${ms}ms` }) as CSSProperties;
  return (
    <>
      {slide.chip && (
        <p className="pd-rise inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full bg-(--pd-sky2) px-2.5 py-1 text-[12.5px] font-semibold leading-snug text-(--pd-ink)">
          {/* Penanda lokasi hanya di slide 1 (chip alamat sekolah); slide lain bertitik warna tema */}
          {first ? (
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <span aria-hidden className="mx-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />
          )}
          <span className="min-w-0">{slide.chip}</span>
        </p>
      )}
      {live ? (
        <h1 style={delay(60)} className={`pd-rise ${slide.chip ? 'mt-4' : ''} max-w-[18ch] text-balance ${C.ink} ${TYPE_P.h1}`}>
          {slide.title}
        </h1>
      ) : (
        <p className={`${slide.chip ? 'mt-4' : ''} max-w-[18ch] text-balance ${TYPE_P.h1}`}>{slide.title}</p>
      )}
      {slide.subtitle && (
        <p style={delay(120)} className={`pd-rise mt-4 max-w-[52ch] text-pretty ${C.body} ${TYPE_P.lead}`}>
          {slide.subtitle}
        </p>
      )}
    </>
  );
}

export function Hero({ m }: { m: PradiptaModel }) {
  const slides = heroSlides(m.hero, m.companyName);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [changed, setChanged] = useState(false);
  const [paused, setPaused] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  // Foto slide lain & thumbnail dimuat SESUDAH foto slide 1 (LCP) selesai dimuat, atau segera saat slide dipilih
  const [warm, setWarm] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const motion = useMotionEnabled();
  const pageHidden = usePageHidden();
  // Hero di luar layar → berhenti (putaran tidak habis tanpa dilihat, slide lain tidak dimuat diam-diam)
  const inView = useInView(frame, 0.3);
  const index = Math.min(active, count - 1);
  const canAutoplay = motion && count > 1;
  const autoplay = canAutoplay && !paused;
  const holding = hovering || focused || pageHidden || !inView;
  const slide = slides[index];

  useEffect(() => {
    if (count < 2) return;
    const lcp = frame.current?.querySelector('img');
    // Cadangan bila event load tidak datang (mis. gambar gagal): tetap dimuat setelah 2,5 dtk
    let timer = window.setTimeout(() => setWarm(true), 2500);
    const loaded = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWarm(true), 120);
    };
    if (!lcp || lcp.complete) loaded();
    else lcp.addEventListener('load', loaded, { once: true });
    return () => {
      window.clearTimeout(timer);
      lcp?.removeEventListener('load', loaded);
    };
  }, [count]);

  const go = (i: number) => {
    const next = wrapIndex(i, count);
    setWarm(true);
    if (next === index) return;
    setChanged(true);
    setActive(next);
  };

  /** Bilah progres penuh → slide berikutnya; setelah MAX_CYCLES putaran kembali ke slide 1 lalu berhenti sendiri. */
  const advance = () => {
    const next = wrapIndex(index + 1, count);
    if (next === 0) {
      const done = cycles + 1;
      if (done >= MAX_CYCLES) {
        setPaused(true);
        setCycles(0);
      } else setCycles(done);
    }
    go(next);
  };

  const togglePause = () => {
    setPaused((p) => !p);
    setCycles(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(index - 1);
    }
  };

  const primary = m.linkOr(slide.primaryUrl, m.sectionAction('about'));
  const secondary = m.linkOr(slide.secondaryUrl, m.spmbAction);
  const progress = (extra: string) => (
    <span
      key={`${index}-${extra}`}
      aria-hidden
      data-run={autoplay ? 'true' : 'false'}
      data-hold={holding ? 'true' : 'false'}
      onAnimationEnd={advance}
      className={`pd-progress absolute inset-0 ${extra}`}
    />
  );

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="thumbs"
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
      style={{ '--pd-autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      className="relative bg-white @5xl:grid"
    >
      {/* Foto selebar layar: HP 6:5 / tablet 16:10 di atas kartu. Layar lebar: foto & isi berbagi SATU sel grid (bukan
          absolute), tinggi minimal 80svh (600–880px) dan ikut memanjang bila teks CMS membuat kartu lebih tinggi */}
      <div
        ref={frame}
        className={`relative isolate aspect-[6/5] overflow-hidden @xl:aspect-[16/10] @5xl:col-start-1 @5xl:row-start-1 @5xl:aspect-auto @5xl:min-h-[max(600px,min(80svh,880px))] ${
          hasImage(slides[0].image) ? 'bg-(--pd-sky)' : 'pd-hero-fallback'
        }`}
      >
        {slides.map((s, i) =>
          hasImage(s.image) && (i === 0 || i === index || warm) ? (
            <div
              key={`${s.image}-${i}`}
              data-active={i === index ? 'true' : 'false'}
              aria-hidden={i === index ? undefined : true}
              className={`pd-slide absolute inset-0 -z-20 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPhoto
                src={s.image}
                alt={i === index ? PRADIPTA_PHOTOS.alt(s.image, `Suasana ${m.companyName}`) : ''}
                priority={i === 0}
                fallback="none"
                // Lebar foto yang benar-benar tergambar: di HP foto 16:9 menutupi wadah 6:5 (± 1,48× lebar layar), di tablet
                // wadah 16:10 (± 1,11× lebar layar), bukan selebar layar: HP dpr 2–3 memuat varian 1280/1920, tidak buram
                sizes="(max-width: 575px) 148vw, (max-width: 1023px) 112vw, 100vw"
                position={POSITIONS[i] ?? '50% 45%'}
                className="absolute inset-0"
              />
            </div>
          ) : null,
        )}
        <div aria-hidden className="pd-hero-scrim absolute inset-0 -z-10 hidden @5xl:block" />
      </div>

      <div className="min-w-0 @5xl:col-start-1 @5xl:row-start-1 @5xl:self-end @5xl:pt-10">
        <div className={`${CONTAINER} @5xl:pb-10`}>
          <div className="grid @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8">
            {/* Kartu judul putih: menumpang 32px di foto (HP), kiri bawah di atas foto (layar lebar) */}
            <div className="relative z-10 -mt-8 min-w-0 rounded-[24px] bg-white p-6 ring-1 ring-inset ring-(--pd-ring) @3xl:p-8 @5xl:col-span-7 @5xl:mt-0 @5xl:ring-0 @6xl:col-span-6 @7xl:p-10">
              {/* Teks semua slide ditumpuk di satu sel grid: tinggi kartu = teks terpanjang. Teks slide lain tersembunyi dari
                  pembaca layar dan bukan <h1>. Teks aktif naik pelan hanya SETELAH pergantian (data-enter). Teks yang lebih
                  pendek rata BAWAH (self-end): sisa ruang jatuh di atas chip, jarak deskripsi → tombol selalu sama. */}
              <div className="grid">
                {slides.map((s, i) =>
                  i === index ? (
                    <div key={`aktif-${i}`} data-enter={changed ? 'true' : 'false'} className="col-start-1 row-start-1 min-w-0 self-end">
                      <SlideText slide={s} live first={i === 0} />
                    </div>
                  ) : (
                    <div key={`bayangan-${i}`} aria-hidden inert className="invisible col-start-1 row-start-1 min-w-0 self-end">
                      <SlideText slide={s} live={false} first={i === 0} />
                    </div>
                  ),
                )}
              </div>
              {count > 1 && (
                // Wilayah live tetap: slide yang dipilih manual diumumkan (polite) saat tidak berganti otomatis
                <p className="sr-only" aria-live={autoplay && !holding ? 'off' : 'polite'} aria-atomic="true" data-pd-slide-status>
                  {`Slide ${index + 1} dari ${count}: ${slide.title}`}
                </p>
              )}
              {((primary && slide.primaryLabel) || (secondary && slide.secondaryLabel)) && (
                <div key={`tombol-${index}`} data-enter={changed ? 'true' : 'false'} className="mt-7 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
                  <span className="pd-rise flex" style={{ '--pd-delay': '180ms' } as CSSProperties}>
                    <PillLink action={primary} label={slide.primaryLabel} variant="primary" size="lg" className="w-full @xl:w-auto" />
                  </span>
                  <span className="pd-rise flex" style={{ '--pd-delay': '220ms' } as CSSProperties}>
                    <PillLink action={secondary} label={slide.secondaryLabel} variant="soft" size="lg" className="w-full @xl:w-auto" />
                  </span>
                </div>
              )}
            </div>

            {count > 1 && (
              <div
                role="group"
                aria-label="Kontrol slide"
                onKeyDown={onKeyDown}
                className="mt-4 flex min-w-0 items-center justify-between gap-3 print:hidden @5xl:col-span-5 @5xl:mt-0 @5xl:flex-col-reverse @5xl:items-end @5xl:gap-4 @6xl:col-span-6"
              >
                {/* Tombol slide: HP = bulatan bernomor + satu bilah progres; layar lebar = thumbnail foto + bilah progres */}
                <div className="relative min-w-0 pb-2 @5xl:pb-0">
                  <div role="group" aria-label="Pilih slide" className="flex items-center gap-1 @5xl:flex-wrap @5xl:items-start @5xl:justify-end @5xl:gap-3">
                    {slides.map((s, i) => {
                      const current = i === index;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => go(i)}
                          aria-label={s.caption ? `Slide ${i + 1} dari ${count}: ${s.caption}` : `Slide ${i + 1} dari ${count}`}
                          aria-current={current ? 'true' : undefined}
                          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-left focus-visible:outline-(--pd-ink) @5xl:h-auto @5xl:w-[80px] @5xl:flex-col @5xl:items-stretch @5xl:justify-start @5xl:rounded-[14px] @5xl:focus-visible:outline-white @6xl:w-[112px] @7xl:w-[132px]"
                        >
                          {/* HP: bulatan bernomor */}
                          <span
                            aria-hidden
                            className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-medium tabular-nums transition-colors duration-200 @5xl:hidden ${DISPLAY} ${
                              current ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--pd-sky2) text-(--pd-ink)'
                            }`}
                          >
                            {i + 1}
                          </span>
                          {/* Layar lebar: thumbnail 16:10 + bilah progres + nomor & keterangan */}
                          <span aria-hidden className="hidden @5xl:block">
                            <span className="relative block aspect-[16/10] overflow-hidden rounded-[12px] bg-white/10">
                              {hasImage(s.image) && (i === index || warm) && (
                                <KitPhoto
                                  src={s.image}
                                  alt=""
                                  fallback="none"
                                  sizes="156px"
                                  position={POSITIONS[i] ?? '50% 45%'}
                                  className={`absolute inset-0 transition-opacity duration-200 ${current ? '' : 'opacity-75 group-hover:opacity-100'}`}
                                />
                              )}
                              {/* Cincin di atas foto: putih tebal = slide aktif */}
                              <span className={`absolute inset-0 rounded-[12px] ring-inset ${current ? 'ring-2 ring-white' : 'ring-1 ring-white/35'}`} />
                            </span>
                            <span className="relative mt-2 block h-0.5 overflow-hidden rounded-full bg-white/30">
                              {current && canAutoplay && progress('bg-white')}
                            </span>
                            <span
                              className={`mt-2 flex gap-1.5 text-[13px] font-medium leading-snug ${current ? 'text-white' : 'text-white/85 group-hover:text-white'}`}
                            >
                              <span className="tabular-nums">{pad2(i + 1)}</span>
                              {s.caption && <span className="hidden min-w-0 @6xl:line-clamp-2">{s.caption}</span>}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* HP: satu bilah progres selebar deret tombol bernomor */}
                  {canAutoplay && (
                    <span aria-hidden className="absolute inset-x-1.5 bottom-0 h-0.5 overflow-hidden rounded-full bg-(--pd-sky2) @5xl:hidden">
                      {progress('bg-(--tpl-accent)')}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span aria-hidden className="mr-2 hidden text-[13px] font-medium tabular-nums text-white @5xl:inline">
                    {pad2(index + 1)} / {pad2(count)}
                  </span>
                  <button type="button" onClick={() => go(index - 1)} aria-label="Slide sebelumnya" className={ROUND_CTRL}>
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => go(index + 1)} aria-label="Slide berikutnya" className={ROUND_CTRL}>
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                  {canAutoplay && (
                    <button type="button" onClick={togglePause} aria-label={paused ? 'Putar slide otomatis' : 'Jeda slide otomatis'} className={ROUND_CTRL}>
                      {paused ? <Play className="h-3.5 w-3.5 translate-x-px fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
