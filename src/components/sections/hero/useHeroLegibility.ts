import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { heroBackgroundKey, type HeroMediaConfig, type HeroTextSettings } from './heroBgConfig';
import { decideHeroLegibility, decideNavTone, fallbackLegibility, type BackgroundSample, type HeroLegibility, type HeroTone } from './heroContrast';
import { combineResults, prefersSaveData, sampleImage, sampleVideo, type SampleLayout, type SampleResult } from './heroSampling';

/** Tata letak hero berganti di sini: tumpuk (HP & tablet) ↔ dua kolom (≥ 1024px), dan ukuran teks HP ↔ ≥ 640px. */
const BREAKPOINTS = ['(min-width: 640px)', '(min-width: 1024px)'];
const TWO_COLUMNS = '(min-width: 1024px)';
/** Area sampel = blok teks + 16px di tiap sisi (efek gulir menggeser teks sedikit). */
const PAD = 16;
/** Pudar bawah ke canvas (HeroMedia): maks. 160px (h-40), min. 64px, selalu 8px di bawah blok teks. */
const FADE_MAX = 160;
const FADE_MIN = 64;
const FADE_GAP = 8;
/** Jeda sebelum mengukur ulang setelah ukuran berubah (resize jendela / ResizeObserver beruntun). */
const RESIZE_DEBOUNCE_MS = 250;
/** Tinggi bar navbar bila `--nav-h` tidak bisa dibaca (64px ≥ 1024px, sama dengan index.css). */
const NAV_FALLBACK_PX = 64;

export interface HeroLegibilityState extends HeroLegibility {
  /** Tepi blok teks untuk --scrim-end (px dari kiri pada ≥ 1024px, dari atas di bawahnya); null = belum diukur */
  scrimEnd: number | null;
  /** Tinggi pudar bawah (px) agar tidak pernah sampai ke blok teks; null = bawaan h-40 */
  fadeHeight: number | null;
}

interface Measured {
  key: string;
  /** Sampel per gambar; null = tidak bisa diukur → cadangan (lapisan admin persis) */
  samples: BackgroundSample[] | null;
  /** Sampel strip di belakang navbar (per gambar); null = tidak terukur / hero tidak di puncak → navbar putih kaca */
  navSamples: BackgroundSample[] | null;
  scrimEnd: number | null;
  fadeHeight: number | null;
}

/** Tinggi bar navbar (px) dari `--nav-h` (rem atau px) di :root; tidak terbaca → 64. */
function navBarHeight(): number {
  if (typeof document === 'undefined') return NAV_FALLBACK_PX;
  const root = getComputedStyle(document.documentElement);
  const raw = root.getPropertyValue('--nav-h').trim();
  const value = parseFloat(raw);
  if (!(value > 0)) return NAV_FALLBACK_PX;
  return raw.endsWith('rem') ? value * (parseFloat(root.fontSize) || 16) : value;
}

/**
 * Pita teks navbar (fixed di puncak halaman) dalam koordinat section: selebar section, setengah tengah tinggi bar
 * (logo, menu & tombol 36-40px berpusat di bar 56/64px; huruf menu 14px di tengahnya). Hanya bila section mulai di
 * puncak halaman (beranda); selain itu null (navbar tidak pernah di atas media ini).
 */
function navStrip(section: HTMLElement, box: SampleLayout['box']): SampleLayout | null {
  const top = section.getBoundingClientRect().top + (window.scrollY || 0);
  if (Math.abs(top) > 1) return null;
  const bar = Math.min(box.h, navBarHeight());
  return { box, region: { x: 0, y: Math.round(bar / 4), w: box.w, h: Math.round(bar / 2) } };
}

/** Ukuran section (= kotak media) dan blok teks di dalamnya, tanpa transform efek gulir bila memungkinkan. */
function measureLayout(
  section: HTMLElement,
  text: HTMLElement,
): { layout: SampleLayout; strip: SampleLayout | null; scrimEnd: number; fadeHeight: number } | null {
  const w = section.clientWidth;
  const h = section.clientHeight;
  if (!(w > 0 && h > 0)) return null;
  let x: number;
  let y: number;
  let tw: number;
  let th: number;
  if (text.offsetParent === section) {
    x = text.offsetLeft;
    y = text.offsetTop;
    tw = text.offsetWidth;
    th = text.offsetHeight;
  } else {
    const s = section.getBoundingClientRect();
    const t = text.getBoundingClientRect();
    x = t.left - s.left;
    y = t.top - s.top;
    tw = t.width;
    th = t.height;
  }
  if (!(tw > 0 && th > 0)) return null;
  const twoColumns = window.matchMedia?.(TWO_COLUMNS).matches ?? window.innerWidth >= 1024;
  const bottom = y + th;
  return {
    layout: { box: { w, h }, region: { x: x - PAD, y: y - PAD, w: tw + PAD * 2, h: th + PAD * 2 } },
    strip: navStrip(section, { w, h }),
    scrimEnd: Math.round(twoColumns ? x + tw + PAD : bottom + PAD),
    fadeHeight: Math.round(Math.min(FADE_MAX, Math.max(FADE_MIN, h - bottom - FADE_GAP))),
  };
}

const mergeVideo = (poster: SampleResult | null, video: HTMLVideoElement | null, layout: SampleLayout): SampleResult | null => {
  if (poster?.kind === 'sample') return poster;
  // Tanpa poster, atau poster gagal: frame video yang sedang tampil (bila sudah ada)
  return video ? sampleVideo(video, layout) : poster;
};

/**
 * Nada teks hero di atas gambar/video dari setting admin (`hero_text_tone`; lapisan `hero_overlay` dipakai persis):
 * - mengambil sampel latar DI BELAKANG BLOK TEKS (`textRef`) dengan potongan object-fit: cover yang sama dengan
 *   halaman; tayangan: semua gambar diukur dan dipakai kasus terburuknya, jadi nada tidak berkedip antar-slide;
 *   video: poster, atau frame pertama (loadeddata, lewat `onVideoFrame` yang dipasang ke HeroMedia);
 * - selama mengukur, dan bila tidak bisa diukur (lintas domain tanpa CORS, canvas tercemar, hemat data dengan 2+
 *   gambar), memakai cadangan (fallbackLegibility): teks gelap seperti halaman tanpa media (terang bila dipaksa
 *   admin) dengan lapisan admin persis, sama dengan HTML prerender, jadi hidrasi tidak berbeda, tidak ada kilasan
 *   lapisan gelap, dan judul tidak putih di atas halaman putih selama gambar/video dimuat;
 * - diukur ulang saat tata letak berganti (640px / 1024px), lebar jendela berubah, isi blok teks berganti
 *   (`layoutKey`, mis. mode Template ↔ Custom: di HP blok teks mode Custom lebih tinggi), atau ukuran blok teks /
 *   section berubah (ResizeObserver), tanpa unduh ulang.
 * Sekalian diukur strip latar di belakang navbar (`navTone`, decideNavTone): navbar transparan di puncak beranda
 * memakai teks terang / gelap yang terbaca di sana (strip bisa jauh lebih gelap dari area teks, mis. langit di atas
 * cahaya), null selama mengukur / bila tidak terukur atau tidak ada nada yang terbaca (navbar tetap putih kaca).
 * `media` null (latar bawaan, belum dimuat, atau semua media gagal) → null: teks hero tampil seperti biasa.
 */
export function useHeroLegibility({
  media,
  text,
  sectionRef,
  textRef,
  layoutKey = '',
}: {
  media: HeroMediaConfig | null;
  text: HeroTextSettings;
  sectionRef: RefObject<HTMLElement | null>;
  textRef: RefObject<HTMLElement | null>;
  /** Berubah saat isi blok teks berganti (mode hero): diukur ulang langsung, tanpa menunggu ResizeObserver */
  layoutKey?: string;
}): { legibility: HeroLegibilityState | null; navTone: HeroTone | null; onVideoFrame: (video: HTMLVideoElement) => void } {
  const mediaKey = media ? heroBackgroundKey(media) : null;
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [video, setVideo] = useState<{ key: string; el: HTMLVideoElement } | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const frame = video && video.key === mediaKey ? video.el : null;

  const onVideoFrame = useCallback(
    (el: HTMLVideoElement) => {
      if (mediaKey) setVideo({ key: mediaKey, el });
    },
    [mediaKey],
  );

  // Ukur ulang saat tata letak berganti, lebar jendela berubah (tinggi jendela saja = bilah alamat HP: diabaikan),
  // atau ukuran blok teks / section berubah: mis. di HP panel mode yang tidak aktif dilepas dari tata letak, jadi
  // mode Custom (tombol lebih tinggi) memanjangkan blok teks; tanpa ukur ulang tombolnya jatuh di luar area sampel
  useEffect(() => {
    if (!mediaKey || typeof window === 'undefined') return undefined;
    const bump = () => setLayoutTick((n) => n + 1);
    const queries = BREAKPOINTS.map((q) => window.matchMedia?.(q)).filter((m): m is MediaQueryList => Boolean(m));
    queries.forEach((m) => m.addEventListener?.('change', bump));
    let width = window.innerWidth;
    let timer = 0;
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(bump, RESIZE_DEBOUNCE_MS);
    };
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      later();
    };
    window.addEventListener('resize', onResize);
    // Ukuran terakhir per elemen (border-box, dibulatkan); laporan pertama hanya mencatat (pengukuran awal sudah jalan)
    const sizes = new Map<Element, string>();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            let changed = false;
            for (const entry of entries) {
              const el = entry.target as HTMLElement;
              const size = `${Math.round(el.offsetWidth)}x${Math.round(el.offsetHeight)}`;
              if (sizes.has(el) && sizes.get(el) !== size) changed = true;
              sizes.set(el, size);
            }
            if (changed) later();
          });
    for (const el of [sectionRef.current, textRef.current]) if (el) observer?.observe(el);
    return () => {
      queries.forEach((m) => m.removeEventListener?.('change', bump));
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [mediaKey, sectionRef, textRef]);

  useEffect(() => {
    if (!media || !mediaKey) return undefined;
    let alive = true;
    const run = async () => {
      // Hemat data + tayangan: gambar berikutnya tidak diunduh hanya untuk diukur (HeroMedia juga menahannya)
      const skip = media.mode === 'image' && media.images.length > 1 && prefersSaveData();
      // Ukuran huruf ikut menentukan tinggi blok teks
      await Promise.resolve(typeof document !== 'undefined' ? document.fonts?.ready : undefined).catch(() => undefined);
      const section = sectionRef.current;
      const textEl = textRef.current;
      const box = alive && section && textEl ? measureLayout(section, textEl) : null;
      if (!alive) return;
      if (!box) {
        setMeasured({ key: mediaKey, samples: null, navSamples: null, scrimEnd: null, fadeHeight: null });
        return;
      }
      // Satu area latar (blok teks atau strip navbar) → sampel per gambar / poster / frame; null = tidak terukur
      const measure = async (layout: SampleLayout): Promise<BackgroundSample[] | null> => {
        if (!skip && media.mode === 'image') {
          return combineResults(await Promise.all(media.images.map((src) => sampleImage(src, layout))));
        }
        if (!skip && media.mode === 'video') {
          const poster = media.poster ? await sampleImage(media.poster, layout) : null;
          const result = alive ? mergeVideo(poster, frame, layout) : null;
          // Belum ada poster terukur maupun frame: tetap cadangan sampai frame pertama datang
          return result ? combineResults([result]) : null;
        }
        return null;
      };
      const [samples, navSamples] = await Promise.all([measure(box.layout), box.strip ? measure(box.strip) : null]);
      if (alive) setMeasured({ key: mediaKey, samples, navSamples, scrimEnd: box.scrimEnd, fadeHeight: box.fadeHeight });
    };
    void run();
    return () => {
      alive = false;
    };
  }, [media, mediaKey, frame, layoutTick, layoutKey, sectionRef, textRef]);

  const legibility = useMemo<HeroLegibilityState | null>(() => {
    if (!mediaKey) return null;
    const current = measured?.key === mediaKey ? measured : null;
    const base = current?.samples
      ? decideHeroLegibility(current.samples, text.tone, text.overlay)
      : fallbackLegibility(text.tone, text.overlay);
    return { ...base, scrimEnd: current?.scrimEnd ?? null, fadeHeight: current?.fadeHeight ?? null };
  }, [mediaKey, measured, text.tone, text.overlay]);

  const navTone = useMemo<HeroTone | null>(() => {
    const current = mediaKey && measured?.key === mediaKey ? measured : null;
    return current?.navSamples ? decideNavTone(current.navSamples) : null;
  }, [mediaKey, measured]);

  return { legibility, navTone, onVideoFrame };
}
