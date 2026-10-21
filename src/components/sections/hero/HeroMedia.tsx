import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { prefersReducedMotion } from '../../../hooks/useInView';
import { HeroBackground } from './HeroBackground';
import { HERO_FADE_MS, HERO_SLIDE_MS, type HeroMediaConfig } from './heroBgConfig';

/** Mode hemat data browser (header Save-Data / "Lite mode"): video & gambar berikutnya tidak dimuat otomatis. */
const prefersSaveData = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

/**
 * play() yang tidak pernah melempar. Ditolak bila browser memblokir pemutaran (mis. iOS Low Power Mode).
 * muted diset lewat properti karena React tidak selalu memasang atribut `muted`, padahal tanpa itu autoplay diblokir.
 */
const playMuted = (el: HTMLVideoElement): Promise<void> => {
  el.muted = true;
  el.defaultMuted = true;
  try {
    return Promise.resolve(el.play());
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * play() ditolak karena dibatalkan (pause() atau muat ulang sebelum pemutaran sempat mulai, mis. hero cepat digulir
 * keluar layar), bukan karena diblokir browser: status jeda pengunjung tidak diubah.
 */
const isAbortError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';

/** Tanpa poster: minta frame pertama (#t) agar Safari iOS tidak menampilkan kotak kosong selama video belum diputar. */
const withFirstFrame = (src: string): string => (src.includes('#') ? src : `${src}#t=0.001`);

/**
 * true selama elemen terlihat di viewport DAN tab aktif (pola HeroShowcase). Belum ada callback IntersectionObserver
 * (atau browser tanpa IO) = dianggap terlihat; visibilitychange saja tidak melanjutkan hero yang sedang di luar layar.
 */
const useOnScreen = (ref: React.RefObject<Element | null>): boolean => {
  const [onScreen, setOnScreen] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let intersecting = true;
    const update = () => setOnScreen(intersecting && !document.hidden);
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1]; // entri terakhir = status terbaru
            if (!entry) return;
            intersecting = entry.isIntersecting;
            update();
          });
    io?.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [ref]);

  return onScreen;
};

/* ─── Gambar bergantian ───────────────────────────────────────────────────── */

interface SlideState {
  /** Gambar yang tampil (paling atas) */
  index: number;
  /** Gambar sebelumnya: tetap penuh di bawah selama gambar baru memudar masuk, lalu disembunyikan (-1 = tidak ada) */
  previous: number;
  /** Indeks terjauh yang pernah tampil: gambar sampai sini tetap terpasang (sudah dimuat browser) */
  reached: number;
  /** Gambar yang sudah selesai dimuat: hanya gambar ini yang boleh menjadi gambar berikutnya */
  loaded: readonly number[];
  /** Gambar yang gagal dimuat: tidak dirender dan dilewati */
  failed: readonly number[];
  /**
   * Menunggu gambar berikutnya selesai dimuat: 'dwell' = 6 detik sudah lewat (berganti begitu termuat, selama tayangan
   * berjalan); 'gone' = gambar yang tampil gagal dimuat (berganti begitu termuat, juga saat dijeda); null = tidak menunggu.
   */
  waiting: 'dwell' | 'gone' | null;
}

type SlideAction =
  | { type: 'due'; count: number }
  | { type: 'load'; at: number; count: number; running: boolean }
  | { type: 'fail'; at: number; count: number; running: boolean }
  | { type: 'settle' };

const FIRST_SLIDE: SlideState = { index: 0, previous: -1, reached: 0, loaded: [], failed: [], waiting: null };

/** Gambar berikutnya (melingkar) yang tidak gagal; tidak ada → tetap `from`. */
const nextSlide = (from: number, count: number, failed: readonly number[]): number => {
  for (let step = 1; step < count; step += 1) {
    const index = (from + step) % count;
    if (!failed.includes(index)) return index;
  }
  return from;
};

/** Tampilkan gambar `to`; gambar yang tampil sekarang (bila tidak gagal) tetap penuh di bawahnya selama pudar masuk. */
const showSlide = (state: SlideState, to: number): SlideState => ({
  ...state,
  index: to,
  previous: state.failed.includes(state.index) ? state.previous : state.index,
  reached: Math.max(state.reached, to),
  waiting: null,
});

/** Penantian selesai bila gambar berikutnya sudah termuat; 'dwell' hanya dilanjutkan selama tayangan berjalan. */
const resolveWaiting = (state: SlideState, count: number, running: boolean): SlideState => {
  if (!state.waiting || (state.waiting === 'dwell' && !running)) return state;
  const to = nextSlide(state.index, count, state.failed);
  // Tidak ada gambar lain yang bisa tampil: tidak ada yang ditunggu lagi (semua gagal → kanvas bawaan di HeroMedia)
  if (to === state.index) return state.waiting === 'dwell' ? { ...state, waiting: null } : state;
  return state.loaded.includes(to) ? showSlide(state, to) : state;
};

const slidesReducer = (state: SlideState, action: SlideAction): SlideState => {
  switch (action.type) {
    case 'settle':
      return state.previous < 0 ? state : { ...state, previous: -1 };
    case 'due':
      // Timer 6 detik hanya berjalan selama tayangan berjalan
      return resolveWaiting({ ...state, waiting: state.waiting ?? 'dwell' }, action.count, true);
    case 'load':
      if (state.loaded.includes(action.at) || state.failed.includes(action.at)) return state;
      return resolveWaiting({ ...state, loaded: [...state.loaded, action.at] }, action.count, action.running);
    case 'fail': {
      if (state.failed.includes(action.at)) return state;
      const failed = [...state.failed, action.at];
      const waiting = action.at === state.index ? 'gone' : state.waiting;
      return resolveWaiting({ ...state, failed, waiting }, action.count, action.running);
    }
  }
};

/**
 * Urutan tayangan gambar: berganti paling cepat 6 detik setelah gambar tampil, dan hanya ke gambar yang sudah selesai
 * dimuat (belum termuat → ditunggu, berganti begitu termuat). Gambar lama disembunyikan setelah pudar masuk selesai,
 * jadi setiap gambar yang tampil lagi selalu memudar masuk dari transparan (juga bila hanya 2 gambar bergantian).
 */
const useSlides = (count: number, running: boolean) => {
  const [state, dispatch] = useReducer(slidesReducer, FIRST_SLIDE);
  const upcoming = nextSlide(state.index, count, state.failed);
  const canAdvance = upcoming !== state.index && state.waiting !== 'gone';

  useEffect(() => {
    if (!running || !canAdvance) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'due', count }), HERO_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [running, canAdvance, count, state.index]);

  // Tetap berjalan saat dijeda: transisi CSS yang sudah mulai tetap selesai
  useEffect(() => {
    if (state.previous < 0) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'settle' }), HERO_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [state.previous, state.index]);

  return {
    state,
    upcoming,
    /** Gambar yang masih bisa tampil (belum gagal dimuat) */
    usable: count - state.failed.length,
    onLoad: (at: number) => dispatch({ type: 'load', at, count, running }),
    onError: (at: number) => dispatch({ type: 'fail', at, count, running }),
  };
};

interface HeroSlidesProps {
  images: string[];
  slides: SlideState;
  upcoming: number;
  /** Gambar berikutnya dipasang lebih dulu (tidak dijeda pengunjung / reduced motion / hemat data, atau gambar yang tampil gagal) */
  preload: boolean;
  /** Pudar masuk 1,2 detik + skala 1,03 → 1; mati untuk reduced motion (langsung berganti) */
  animate: boolean;
  onLoad: (index: number) => void;
  onError: (index: number) => void;
}

/**
 * Crossfade bertumpuk: gambar aktif memudar masuk DI ATAS gambar sebelumnya (yang tetap penuh), jadi tidak pernah ada
 * kilasan kosong. Gambar dipasang bertahap (yang tampil, berikutnya, dan yang sudah pernah tampil), bukan sekaligus.
 */
const HeroSlides: React.FC<HeroSlidesProps> = ({ images, slides, upcoming, preload, animate, onLoad, onError }) => (
  <>
    {images.map((src, index) => {
      const mounted = index <= slides.reached || (preload && index === upcoming);
      if (!mounted || slides.failed.includes(index)) return null;
      const active = index === slides.index;
      const under = index === slides.previous;
      // Tampil / di bawah: penuh dengan transisi, jadi gambar tersembunyi yang menjadi aktif memudar dari 0 (+ skala
      // 1,03 → 1; Tailwind v4 scale-* = properti CSS `scale`). Tersembunyi: langsung transparan tanpa transisi, karena
      // saat itu tertutup gambar aktif yang sudah penuh.
      const layer = active ? 'z-[2] opacity-100' : under ? 'z-[1] opacity-100' : 'z-0 opacity-0';
      const motion = !animate
        ? ''
        : active || under
          ? ' scale-100 transition-[opacity,scale] duration-[1200ms] ease-calm motion-reduce:transition-none'
          : ' scale-[1.03]';
      return (
        <img
          key={src}
          src={src}
          alt=""
          // Gambar pertama = kandidat LCP: dimuat segera; lainnya belakangan
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : undefined}
          decoding="async"
          onLoad={() => onLoad(index)}
          onError={() => onError(index)}
          className={`absolute inset-0 h-full w-full object-cover ${layer}${motion}`}
        />
      );
    })}
  </>
);

/* ─── Lapisan latar + tombol jeda ─────────────────────────────────────────── */

/**
 * Latar hero dari admin (mode Gambar / Video; mode Bawaan = HeroBackground):
 * - gambar: satu gambar statis, 2+ gambar bergantian minimal tiap 6 detik (selalu memudar masuk dari 0 selama 1,2 detik,
 *   hanya ke gambar yang sudah termuat); gambar yang gagal dimuat dilewati;
 * - video: berulang tanpa suara, inline, tanpa kontrol bawaan; poster tampil sampai video berjalan. Video rusak /
 *   gagal dimuat → disembunyikan (poster tetap tampil sebagai gambar bila ada).
 * Tidak ada lagi yang bisa tampil (semua gambar gagal, atau video gagal tanpa poster yang bisa dimuat) → kanvas bawaan.
 * Di atas media: cuci putih agar teks tetap terbaca (HP rata, ≥ 1024px kuat di kolom teks kiri, tipis di kanan) +
 * pudar atas (navbar transparan) dan bawah (menyatu dengan strip layanan). Datar: tanpa scrim gelap, tanpa blur.
 * Berhenti saat hero tidak terlihat atau tab disembunyikan; tombol jeda (WCAG 2.2.2) selama masih ada 2+ gambar yang
 * bisa tampil, atau video yang masih bisa diputar.
 * Reduced motion atau hemat data (Save-Data): mulai dijeda (gambar pertama / poster saja), pengunjung bisa memutar;
 * reduced motion juga tanpa pudar & skala (gambar langsung berganti).
 * Autoplay yang diblokir browser → status dijeda, poster / frame pertama tetap tampil (play() yang dibatalkan tidak).
 * Dirender di dalam section hero yang `relative isolate` (lapisan -z-10 di belakang isi, tombol z-10 di atasnya).
 */
export const HeroMedia: React.FC<{ config: HeroMediaConfig }> = ({ config }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScreen = useOnScreen(layerRef);
  const [reduced] = useState(prefersReducedMotion);
  const [paused, setPaused] = useState(() => reduced || prefersSaveData());
  const [broken, setBroken] = useState(false); // video gagal dimuat / diputar
  const [posterBroken, setPosterBroken] = useState(false);

  const isVideo = config.mode === 'video';
  const playing = !paused && onScreen;
  const slides = useSlides(config.mode === 'image' ? config.images.length : 0, playing);
  // Tombol jeda hanya bila ada yang bergerak: 2+ gambar yang masih bisa tampil, atau video yang masih bisa diputar
  const controllable = config.mode === 'image' ? slides.usable > 1 : !broken;
  const exhausted = config.mode === 'image' ? slides.usable === 0 : broken && (!config.poster || posterBroken);

  // Video diputar hanya selama boleh bergerak; diblokir browser → dijeda (poster / frame pertama tetap tampil)
  useEffect(() => {
    const el = videoRef.current;
    if (!isVideo || broken || !el) return undefined;
    if (!playing) {
      el.pause();
      return undefined;
    }
    let alive = true;
    if (el.paused) {
      playMuted(el).catch((err: unknown) => {
        if (alive && !isAbortError(err)) setPaused(true);
      });
    }
    return () => {
      alive = false;
    };
  }, [isVideo, broken, playing]);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    // Putar langsung di dalam klik (gesture pengguna): iOS mengizinkannya walau autoplay sebelumnya diblokir
    const el = videoRef.current;
    if (!next && isVideo && el) {
      playMuted(el).catch((err: unknown) => {
        if (videoRef.current === el && !isAbortError(err)) setPaused(true);
      });
    }
  };

  // Tidak ada lagi media yang bisa tampil: latar bawaan, bukan cuci putih kosong (sama dengan Hero.tsx)
  if (exhausted) return <HeroBackground className="absolute inset-0 -z-10" />;

  return (
    <>
      <div
        ref={layerRef}
        className="pointer-events-none absolute inset-0 -z-10 animate-fade-in motion-reduce:animate-none"
        aria-hidden
      >
        {config.mode === 'image' && (
          <HeroSlides
            images={config.images}
            slides={slides.state}
            upcoming={slides.upcoming}
            preload={!paused || slides.state.waiting === 'gone'}
            animate={!reduced}
            onLoad={slides.onLoad}
            onError={slides.onError}
          />
        )}

        {config.mode === 'video' &&
          (!broken ? (
            <video
              ref={videoRef}
              src={config.poster ? config.src : withFirstFrame(config.src)}
              poster={config.poster ?? undefined}
              muted
              loop
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              preload={paused ? 'metadata' : 'auto'}
              tabIndex={-1}
              aria-hidden
              onError={() => setBroken(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            config.poster &&
            !posterBroken && (
              <img
                src={config.poster}
                alt=""
                decoding="async"
                onError={() => setPosterBroken(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ))}

        {/* Cuci putih untuk keterbacaan: HP & tablet rata; ≥ 1024px kuat di belakang kolom teks, tipis di kanan */}
        <div className="absolute inset-0 z-[3] bg-canvas/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-canvas/90 lg:via-canvas/75 lg:to-canvas/40" />
        {/* Pudar di atas (area navbar) dan di bawah (menyatu dengan strip layanan), sama dengan HeroBackground */}
        <div className="absolute inset-x-0 top-0 z-[3] h-28 bg-gradient-to-b from-canvas via-canvas/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      {controllable && (
        // Kiri bawah, di padding bawah hero: kanan bawah (≥ 640px) bertabrakan dengan tombol WhatsApp melayang
        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 sm:bottom-3 lg:bottom-6">
          <div className="container-site flex">
            <button
              type="button"
              onClick={toggle}
              className="pointer-events-auto relative flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-fg ring-1 ring-inset ring-line transition-colors hover:bg-surface max-sm:after:absolute max-sm:after:-inset-1"
              aria-label={paused ? 'Putar latar' : 'Jeda latar'}
            >
              {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroMedia;
