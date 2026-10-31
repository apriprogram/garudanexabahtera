// @vitest-environment jsdom
// Teks hero di atas gambar/video (useHeroLegibility + Hero + HeroMedia), permintaan pemilik 2026-10-23: lapisan =
// setting admin `hero_overlay` PERSIS (bawaan 0 = tanpa elemen lapisan, tidak pernah ditebalkan website), nada teks
// dari sampel latar di belakang blok teks (kasus terburuk tayangan) atau dipaksa admin, cadangan selama mengukur / bila
// tidak bisa diukur (teks gelap seperti halaman, terang bila dipaksa; lapisan admin persis), HTML server = render
// hidrasi pertama, tanpa bayangan apa pun di hero, ukur
// ulang saat lebar / mode hero / ukuran blok teks berubah, hemat data, video (poster / frame pertama), media yang
// habis → tampilan bawaan, pudar bawah yang tidak sampai ke teks, dan kelas teks terang vs gelap.
// Jalankan: npx vitest run src/components/sections/hero/__tests__/heroLegibility.test.tsx
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Hero gaya klasik (Hero.tsx memuatnya lazy; pemilihan gaya diuji di heroStyle.test.tsx)
import Hero from '../HeroClassic';
import { HeroMedia } from '../HeroMedia';
import { backgroundSample, decideHeroLegibility, hexToRgb, type BackgroundSample, type Rgb } from '../heroContrast';
import { sampleImage, sampleVideo, type SampleResult } from '../heroSampling';
import { getHeroNavState } from '../heroNavState';

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
/** Pita teks navbar (useHeroLegibility): x 0, setengah tengah bar 64px (jsdom tidak membaca --nav-h) = y 16, tinggi 32. */
const isStrip = (layout: { region: { x: number; y: number; h: number } }) =>
  layout.region.x === 0 && layout.region.y === 16 && layout.region.h === 32;
/** Panggilan sampel untuk area blok teks saja (tanpa strip navbar). */
const textCalls = () => vi.mocked(sampleImage).mock.calls.filter(([, layout]) => !isStrip(layout));
/** Selesai mengukur: sampel diminta, lalu hasilnya (promise tiruan) diterapkan */
const measuredOnce = async () => {
  await waitFor(() => expect(sampleImage).toHaveBeenCalled());
  await act(async () => {});
};

/** Utilitas Tailwind / kelas buatan yang memberi bayangan atau pendar (juga dengan varian, mis. hover:shadow-md). */
const SHADOW_CLASS = /^(shadow|drop-shadow|text-shadow|hero-shadow|glow)(-|$)/;
/** Elemen di dalam hero yang memakai kelas bayangan atau gaya inline bayangan/filter; kosong = hero datar. */
const shadowedElements = (root: Element) =>
  [root, ...root.querySelectorAll('*')].flatMap((el) => {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/).filter((token) => SHADOW_CLASS.test(token.split(':').pop() ?? ''));
    const style = (el as HTMLElement).style;
    const inline = style ? [style.textShadow, style.boxShadow, style.filter].filter(Boolean) : [];
    return classes.length > 0 || inline.length > 0 ? [`${el.tagName.toLowerCase()}: ${[...classes, ...inline].join(' ')}`] : [];
  });

describe('Hero: latar bawaan', () => {
  it('tanpa nada & lapisan: teks tampil seperti biasa', async () => {
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('canvas')).not.toBeNull());
    expect(view.textColumn()).not.toHaveAttribute('data-hero-tone');
    expect(view.scrim()).toBeNull();
    expect(view.title().className).toContain('text-fg');
    expect(view.section.querySelector('[role="tablist"]')!.className).toContain('bg-surface/60');
    expect(sampleImage).not.toHaveBeenCalled();
  });
});

describe('Hero: gambar latar', () => {
  it('bawaan (hero_overlay tidak ada) = 0%: tanpa elemen lapisan sama sekali, juga selama mengukur', async () => {
    site.settings = image(IMAGE_1);
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector(`img[src="${IMAGE_1}"]`)).not.toBeNull());
    // Gambar belum terukur (mungkin belum tampil: di belakang teks masih halaman putih) -> teks gelap, bukan putih
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(view.title().className).toContain('text-fg');
    expect(view.section.querySelector('.text-on-media, .text-on-media-muted, .btn-outline-on-media')).toBeNull();
    expect(view.scrim()).toBeNull();
    expect(view.section.querySelector('.hero-scrim')).toBeNull();
    // Pudar bawah ke canvas tetap ada (bukan lapisan gelap)
    expect(view.fade()).not.toBeNull();
  });

  it('selama mengukur: cadangan = teks gelap dengan lapisan admin persis (putih, tidak ditebalkan, tidak menggelapkan)', async () => {
    site.settings = { ...image(IMAGE_1), hero_overlay: '40' };
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(view.title().className).toContain('text-fg');
    expect(rgbOf(view.scrim())).toBe('255 255 255');
    expect(alphaOf(view.scrim())).toBe(0.4);
    // Lapisan di atas media, di bawah pudar bawah
    expect(view.scrim()!.className).toContain('hero-scrim');
    expect(view.scrim()!.className).toContain('z-[3]');
    expect(view.fade()!.className).toContain('z-[4]');
  });

  it('gambar gelap → teks terang: judul putih, aksen brand-200, poin, centang, toggle & tombol garis terang', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await measuredOnce();
    expect(view.scrim()).toBeNull();
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

  it('gambar terang → teks gelap (tampilan bawaan), tanpa lapisan di 0%; lapisan putih persis bila admin memasangnya', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(view.scrim()).toBeNull();
    expect(view.title().className).toContain('text-fg');
    expect(view.title().querySelector('.text-primary')).not.toBeNull();
    expect(view.section.querySelector('.btn-outline-clear')).not.toBeNull();
    view.unmount();

    site.settings = { ...image(IMAGE_1), hero_overlay: '40' };
    const layered = renderHero();
    await waitFor(() => expect(layered.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(rgbOf(layered.scrim())).toBe('255 255 255');
    expect(alphaOf(layered.scrim())).toBe(0.4);
  });

  it('latar campuran kurang terbaca: lapisan tetap persis setting admin, tidak dinaikkan website', async () => {
    site.settings = { ...image(IMAGE_1), hero_overlay: '20' };
    vi.mocked(sampleImage).mockResolvedValue(ok(MIXED));
    const expected = decideHeroLegibility(MIXED, 'auto', 20);
    expect(expected).toMatchObject({ overlayAlpha: 0.2, readable: false });
    const view = renderHero();
    await measuredOnce();
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', expected.tone));
    expect(alphaOf(view.scrim())).toBe(0.2);
  });

  it('lapisan persis untuk setiap nilai admin, juga teks terang yang dipaksa di atas gambar terang', async () => {
    for (const overlay of ['0', '15', '55', '80']) {
      site.settings = { ...image(IMAGE_1), hero_text_tone: 'light', hero_overlay: overlay };
      vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
      const view = renderHero();
      await measuredOnce();
      expect(view.textColumn(), overlay).toHaveAttribute('data-hero-tone', 'light');
      if (overlay === '0') expect(view.scrim(), overlay).toBeNull();
      else expect(alphaOf(view.scrim()), overlay).toBe(Number(overlay) / 100);
      view.unmount();
      vi.mocked(sampleImage).mockClear();
    }
  });

  it('tayangan: semua gambar diukur dengan area blok teks, dipakai kasus terburuk', async () => {
    site.settings = { ...image(IMAGE_1, IMAGE_2), hero_overlay: '40' };
    vi.mocked(sampleImage).mockImplementation(async (src) => ok(src === IMAGE_1 ? DARK : MIXED));
    const expected = decideHeroLegibility([DARK, MIXED], 'auto', 40);
    expect(expected.overlayAlpha).toBe(0.4);
    const view = renderHero();
    await waitFor(() => expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('816px'));
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', expected.tone);
    expect(alphaOf(view.scrim())).toBe(0.4);
    expect(textCalls().map(([src]) => src)).toEqual([IMAGE_1, IMAGE_2]);
    // Blok teks ± 16px di dalam section 1366×900
    expect(textCalls()[0][1]).toEqual({
      box: { w: 1366, h: 900 },
      region: { x: 32, y: 84, w: 627, h: 732 },
    });
    // HP & tablet (matchMedia ≥ 1024px tidak cocok di jsdom): lapisan pekat sampai 16px di bawah blok teks
    expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('816px');
    // Pudar bawah tidak sampai ke blok teks: 900 − 800 − 8 = 92px
    expect(view.fade()!.style.height).toBe('92px');
  });

  it('nada & lapisan dari admin: nada dipaksa, lapisan admin persis', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark', hero_overlay: '70' };
    vi.mocked(sampleImage).mockResolvedValue(ok(BRIGHT));
    const view = renderHero();
    await measuredOnce();
    expect(alphaOf(view.scrim())).toBe(0.7);
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(rgbOf(view.scrim())).toBe('255 255 255');
  });

  it('nada terang dipaksa selama mengukur: pilihan admin dihormati, lapisan admin persis', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'light', hero_overlay: '30' };
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(rgbOf(view.scrim())).toBe('18 22 32');
    expect(alphaOf(view.scrim())).toBe(0.3);
  });

  it('nada gelap dipaksa selama mengukur: teks gelap dengan lapisan admin persis (0% = tanpa lapisan)', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark' };
    const view = renderHero();
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    expect(view.scrim()).toBeNull();
    view.unmount();

    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark', hero_overlay: '25' };
    const layered = renderHero();
    await waitFor(() => expect(layered.scrim()).not.toBeNull());
    expect(layered.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(rgbOf(layered.scrim())).toBe('255 255 255');
    expect(alphaOf(layered.scrim())).toBe(0.25);
  });

  it('tidak bisa diukur (mis. lintas domain tanpa CORS): cadangan, teks gelap dengan lapisan admin persis', async () => {
    for (const overlay of [undefined, '40']) {
      site.settings = { ...image('https://s3.test/bucket/assets/bg/hero_1.jpg'), hero_overlay: overlay };
      vi.mocked(sampleImage).mockResolvedValue({ kind: 'unmeasurable' });
      const view = renderHero();
      await measuredOnce();
      expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
      if (overlay) expect(alphaOf(view.scrim())).toBe(0.4);
      else expect(view.scrim()).toBeNull();
      view.unmount();
      vi.mocked(sampleImage).mockClear();
    }
  });

  it('hemat data + tayangan: gambar lain tidak diunduh hanya untuk diukur, cadangan dengan lapisan admin persis', async () => {
    saveData = true;
    site.settings = { ...image(IMAGE_1, IMAGE_2), hero_overlay: '30' };
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(view.scrim()).not.toBeNull());
    await act(async () => {});
    expect(sampleImage).not.toHaveBeenCalled();
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(alphaOf(view.scrim())).toBe(0.3);
  });

  it('diukur ulang saat lebar jendela berubah (tanpa unduh ulang: sampleImage memakai gambar tersimpan)', async () => {
    site.settings = image(IMAGE_1);
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    renderHero();
    await waitFor(() => expect(textCalls()).toHaveLength(1));
    const width = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width - 300 });
      fireEvent(window, new Event('resize'));
      await waitFor(() => expect(textCalls()).toHaveLength(2), { timeout: 2000 });
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('ganti mode Template ↔ Custom: diukur ulang dengan blok teks yang baru (di HP mode Custom lebih tinggi)', async () => {
    site.settings = { ...image(IMAGE_1), hero_overlay: '40' };
    vi.mocked(sampleImage).mockResolvedValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(textCalls()).toHaveLength(1));
    await waitFor(() => expect(view.scrim()!.style.getPropertyValue('--scrim-end')).toBe('816px'));
    const height = LAYOUT.text.height;
    try {
      LAYOUT.text.height = 760;
      fireEvent.click(view.getAllByRole('tab')[1]);
      await waitFor(() => expect(textCalls()).toHaveLength(2));
      expect(textCalls()[1][1].region).toEqual({ x: 32, y: 84, w: 627, h: 792 });
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
      await waitFor(() => expect(textCalls()).toHaveLength(1));
      const callback = observed.get(view.textColumn());
      expect(callback).toBeDefined();
      const report = () =>
        act(() => {
          callback!([{ target: view.textColumn() } as unknown as ResizeObserverEntry], {} as ResizeObserver);
        });
      report(); // laporan pertama: ukuran awal, tidak mengukur ulang
      report(); // ukuran sama
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(textCalls()).toHaveLength(1);
      textHeight = 760;
      report();
      await waitFor(() => expect(textCalls()).toHaveLength(2), { timeout: 2000 });
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

  it('tanpa poster: cadangan (teks gelap) sampai frame pertama (loadeddata), lalu frame itu yang diukur', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO };
    vi.mocked(sampleVideo).mockReturnValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('video')).not.toBeNull());
    await act(async () => {});
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    expect(sampleVideo).not.toHaveBeenCalled();
    const video = view.section.querySelector('video') as HTMLVideoElement;
    fireEvent.loadedData(video);
    await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light'));
    expect(vi.mocked(sampleVideo).mock.calls[0][0]).toBe(video);
  });

  it('seperti produksi (video, teks terang, lapisan 0): video tidak pernah ditutup lapisan, sebelum & sesudah frame', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO, hero_text_tone: 'light', hero_overlay: '0' };
    vi.mocked(sampleVideo).mockReturnValue(ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('video')).not.toBeNull());
    await act(async () => {});
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(view.scrim()).toBeNull();
    fireEvent.loadedData(view.section.querySelector('video') as HTMLVideoElement);
    await waitFor(() => expect(sampleVideo).toHaveBeenCalled());
    await act(async () => {});
    // Latar terang + teks terang dipaksa: tetap tanpa lapisan (website tidak menambah apa pun sendiri)
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'light');
    expect(view.scrim()).toBeNull();
    expect(view.section.querySelector('.hero-scrim')).toBeNull();
  });
});

describe('Hero → navbar: strip latar di belakang navbar (permintaan pemilik 2026-10-23)', () => {
  /** Sampel per area: pita teks navbar (x 0, y 16, tinggi 32) vs blok teks. */
  const byArea = (strip: SampleResult, text: SampleResult) =>
    vi.mocked(sampleImage).mockImplementation(async (_src, layout) => (isStrip(layout) ? strip : text));

  it('latar bawaan: navbar tanpa media (tetap seperti biasa)', async () => {
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('canvas')).not.toBeNull());
    expect(getHeroNavState()).toEqual({ media: false, tone: null });
  });

  it('strip gelap di atas area teks yang terang: navbar teks putih, teks hero tetap gelap (diukur terpisah)', async () => {
    site.settings = image(IMAGE_1);
    byArea(ok(DARK), ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(getHeroNavState()).toEqual({ media: true, tone: 'light' }));
    expect(view.textColumn()).toHaveAttribute('data-hero-tone', 'dark');
    // Strip = selebar section, setinggi navbar, dari puncak
    expect(vi.mocked(sampleImage).mock.calls.some(([, layout]) => isStrip(layout) && layout.region.w === 1366)).toBe(true);
  });

  it('strip terang: navbar transparan dengan teks gelap', async () => {
    site.settings = image(IMAGE_1);
    byArea(ok(BRIGHT), ok(DARK));
    renderHero();
    await waitFor(() => expect(getHeroNavState()).toEqual({ media: true, tone: 'dark' }));
  });

  it('selama mengukur atau tidak terukur: tanpa nada → navbar putih kaca; strip ramai tetap transparan (nada lebih terbaca)', async () => {
    site.settings = image(IMAGE_1);
    const view = renderHero();
    await waitFor(() => expect(getHeroNavState()).toEqual({ media: true, tone: null }));
    view.unmount();

    byArea(ok(MIXED), ok(BRIGHT));
    const busy = renderHero();
    await waitFor(() => expect(busy.textColumn()).toHaveAttribute('data-hero-tone', 'dark'));
    await act(async () => {});
    // Permintaan pemilik 2026-10-23: transparan di desktop DAN HP, walau tidak ada nada ≥ 3:1
    expect(getHeroNavState()).toEqual({ media: true, tone: expect.stringMatching(/^(light|dark)$/) });
    busy.unmount();

    byArea({ kind: 'unmeasurable' }, ok(BRIGHT));
    renderHero();
    await measuredOnce();
    expect(getHeroNavState()).toEqual({ media: true, tone: null });
  });

  it('nada teks hero yang dipaksa admin tidak mengubah nada navbar (strip diukur sendiri)', async () => {
    site.settings = { ...image(IMAGE_1), hero_text_tone: 'dark' };
    byArea(ok(DARK), ok(BRIGHT));
    renderHero();
    await waitFor(() => expect(getHeroNavState().tone).toBe('light'));
  });

  it('tayangan: nada navbar dari kasus terburuk SEMUA gambar, tetap transparan', async () => {
    site.settings = image(IMAGE_1, IMAGE_2);
    vi.mocked(sampleImage).mockImplementation(async (src, layout) => (isStrip(layout) ? ok(src === IMAGE_1 ? DARK : BRIGHT) : ok(BRIGHT)));
    renderHero();
    await waitFor(() => expect(textCalls()).toHaveLength(2));
    await act(async () => {});
    // Gambar 1 gelap, gambar 2 terang di strip: tidak ada nada yang terbaca di keduanya → nada yang kontrasnya lebih
    // tinggi, navbar tetap transparan (permintaan pemilik 2026-10-23)
    expect(getHeroNavState()).toEqual({ media: true, tone: expect.stringMatching(/^(light|dark)$/) });
  });

  it('video: strip diukur dari frame pertama bila tanpa poster', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO };
    vi.mocked(sampleVideo).mockReturnValue(ok(DARK));
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('video')).not.toBeNull());
    await act(async () => {});
    expect(getHeroNavState()).toEqual({ media: true, tone: null });
    fireEvent.loadedData(view.section.querySelector('video') as HTMLVideoElement);
    await waitFor(() => expect(getHeroNavState()).toEqual({ media: true, tone: 'light' }));
  });

  it('semua media gagal (kanvas bawaan) atau hero dilepas (pindah halaman): kembali tanpa media', async () => {
    site.settings = image(IMAGE_1);
    byArea(ok(DARK), ok(BRIGHT));
    const view = renderHero();
    await waitFor(() => expect(getHeroNavState().tone).toBe('light'));
    fireEvent.error(view.section.querySelector(`img[src="${IMAGE_1}"]`) as HTMLImageElement);
    await waitFor(() => expect(getHeroNavState()).toEqual({ media: false, tone: null }));
    view.unmount();

    const again = renderHero();
    await waitFor(() => expect(getHeroNavState().tone).toBe('light'));
    again.unmount();
    expect(getHeroNavState()).toEqual({ media: false, tone: null });
  });
});

describe('Hero: tanpa bayangan (permintaan pemilik 2026-10-23)', () => {
  it('tidak ada kelas atau gaya bayangan / pendar di elemen hero mana pun, di kedua nada & kedua mode', async () => {
    for (const [sample, tone] of [[DARK, 'light'], [BRIGHT, 'dark']] as const) {
      site.settings = { ...image(IMAGE_1, IMAGE_2), hero_overlay: '30' };
      vi.mocked(sampleImage).mockResolvedValue(ok(sample));
      const view = renderHero();
      await waitFor(() => expect(view.textColumn()).toHaveAttribute('data-hero-tone', tone));
      expect(shadowedElements(view.section), tone).toEqual([]);
      // Mode Custom: judul, poin & tombol lain, rail langkah alur custom
      fireEvent.click(view.getAllByRole('tab')[1]);
      await act(async () => {});
      expect(shadowedElements(view.section), `${tone} custom`).toEqual([]);
      view.unmount();
    }
  });

  it('latar bawaan juga datar', async () => {
    const view = renderHero();
    await waitFor(() => expect(view.section.querySelector('canvas')).not.toBeNull());
    expect(shadowedElements(view.section)).toEqual([]);
  });
});

describe('Hero: HTML server = render pertama di browser', () => {
  /** Render server lalu hidrasi di jsdom; mengembalikan HTML server, wadah, dan masalah hidrasi yang dilaporkan React. */
  async function serverThenHydrate() {
    const tree = (
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    );
    const html = renderToString(tree);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    // Browser menyalin atribut `muted` dari HTML ke properti video; jsdom tidak (React membandingkan propertinya)
    container.querySelectorAll('video').forEach((video) => {
      video.muted = video.hasAttribute('muted');
    });
    const server = {
      tone: container.querySelector('.hero-parallax')?.getAttribute('data-hero-tone') ?? null,
      scrim: container.querySelector<HTMLElement>('[data-hero-scrim]'),
    };
    const problems: string[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const text = args.map(String).join(' ');
      if (/hydrat|did(?: not|n't) match|server rendered/i.test(text)) problems.push(text.slice(-2000));
    });
    let root: ReturnType<typeof hydrateRoot> | null = null;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError: (error) => problems.push(`recoverable: ${String(error)}`) });
    });
    consoleError.mockRestore();
    return {
      html,
      server,
      container,
      problems,
      done: () => {
        act(() => root?.unmount());
        container.remove();
      },
    };
  }

  it('video, teks terang, lapisan 0: tanpa lapisan di HTML server maupun setelah hidrasi, tanpa selisih', async () => {
    site.settings = { hero_bg_mode: 'video', hero_bg_video: VIDEO, hero_text_tone: 'light', hero_overlay: '0' };
    const run = await serverThenHydrate();
    try {
      expect(run.problems).toEqual([]);
      expect(run.html).toContain('<video');
      expect(run.html).not.toContain('data-hero-scrim');
      expect(run.html).not.toContain('hero-scrim');
      expect(run.server.tone).toBe('light');
      expect(run.container.querySelector('.hero-parallax')).toHaveAttribute('data-hero-tone', 'light');
      expect(run.container.querySelector('[data-hero-scrim]')).toBeNull();
      expect(shadowedElements(run.container)).toEqual([]);
    } finally {
      run.done();
    }
  });

  it('gambar, otomatis, lapisan 0 (bawaan): judul gelap di HTML server & setelah hidrasi, bukan putih di atas halaman putih', async () => {
    site.settings = image(IMAGE_1);
    const run = await serverThenHydrate();
    try {
      expect(run.problems).toEqual([]);
      expect(run.html).not.toContain('hero-scrim');
      expect(run.html).not.toMatch(/text-on-media|btn-outline-on-media/);
      expect(run.server.tone).toBe('dark');
      expect(run.container.querySelector('.hero-parallax')).toHaveAttribute('data-hero-tone', 'dark');
      expect(run.container.querySelector('h1')!.className).toContain('text-fg');
      expect(run.container.querySelector('[data-hero-scrim]')).toBeNull();
    } finally {
      run.done();
    }
  });

  it('gambar, lapisan 40: lapisan yang sama di HTML server dan setelah hidrasi (tanpa kilasan lapisan lain)', async () => {
    site.settings = { ...image(IMAGE_1), hero_overlay: '40' };
    const run = await serverThenHydrate();
    try {
      expect(run.problems).toEqual([]);
      // Belum terukur: teks gelap dengan lapisan putih admin (bukan obsidian di atas gambar yang belum diketahui)
      expect(run.server.tone).toBe('dark');
      expect(rgbOf(run.server.scrim)).toBe('255 255 255');
      expect(alphaOf(run.server.scrim)).toBe(0.4);
      // Node lapisan dari server dipakai ulang, alpha tetap
      const scrim = run.container.querySelector<HTMLElement>('[data-hero-scrim]');
      expect(scrim).toBe(run.server.scrim);
      expect(alphaOf(scrim)).toBe(0.4);
    } finally {
      run.done();
    }
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

  it('scrim dengan alpha 0 (lapisan admin 0%): tidak ada elemen lapisan sama sekali', () => {
    const { container } = render(<HeroMedia config={{ mode: 'image', images: [IMAGE_1] }} scrim={{ tone: 'light', alpha: 0, end: 640 }} />);
    expect(container.querySelector('[data-hero-scrim]')).toBeNull();
    expect(container.querySelector('.hero-scrim')).toBeNull();
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
