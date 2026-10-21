import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { prefersReducedMotion } from '../../../hooks/useInView';
import { HERO_SLIDE_MS, type HeroMediaConfig } from './heroBgConfig';

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
  /** Gambar sebelumnya: tetap terlihat di bawah selama gambar baru memudar masuk (juga bila gambar baru belum termuat) */
  previous: number;
  /** Indeks terjauh yang pernah tampil: gambar sampai sini tetap terpasang (sudah dimuat browser) */
  reached: number;
  /** Gambar yang gagal dimuat: tidak dirender dan dilewati */
  failed: readonly number[];
}

type SlideAction = { type: 'next'; count: number } | { type: 'fail'; at: number; count: number };

const FIRST_SLIDE: SlideState = { index: 0, previous: -1, reached: 0, failed: [] };

/** Gambar berikutnya (melingkar) yang tidak gagal; tidak ada → tetap `from`. */
const nextSlide = (from: number, count: number, failed: readonly number[]): number => {
  for (let step = 1; step < count; step += 1) {
    const index = (from + step) % count;
    if (!failed.includes(index)) return index;
  }
  return from;
};

const slidesReducer = (state: SlideState, action: SlideAction): SlideState => {
  if (action.type === 'fail') {
    if (state.failed.includes(action.at)) return state;
    const failed = [...state.failed, action.at];
    if (action.at !== state.index) return { ...state, failed };
    // Gambar yang sedang tampil gagal: langsung ke gambar berikutnya, gambar sebelumnya tetap di bawahnya
    const index = nextSlide(state.index, action.count, failed);
    return { ...state, index, reached: Math.max(state.reached, index), failed };
  }
  const index = nextSlide(state.index, action.count, state.failed);
  if (index === state.index) return state;
  return { ...state, index, previous: state.index, reached: Math.max(state.reached, index) };
};

interface HeroSlidesProps {
  images: string[];
  /** Berganti otomatis sekarang (terlihat, tab aktif, tidak dijeda) */
  running: boolean;
  /** Gambar berikutnya boleh dimuat lebih dulu (tidak dijeda pengunjung / reduced motion / hemat data) */
  preload: boolean;
  /** Gambar baru sedikit "mengendap" (skala 1,03 → 1); mati untuk reduced motion */
  settle: boolean;
}

/**
 * Crossfade bertumpuk: gambar aktif memudar masuk DI ATAS gambar sebelumnya (yang tetap penuh), jadi tidak pernah ada
 * kilasan kosong. Gambar dipasang bertahap (yang tampil, berikutnya, dan yang sudah pernah tampil), bukan sekaligus.
 */
const HeroSlides: React.FC<HeroSlidesProps> = ({ images, running, preload, settle }) => {
  const count = images.length;
  const [state, dispatch] = useReducer(slidesReducer, FIRST_SLIDE);
  const upcoming = nextSlide(state.index, count, state.failed);

  useEffect(() => {
    if (!running || upcoming === state.index) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'next', count }), HERO_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [running, count, state.index, upcoming]);

  return (
    <>
      {images.map((src, index) => {
        const mounted = index <= state.reached || (preload && index === upcoming);
        if (!mounted || state.failed.includes(index)) return null;
        const active = index === state.index;
        const under = index === state.previous;
        const layer = active ? 'z-[2] opacity-100' : under ? 'z-[1] opacity-100' : 'z-0 opacity-0';
        return (
          <img
            key={src}
            src={src}
            alt=""
            // Gambar pertama = kandidat LCP: dimuat segera; lainnya belakangan
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : undefined}
            decoding="async"
            onError={() => dispatch({ type: 'fail', at: index, count })}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-calm ${layer} ${
              settle && !active && !under ? 'scale-[1.03]' : 'scale-100'
            }`}
          />
        );
      })}
    </>
  );
};

/* ─── Lapisan latar + tombol jeda ─────────────────────────────────────────── */

/**
 * Latar hero dari admin (mode Gambar / Video; mode Bawaan = HeroBackground):
 * - gambar: satu gambar statis, 2+ gambar bergantian tiap 6 detik (crossfade 1,2 detik);
 * - video: berulang tanpa suara, inline, tanpa kontrol bawaan; poster tampil sampai video berjalan. Video rusak /
 *   gagal dimuat → disembunyikan (poster tetap tampil sebagai gambar bila ada).
 * Di atas media: cuci putih agar teks tetap terbaca (HP rata, ≥ 1024px kuat di kolom teks kiri, tipis di kanan) +
 * pudar atas (navbar transparan) dan bawah (menyatu dengan strip layanan). Datar: tanpa scrim gelap, tanpa blur.
 * Berhenti saat hero tidak terlihat atau tab disembunyikan; tombol jeda (WCAG 2.2.2) untuk 2+ gambar dan video.
 * Reduced motion atau hemat data (Save-Data): mulai dijeda (gambar pertama / poster saja), pengunjung bisa memutar.
 * Autoplay yang diblokir browser → status dijeda, poster / frame pertama tetap tampil.
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
  // Tombol jeda hanya bila ada yang bergerak: 2+ gambar, atau video yang masih bisa diputar
  const controllable = config.mode === 'image' ? config.images.length > 1 : !broken;

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
      playMuted(el).catch(() => {
        if (alive) setPaused(true);
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
      playMuted(el).catch(() => {
        if (videoRef.current === el) setPaused(true);
      });
    }
  };

  return (
    <>
      <div
        ref={layerRef}
        className="pointer-events-none absolute inset-0 -z-10 animate-fade-in motion-reduce:animate-none"
        aria-hidden
      >
        {config.mode === 'image' && (
          <HeroSlides images={config.images} running={playing} preload={!paused} settle={!reduced} />
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
