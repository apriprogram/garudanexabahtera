// @vitest-environment jsdom
// Teks hero selalu terbaca di atas gambar/video (useHeroLegibility + Hero + HeroMedia): nada & lapisan dari sampel latar
// di belakang blok teks (kasus terburuk tayangan), cadangan aman selama mengukur / bila tidak bisa diukur, nada yang
// dipaksa admin, lapisan minimum, ukur ulang saat lebar / mode hero / ukuran blok teks berubah, hemat data, video
// (poster / frame pertama), media yang habis → tampilan bawaan, pudar bawah yang tidak sampai ke teks, dan kelas teks
// terang vs gelap.
// Jalankan: npx vitest run src/components/sections/hero/__tests__/heroLegibility.test.tsx
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Hero from '../../Hero';
import { HeroMedia } from '../HeroMedia';
import {
  HERO_DARK_FALLBACK_ALPHA,
  HERO_FALLBACK_ALPHA,
  backgroundSample,
  decideHeroLegibility,
  hexToRgb,
  type BackgroundSample,
  type Rgb,
} from '../heroContrast';
import { sampleImage, sampleVideo, type SampleResult } from '../heroSampling';

// Pengaturan situs per tes (pola navbarHeroMedia.test.tsx)
const site = vi.hoisted(() => ({ settings: {} as Record<string, string | undefined>, loaded: true }));
vi.mock('../../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => site,
}));

// jsdom tidak memuat gambar & tidak punya canvas: sampel latar diganti hasil yang diatur per tes
vi.mock('../heroSampling', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../heroSampling')>()),
  sampleImage: vi.fn(),
  sampleVideo: vi.fn(),
}));

const pixels = (n: number, [r, g, b]: Rgb) => Array.from({ length: n }, () => [r, g, b, 255]).flat();
const sampleOf = (...groups: [number, string][]): BackgroundSample =>
  backgroundSample(groups.flatMap(([n, hex]) => pixels(n, hexToRgb(hex))))!;
const DARK = sampleOf([90, '#0B1430'], [10, '#1D3A8A']);
const BRIGHT = sampleOf([80, '#F4F7FF'], [20, '#DCE6F5']);
const MIXED = sampleOf([55, '#06102C'], [15, '#1A6BFF'], [30, '#F2F6FF']);
const ok = (sample: BackgroundSample): SampleResult => ({ kind: 'sample', sample });

const IMAGE_1 = '/assets/bg/hero_1.jpg';
const IMAGE_2 = '/assets/bg/hero_2.jpg';
const VIDEO = '/assets/bg/hero_video_0123456789ab.mp4';
const POSTER = '/assets/bg/hero_poster_0123456789ab.jpg';
const image = (...urls: string[]) => ({ hero_bg_mode: 'image', hero_images: JSON.stringify(urls) });

/** Tata letak tiruan: section 1366×900, blok teks x 48..643, y 100..800 (jsdom tidak menghitung tata letak). */
const LAYOUT = { section: { width: 1366, height: 900 }, text: { left: 48, top: 100, width: 595, height: 700 } };
const isText = (el: Element) => el.classList.contains('hero-parallax') && el.querySelector('[role="tablist"]') !== null;
const rect = ({ left, top, width, height }: { left: number; top: number; width: number; height: number }) =>
  ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;

const originalRect = HTMLElement.prototype.getBoundingClientRect;
let saveData = false;

beforeEach(() => {
  site.settings = {};
  site.loaded = true;
  saveData = false;
  vi.mocked(sampleImage).mockReset().mockImplementation(() => new Promise(() => {})); // belum selesai = sedang mengukur
  vi.mocked(sampleVideo).mockReset().mockReturnValue({ kind: 'unmeasurable' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ templates: [] }), { status: 200 })));
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.id === 'beranda' ? LAYOUT.section.width : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.id === 'beranda' ? LAYOUT.section.height : 0; } });
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement) {
    if (this.id === 'beranda') return rect({ left: 0, top: 0, ...LAYOUT.section });
    if (isText(this)) return rect(LAYOUT.text);
    return rect({ left: 0, top: 0, width: 0, height: 0 });
  };
  Object.defineProperty(window.navigator, 'connection', { configurable: true, get: () => ({ saveData }) });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  Reflect.deleteProperty(window.navigator, 'connection');
});

const renderHero = () => {
  const view = render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
  const section = view.container.querySelector('#beranda') as HTMLElement;
  return {
    ...view,
    section,
    textColumn: () => section.querySelector('.hero-parallax') as HTMLElement,
    title: () => section.querySelector('h1') as HTMLElement,
    scrim: () => section.querySelector<HTMLElement>('[data-hero-scrim]'),
    fade: () => Array.from(section.querySelectorAll<HTMLElement>('div')).find((el) => el.className.includes('to-canvas')) ?? null,
  };
};

const alphaOf = (scrim: HTMLElement | null) => Number(scrim?.style.getPropertyValue('--scrim-a'));
const rgbOf = (scrim: HTMLElement | null) => scrim?.style.getPropertyValue('--scrim-rgb');

describe('Hero: latar bawaan', () => {
  it('tanpa nada & lapisan: teks tampil seperti biasa', async () => {
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('canvas')).not.toBeNull());
    expect(view.textColumn()).not.toHaveAttribute('data-hero-tone');
    expect(view.scrim()).toBeNull();
    expect(view.title().className).toContain('text-fg');
    expect(view.section.querySelector('[role="tablist"]')!.className).toContain('bg-surface');
    expect(sampleImage).not.toHaveBeenCalled();
  });
});

describe('Hero: gambar latar', () => {
  it('selama mengukur: cadangan aman (teks terang + lapisan obsidian ≥ 55%), tidak pernah teks gelap tanpa lapisan', async () => {
    site.settings = image(IMAGE_1);
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(rgbOf(view.scrim())).toBe('18 22 32');
    expect(alphaOf(view.scrim())).toBeCloseTo(HERO_FALLBACK_ALPHA, 3);
    expect(alphaOf(view.scrim())).toBeGreaterThanOrEqual(0.55);
    // Lapisan di atas media, di bawah pudar bawah
    expect(view.scrim()!.className).toContain('hero-scrim');
    expect(view.scrim()!.className).toContain('z-[3]');
    expect(view.fade()!.className).toContain('z-[4]');
  });

  it('gambar gelap → teks terang: judul putih, aksen brand-200, poin, centang, toggle & tombol garis terang', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(alphaOf(view.scrim())).toBeCloseTo(0.4, 3));
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(view.title().className).toContain('text-on-media');
    expect(view.title().querySelector('.text-on-media-accent')).not.toBeNull();
    const point = view.section.querySelector('li') as HTMLElement;
    expect(point.className).toContain('text-on-media-muted');
    expect(point.querySelector('span')!.className).toContain('bg-primary');
    expect(view.section.querySelector('[role="tablist"]')!.className).toContain('bg-fg/70');
    expect(view.section.querySelector('.btn-outline-on-media')).not.toBeNull();
    expect(view.section.querySelector('.btn-outline-clear')).toBeNull();
    // Tombol utama tetap biru brand
    expect(view.section.querySelector('.btn-primary')).not.toBeNull();
  });

  it('gambar terang → teks gelap (tampilan bawaan) di atas lapisan putih', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(rgbOf(view.scrim())).toBe('255 255 255');
    expect(alphaOf(view.scrim())).toBeCloseTo(0.4, 3);
    expect(view.title().className).toContain('text-fg');
    expect(view.title().querySelector('.text-primary')).not.toBeNull();
    expect(view.section.querySelector('.btn-outline-clear')).not.toBeNull();
  });

  it('latar campuran: lapisan dinaikkan di atas minimum admin sampai terbaca', async () => {
    site.settings = { ...image(IMAGE_1), hero_overlay: '20' };
    vi.mocked(sampleImage).mockResolvedValue(ok(MIXED));
    const expected = decideHeroLegibility(MIXED, 'auto', 20);
    const view = renderHero();
    await waitFor(() => expect(alphaOf(view.scrim())).toBeCloseTo(expected.overlayAlpha, 3));
    expect(expected.overlayAlpha).toBeGreaterThan(0.2);
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', expected.tone);
  });

  it('tayangan: semua gambar diukur dengan area blok teks, dipakai kasus terburuk', async () => {
    site.settings = image(IMAGE_1, IMAGE_2);
    vi.mocked(sampleImage).mockImplementation(async (src) => ok(src === IMAGE_1 ? DARK : MIXED));
    const expected = decideHeroLegibility([DARK, MIXED], 'auto', 40);
    const view = renderHero();
    await waitFor(() => expect(alphaOf(view.scrim())).toBeCloseTo(expected.overlayAlpha, 3));
    expect(vi.mocked(sampleImage).mock.calls.map(([src]) => src)).toEqual([IMAGE_1, IMAGE_2]);
    // Blok teks ± 16px di dalam section 1366×900
    expect(vi.mocked(sampleImage).mock.calls[0][1]).toEqual({
      box: { w: 1366, h: 900 },
      region: { x: 32, y: 84, w: 627, h: 732 },
    });
    // HP & tablet (matchMedia ≥ 1024px tidak cocok di jsdom): lapisan pekat sampai 16px di bawah blok teks
    expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('816px');
    // Pudar bawah tidak sampai ke blok teks: 900 − 800 − 8 = 92px
    expect(view.fade()!.style.height).toBe('92px');
  });

  it('nada & lapisan dari admin: nada dipaksa, lapisan admin minimum', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark', hero_overlay: '70' };
    vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(alphaOf(view.scrim())).toBeCloseTo(0.7, 3));
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(rgbOf(view.scrim())).toBe('255 255 255');
  });

  it('nada gelap dipaksa selama mengukur: lapisan putih yang cukup untuk latar hitam', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark' };
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(alphaOf(view.scrim())).toBeCloseTo(HERO_DARK_FALLBACK_ALPHA, 3);
  });

  it('tidak bisa diukur (mis. lintas domain tanpa CORS): tetap cadangan aman', async () => {
    site.settings = image('https://s3.test/bucket/assets/bg/hero_1.jpg');
    vi.mocked(sampleImage).mockResolvedValue({ kind: 'unmeasurable' });
    const view = renderHero();
    await waitFor(() => expect(sampleImage).toHaveBeenCalled());
    await act(async () => {});
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(alphaOf(view.scrim())).toBeCloseTo(HERO_FALLBACK_ALPHA, 3);
  });

  it('hemat data + tayangan: gambar lain tidak diunduh hanya untuk diukur, cadangan aman', async () => {
    saveData = true;
    site.settings = image(IMAGE_1, IMAGE_2);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    await act(async () => {});
    expect(sampleImage).not.toHaveBeenCalled();
    expect(alphaOf(view.scrim())).toBeCloseTo(HERO_FALLBACK_ALPHA, 3);
  });

  it('diukur ulang saat lebar jendela berubah (tanpa unduh ulang: sampleImage memakai gambar tersimpan)', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    renderHero();
    await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(1));
    const width = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width - 300 });
      fireEvent(window, new Event('resize'));
      await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(2), { timeout: 2000 });
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('ganti mode Template ↔ Custom: diukur ulang dengan blok teks yang baru (di HP mode Custom lebih tinggi)', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('816px'));
    const height = LAYOUT.text.height;
    try {
      LAYOUT.text.height = 760;
      fireEvent.click(view.getAllByRole('tab')[1]);
      await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(2));
      expect(vi.mocked(sampleImage).mock.calls[1][1].region).toEqual({ x: 32, y: 84, w: 627, h: 792 });
      await waitFor(() => expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('876px'));
    } finally {
      LAYOUT.text.height = height;
    }
  });

  it('ukuran blok teks berubah (ResizeObserver): diukur ulang; laporan pertama hanya dicatat', async () => {
    // Callback per elemen yang diamati (komponen lain boleh punya ResizeObserver sendiri)
    const observed = new Map<Element, ResizeObserverCallback>();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }
        observe(el: Element) {
          observed.set(el, this.callback);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    let textHeight = 700;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return isText(this) ? textHeight : 0;
      },
    });
    try {
      site.settings = image(IMAGE_1);
      vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
      const view = renderHero();
      await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(1));
      const callback = observed.get(view.textColumn());
      expect(callback).toBeDefined();
      const report = () =>
        act(() => {
          callback!([{ target: view.textColumn() } as unknown as ResizeObserverEntry], {} as ResizeObserver);
        });
      report(); // laporan pertama: ukuran awal, tidak mengukur ulang
      report(); // ukuran sama
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(sampleImage).toHaveBeenCalledTimes(1);
      textHeight = 760;
      report();
      await waitFor(() => expect(sampleImage).toHaveBeenCalledTimes(2), { timeout: 2000 });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
    }
  });

  it('semua gambar gagal dimuat → kanvas bawaan, teks kembali tampilan bawaan tanpa lapisan', async () => {
    site.settings = image(IMAGE_1);
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector(`img[src="${IMAGE_1}"]`)).not.toBeNull());
    fireEvent.error(view.section.querySelector(`img[src="${IMAGE_1}"]`) as HTMLImageElement);
    await waitFor(() => expect(view.section.querySelector('canvas')).not.toBeNull());
    expect(view.textColumn()).not.toHaveAttribute('data-hero-tone');
    expect(view.scrim()).toBeNull();
    expect(view.title().className).toContain('text-fg');
  });
});

describe('Hero: video latar', () => {
  it('dengan poster: poster yang diukur', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO, hero_bg_video_poster: POSTER };
    vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(vi.mocked(sampleImage).mock.calls[0][0]).toBe(POSTER);
    expect(sampleVideo).not.toHaveBeenCalled();
  });

  it('tanpa poster: cadangan sampai frame pertama (loadeddata), lalu frame itu yang diukur', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO };
    vi.mocked(sampleVideo).mockReturnValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('video')).not.toBeNull());
    await act(async () => {});
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(sampleVideo).not.toHaveBeenCalled();
    const video = view.section.querySelector('video') as HTMLVideoElement;
    fireEvent.loadedData(video);
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(vi.mocked(sampleVideo).mock.calls[0][0]).toBe(video);
  });
});

describe('HeroMedia: lapisan & pudar bawah', () => {
  it('tanpa scrim: media polos, pudar bawah bawaan h-40', () => {
    const { container } = render(<HeroMedia config={{ mode: 'image', images: [IMAGE_1] }} />);
    expect(container.querySelector('[data-hero-scrim]')).toBeNull();
    const fade = Array.from(container.querySelectorAll<HTMLElement>('div')).find((el) => el.className.includes('to-canvas'))!;
    expect(fade.className).toContain('h-40');
    expect(fade.style.height).toBe('');
  });

  it('dengan scrim: warna, alpha, dan tepi blok teks lewat variabel CSS; pudar bawah setinggi fadeHeight', () => {
    const { container } = render(
      <HeroMedia config={{ mode: 'image', images: [IMAGE_1] }} scrim={{ tone: 'light', alpha: 0.4567, end: 640 }} fadeHeight={96} />,
    );
    const scrim = container.querySelector<HTMLElement>('[data-hero-scrim="light"]')!;
    expect(scrim.style.getPropertyValue('--scrim-rgb')).toBe('18 22 32');
    expect(scrim.style.getPropertyValue('--scrim-a')).toBe('0.457');
    expect(scrim.style.getPropertyValue('--scrim-end')).toBe('640px');
    // Lapisan di dalam lapisan media (aria-hidden, di belakang isi), tanpa blur
    expect(scrim.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(scrim.className).not.toMatch(/blur|shadow/);
    const fade = Array.from(container.querySelectorAll<HTMLElement>('div')).find((el) => el.className.includes('to-canvas'))!;
    expect(fade.style.height).toBe('96px');
  });

  it('scrim tanpa tepi terukur: memakai bawaan CSS; nada gelap = putih', () => {
    const { container } = render(<HeroMedia config={{ mode: 'image', images: [IMAGE_1] }} scrim={{ tone: 'dark', alpha: 0.3, end: null }} />);
    const scrim = container.querySelector<HTMLElement>('[data-hero-scrim="dark"]')!;
    expect(scrim.style.getPropertyValue('--scrim-rgb')).toBe('255 255 255');
    expect(scrim.style.getPropertyValue('--scrim-end')).toBe('');
  });

  it('onVideoFrame saat frame pertama siap; onExhausted saat tidak ada media yang bisa tampil', () => {
    const onVideoFrame = vi.fn();
    const onExhausted = vi.fn();
    const { container } = render(
      <HeroMedia config={{ mode: 'video', src: VIDEO, poster: null }} onVideoFrame={onVideoFrame} onExhausted={onExhausted} />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    fireEvent.loadedData(video);
    expect(onVideoFrame).toHaveBeenCalledWith(video);
    expect(onExhausted).not.toHaveBeenCalled();
    fireEvent.error(video);
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });
});
