// @vitest-environment jsdom
// Gaya hero (setting hero_style, hero/heroStyle.ts): parser & bawaan, H1 kata kunci, HeroPrompt (judul / placeholder /
// chip dari setting, kirim ke Nexa atau ke /pesan-custom?brief=), Hero memilih gaya, hero klasik tidak berubah, HTML
// server gaya prompt, preload LCP, dan kontras teks di atas kanvas burung.
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/components/sections/hero/__tests__/heroStyle.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { prerender } from 'react-dom/static';
// react-router-dom (v7) mengekspor ulang react-router; satu specifier = satu instance konteks router di Vitest
import * as Router from 'react-router-dom';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../../hooks/useSiteSettings';
import { PRELOAD_URLS, primePreload, resetPreload } from '../../../../lib/preload';
import { getNexaRequest, resetNexaBridge, setNexaAvailable } from '../../../layout/nexa/nexaBridge';
import Hero from '../../Hero';
import {
  BODY_TARGET,
  COLORS,
  HEADLINE_TARGET,
  compositeRgb,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
  type Rgb,
} from '../heroContrast';
import { HeroPrompt } from '../HeroPrompt';
import { heroPreloadImage } from '../heroPreload';
import {
  HERO_PROMPT_CHIPS_DEFAULT,
  HERO_PROMPT_PLACEHOLDER_DEFAULT,
  HERO_PROMPT_TITLE_DEFAULT,
  customOrderWithBrief,
  parseHeroPrompt,
  parseHeroStyle,
  promptHeadline,
  promptText,
  readHeroPromptDraft,
  readPromptChips,
  safeChipHref,
} from '../heroStyle';
import { GLYPH_ALPHA_MAX } from '../prompt/garudaEngine';

const BUILT_AT = '2026-10-29T03:00:00.000Z';
const KEYWORD_H1 = 'Template website siap pakai, termasuk hosting & SSL';

/**
 * Konteks react-router: render server (prerender) yang ditunda React.lazy bisa meninggalkan nilai konteks (lokasi
 * StaticRouter/MemoryRouter) yang lalu terbaca render klien berikutnya ("<Router> inside another <Router>"), karena tes
 * menjalankan keduanya di satu proses. Dikembalikan manual (pola src/__tests__/hydration.test.tsx).
 */
type ContextObject = { $$typeof: symbol; _currentValue: unknown; _currentValue2: unknown };
const ROUTER_CONTEXTS = (Object.values(Router) as unknown[]).filter(
  (value): value is ContextObject => Boolean(value) && (value as ContextObject).$$typeof === Symbol.for('react.context'),
);
const CONTEXT_DEFAULTS = ROUTER_CONTEXTS.map((context) => [context, context._currentValue, context._currentValue2] as const);
const restoreRouterContexts = () => {
  for (const [context, value, value2] of CONTEXT_DEFAULTS) {
    context._currentValue = value;
    context._currentValue2 = value2;
  }
};

/** Setting dari "preload" (HTML prerender): useSiteSettings langsung `loaded` dengan nilai ini. */
const prime = (settings: SiteSettings) => {
  resetPreload();
  primePreload({ path: '/', builtAt: BUILT_AT, api: { [PRELOAD_URLS.settings]: settings } });
};

beforeEach(() => {
  resetNexaBridge();
  // Tanpa jaringan: data dari preload saja; kanvas tidak ada di jsdom (mesin burung berhenti sendiri)
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  resetPreload();
  resetNexaBridge();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* ─── Parser ──────────────────────────────────────────────────────────────── */

describe('parseHeroStyle & isi prompt', () => {
  it('hero_style dicocokkan persis: hanya "prompt" yang mengganti gaya', () => {
    expect(parseHeroStyle('prompt')).toBe('prompt');
    for (const raw of ['classic', '', 'PROMPT', ' prompt', 'prompt ', undefined, null, 1, ['prompt']]) {
      expect(parseHeroStyle(raw), JSON.stringify(raw)).toBe('classic');
    }
  });

  it('teks kosong → bawaan; isian admin dirapikan (spasi beruntun, panjang); hanya "0" mematikan animasi', () => {
    expect(parseHeroPrompt({})).toEqual({
      title: HERO_PROMPT_TITLE_DEFAULT,
      placeholder: HERO_PROMPT_PLACEHOLDER_DEFAULT,
      chips: [...HERO_PROMPT_CHIPS_DEFAULT],
      garuda: true,
    });
    const draft = readHeroPromptDraft({ hero_prompt_title: '  Mau   bikin\napa? ', hero_prompt_garuda: '0' });
    expect(draft.title).toBe('Mau bikin apa?');
    expect(draft.placeholder).toBe('');
    expect(draft.garuda).toBe(false);
    expect(parseHeroPrompt({ hero_prompt_title: 'x'.repeat(200) }).title).toHaveLength(160);
    expect(parseHeroPrompt({ hero_prompt_garuda: '' }).garuda).toBe(true);
    expect(parseHeroPrompt({ hero_prompt_garuda: 'false' }).garuda).toBe(true);
  });

  it('chip: tautan aman saja, label dirapikan, maks. 6, daftar kosong dihormati, rusak → bawaan', () => {
    expect(safeChipHref('/template')).toBe('/template');
    expect(safeChipHref(' #kontak ')).toBe('#kontak');
    expect(safeChipHref('https://wa.me/6285188009152')).toBe('https://wa.me/6285188009152');
    for (const bad of ['//evil.test', 'javascript:alert(1)', 'data:text/html,x', 'template', '#kontak lagi', '', 3, null]) {
      expect(safeChipHref(bad), String(bad)).toBeNull();
    }
    const many = Array.from({ length: 7 }, (_, i) => ({ label: `C${i}`, href: '/a' }));
    const chips = readPromptChips(
      JSON.stringify([
        { label: ' Toko  online ', href: '/template/kategori/toko-online' },
        { label: 'x', href: 'javascript:1' },
        { label: '', href: '/x' },
        7,
        ['a'],
        ...many,
      ]),
    );
    expect(chips?.map((chip) => chip.label)).toEqual(['Toko online', 'C0', 'C1', 'C2', 'C3', 'C4']);
    expect(readPromptChips('[]')).toEqual([]);
    expect(readPromptChips(' [{"label":"A","href":"/a"}]')).toEqual([{ label: 'A', href: '/a' }]);
    expect(parseHeroPrompt({ hero_prompt_chips: '[]' }).chips).toEqual([]);
    for (const raw of [undefined, '', '{rusak', '{"a":1}', '{"0":{"label":"a","href":"/a"}}', '"x"', 5]) {
      expect(readPromptChips(raw), String(raw)).toBeNull();
    }
    // Pemangkasan linear: deretan 1 MB karakter trim tidak membuat parser tersendat
    const started = performance.now();
    expect(promptText(`a${'\x0B'.repeat(1_000_000)}b`, 3)).toBe('a\x0B\x0B');
    expect(safeChipHref(`${'\x0B'.repeat(1_000_000)}/a${' '.repeat(1_000_000)}`)).toBe('/a');
    expect(performance.now() - started).toBeLessThan(1500);
    expect(parseHeroPrompt({ hero_prompt_chips: '{rusak' }).chips).toEqual([...HERO_PROMPT_CHIPS_DEFAULT]);
  });

  it('promptHeadline: judul = H1 hanya bila memuat "template website"; selain itu H1 kata kunci tanpa tanda baca akhir', () => {
    expect(promptHeadline('Template Website siap pakai', 'X.')).toEqual({ isH1: true, keywordH1: null });
    expect(promptHeadline('Mau bikin apa hari ini?', `${KEYWORD_H1}.`)).toEqual({ isH1: false, keywordH1: KEYWORD_H1 });
  });
});

/* ─── HeroPrompt ──────────────────────────────────────────────────────────── */

const Probe = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="probe">{`${pathname}${search}`}</p>;
};

const renderPrompt = (settings: SiteSettings) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HeroPrompt settings={settings} />} />
        <Route path="/pesan-custom" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('HeroPrompt', () => {
  it('judul, placeholder, chip dari setting; judul tanpa kata kunci → <p> + H1 kata kunci; animasi bisa dimatikan', () => {
    const { container } = renderPrompt({
      hero_prompt_title: 'Mau bikin apa?',
      hero_prompt_placeholder: 'Tulis di sini',
      hero_prompt_chips: JSON.stringify([
        { label: 'Toko online', href: '/template/kategori/toko-online' },
        { label: 'Kontak', href: '#kontak' },
      ]),
      hero_prompt_garuda: '0',
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(KEYWORD_H1);
    expect(screen.getByText('Mau bikin apa?').tagName).toBe('P');
    expect(screen.getByPlaceholderText('Tulis di sini')).toBeInTheDocument();
    const chips = screen.getByRole('list', { name: 'Rekomendasi' });
    expect(within(chips).getAllByRole('link')).toHaveLength(2);
    expect(within(chips).getByRole('link', { name: 'Toko online' })).toHaveAttribute('href', '/template/kategori/toko-online');
    expect(container.querySelector('[data-garuda-ascii]')).toBeNull();
  });

  it('judul dengan kata kunci = satu-satunya H1; tanpa setting memakai bawaan; kanvas Garuda dimuat lazy', async () => {
    const { container } = renderPrompt({ hero_prompt_title: 'Template website untuk usaha Anda' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Template website untuk usaha Anda');
    expect(screen.getByPlaceholderText(HERO_PROMPT_PLACEHOLDER_DEFAULT)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Rekomendasi' })).getAllByRole('link')).toHaveLength(HERO_PROMPT_CHIPS_DEFAULT.length);
    await waitFor(() => expect(container.querySelector('[data-garuda-ascii]')).not.toBeNull());
  });

  it('Enter mengirim ke Nexa (widget ada) dan mengosongkan kotak; Shift+Enter dan kotak kosong tidak mengirim', () => {
    setNexaAvailable(true);
    renderPrompt({});
    const box = screen.getByLabelText(/Ceritakan kebutuhan/);
    expect(screen.getByText('Dijawab Nexa AI')).toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(getNexaRequest()).toBeNull();
    fireEvent.change(box, { target: { value: 'Saya mau toko online' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(getNexaRequest()).toBeNull();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(getNexaRequest()).toMatchObject({ text: 'Saya mau toko online', listen: false });
    expect(box).toHaveValue('');
    // Tetap di beranda (tidak berpindah ke form pesan custom)
    expect(screen.queryByTestId('probe')).toBeNull();
  });

  it('tanpa widget Nexa (dimatikan admin): tombol kirim membawa teks ke /pesan-custom?brief=', () => {
    renderPrompt({});
    expect(screen.getByText('Dikirim ke form pesan custom')).toBeInTheDocument();
    const box = screen.getByLabelText(/Ceritakan kebutuhan/);
    fireEvent.change(box, { target: { value: 'Aplikasi kasir untuk warung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke Nexa' }));
    expect(screen.getByTestId('probe')).toHaveTextContent(customOrderWithBrief('Aplikasi kasir untuk warung'));
    expect(customOrderWithBrief('a b')).toBe('/pesan-custom?brief=a%20b');
    expect(getNexaRequest()).toBeNull();
  });
});

/* ─── Hero memilih gaya ───────────────────────────────────────────────────── */

describe('Hero memilih gaya', () => {
  // HeroClassic dimuat lazy: prerender menunggu chunk-nya (seperti prerender situs), renderToString hanya fallback
  const classicHtml = async (settings: SiteSettings) => {
    prime(settings);
    const { prelude } = await prerender(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
      { progressiveChunkSize: Number.POSITIVE_INFINITY },
    );
    const markup = await new Response(prelude).text();
    restoreRouterContexts();
    return markup;
  };

  it('klasik tidak berubah: tanpa setting, "classic", dan nilai tak dikenal menghasilkan HTML yang sama', async () => {
    const base = await classicHtml({});
    // Toggle Template / Custom = hero klasik; tidak ada kotak prompt
    expect(base).toContain('role="tablist"');
    expect(base).not.toContain('hero-prompt');
    expect(base).not.toMatch(/<!--\$[!?]-->/);
    expect(await classicHtml({ hero_style: 'classic' })).toBe(base);
    expect(await classicHtml({ hero_style: 'PROMPT' })).toBe(base);
  });

  it('prompt: HTML server berisi judul, kotak prompt, chip, dan kanvas (lazy selesai), tepat satu H1, tanpa tayangan klasik', async () => {
    prime({ hero_style: 'prompt' });
    const { prelude } = await prerender(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
      { progressiveChunkSize: Number.POSITIVE_INFINITY },
    );
    const markup = await new Response(prelude).text();
    restoreRouterContexts();
    expect(markup).toContain(HERO_PROMPT_TITLE_DEFAULT);
    expect(markup).toContain('id="hero-prompt"');
    expect(markup).toContain('data-garuda-ascii');
    expect(markup.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(markup).toContain(`id="hero-title"`);
    expect(markup).not.toMatch(/<!--\$[!?]-->/);
    expect(markup).not.toContain('role="tablist"');
    // Keadaan klien (widget Nexa) belum ada di server: catatan "Dijawab Nexa AI", tanpa tombol mikrofon
    expect(markup).toContain('Dijawab Nexa AI');
    expect(markup).not.toContain('Bicara (isi pesan');
  });

  it('klien: setting prompt dari preload → HeroPrompt langsung (tanpa tayangan klasik)', () => {
    prime({ hero_style: 'prompt', hero_prompt_title: 'Halo dari admin' });
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    expect(screen.getByText('Halo dari admin')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('preload LCP: gaya prompt tidak mem-preload gambar apa pun', () => {
    const settings = { hero_style: 'prompt', hero_bg_mode: 'image', hero_images: JSON.stringify(['/assets/bg/a.jpg']) };
    expect(heroPreloadImage(settings, [])).toBeUndefined();
    expect(heroPreloadImage({ ...settings, hero_style: 'classic' }, [])).toBe('/assets/bg/a.jpg');
  });
});

/* ─── Kontras teks di atas kanvas burung ─────────────────────────────────── */

describe('kontras teks hero Prompt AI di atas kanvas burung', () => {
  const white = hexToRgb('#FFFFFF');
  const fg = hexToRgb(COLORS.fg);
  const muted = hexToRgb(COLORS.muted);
  const lum = (color: Rgb) => relativeLuminance(color);

  it('sel glyph paling pekat: judul besar ≥ 3:1; teks kecil di kartu / pill putih 90% ≥ 4,5:1', () => {
    const cell = compositeRgb(fg, GLYPH_ALPHA_MAX, white);
    expect(contrastRatio(lum(fg), lum(cell))).toBeGreaterThanOrEqual(HEADLINE_TARGET);
    const card = compositeRgb(white, 0.9, cell);
    expect(contrastRatio(lum(muted), lum(card))).toBeGreaterThanOrEqual(BODY_TARGET);
    expect(contrastRatio(lum(fg), lum(card))).toBeGreaterThanOrEqual(BODY_TARGET);
  });
});
