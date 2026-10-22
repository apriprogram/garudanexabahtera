// @vitest-environment jsdom
// Latar hero beranda dari setting admin (hero_bg_mode / hero_images / hero_bg_video / hero_bg_video_poster): parser &
// URL aman, HeroMedia mode gambar (slide bertahap, selalu memudar masuk dari 0, hanya ke gambar yang sudah termuat, jeda,
// reduced motion, di luar layar, semua gagal → kanvas) dan video (muted/inline, play() hanya bila boleh, autoplay
// diblokir vs. dibatalkan, error → poster / kanvas), serta Hero yang menunggu setting lalu memilih kanvas / gambar / video.
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/components/sections/hero
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { SiteSettings } from '../../../../hooks/useSiteSettings';
import {
  HERO_FADE_MS,
  HERO_MAX_IMAGES,
  HERO_SLIDE_MS,
  heroBackgroundKey,
  parseHeroBackground,
  safeMediaUrl,
  type HeroMediaConfig,
} from '../heroBgConfig';
import { HeroMedia } from '../HeroMedia';

/* ─── Lingkungan browser yang bisa diatur per tes ─────────────────────────── */

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let ioCallbacks: IOCallback[] = [];

/** IntersectionObserver yang memanggil balik hanya saat tes memintanya (setup.ts: tidak pernah memanggil balik). */
class ControlledIntersectionObserver {
  constructor(callback: IOCallback) {
    ioCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const setIntersecting = (isIntersecting: boolean) =>
  act(() => ioCallbacks.forEach((callback) => callback([{ isIntersecting }])));

let tabHidden = false;
const setTabHidden = (hidden: boolean) =>
  act(() => {
    tabHidden = hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });

const originalMatchMedia = window.matchMedia;
const originalIntersectionObserver = window.IntersectionObserver;
const mockReducedMotion = () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const mockSaveData = () =>
  Object.defineProperty(window.navigator, 'connection', { configurable: true, value: { saveData: true } });

let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;

beforeEach(() => {
  ioCallbacks = [];
  tabHidden = false;
  // setup.ts memasang IntersectionObserver sebagai properti writable (tidak configurable), jadi cukup ditimpa
  window.IntersectionObserver = ControlledIntersectionObserver as unknown as typeof IntersectionObserver;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => tabHidden });
  // jsdom tidak punya pemutar media
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn<() => void>();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.matchMedia = originalMatchMedia;
  window.IntersectionObserver = originalIntersectionObserver;
  Reflect.deleteProperty(window.navigator, 'connection');
  Reflect.deleteProperty(document, 'hidden'); // kembali ke getter bawaan jsdom
});

/* ─── Parser ──────────────────────────────────────────────────────────────── */

describe('safeMediaUrl', () => {
  it('menerima path situs dan http(s) absolut (dirapikan)', () => {
    expect(safeMediaUrl('/assets/bg/hero_1.jpg')).toBe('/assets/bg/hero_1.jpg');
    expect(safeMediaUrl('  /assets/bg/hero_video_0123456789ab.mp4 ')).toBe('/assets/bg/hero_video_0123456789ab.mp4');
    expect(safeMediaUrl('https://s3.test/bucket/assets/bg/a.webp')).toBe('https://s3.test/bucket/assets/bg/a.webp');
    expect(safeMediaUrl('http://cdn.test/a.jpg')).toBe('http://cdn.test/a.jpg');
  });

  it('menolak data:, javascript:, blob:, protocol-relative, relatif, kosong, dan bukan string', () => {
    const rejected: unknown[] = [
      '',
      '   ',
      'data:image/png;base64,iVBORw0KGgo=',
      ' data:video/mp4;base64,AAAA',
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'vbscript:msgbox(1)',
      'blob:https://garudanexa.com/0b6d',
      '//evil.test/a.jpg',
      '/\\evil.test/a.jpg',
      '/\t/evil.test/a.jpg',
      'assets/bg/a.jpg',
      'https://',
      'https:///a.jpg',
      'ftp://cdn.test/a.jpg',
      42,
      null,
      undefined,
      ['/a.jpg'],
    ];
    rejected.forEach((value) => expect(safeMediaUrl(value), JSON.stringify(value)).toBeNull());
  });
});

describe('parseHeroBackground', () => {
  const images = (list: unknown[]): SiteSettings => ({ hero_bg_mode: 'image', hero_images: JSON.stringify(list) });

  it('mode kosong / tidak dikenal → bawaan (dicocokkan persis, sama dengan admin)', () => {
    const settings: SiteSettings[] = [
      {},
      { hero_bg_mode: '' },
      { hero_bg_mode: 'slider' },
      { hero_bg_mode: 'IMAGE', hero_images: '["/a.jpg"]' },
      { hero_bg_mode: ' video', hero_bg_video: '/v.mp4' },
      { hero_bg_mode: 'default', hero_images: '["/a.jpg"]', hero_bg_video: '/v.mp4' },
    ];
    settings.forEach((value) => expect(parseHeroBackground(value), JSON.stringify(value)).toEqual({ mode: 'default' }));
  });

  it('mode gambar tanpa satu pun URL aman → bawaan', () => {
    expect(parseHeroBackground(images([]))).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'image' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'image', hero_images: '{rusak' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'image', hero_images: '"/a.jpg"' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground(images(['data:image/png;base64,AAA', 'javascript:alert(1)', '//x.test/a.jpg', 7]))).toEqual({
      mode: 'default',
    });
  });

  it('mode gambar: hanya URL aman, urutan admin, tanpa duplikat, maks. 12', () => {
    expect(parseHeroBackground(images(['/assets/bg/a.jpg', 'data:image/png;base64,AAA', ' /assets/bg/a.jpg', 'https://s3.test/b.jpg', 42]))).toEqual({
      mode: 'image',
      images: ['/assets/bg/a.jpg', 'https://s3.test/b.jpg'],
    });
    const many = Array.from({ length: 15 }, (_, index) => `/assets/bg/hero_${index}.jpg`);
    const parsed = parseHeroBackground(images([many[0], ...many]));
    expect(parsed).toEqual({ mode: 'image', images: many.slice(0, HERO_MAX_IMAGES) });
  });

  it('mode video: wajib URL video aman, poster opsional', () => {
    expect(parseHeroBackground({ hero_bg_mode: 'video' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'video', hero_bg_video: '' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'video', hero_bg_video: 'data:video/mp4;base64,AAAA' })).toEqual({ mode: 'default' });
    expect(parseHeroBackground({ hero_bg_mode: 'video', hero_bg_video: '/assets/bg/hero_video_0123456789ab.mp4' })).toEqual({
      mode: 'video',
      src: '/assets/bg/hero_video_0123456789ab.mp4',
      poster: null,
    });
    expect(
      parseHeroBackground({ hero_bg_mode: 'video', hero_bg_video: 'https://s3.test/v.webm', hero_bg_video_poster: 'javascript:alert(1)' }),
    ).toEqual({ mode: 'video', src: 'https://s3.test/v.webm', poster: null });
    expect(
      parseHeroBackground({ hero_bg_mode: 'video', hero_bg_video: '/v.mp4', hero_bg_video_poster: ' /assets/bg/hero_poster_0123456789ab.jpg ' }),
    ).toEqual({ mode: 'video', src: '/v.mp4', poster: '/assets/bg/hero_poster_0123456789ab.jpg' });
  });

  it('kunci React berbeda untuk latar yang berbeda', () => {
    const keys = [
      heroBackgroundKey({ mode: 'default' }),
      heroBackgroundKey({ mode: 'image', images: ['/a.jpg'] }),
      heroBackgroundKey({ mode: 'image', images: ['/a.jpg', '/b.jpg'] }),
      heroBackgroundKey({ mode: 'video', src: '/v.mp4', poster: null }),
      heroBackgroundKey({ mode: 'video', src: '/v.mp4', poster: '/p.jpg' }),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/* ─── HeroMedia: gambar ───────────────────────────────────────────────────── */

const IMAGES = ['/assets/bg/hero_1.jpg', '/assets/bg/hero_2.jpg', '/assets/bg/hero_3.jpg'];

const renderMedia = (config: HeroMediaConfig) => render(<HeroMedia config={config} />);
const imgs = (container: HTMLElement) => Array.from(container.querySelectorAll('img'));
const srcs = (container: HTMLElement) => imgs(container).map((img) => img.getAttribute('src'));
const imgOf = (container: HTMLElement, src: string) => container.querySelector(`img[src="${src}"]`) as HTMLImageElement;
const activeSrc = (container: HTMLElement) =>
  imgs(container).find((img) => img.className.includes('z-[2]'))?.getAttribute('src');
/** jsdom tidak pernah memuat gambar: tandai semua gambar yang sedang terpasang sebagai selesai dimuat. */
const loadMounted = (container: HTMLElement) => imgs(container).forEach((img) => fireEvent.load(img));

describe('HeroMedia mode gambar', () => {
  it('satu gambar: statis tanpa tombol jeda, dimuat segera, dekoratif', () => {
    const { container } = renderMedia({ mode: 'image', images: [IMAGES[0]] });
    const layer = container.firstElementChild as HTMLElement;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toContain('-z-10');
    expect(layer.className).toContain('pointer-events-none');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const [img] = imgs(container);
    expect(imgs(container)).toHaveLength(1);
    expect(img).toHaveAttribute('src', IMAGES[0]);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img.className).toContain('object-cover');
  });

  // Lapisan keterbacaan (prop scrim dari Hero) diuji di heroLegibility.test.tsx
  it('tanpa prop scrim: media polos, tanpa cuci putih & pudar atas, hanya pudar bawah ke canvas', () => {
    const { container } = renderMedia({ mode: 'image', images: [IMAGES[0]] });
    const overlays = Array.from((container.firstElementChild as HTMLElement).querySelectorAll('div'));
    expect(overlays.some((el) => /bg-canvas\/\d+|from-canvas\/\d+/.test(el.className))).toBe(false);
    expect(overlays.some((el) => el.className.includes('top-0') && el.className.includes('from-canvas'))).toBe(false);
    const bottom = overlays.filter((el) => el.className.includes('bottom-0') && el.className.includes('to-canvas'));
    expect(bottom).toHaveLength(1);
    expect(bottom[0].className).toContain('h-40');
  });

  it('2+ gambar: dipasang bertahap, berganti tiap 6 detik, tombol jeda mengganti labelnya', () => {
    vi.useFakeTimers();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    // Yang tampil + berikutnya saja; gambar berikutnya lazy
    expect(srcs(container)).toEqual(IMAGES.slice(0, 2));
    expect(imgs(container)[1]).toHaveAttribute('loading', 'lazy');
    expect(imgs(container)[1]).not.toHaveAttribute('fetchpriority');
    expect(activeSrc(container)).toBe(IMAGES[0]);
    loadMounted(container);

    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[1]);
    expect(imgs(container)).toHaveLength(3);
    loadMounted(container);
    // Gambar sebelumnya tetap penuh di bawah gambar baru (crossfade tanpa kilasan kosong)
    expect(imgs(container)[0].className).toContain('z-[1] opacity-100');

    const button = screen.getByRole('button', { name: 'Jeda latar' });
    // Di atas isi hero (di luar lapisan -z-10) dan bisa diklik
    expect(button.className).toContain('pointer-events-auto');
    expect((button.closest('.z-10') as HTMLElement).className).not.toContain('-z-10');
    fireEvent.click(button);
    expect(button).toHaveAccessibleName('Putar latar');
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 3));
    expect(activeSrc(container)).toBe(IMAGES[1]);

    fireEvent.click(button);
    expect(button).toHaveAccessibleName('Jeda latar');
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[2]);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[0]);
  });

  it('berhenti saat hero di luar layar; tab yang aktif lagi tidak melanjutkan hero yang masih di luar layar', () => {
    vi.useFakeTimers();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    loadMounted(container);
    setIntersecting(false);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);

    setTabHidden(true);
    setTabHidden(false);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);

    setIntersecting(true);
    setTabHidden(true);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);

    setTabHidden(false);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[1]);
  });

  it('2 gambar: setiap pergantian (juga kedua & ketiga) memudar masuk dari 0 di atas gambar lama yang tetap penuh', () => {
    vi.useFakeTimers();
    const [a, b] = IMAGES;
    const { container } = renderMedia({ mode: 'image', images: [a, b] });
    loadMounted(container);
    let now = 0;
    const at = (ms: number) => {
      act(() => vi.advanceTimersByTime(ms - now));
      now = ms;
    };
    // Tersembunyi = transparan, sedikit membesar, tanpa transisi: titik awal pudar masuk berikutnya
    const expectHidden = (src: string) => {
      const { className } = imgOf(container, src);
      expect(className).toContain('z-0 opacity-0');
      expect(className).toContain('scale-[1.03]');
      expect(className).not.toContain('transition');
    };
    // Tailwind v4 scale-* memakai properti CSS `scale`, jadi properti itu yang ditransisikan (bukan transform)
    const expectFadingIn = (src: string) => {
      const { className } = imgOf(container, src);
      expect(className).toContain('z-[2] opacity-100 scale-100');
      expect(className).toContain('transition-[opacity,scale] duration-[1200ms] ease-calm');
    };
    const expectUnder = (src: string) => expect(imgOf(container, src).className).toContain('z-[1] opacity-100');

    expect(activeSrc(container)).toBe(a);
    [
      [b, a],
      [a, b],
      [b, a],
    ].forEach(([incoming, outgoing], step) => {
      const start = HERO_SLIDE_MS * (step + 1);
      at(start - 1);
      expectHidden(incoming);
      at(start);
      expectFadingIn(incoming);
      expectUnder(outgoing);
      // Gambar lama tetap penuh di bawah sampai pudar masuk selesai, baru disembunyikan
      at(start + HERO_FADE_MS - 1);
      expectUnder(outgoing);
      at(start + HERO_FADE_MS);
      expectHidden(outgoing);
      expectFadingIn(incoming);
    });
  });

  it('hanya berganti ke gambar yang sudah termuat: ditunggu, lalu berganti begitu termuat (minimal tetap 6 detik)', () => {
    vi.useFakeTimers();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    fireEvent.load(imgOf(container, IMAGES[0]));
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);
    expect(imgOf(container, IMAGES[1]).className).toContain('opacity-0');

    // 6 detik sudah lewat: langsung berganti begitu gambar berikutnya termuat
    fireEvent.load(imgOf(container, IMAGES[1]));
    expect(activeSrc(container)).toBe(IMAGES[1]);

    // Gambar berikutnya sudah termuat lebih dulu: gambar yang tampil tetap 6 detik penuh
    fireEvent.load(imgOf(container, IMAGES[2]));
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS - 1));
    expect(activeSrc(container)).toBe(IMAGES[1]);
    act(() => vi.advanceTimersByTime(1));
    expect(activeSrc(container)).toBe(IMAGES[2]);
  });

  it('berhenti (di luar layar) saat menunggu gambar berikutnya: gambar yang baru termuat tidak memutar tayangan', () => {
    vi.useFakeTimers();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    fireEvent.load(imgOf(container, IMAGES[0]));
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    setIntersecting(false);
    fireEvent.load(imgOf(container, IMAGES[1]));
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);

    // Terlihat lagi: tampil 6 detik lagi, lalu berganti
    setIntersecting(true);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS - 1));
    expect(activeSrc(container)).toBe(IMAGES[0]);
    act(() => vi.advanceTimersByTime(1));
    expect(activeSrc(container)).toBe(IMAGES[1]);
  });

  it('reduced motion: hanya gambar pertama, mulai dijeda, pengunjung bisa memutar; tanpa pudar & skala', () => {
    vi.useFakeTimers();
    mockReducedMotion();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    expect(imgs(container)).toHaveLength(1);
    loadMounted(container);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 3));
    expect(activeSrc(container)).toBe(IMAGES[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Putar latar' }));
    expect(imgs(container)).toHaveLength(2);
    loadMounted(container);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[1]);
    // Langsung berganti: tanpa transisi dan tanpa efek skala untuk pengguna ini
    act(() => vi.advanceTimersByTime(HERO_FADE_MS));
    imgs(container).forEach((img) => {
      expect(img.className).not.toContain('scale-[1.03]');
      expect(img.className).not.toContain('transition');
    });
  });

  it('gambar yang gagal dimuat dilewati, juga saat sedang ditunggu', () => {
    vi.useFakeTimers();
    const first = renderMedia({ mode: 'image', images: IMAGES });
    const { container } = first;
    fireEvent.error(imgs(container)[1]);
    expect(srcs(container)).toEqual([IMAGES[0], IMAGES[2]]);
    loadMounted(container);
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    expect(activeSrc(container)).toBe(IMAGES[2]);
    first.unmount();

    // Gambar berikutnya gagal saat sedang ditunggu → gambar sesudahnya dipasang, tampil begitu termuat
    const second = renderMedia({ mode: 'image', images: IMAGES }).container;
    fireEvent.load(imgOf(second, IMAGES[0]));
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS));
    fireEvent.error(imgOf(second, IMAGES[1]));
    expect(activeSrc(second)).toBe(IMAGES[0]);
    fireEvent.load(imgOf(second, IMAGES[2]));
    expect(activeSrc(second)).toBe(IMAGES[2]);
  });

  it('gambar pertama gagal: gambar berikutnya dipasang (juga saat dijeda) dan tampil begitu termuat', () => {
    mockReducedMotion();
    const { container } = renderMedia({ mode: 'image', images: IMAGES.slice(0, 2) });
    expect(srcs(container)).toEqual([IMAGES[0]]);
    fireEvent.error(imgs(container)[0]);
    expect(srcs(container)).toEqual([IMAGES[1]]);
    expect(activeSrc(container)).toBeUndefined();
    fireEvent.load(imgs(container)[0]);
    expect(activeSrc(container)).toBe(IMAGES[1]);
  });

  it('tombol jeda hanya selama masih ada 2+ gambar yang bisa tampil', () => {
    vi.useFakeTimers();
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    loadMounted(container);
    fireEvent.error(imgOf(container, IMAGES[1]));
    expect(screen.getByRole('button', { name: 'Jeda latar' })).toBeInTheDocument();
    fireEvent.error(imgOf(container, IMAGES[2]));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(HERO_SLIDE_MS * 2));
    expect(activeSrc(container)).toBe(IMAGES[0]);
  });

  it('semua gambar gagal dimuat → kanvas bawaan, tanpa tombol jeda', () => {
    const { container } = renderMedia({ mode: 'image', images: IMAGES });
    for (let guard = 0; imgs(container).length > 0 && guard < IMAGES.length; guard += 1) fireEvent.error(imgs(container)[0]);
    expect(imgs(container)).toHaveLength(0);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    // Sama dengan latar bawaan di Hero.tsx: di belakang isi hero
    expect((canvas?.parentElement as HTMLElement).className).toContain('absolute inset-0 -z-10');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tanpa timer & listener tersisa setelah dilepas', () => {
    vi.useFakeTimers();
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderMedia({ mode: 'image', images: IMAGES });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});

/* ─── HeroMedia: video ────────────────────────────────────────────────────── */

const VIDEO = '/assets/bg/hero_video_0123456789ab.mp4';
const POSTER = '/assets/bg/hero_poster_0123456789ab.jpg';
const videoOf = (container: HTMLElement) => container.querySelector('video') as HTMLVideoElement;

describe('HeroMedia mode video', () => {
  it('muted, berulang, inline, tanpa kontrol & PiP, poster; diputar saat boleh', async () => {
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    const video = videoOf(container);
    expect(video).toHaveAttribute('src', VIDEO);
    expect(video).toHaveAttribute('poster', POSTER);
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(video).toHaveAttribute('muted'); // defaultMuted memasang atribut (iOS)
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('disablepictureinpicture');
    expect(video).not.toHaveAttribute('controls');
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video).toHaveAttribute('tabindex', '-1');
    expect(video).toHaveAttribute('preload', 'auto');
    expect(video.className).toContain('object-cover');
    expect(play).toHaveBeenCalledTimes(1);

    const button = screen.getByRole('button', { name: 'Jeda latar' });
    fireEvent.click(button);
    expect(pause).toHaveBeenCalled();
    expect(button).toHaveAccessibleName('Putar latar');
    fireEvent.click(button);
    expect(play.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(button).toHaveAccessibleName('Jeda latar'));
  });

  it('tanpa poster: minta frame pertama lewat #t', () => {
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: null });
    expect(videoOf(container)).toHaveAttribute('src', `${VIDEO}#t=0.001`);
    expect(videoOf(container)).not.toHaveAttribute('poster');
  });

  it('reduced motion: tidak diputar otomatis, tombol "Putar latar" memutar langsung', () => {
    mockReducedMotion();
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    expect(play).not.toHaveBeenCalled();
    expect(videoOf(container)).toHaveAttribute('preload', 'metadata');
    fireEvent.click(screen.getByRole('button', { name: 'Putar latar' }));
    expect(play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Jeda latar' })).toBeInTheDocument();
  });

  it('hemat data (Save-Data): tidak diputar otomatis', () => {
    mockSaveData();
    renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Putar latar' })).toBeInTheDocument();
  });

  it('autoplay diblokir browser → status dijeda, poster tetap', async () => {
    play.mockImplementation(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    expect(await screen.findByRole('button', { name: 'Putar latar' })).toBeInTheDocument();
    expect(videoOf(container)).toHaveAttribute('poster', POSTER);
  });

  it('play() yang dibatalkan (AbortError, mis. pause() saat masih memulai) tidak mengubah status jadi dijeda', async () => {
    const aborted = () => Promise.reject(new DOMException('The play() request was interrupted by a call to pause().', 'AbortError'));
    play.mockImplementation(aborted);
    renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    await act(() => new Promise((done) => setTimeout(done, 0)));
    expect(play).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: 'Jeda latar' });

    // Juga dari tombol Putar
    play.mockImplementation(() => Promise.resolve());
    fireEvent.click(button);
    expect(button).toHaveAccessibleName('Putar latar');
    play.mockImplementation(aborted);
    fireEvent.click(button);
    await act(() => new Promise((done) => setTimeout(done, 0)));
    expect(button).toHaveAccessibleName('Jeda latar');
  });

  it('jeda saat di luar layar / tab disembunyikan, lanjut hanya bila terlihat lagi', () => {
    renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    expect(play).toHaveBeenCalledTimes(1);
    setIntersecting(false);
    expect(pause).toHaveBeenCalledTimes(1);
    setTabHidden(true);
    setTabHidden(false);
    expect(play).toHaveBeenCalledTimes(1);
    setIntersecting(true);
    expect(play).toHaveBeenCalledTimes(2);
    setTabHidden(true);
    expect(pause).toHaveBeenCalledTimes(2);
  });

  it('video gagal dimuat → disembunyikan, poster tampil sebagai gambar, tanpa tombol', () => {
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    fireEvent.error(videoOf(container));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', POSTER);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('video gagal tanpa poster → kanvas bawaan', () => {
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: null });
    expect(container.querySelector('canvas')).toBeNull();
    fireEvent.error(videoOf(container));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('video dan poster gagal → kanvas bawaan', () => {
    const { container } = renderMedia({ mode: 'video', src: VIDEO, poster: POSTER });
    fireEvent.error(videoOf(container));
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});

/* ─── Hero: setting dimuat → latar yang dipilih admin ─────────────────────── */

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

/** Hero segar per tes: cache setting (useCachedJson) & apiGet tingkat modul ikut kosong. */
const renderHero = async (settings: Promise<SiteSettings> | SiteSettings) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_settings') return json(await settings);
      return json({ templates: [] });
    }),
  );
  vi.resetModules();
  const { default: Hero } = await import('../../Hero');
  const view = render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
  return { ...view, section: view.container.querySelector('#beranda') as HTMLElement };
};

describe('Hero', () => {
  it('belum ada latar sebelum setting dimuat, lalu kanvas bawaan', async () => {
    let resolve: (value: SiteSettings) => void = () => {};
    const { section } = await renderHero(new Promise<SiteSettings>((done) => (resolve = done)));
    expect(section.className).toContain('relative isolate overflow-hidden');
    expect(section.querySelector('canvas')).toBeNull();
    expect(section.querySelector('video')).toBeNull();
    resolve({});
    await waitFor(() => expect(section.querySelector('canvas')).not.toBeNull());
  });

  it('mode gambar: tanpa kanvas, gambar admin tampil', async () => {
    const { section } = await renderHero({ hero_bg_mode: 'image', hero_images: JSON.stringify(IMAGES) });
    await waitFor(() => expect(section.querySelector(`img[src="${IMAGES[0]}"]`)).not.toBeNull());
    expect(section.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('button', { name: 'Jeda latar' })).toBeInTheDocument();
  });

  it('mode video: tanpa kanvas, video admin tampil', async () => {
    const { section } = await renderHero({ hero_bg_mode: 'video', hero_bg_video: VIDEO, hero_bg_video_poster: POSTER });
    await waitFor(() => expect(section.querySelector('video')).not.toBeNull());
    expect(section.querySelector('video')).toHaveAttribute('src', VIDEO);
    expect(section.querySelector('canvas')).toBeNull();
  });

  it('setting tidak lengkap / tidak aman → kanvas bawaan', async () => {
    const { section } = await renderHero({ hero_bg_mode: 'video', hero_bg_video: 'data:video/mp4;base64,AAAA', hero_images: '[]' });
    await waitFor(() => expect(section.querySelector('canvas')).not.toBeNull());
    expect(section.querySelector('video')).toBeNull();
  });
});
