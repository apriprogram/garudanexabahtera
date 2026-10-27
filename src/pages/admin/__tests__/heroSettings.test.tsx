// @vitest-environment jsdom
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/pages/admin/__tests__/heroSettings.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroSettings from '../HeroSettings';
import SiteSettings from '../SiteSettings';
import {
  UPLOAD_NETWORK_ERROR,
  UPLOAD_SESSION_ERROR,
  UPLOAD_TOO_LARGE_ERROR,
  fitWithin,
  heroMediaBaseline,
  heroUploadErrorMessage,
  heroVideoContentType,
  heroVideoLimitMb,
  imageCapMessage,
  imageRejectMessage,
  normalizeHeroBgMode,
  omitUnchangedHeroMedia,
  parseHeroImages,
  parseHeroLogos,
  posterFrameTime,
  stableListKeys,
  uploadedVideoUrl,
  validateHeroVideoFile,
  type HeroBgMode,
} from '../hero/heroMedia';
import { resizeHeroImage } from '../hero/heroImage';
import { HeroUploadError, captureVideoPoster, uploadHeroVideo, type PosterResult } from '../hero/heroVideo';
import {
  HERO_OVERLAY_DEFAULT,
  backgroundSample,
  decideHeroLegibility,
  formatRatio,
  hexToRgb,
  readableOverlay,
  type BackgroundSample,
  type HeroTextTone,
} from '../../../components/sections/hero/heroContrast';
import { sampleImage } from '../../../components/sections/hero/heroSampling';

const POSTER = 'data:image/jpeg;base64,AAAA';
const VIDEO_URL = '/assets/bg/hero_video_0123456789ab.mp4';
const POSTER_URL = '/assets/bg/hero_poster_0123456789ab.jpg';
const STALE_ERROR = 'Latar hero sudah diubah di tab atau perangkat lain. Muat ulang halaman, lalu simpan lagi.';
const DONE_STATUS = 'Video berhasil diunggah. Klik Simpan semua perubahan agar tampil di website.';
const HERO_MEDIA_KEYS = ['hero_bg_mode', 'hero_bg_video', 'hero_bg_video_poster', 'hero_images'];
const MB = 1024 * 1024;

// Token login tiruan (XHR tidak lewat pembungkus fetch, jadi header dipasang sendiri)
vi.mock('../../../lib/auth', () => ({ getToken: () => 'test-token' }));

// Gambar sampul butuh dekode video sungguhan; di jsdom diganti hasil tetap
vi.mock('../hero/heroVideo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hero/heroVideo')>();
  return { ...actual, captureVideoPoster: vi.fn() };
});

// Gambar latar dikecilkan lewat canvas (tidak ada di jsdom): diganti data URI tiruan dari nama file
vi.mock('../hero/heroImage', () => ({ resizeHeroImage: vi.fn() }));

// Pratinjau keterbacaan mengukur gambar lewat canvas (tidak ada di jsdom): sampel diatur per tes, bawaan = belum selesai
vi.mock('../../../components/sections/hero/heroSampling', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../components/sections/hero/heroSampling')>()),
  sampleImage: vi.fn(),
}));

const defaultPoster = async (): Promise<PosterResult> => ({ poster: POSTER, duration: 12 });
const defaultResize = async (file: Blob) => `data:image/jpeg;base64,${(file as File).name}`;

// ─── XMLHttpRequest tiruan ────────────────────────────────────────────────────

class MockXHR {
  static last: MockXHR | null = null;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  responseText = '';
  aborted = false;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    MockXHR.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  respond(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  MockXHR.last = null;
  vi.stubGlobal('XMLHttpRequest', MockXHR);
  // Default: server tidak bisa dihubungi (get_hero_media_limits gagal → batas bawaan 30 MB)
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
  vi.mocked(captureVideoPoster).mockReset().mockImplementation(defaultPoster);
  vi.mocked(resizeHeroImage).mockReset().mockImplementation(defaultResize);
  vi.mocked(sampleImage).mockReset().mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const videoFile = (name = 'hero.mp4', type = 'video/mp4', size?: number) => {
  const file = new File([new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
};
const imageFile = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
const storedImages = (count: number) => Array.from({ length: count }, (_, i) => `/assets/bg/hero_${i + 1}.jpg`);

/** Janji yang diselesaikan dari tes (unggahan / gambar sampul / respons yang masih berjalan). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// ─── Helper murni ─────────────────────────────────────────────────────────────

describe('helper latar hero', () => {
  it('menormalkan hero_bg_mode', () => {
    expect(normalizeHeroBgMode('image')).toBe('image');
    expect(normalizeHeroBgMode('video')).toBe('video');
    expect(normalizeHeroBgMode('default')).toBe('default');
    for (const bad of [undefined, null, '', 'slider', 'VIDEO', ' image', 3]) expect(normalizeHeroBgMode(bad)).toBe('default');
  });

  it('membaca hero_images dengan aman', () => {
    expect(parseHeroImages('["/assets/bg/a.jpg", 1, "", "https://cdn.example.com/assets/bg/b.jpg", null]')).toEqual([
      '/assets/bg/a.jpg',
      'https://cdn.example.com/assets/bg/b.jpg',
    ]);
    expect(parseHeroImages('{rusak')).toEqual([]);
    expect(parseHeroImages('{"a":1}')).toEqual([]);
    expect(parseHeroImages(undefined)).toEqual([]);
    expect(parseHeroLogos('[{"name":"A","src":"/a.png"},{"name":"B"},"x",{"src":"/c.png"}]')).toEqual([
      { name: 'A', src: '/a.png' },
      { name: '', src: '/c.png' },
    ]);
  });

  it('validasi file video: format dan ukuran', () => {
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 5 * MB })).toBeNull();
    expect(validateHeroVideoFile({ name: 'a.webm', type: 'video/webm', size: 5 * MB })).toBeNull();
    // MIME kosong (sebagian OS) → dari ekstensi
    expect(validateHeroVideoFile({ name: 'klip.MP4', type: '', size: MB })).toBeNull();
    expect(validateHeroVideoFile({ name: 'a.mov', type: 'video/quicktime', size: MB })).toBe('Format video harus MP4 atau WebM.');
    expect(validateHeroVideoFile({ name: 'a.mkv', type: 'video/x-matroska', size: MB })).toBe('Format video harus MP4 atau WebM.');
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 31 * MB })).toBe('Ukuran video maksimal 30 MB.');
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 30 * MB })).toBeNull();
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 0 })).toBe('File video kosong.');
    expect(heroVideoContentType({ name: 'a.webm', type: '' })).toBe('video/webm');
    expect(heroVideoContentType({ name: 'a.mp4', type: 'video/mp4' })).toBe('video/mp4');
  });

  it('ukuran gambar muat di kotak tanpa diperbesar', () => {
    expect(fitWithin(3840, 2160, 1920, 1080)).toEqual({ width: 1920, height: 1080 });
    expect(fitWithin(1000, 500, 1920, 1080)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(1080, 1920, 1920, 1080)).toEqual({ width: 608, height: 1080 });
    expect(fitWithin(4000, 1000, 1920, 1080)).toEqual({ width: 1920, height: 480 });
    expect(fitWithin(2560, 1440, 1280, Number.POSITIVE_INFINITY)).toEqual({ width: 1280, height: 720 });
    expect(fitWithin(0, 100, 1920, 1080)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 100, 1920, 1080)).toEqual({ width: 0, height: 0 });
  });

  it('detik frame gambar sampul', () => {
    expect(posterFrameTime(2)).toBe(0.5);
    expect(posterFrameTime(20)).toBe(1);
    expect(posterFrameTime(Number.NaN)).toBe(0);
    expect(posterFrameTime(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('memetakan error unggah', () => {
    expect(heroUploadErrorMessage(0)).toBe(UPLOAD_NETWORK_ERROR);
    expect(heroUploadErrorMessage(413, '<html>413 Request Entity Too Large</html>')).toBe(UPLOAD_TOO_LARGE_ERROR);
    expect(heroUploadErrorMessage(413, '{"error":"Ukuran video maksimal 30 MB."}')).toBe('Ukuran video maksimal 30 MB.');
    expect(heroUploadErrorMessage(401, '{"error":"Sesi tidak valid atau sudah berakhir. Silakan login kembali."}')).toBe(UPLOAD_SESSION_ERROR);
    expect(heroUploadErrorMessage(403, '')).toBe(UPLOAD_SESSION_ERROR);
    expect(heroUploadErrorMessage(400, '{"error":"Hanya video MP4 atau WebM yang diizinkan."}')).toBe('Hanya video MP4 atau WebM yang diizinkan.');
    expect(heroUploadErrorMessage(500, '')).toBe('Gagal mengunggah video (HTTP 500).');
    expect(heroUploadErrorMessage(200, '{}')).toMatch(/respons server tidak sesuai/);
    expect(uploadedVideoUrl(`{"success":true,"url":"${VIDEO_URL}"}`)).toBe(VIDEO_URL);
    expect(uploadedVideoUrl('{"success":true,"url":"data:video/mp4;base64,AA"}')).toBeNull();
  });

  it('pesan gambar yang dilewati', () => {
    expect(imageRejectMessage([])).toBeNull();
    expect(imageRejectMessage([{ name: 'besar.jpg', reason: 'size' }])).toBe('"besar.jpg" tidak ditambahkan karena lebih dari 10 MB.');
    expect(imageRejectMessage([{ name: 'a.txt', reason: 'type' }, { name: 'b.heic', reason: 'read' }])).toBe(
      '2 file tidak ditambahkan: a.txt (bukan file gambar), b.heic (tidak bisa dibaca).',
    );
  });

  it('key daftar gambar stabil dan unik', () => {
    const keys = stableListKeys(['data:a', 'data:b', 'data:a']);
    expect(new Set(keys).size).toBe(3);
    expect(stableListKeys(['data:b', 'data:a'])).toEqual([keys[1], keys[0]]);
  });

  it('batas video dari server dan pesan batas gambar', () => {
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 45 * MB }, 50)).toBeNull();
    expect(validateHeroVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 11 * MB }, 10)).toBe('Ukuran video maksimal 10 MB.');
    expect(heroVideoLimitMb(50)).toBe(50);
    expect(heroVideoLimitMb(12.7)).toBe(12);
    for (const bad of [0, 0.5, -3, Number.NaN, Number.POSITIVE_INFINITY, '50', null, undefined]) expect(heroVideoLimitMb(bad)).toBeNull();
    expect(imageCapMessage(1, 0, 12)).toBe('Maksimal 12 gambar latar. Hapus salah satu dulu.');
    expect(imageCapMessage(2, 1, 12)).toBe('Maksimal 12 gambar latar, jadi 2 file terakhir tidak ditambahkan.');
  });

  it('dasar latar hero dan kunci yang tidak diubah', () => {
    const baseline = heroMediaBaseline({
      hero_bg_mode: 'slider',
      hero_bg_video: ` ${VIDEO_URL} `,
      hero_images: '["\\/assets\\/bg\\/a.jpg", 3]',
      hero_title: 'Judul',
    });
    expect(baseline).toEqual({
      hero_bg_mode: 'default',
      hero_bg_video: VIDEO_URL,
      hero_bg_video_poster: '',
      hero_images: '["/assets/bg/a.jpg"]',
      // Persis seperti tersimpan: server membandingkannya dengan nilai di database
      base: { video: ` ${VIDEO_URL} `, poster: '' },
    });

    const outgoing = {
      hero_title: 'Judul baru',
      hero_bg_mode: 'default',
      hero_bg_video: VIDEO_URL,
      hero_bg_video_poster: POSTER,
      hero_images: '["/assets/bg/a.jpg"]',
    };
    expect(omitUnchangedHeroMedia(outgoing, baseline)).toEqual({ hero_title: 'Judul baru', hero_bg_video_poster: POSTER });
    expect(outgoing).toHaveProperty('hero_bg_mode'); // salinan, aslinya tidak diubah
    expect(omitUnchangedHeroMedia({ hero_images: '[]', hero_bg_mode: 'image' }, baseline)).toEqual({ hero_images: '[]', hero_bg_mode: 'image' });
  });
});

describe('uploadHeroVideo (XHR)', () => {
  it('mengirim byte mentah dengan token dan progres, lalu mengembalikan URL', async () => {
    const onProgress = vi.fn();
    const file = videoFile();
    const job = uploadHeroVideo(file, { token: 'abc', onProgress });
    const xhr = MockXHR.last!;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api.php?action=upload_hero_video');
    expect(xhr.headers).toEqual({ Authorization: 'Bearer abc', 'Content-Type': 'video/mp4' });
    expect(xhr.body).toBe(file);
    xhr.progress(25, 100);
    expect(onProgress).toHaveBeenLastCalledWith(25);
    xhr.respond(200, JSON.stringify({ success: true, url: VIDEO_URL }));
    await expect(job.promise).resolves.toBe(VIDEO_URL);
  });

  it('gagal: 413 bukan JSON, jaringan, dan dibatalkan', async () => {
    const tooBig = uploadHeroVideo(videoFile(), { token: 'abc' });
    MockXHR.last!.respond(413, '<html></html>');
    await expect(tooBig.promise).rejects.toMatchObject({ message: UPLOAD_TOO_LARGE_ERROR, status: 413 });

    const offline = uploadHeroVideo(videoFile(), { token: 'abc' });
    MockXHR.last!.onerror?.();
    await expect(offline.promise).rejects.toMatchObject({ message: UPLOAD_NETWORK_ERROR });

    const cancelled = uploadHeroVideo(videoFile(), { token: 'abc' });
    cancelled.abort();
    const error = await cancelled.promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HeroUploadError);
    expect((error as HeroUploadError).aborted).toBe(true);
  });
});

// ─── HeroSettings ─────────────────────────────────────────────────────────────

/**
 * Halaman tiruan seperti SiteSettings: menyimpan state latar dan jumlah gambar yang diproses (imagesPending), dengan
 * tombol untuk menutup/membuka tampilan Hero (= pindah tab) dan menambah gambar dari luar tampilan itu.
 */
function Harness({
  initialMode = 'default',
  initialImages = [],
  initialLogos = [],
  initialVideo = '',
  initialPoster = '',
  initialTone = 'auto',
  initialOverlay = HERO_OVERLAY_DEFAULT,
  saving,
  onBusyChange,
  onImagesProcessing,
  onImageNotice,
}: {
  initialMode?: HeroBgMode;
  initialImages?: string[];
  initialLogos?: { name: string; src: string }[];
  initialVideo?: string;
  initialPoster?: string;
  initialTone?: HeroTextTone;
  initialOverlay?: number;
  saving?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onImagesProcessing?: (delta: number) => void;
  onImageNotice?: (message: string) => void;
}) {
  const [mode, setMode] = useState<HeroBgMode>(initialMode);
  const [images, setImages] = useState<string[]>(initialImages);
  const [logos, setLogos] = useState<{ name: string; src: string }[]>(initialLogos);
  const [video, setVideo] = useState(initialVideo);
  const [poster, setPoster] = useState(initialPoster);
  const [tone, setTone] = useState<HeroTextTone>(initialTone);
  const [overlay, setOverlay] = useState(initialOverlay);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(true);
  return (
    <>
      {shown && (
        <HeroSettings
          settings={{}}
          heroImages={images}
          setHeroImages={setImages}
          heroLogos={logos}
          setHeroLogos={setLogos}
          heroBgMode={mode}
          setHeroBgMode={setMode}
          heroVideo={video}
          setHeroVideo={setVideo}
          heroVideoPoster={poster}
          setHeroVideoPoster={setPoster}
          saving={saving}
          videoUploading={busy}
          onBusyChange={(value) => {
            setBusy(value);
            onBusyChange?.(value);
          }}
          imagesPending={pending}
          onImagesProcessing={(delta) => {
            setPending((n) => n + delta);
            onImagesProcessing?.(delta);
          }}
          onImageNotice={onImageNotice}
          heroTextTone={tone}
          setHeroTextTone={setTone}
          heroOverlay={overlay}
          setHeroOverlay={setOverlay}
        />
      )}
      <button type="button" onClick={() => setShown((s) => !s)}>
        Tutup atau buka tab Hero
      </button>
      <button type="button" onClick={() => setImages((prev) => [...prev, `/assets/bg/luar_${prev.length + 1}.jpg`])}>
        Tambah gambar dari luar
      </button>
      <output data-testid="state">{JSON.stringify({ mode, video, poster })}</output>
      <output data-testid="text">{JSON.stringify({ tone, overlay })}</output>
      <output data-testid="images">{JSON.stringify(images)}</output>
      <output data-testid="logos">{JSON.stringify(logos)}</output>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId('state').textContent || '{}') as { mode: string; video: string; poster: string };
/** hero_text_tone & hero_overlay di halaman tiruan */
const textState = () => JSON.parse(screen.getByTestId('text').textContent || '{}') as { tone: string; overlay: number };
const images = () => JSON.parse(screen.getByTestId('images').textContent || '[]') as string[];
const logos = () => JSON.parse(screen.getByTestId('logos').textContent || '[]') as { name: string; src: string }[];
/** Input file gambar latar (teks kotaknya "Tambah", atau "Memproses..." selama ada gambar yang diproses). */
const addImageInput = () => screen.getByLabelText(/^(Tambah|Memproses\.\.\.)$/);
/** Input file tersembunyi untuk "Ganti video" (hanya ada bila video sudah terpasang). */
const replaceInput = () => document.querySelector<HTMLInputElement>('input[type="file"][accept="video/mp4,video/webm"][tabindex="-1"]')!;
/** Baris status aria-live pengunggah video. */
const liveStatus = () => document.querySelector('[aria-live="polite"]');

describe('HeroSettings: latar hero', () => {
  it('grid gambar hanya di mode Gambar, pengunggah video hanya di mode Video', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Pilih latar hero' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bawaan' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Animasi titik bawaan/)).toBeInTheDocument();
    expect(screen.queryByText('Gambar latar')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Unggah video/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Gambar' }));
    expect(state().mode).toBe('image');
    expect(screen.getByText('Gambar latar')).toBeInTheDocument();
    expect(screen.getByText(/Belum ada gambar/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Unggah video/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Video' }));
    expect(state().mode).toBe('video');
    expect(screen.getByLabelText(/Unggah video/)).toHaveAttribute('accept', 'video/mp4,video/webm');
    expect(screen.getByText(/Belum ada video/)).toBeInTheDocument();
    expect(screen.queryByText('Gambar latar')).not.toBeInTheDocument();

    // Bagian lain tetap ada
    expect(screen.getByLabelText('Teks badge')).toBeInTheDocument();
    expect(screen.getByText('Logo partner')).toBeInTheDocument();
  });

  it('gambar bukan image/* atau lebih dari 10 MB ditolak dengan pesan', async () => {
    render(<Harness initialMode="image" />);
    const big = new File(['x'], 'besar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * MB });
    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [new File(['x'], 'catatan.txt', { type: 'text/plain' }), big] } });
    expect(await screen.findByText('2 file tidak ditambahkan: catatan.txt (bukan file gambar), besar.jpg (lebih dari 10 MB).')).toBeInTheDocument();
    expect(screen.getByText(/Belum ada gambar/)).toBeInTheDocument();
  });

  it('format video salah ditolak sebelum diunggah', () => {
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" onBusyChange={onBusyChange} />);
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile('klip.mov', 'video/quicktime')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Format video harus MP4 atau WebM.');
    expect(MockXHR.last).toBeNull();
    expect(onBusyChange).not.toHaveBeenCalledWith(true);

    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile('besar.mp4', 'video/mp4', 31 * MB)] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Ukuran video maksimal 30 MB.');
    expect(MockXHR.last).toBeNull();
  });

  it('sibuk selama unggah: progres, mode terkunci, lalu video + sampul terpasang', async () => {
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" onBusyChange={onBusyChange} />);
    const file = videoFile();
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [file] } });

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    const xhr = MockXHR.last!;
    expect(xhr.headers.Authorization).toBe('Bearer test-token');
    expect(xhr.body).toBe(file);
    expect(screen.getByRole('tab', { name: 'Gambar' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Bawaan' })).toBeDisabled();

    act(() => xhr.progress(50, 100));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/Mengunggah 50%/)).toBeInTheDocument();

    await act(async () => xhr.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(state()).toEqual({ mode: 'video', video: VIDEO_URL, poster: POSTER });
    expect(screen.getByLabelText('Pratinjau video latar')).toHaveAttribute('src', VIDEO_URL);
    expect(screen.getByRole('button', { name: /Ganti video/ })).toBeEnabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Gambar' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Hapus video/ }));
    expect(state()).toEqual({ mode: 'video', video: '', poster: '' });
    expect(screen.getByLabelText(/Unggah video/)).toBeInTheDocument();
  });

  it('Batal menghentikan unggahan tanpa memasang video', async () => {
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" onBusyChange={onBusyChange} />);
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(MockXHR.last!.aborted).toBe(true);
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(state().video).toBe('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Unggah video/)).toBeInTheDocument();
  });

  it('error server tampil di bawah pengunggah', async () => {
    render(<Harness initialMode="video" />);
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    await act(async () => MockXHR.last!.respond(401, '{"error":"Sesi tidak valid"}'));
    expect(await screen.findByRole('alert')).toHaveTextContent(UPLOAD_SESSION_ERROR);
    expect(state().video).toBe('');
  });
});

describe('HeroSettings: maks. 12 gambar latar (ADM-6)', () => {
  it('gambar ke-13 dan seterusnya ditolak dengan pesan; chip "n/12 gambar"', async () => {
    render(<Harness initialMode="image" initialImages={storedImages(11)} />);
    expect(screen.getByText('11/12 gambar')).toBeInTheDocument();
    expect(screen.getByText(/maks\. 12 gambar/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [imageFile('a.jpg'), imageFile('b.jpg'), imageFile('c.jpg')] } });
    expect(await screen.findByText('12/12 gambar')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Maksimal 12 gambar latar, jadi 2 file terakhir tidak ditambahkan.');
    expect(images()).toEqual([...storedImages(11), 'data:image/jpeg;base64,a.jpg']);
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);

    // Sudah penuh: tidak ada yang diproses
    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [imageFile('d.jpg')] } });
    expect(await screen.findByText('Maksimal 12 gambar latar. Hapus salah satu dulu.')).toBeInTheDocument();
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);
    expect(images()).toHaveLength(12);

    // Seret-lepas ke kotak Tambah juga dibatasi
    fireEvent.drop(screen.getByLabelText('Tambah').closest('label')!, { dataTransfer: { files: [imageFile('e.jpg')] } });
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);
  });

  it('gambar yang masih diproses ikut dihitung', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    render(<Harness initialMode="image" initialImages={storedImages(11)} />);
    // Selama diproses teks kotaknya "Memproses...": pakai elemen input yang sama
    const add = screen.getByLabelText('Tambah');
    fireEvent.change(add, { target: { files: [imageFile('a.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Memproses...')).toBeInTheDocument();
    fireEvent.change(add, { target: { files: [imageFile('b.jpg')] } });
    expect(await screen.findByText('Maksimal 12 gambar latar. Hapus salah satu dulu.')).toBeInTheDocument();
    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    expect(images()).toHaveLength(12);
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);
  });

  it('daftar tersimpan lebih dari 12: peringatan hanya 12 pertama yang tampil', () => {
    render(<Harness initialMode="image" initialImages={storedImages(14)} />);
    expect(screen.getByText('14/12 gambar')).toBeInTheDocument();
    expect(screen.getByText(/hanya 12 gambar pertama yang tampil di website/)).toBeInTheDocument();
  });

  it('gambar yang masih diproses dari tampilan Hero sebelumnya ikut dihitung (ADM-A2)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    render(<Harness initialMode="image" initialImages={storedImages(11)} />);
    fireEvent.change(addImageInput(), { target: { files: [imageFile('a.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));

    // Pindah tab lalu kembali: tampilan baru tetap tahu ada gambar yang diproses
    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    fireEvent.change(addImageInput(), { target: { files: [imageFile('b.jpg')] } });
    expect(await screen.findByText('Maksimal 12 gambar latar. Hapus salah satu dulu.')).toBeInTheDocument();
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Memproses...')).toBeInTheDocument();

    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    expect(images()).toEqual([...storedImages(11), 'data:image/jpeg;base64,a.jpg']);
  });

  it('gambar yang terpotong saat masuk daftar dilaporkan di tempat (ADM-A2)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const onImageNotice = vi.fn();
    render(<Harness initialMode="image" initialImages={storedImages(11)} onImageNotice={onImageNotice} />);
    fireEvent.change(addImageInput(), { target: { files: [imageFile('a.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Daftar penuh dari tempat lain selama gambar diproses
    fireEvent.click(screen.getByRole('button', { name: 'Tambah gambar dari luar' }));
    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    expect(images()).toHaveLength(12);
    expect(images()).not.toContain('data:image/jpeg;base64,a.jpg');
    expect(screen.getByRole('alert')).toHaveTextContent('Maksimal 12 gambar latar. Hapus salah satu dulu.');
    expect(onImageNotice).not.toHaveBeenCalled();
  });

  it('mode sudah bukan Gambar: gambar yang terpotong tetap dilaporkan lewat halaman', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const onImageNotice = vi.fn();
    render(<Harness initialMode="image" initialImages={storedImages(11)} onImageNotice={onImageNotice} />);
    fireEvent.change(addImageInput(), { target: { files: [imageFile('a.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));

    // Pesan inline hanya tampil di mode Gambar, jadi setelah pindah ke Bawaan pesannya lewat halaman
    fireEvent.click(screen.getByRole('tab', { name: /Bawaan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah gambar dari luar' }));
    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    await waitFor(() => expect(onImageNotice).toHaveBeenCalledTimes(1));
    expect(onImageNotice).toHaveBeenCalledWith('Maksimal 12 gambar latar. Hapus salah satu dulu.');
  });

  it('tampilan Hero sudah ditutup: gambar yang terpotong dilaporkan lewat halaman (ADM-A2)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const onImageNotice = vi.fn();
    render(<Harness initialMode="image" initialImages={storedImages(10)} onImageNotice={onImageNotice} />);
    fireEvent.change(addImageInput(), { target: { files: [imageFile('a.jpg'), imageFile('b.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Tambah gambar dari luar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    await waitFor(() => expect(onImageNotice).toHaveBeenCalledTimes(1));
    expect(onImageNotice).toHaveBeenCalledWith('Maksimal 12 gambar latar, jadi 1 file terakhir tidak ditambahkan.');
    expect(images()).toEqual([...storedImages(10), '/assets/bg/luar_11.jpg', 'data:image/jpeg;base64,a.jpg']);
  });
});

describe('HeroSettings: terkunci selama menyimpan (ADM-2)', () => {
  it('pilihan latar, unggah gambar/video, dan hapus nonaktif', () => {
    const { rerender } = render(<Harness initialMode="image" initialImages={storedImages(2)} saving />);
    for (const name of ['Bawaan', 'Gambar', 'Video']) expect(screen.getByRole('tab', { name })).toBeDisabled();
    expect(screen.getByLabelText('Tambah')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus gambar 1' })).toBeDisabled();
    expect(screen.getByLabelText('Tambah logo')).toBeDisabled();

    // Seret-lepas juga diabaikan
    fireEvent.drop(screen.getByLabelText('Tambah').closest('label')!, { dataTransfer: { files: [imageFile('a.jpg')] } });
    expect(resizeHeroImage).not.toHaveBeenCalled();

    rerender(<Harness initialMode="image" initialImages={storedImages(2)} />);
    expect(screen.getByRole('tab', { name: 'Video' })).toBeEnabled();
    expect(screen.getByLabelText('Tambah')).toBeEnabled();
  });

  it('video: unggah, ganti, hapus, dan lepas file nonaktif', () => {
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} saving />);
    expect(screen.getByRole('button', { name: /Ganti video/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hapus video/ })).toBeDisabled();
    expect(replaceInput()).toBeDisabled();
    fireEvent.drop(screen.getByLabelText('Pratinjau video latar'), { dataTransfer: { files: [videoFile()] } });
    expect(MockXHR.last).toBeNull();
  });

  it('logo partner: hapus, ganti nama, dan geser urutan nonaktif (ADM-A5)', () => {
    const partnerLogos = [
      { name: 'Alpha', src: '/assets/logos/alpha.png' },
      { name: 'Beta', src: '/assets/logos/beta.png' },
    ];
    const { rerender } = render(<Harness initialLogos={partnerLogos} saving />);
    const tile = (name: string) => screen.getByAltText(name).parentElement!;
    expect(screen.getByRole('button', { name: 'Hapus Alpha' })).toBeDisabled();
    expect(screen.getByDisplayValue('Alpha')).toBeDisabled();
    expect(tile('Alpha')).toHaveAttribute('draggable', 'false');
    expect(tile('Alpha')).not.toHaveClass('cursor-move');

    fireEvent.dragStart(tile('Alpha'));
    fireEvent.drop(tile('Beta'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Alpha' }));
    expect(logos()).toEqual(partnerLogos);

    rerender(<Harness initialLogos={partnerLogos} />);
    expect(screen.getByRole('button', { name: 'Hapus Alpha' })).toBeEnabled();
    expect(screen.getByDisplayValue('Alpha')).toBeEnabled();
    expect(tile('Alpha')).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(tile('Alpha'));
    fireEvent.drop(tile('Beta'));
    expect(logos().map((logo) => logo.name)).toEqual(['Beta', 'Alpha']);
  });

  it('melaporkan gambar yang sedang diproses ke halaman (+n lalu −n)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const onImagesProcessing = vi.fn();
    render(<Harness initialMode="image" onImagesProcessing={onImagesProcessing} />);
    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [imageFile('a.jpg'), imageFile('b.jpg')] } });
    await waitFor(() => expect(onImagesProcessing).toHaveBeenCalledWith(2));
    expect(screen.getByText('Memproses...')).toBeInTheDocument();
    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    await waitFor(() => expect(onImagesProcessing).toHaveBeenLastCalledWith(-2));
    expect(images()).toEqual(['data:image/jpeg;base64,a.jpg', 'data:image/jpeg;base64,b.jpg']);
  });
});

describe('HeroVideoField: batas ukuran dari server (ADM-5)', () => {
  it('memakai video_max_mb dari get_hero_media_limits untuk validasi dan teks', async () => {
    const fetchMock = vi.fn(async () => json({ success: true, video_max_mb: 50, max_images: 12 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness initialMode="video" />);
    expect(await screen.findByText(/MP4 atau WebM, maks\. 50 MB/)).toBeInTheDocument();
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('/api.php?action=get_hero_media_limits');
    expect(screen.getByText(/WebM, maks\. 50 MB; disarankan/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile('besar.mp4', 'video/mp4', 51 * MB)] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Ukuran video maksimal 50 MB.');
    expect(MockXHR.last).toBeNull();

    // 40 MB: lebih dari bawaan 30 MB, tapi masih di bawah batas server
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile('sedang.mp4', 'video/mp4', 40 * MB)] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
  });

  it('jatuh ke 30 MB bila get_hero_media_limits gagal atau isinya tidak sah', async () => {
    for (const reply of [() => json({ error: 'Akses ditolak' }, 403), () => json({ success: true, video_max_mb: 'banyak' })]) {
      const fetchMock = vi.fn(async () => reply());
      vi.stubGlobal('fetch', fetchMock);
      const view = render(<Harness initialMode="video" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(async () => {});
      expect(screen.getByText(/MP4 atau WebM, maks\. 30 MB/)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile('besar.mp4', 'video/mp4', 31 * MB)] } });
      expect(screen.getByRole('alert')).toHaveTextContent('Ukuran video maksimal 30 MB.');
      view.unmount();
    }
  });
});

describe('HeroVideoField: status unggahan', () => {
  it('saran "lebih dari 1 menit" hanya untuk video yang benar-benar terpasang (ADM-3)', async () => {
    vi.mocked(captureVideoPoster).mockImplementation(async () => ({ poster: POSTER, duration: 90 }));
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} initialPoster={POSTER_URL} />);

    // Video pengganti panjang, unggahan gagal → video lama tetap, tanpa saran
    fireEvent.change(replaceInput(), { target: { files: [videoFile('panjang.mp4')] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    await act(async () => MockXHR.last!.respond(500, ''));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengunggah video (HTTP 500).');
    expect(state().video).toBe(VIDEO_URL);
    expect(screen.queryByText(/lebih dari 1 menit/)).not.toBeInTheDocument();

    // Berhasil → saran tampil
    const NEW_URL = '/assets/bg/hero_video_ba9876543210.mp4';
    fireEvent.change(replaceInput(), { target: { files: [videoFile('panjang.mp4')] } });
    await waitFor(() => expect(MockXHR.last!.body).not.toBeNull());
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: NEW_URL })));
    expect(await screen.findByText(/lebih dari 1 menit/)).toBeInTheDocument();

    // Dihapus → saran ikut hilang (juga setelah video lain dipasang lagi tanpa durasi)
    fireEvent.click(screen.getByRole('button', { name: /Hapus video/ }));
    expect(screen.queryByText(/lebih dari 1 menit/)).not.toBeInTheDocument();
    vi.mocked(captureVideoPoster).mockImplementation(async () => ({ poster: null, duration: null }));
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last!.body).not.toBeNull());
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    await waitFor(() => expect(state().video).toBe(VIDEO_URL));
    expect(screen.queryByText(/lebih dari 1 menit/)).not.toBeInTheDocument();
  });

  it('saran video panjang tidak muncul untuk unggahan yang dibatalkan', async () => {
    const poster = deferred<PosterResult>();
    vi.mocked(captureVideoPoster).mockImplementationOnce(() => poster.promise);
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} />);
    fireEvent.change(replaceInput(), { target: { files: [videoFile('panjang.mp4')] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await act(async () => poster.resolve({ poster: POSTER, duration: 90 }));
    expect(state().video).toBe(VIDEO_URL);
    expect(screen.queryByText(/lebih dari 1 menit/)).not.toBeInTheDocument();
  });

  it('fokus berpindah sesuai tahap dan status diumumkan lewat aria-live (ADM-6 a11y)', async () => {
    render(<Harness initialMode="video" />);
    expect(liveStatus()).toBeInTheDocument();

    // Mulai → fokus ke Batal
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus());
    expect(liveStatus()).toHaveTextContent('Mengunggah hero.mp4...');

    // Berhasil → fokus ke Ganti video
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    await waitFor(() => expect(screen.getByRole('button', { name: /Ganti video/ })).toHaveFocus());
    expect(liveStatus()).toHaveTextContent(DONE_STATUS);

    // Hapus → fokus ke kotak unggah
    fireEvent.click(screen.getByRole('button', { name: /Hapus video/ }));
    await waitFor(() => expect(screen.getByLabelText(/Unggah video/)).toHaveFocus());
    expect(liveStatus()).toHaveTextContent(/Video dihapus/);

    // Batal → kembali ke kotak unggah
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.getByLabelText(/Unggah video/)).toHaveFocus());
    expect(liveStatus()).toHaveTextContent('Unggahan video dibatalkan.');

    // Gagal → kembali ke kotak unggah, pesan detail di alert
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus());
    await act(async () => MockXHR.last!.respond(500, ''));
    await waitFor(() => expect(screen.getByLabelText(/Unggah video/)).toHaveFocus());
    expect(liveStatus()).toHaveTextContent('Video gagal diunggah.');
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal mengunggah video (HTTP 500).');
  });

  it('video yang ada: pratinjau juga tempat lepas file, dan file yang dilepas tidak membuka tab (ADM-7)', async () => {
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} />);
    const preview = screen.getByLabelText('Pratinjau video latar');
    expect(fireEvent.dragOver(preview)).toBe(false);
    expect(screen.getByText('Lepaskan untuk mengganti video')).toBeInTheDocument();

    const file = videoFile('baru.mp4');
    expect(fireEvent.drop(preview, { dataTransfer: { files: [file] } })).toBe(false);
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    expect(MockXHR.last!.body).toBe(file);
    expect(screen.queryByText('Lepaskan untuk mengganti video')).not.toBeInTheDocument();

    // Di luar area lepas (mis. catatan di bawahnya) browser tetap tidak membuka file
    const note = screen.getByText(/Video diputar tanpa suara/);
    expect(fireEvent.dragOver(note)).toBe(false);
    expect(fireEvent.drop(note, { dataTransfer: { files: [videoFile()] } })).toBe(false);
  });

  it('setelah XHR selesai URL langsung dipakai dan Batal hilang selama sampul dibuat (ADM-8)', async () => {
    const poster = deferred<PosterResult>();
    vi.mocked(captureVideoPoster).mockImplementationOnce(() => poster.promise);
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" initialVideo="/assets/bg/hero_video_aaaaaaaaaaaa.mp4" initialPoster={POSTER_URL} onBusyChange={onBusyChange} />);
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();

    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    expect(state()).toEqual({ mode: 'video', video: VIDEO_URL, poster: '' });
    expect(screen.queryByRole('button', { name: 'Batal' })).not.toBeInTheDocument();
    expect(screen.getByText(/Menyiapkan gambar sampul/)).toBeInTheDocument();
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    await act(async () => poster.resolve({ poster: POSTER, duration: 12 }));
    expect(state().poster).toBe(POSTER);
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
  });

  it('tampilan ditutup saat sampul dibuat: tetap sibuk sampai sampul terpasang ke halaman (ADM-A3)', async () => {
    const poster = deferred<PosterResult>();
    vi.mocked(captureVideoPoster).mockImplementationOnce(() => poster.promise);
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" initialVideo="/assets/bg/hero_video_aaaaaaaaaaaa.mp4" initialPoster={POSTER_URL} onBusyChange={onBusyChange} />);
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    const xhr = MockXHR.last!;
    await act(async () => xhr.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    expect(onBusyChange).not.toHaveBeenCalledWith(false);

    // Dibuka lagi sebelum sampul siap: pilihan latar dan bidang video terkunci, sampul ditunggu
    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    expect(screen.getByRole('tab', { name: 'Gambar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ganti video/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hapus video/ })).toBeDisabled();
    expect(screen.getByText('Gambar sampul sedang dibuat dari video.')).toBeInTheDocument();
    fireEvent.drop(screen.getByLabelText('Pratinjau video latar'), { dataTransfer: { files: [videoFile('lain.mp4')] } });
    expect(MockXHR.last).toBe(xhr);

    await act(async () => poster.resolve({ poster: POSTER, duration: 12 }));
    expect(state()).toEqual({ mode: 'video', video: VIDEO_URL, poster: POSTER });
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(onBusyChange.mock.calls.filter(([busy]) => busy === false)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Ganti video/ })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Gambar' })).toBeEnabled();
  });

  it('tampilan ditutup saat file masih dikirim: unggahan dibatalkan dan tidak sibuk lagi (ADM-A3)', async () => {
    const onBusyChange = vi.fn();
    render(<Harness initialMode="video" onBusyChange={onBusyChange} />);
    fireEvent.change(screen.getByLabelText(/Unggah video/), { target: { files: [videoFile()] } });
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByRole('button', { name: 'Tutup atau buka tab Hero' }));
    expect(MockXHR.last!.aborted).toBe(true);
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(state().video).toBe('');
  });

  it('sampul tidak bisa dibuat (mis. lewat batas waktu) → poster kosong', async () => {
    vi.mocked(captureVideoPoster).mockImplementationOnce(async () => ({ poster: null, duration: null }));
    render(<Harness initialMode="video" initialVideo="/assets/bg/hero_video_aaaaaaaaaaaa.mp4" initialPoster={POSTER_URL} />);
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: VIDEO_URL })));
    await waitFor(() => expect(screen.getByRole('button', { name: /Ganti video/ })).toBeEnabled());
    expect(state()).toEqual({ mode: 'video', video: VIDEO_URL, poster: '' });
  });
});

// ─── HeroSettings: teks di atas latar (hero_text_tone, hero_overlay) ──────────

const pixelsOf = (...groups: [number, string][]): BackgroundSample =>
  backgroundSample(groups.flatMap(([n, hex]) => Array.from({ length: n }, () => [...hexToRgb(hex), 255]).flat()))!;
const DARK_BG = pixelsOf([90, '#0B1430'], [10, '#1D3A8A']);
const MIXED_BG = pixelsOf([55, '#06102C'], [15, '#1A6BFF'], [30, '#F2F6FF']);
const BRIGHT_BG = pixelsOf([80, '#F4F7FF'], [20, '#DCE6F5']);
const toneTab = (name: string) => screen.getByRole('tab', { name });
const overlaySlider = () => screen.getByRole('slider', { name: 'Lapisan' });
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('HeroSettings: teks di atas latar', () => {
  it('hanya di mode Gambar & Video: warna teks Otomatis / Terang / Gelap dan lapisan 0-80%', () => {
    render(<Harness />);
    expect(screen.queryByText('Teks di atas latar')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Warna teks hero' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Gambar' }));
    expect(screen.getByText('Teks di atas latar')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Warna teks hero' })).toBeInTheDocument();
    expect(toneTab('Otomatis')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Dipilih otomatis dari kecerahan latar/)).toBeInTheDocument();
    expect(overlaySlider()).toHaveAttribute('min', '0');
    expect(overlaySlider()).toHaveAttribute('max', '80');
    // Bawaan 0 = tanpa lapisan; nilainya dipakai persis di website
    expect(overlaySlider()).toHaveValue('0');
    expect(overlaySlider()).toHaveAttribute('aria-valuetext', '0%');
    expect(overlaySlider()).toHaveAccessibleDescription(/dipakai persis.*0% = tanpa lapisan, video\/gambar tampil penuh/);
    const field = screen.getByText('Teks di atas latar').parentElement!.parentElement!;
    expect(field.textContent).not.toMatch(/minimal|minimum|menebalkan|85%/i);

    fireEvent.click(screen.getByRole('tab', { name: 'Video' }));
    expect(screen.getByRole('tablist', { name: 'Warna teks hero' })).toBeInTheDocument();
  });

  it('memilih warna teks dan menggeser lapisan mengubah setting halaman', () => {
    render(<Harness initialMode="image" initialImages={['/assets/bg/hero_1.jpg']} />);
    fireEvent.click(toneTab('Terang'));
    expect(textState().tone).toBe('light');
    expect(screen.getByText('Teks putih, cocok untuk latar gelap.')).toBeInTheDocument();
    fireEvent.click(toneTab('Gelap'));
    expect(textState().tone).toBe('dark');
    expect(screen.getByText('Teks gelap, cocok untuk latar terang.')).toBeInTheDocument();
    fireEvent.change(overlaySlider(), { target: { value: '65' } });
    expect(textState().overlay).toBe(65);
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(overlaySlider()).toHaveAttribute('aria-valuetext', '65%');
  });

  it('pratinjau = website: gambar pertama, lapisan persis, contoh judul datar; kontras dari semua gambar (kasus terburuk)', async () => {
    const images = ['/assets/bg/hero_1.jpg', '/assets/bg/hero_2.jpg', '/assets/bg/hero_1.jpg'];
    vi.mocked(sampleImage).mockImplementation(async (src) => ({ kind: 'sample', sample: src.endsWith('1.jpg') ? DARK_BG : MIXED_BG }));
    const expected = decideHeroLegibility([DARK_BG, MIXED_BG], 'auto', 30);
    // Lapisan 30% belum cukup untuk gambar campuran: website TIDAK menebalkannya, admin diberi peringatan
    expect(expected).toMatchObject({ tone: 'light', overlayAlpha: 0.3, readable: false });
    render(<Harness initialMode="image" initialImages={images} initialOverlay={30} />);

    expect(await screen.findByText(`Kontras ${formatRatio(expected.contrast!.body)} · Kurang terbaca`)).toBeInTheDocument();
    // Tanpa duplikat, maks. 12 gambar seperti website, dengan area kolom teks desktop
    expect(vi.mocked(sampleImage).mock.calls.map(([src]) => src)).toEqual(['/assets/bg/hero_1.jpg', '/assets/bg/hero_2.jpg']);
    expect(vi.mocked(sampleImage).mock.calls[0][1]).toEqual({ box: { w: 1366, h: 900 }, region: { x: 32, y: 196, w: 628, h: 540 } });

    const preview = screen.getByRole('img', { name: 'Pratinjau teks hero: teks terang, lapisan 30%' });
    expect(preview.querySelector('img')).toHaveAttribute('src', '/assets/bg/hero_1.jpg');
    const scrim = preview.querySelector<HTMLElement>('[data-preview-scrim="light"]')!;
    expect(scrim.className).toContain('hero-scrim');
    expect(scrim.style.getPropertyValue('--scrim-a')).toBe('0.300');
    expect(preview.querySelector('.text-on-media')).toHaveTextContent('Template website siap pakai,');
    expect(preview.querySelector('.text-on-media-accent')).toHaveTextContent('termasuk hosting & SSL.');
    // Datar seperti website: tanpa kelas bayangan / pendar di pratinjau
    for (const el of preview.querySelectorAll('*')) expect(el.getAttribute('class') ?? '').not.toMatch(/shadow|glow/);
    expect(screen.getByText(/Website memakai teks terang dengan lapisan 30%\./)).toBeInTheDocument();
    expect(screen.getByText(/Dihitung dari 2 gambar/)).toBeInTheDocument();
    expect(screen.queryByText(/dinaikkan/)).not.toBeInTheDocument();

    // Peringatan jujur + saran lapisan yang cukup (dihitung dari semua gambar)
    const needed = readableOverlay([DARK_BG, MIXED_BG], 'light')!;
    expect(needed).toBeGreaterThan(30);
    expect(screen.getByText('Teks mungkin sulit dibaca')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(escapeRegExp(`naikkan lapisan ke ${needed}%`)))).toBeInTheDocument();

    // Admin menaikkan lapisan sesuai saran: terbaca, peringatan hilang, pratinjau memakai nilai itu persis
    fireEvent.change(overlaySlider(), { target: { value: String(needed) } });
    const raised = decideHeroLegibility([DARK_BG, MIXED_BG], 'auto', needed);
    expect(raised.readable).toBe(true);
    expect(screen.getByText(`Kontras ${formatRatio(raised.contrast!.body)} · Terbaca`)).toBeInTheDocument();
    expect(screen.queryByText('Teks mungkin sulit dibaca')).not.toBeInTheDocument();
    expect(preview.querySelector<HTMLElement>('[data-preview-scrim]')!.style.getPropertyValue('--scrim-a')).toBe((needed / 100).toFixed(3));

    // 0% = tanpa elemen lapisan, sama dengan website
    fireEvent.change(overlaySlider(), { target: { value: '0' } });
    expect(screen.getByRole('img', { name: /tanpa lapisan$/ })).toBe(preview);
    expect(preview.querySelector('[data-preview-scrim]')).toBeNull();
    expect(screen.getByText(/tanpa lapisan \(gambar\/video tampil penuh\)/)).toBeInTheDocument();

    // Gelap dipaksa dengan lapisan: lapisan putih persis
    fireEvent.change(overlaySlider(), { target: { value: '40' } });
    fireEvent.click(toneTab('Gelap'));
    const dark = decideHeroLegibility([DARK_BG, MIXED_BG], 'dark', 40);
    expect(dark.overlayAlpha).toBe(0.4);
    expect(screen.getByText(new RegExp(escapeRegExp(`Kontras ${formatRatio(dark.contrast!.body)} · `)))).toBeInTheDocument();
    expect(preview.querySelector<HTMLElement>('[data-preview-scrim="dark"]')!.style.getPropertyValue('--scrim-a')).toBe('0.400');
    expect(preview.querySelector('.text-fg')).not.toBeNull();
    // Pengukuran tidak diulang saat nada / lapisan berubah
    fireEvent.change(overlaySlider(), { target: { value: '80' } });
    expect(sampleImage).toHaveBeenCalledTimes(2);
  });

  it('status pratinjau: belum ada gambar, sedang menghitung, tidak terukur, video tanpa sampul', async () => {
    const empty = render(<Harness initialMode="image" />);
    expect(screen.getByText('Belum ada pratinjau')).toBeInTheDocument();
    expect(screen.getByText('Tambahkan gambar dulu untuk melihat pratinjau.')).toBeInTheDocument();
    // Tanpa gambar tidak ada pratinjau palsu (latar putih kosong)
    expect(screen.queryByRole('img', { name: /Pratinjau teks hero/ })).not.toBeInTheDocument();
    empty.unmount();

    const pending = render(<Harness initialMode="image" initialImages={['/assets/bg/hero_1.jpg']} />);
    expect(screen.getByText('Menghitung kontras...')).toBeInTheDocument();
    pending.unmount();

    vi.mocked(sampleImage).mockResolvedValue({ kind: 'unmeasurable' });
    const cross = render(<Harness initialMode="image" initialImages={['https://s3.test/bucket/assets/bg/a.jpg']} />);
    expect(await screen.findByText('Kontras tidak terukur')).toBeInTheDocument();
    // Cadangan = teks gelap seperti halaman (sama dengan website) + lapisan admin persis (bawaan 0), tanpa peringatan
    // karena tidak terukur; admin diberi tahu kapan memilih Terang
    expect(screen.getByText(/Website memakai teks gelap tanpa lapisan \(gambar\/video tampil penuh\)\. Pilih Terang bila latarnya gelap\./)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pratinjau teks hero: teks gelap, tanpa lapisan' }).querySelector('[data-preview-scrim]')).toBeNull();
    expect(screen.queryByText('Teks mungkin sulit dibaca')).not.toBeInTheDocument();
    cross.unmount();

    const forcedCross = render(<Harness initialMode="image" initialImages={['https://s3.test/bucket/assets/bg/a.jpg']} initialTone="light" />);
    expect(await screen.findByText('Kontras tidak terukur')).toBeInTheDocument();
    expect(screen.getByText(/Website memakai teks terang tanpa lapisan \(gambar\/video tampil penuh\)\.$/)).toBeInTheDocument();
    forcedCross.unmount();

    const noPoster = render(<Harness initialMode="video" initialVideo={VIDEO_URL} />);
    expect(screen.getByText(/Video belum punya sampul. Website mengukur frame pertama video saat dibuka untuk memilih warna teks/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Pratinjau teks hero/ })).not.toBeInTheDocument();
    noPoster.unmount();

    // Nada dipaksa: website tidak memilih warna teks, kalimatnya menyebut nada & lapisan yang dipakai
    for (const [initialTone, name] of [['light', 'terang'], ['dark', 'gelap']] as const) {
      const forced = render(<Harness initialMode="video" initialVideo={VIDEO_URL} initialTone={initialTone} initialOverlay={30} />);
      expect(screen.getByText(`Video belum punya sampul. Website memakai teks ${name} dengan lapisan 30%.`)).toBeInTheDocument();
      expect(screen.queryByText(/untuk memilih warna teks/)).not.toBeInTheDocument();
      forced.unmount();
    }
  });

  it('peringatan menyarankan lapisan dan warna teks lain (seperti produksi: Terang di atas sampul terang, 0%)', async () => {
    vi.mocked(sampleImage).mockResolvedValue({ kind: 'sample', sample: BRIGHT_BG });
    const own = readableOverlay(BRIGHT_BG, 'light')!;
    expect(own).toBeGreaterThan(0);
    // Teks gelap sudah terbaca tanpa lapisan: saran warna teks tanpa keterangan lapisan
    expect(readableOverlay(BRIGHT_BG, 'dark')).toBe(0);
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} initialPoster={POSTER_URL} initialTone="light" initialOverlay={0} />);
    expect(await screen.findByText(/· Kurang terbaca$/)).toBeInTheDocument();
    expect(screen.getByText('Teks mungkin sulit dibaca')).toBeInTheDocument();
    expect(screen.getByText(`Coba naikkan lapisan ke ${own}% atau pilih warna teks Gelap.`)).toBeInTheDocument();
    // Video: hanya sampul yang diukur, frame lain bisa berbeda
    expect(screen.getByText(/Untuk video, yang diukur hanya sampulnya; frame lain bisa lebih terang atau lebih gelap\./)).toBeInTheDocument();
    // Pratinjau = website: teks terang tanpa lapisan, tidak ada yang ditambahkan diam-diam
    const preview = screen.getByRole('img', { name: 'Pratinjau teks hero: teks terang, tanpa lapisan' });
    expect(preview.querySelector('[data-preview-scrim]')).toBeNull();
    expect(preview.querySelector('.text-on-media')).not.toBeNull();

    // Ikut saran warna teks: terbaca tanpa lapisan, peringatan hilang
    fireEvent.click(toneTab('Gelap'));
    expect(screen.getByText(/· Terbaca$/)).toBeInTheDocument();
    expect(screen.queryByText('Teks mungkin sulit dibaca')).not.toBeInTheDocument();
  });

  it('saran warna teks lain menyebut lapisannya bila nada itu butuh lapisan lebih tebal dari pilihan admin', async () => {
    vi.mocked(sampleImage).mockResolvedValue({ kind: 'sample', sample: MIXED_BG });
    const light = readableOverlay(MIXED_BG, 'light')!;
    const dark = readableOverlay(MIXED_BG, 'dark')!;
    // Gelap dipaksa di 10%: Terang butuh lapisan lebih tipis dari Gelap, tapi lebih tebal dari 10%
    expect(light).toBeLessThan(dark);
    expect(light).toBeGreaterThan(10);
    expect(decideHeroLegibility(MIXED_BG, 'dark', 10).readable).toBe(false);
    render(<Harness initialMode="image" initialImages={['/assets/bg/hero_1.jpg']} initialTone="dark" initialOverlay={10} />);
    expect(await screen.findByText('Teks mungkin sulit dibaca')).toBeInTheDocument();
    expect(screen.getByText(`Coba naikkan lapisan ke ${dark}% atau pilih warna teks Terang dengan lapisan ${light}%.`)).toBeInTheDocument();
    expect(screen.queryByText(/Untuk video/)).not.toBeInTheDocument();
  });

  it('sampul video yang diukur; terkunci selama menyimpan', async () => {
    vi.mocked(sampleImage).mockResolvedValue({ kind: 'sample', sample: DARK_BG });
    render(<Harness initialMode="video" initialVideo={VIDEO_URL} initialPoster={POSTER_URL} saving />);
    expect(await screen.findByText(/Kontras .* · Terbaca/)).toBeInTheDocument();
    expect(vi.mocked(sampleImage).mock.calls[0][0]).toBe(POSTER_URL);
    for (const name of ['Otomatis', 'Terang', 'Gelap']) expect(toneTab(name)).toBeDisabled();
    expect(overlaySlider()).toBeDisabled();
  });
});

// ─── SiteSettings: muat & simpan setting latar ────────────────────────────────

type SavedBody = { action: string; settings: Record<string, string>; hero_media_base?: { video: string; poster: string } };

/**
 * fetch tiruan untuk SiteSettings: get_settings membaca `stored`, update_settings menggabungkan settings yang dikirim
 * ke `stored` (seperti server) kecuali `post` diganti; get_hero_media_limits → 30 MB.
 */
function mockSiteApi({
  stored = {},
  get,
  post,
}: {
  stored?: Record<string, string>;
  get?: () => Response | Promise<Response>;
  post?: (body: SavedBody) => Response | Promise<Response>;
} = {}) {
  const posts: SavedBody[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('get_hero_media_limits')) return json({ success: true, video_max_mb: 30, max_images: 12 });
    // Tab Harga: markup DewaBiz tidak ikut get_settings, dimuat terpisah
    if (url.includes('admin_get_domain_pricing')) {
      return json({ success: true, source: 'default', markup_percent: Number(stored.domain_markup_percent || 25), markup_default: 25 });
    }
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as SavedBody;
      // Tab Panduan: daftar artikel dari database (bukan simpanan halaman ini, tidak dicatat di posts)
      if ((body as { action?: string }).action === 'admin_get_guides') {
        return json({ success: true, hubViews: 7, guides: [{ id: 1, slug: 'artikel-uji', title: 'Artikel uji panduan', description: 'Deskripsi artikel uji.', body: '## Isi', author: 'Tim Garuda Nexa', datePublished: '2026-10-23', dateModified: '2026-10-23', reviewed: null, cta: 'template', sources: [], related: [], views: 3, createdAt: '2026-10-24 10:00:00', updatedAt: '2026-10-24 10:00:00' }] });
      }
      posts.push(body);
      if (post) return post(body);
      // Tab Tanya Nexa: konfigurasi AI (kunci hanya topeng)
      if ((body as { action?: string }).action === 'nexa_get_config' || (body as { action?: string }).action === 'nexa_save_config') {
        return json({
          success: true,
          config: {
            enabled: true,
            provider: 'anthropic',
            anthropic: { on: true, key_masked: '', env_key: false },
            gemini: { on: true, key_masked: '••••9988', env_key: false },
          },
        });
      }
      Object.assign(stored, body.settings);
      return json({ success: true });
    }
    return get ? get() : json(stored);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { posts, fetchMock, stored };
}

const renderSite = () =>
  render(
    <MemoryRouter>
      <SiteSettings />
    </MemoryRouter>,
  );

const SAVE_LABEL = /^(Simpan semua perubahan|Menyimpan\.\.\.|Memuat pengaturan\.\.\.|Memproses gambar\.\.\.|Menunggu unggahan video\.\.\.)$/;
const saveButton = () => screen.getByRole('button', { name: SAVE_LABEL });
const readySave = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Simpan semua perubahan' })).toBeEnabled());
  return screen.getByRole('button', { name: 'Simpan semua perubahan' });
};

const STORED_VIDEO = {
  hero_bg_mode: 'video',
  hero_bg_video: VIDEO_URL,
  hero_bg_video_poster: POSTER_URL,
  hero_images: '["\\/assets\\/bg\\/hero_1.jpg"]',
};

describe('SiteSettings: setting latar hero', () => {
  it('memuat walau hero_images rusak; latar yang tidak diubah tidak dikirim', async () => {
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO, hero_images: '{rusak' } });
    renderSite();

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByLabelText('Pratinjau video latar')).toHaveAttribute('src', VIDEO_URL);
    expect(screen.queryByText('Gagal memuat pengaturan')).not.toBeInTheDocument();

    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].action).toBe('update_settings');
    for (const key of HERO_MEDIA_KEYS) expect(posts[0].settings).not.toHaveProperty(key);
    expect(posts[0].settings).toHaveProperty('hero_title');
    expect(posts[0].settings).toHaveProperty('hero_logos');
  });

  it('mengirim hero_media_base dan hanya latar yang diubah; dasar diperbarui setelah simpan (ADM-1)', async () => {
    const { posts, stored } = mockSiteApi({ stored: { ...STORED_VIDEO } });
    renderSite();
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    // Persis seperti yang dimuat (bukan versi yang sudah dirapikan), tidak di dalam settings
    expect(posts[0].hero_media_base).toEqual({ video: VIDEO_URL, poster: POSTER_URL });
    expect(posts[0].settings).not.toHaveProperty('hero_media_base');
    for (const key of HERO_MEDIA_KEYS) expect(posts[0].settings).not.toHaveProperty(key);

    // Mode diganti → hanya hero_bg_mode yang ikut
    await readySave();
    fireEvent.click(screen.getByRole('tab', { name: 'Gambar' }));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1].settings.hero_bg_mode).toBe('image');
    for (const key of ['hero_bg_video', 'hero_bg_video_poster', 'hero_images']) expect(posts[1].settings).not.toHaveProperty(key);
    expect(stored.hero_bg_mode).toBe('image');

    // Setelah simpan, dasar = hasil muat ulang: mode tidak dikirim lagi
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(3));
    expect(posts[2].settings).not.toHaveProperty('hero_bg_mode');

    // Gambar dihapus → hero_images dikirim
    fireEvent.click(screen.getByRole('button', { name: 'Hapus gambar 1' }));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(4));
    expect(posts[3].settings.hero_images).toBe('[]');
    expect(posts[3].hero_media_base).toEqual({ video: VIDEO_URL, poster: POSTER_URL });
  });

  it('video baru: hero_bg_video + sampul dikirim, dasar tetap nilai yang dimuat', async () => {
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO } });
    renderSite();
    await readySave();
    const NEW_URL = '/assets/bg/hero_video_ba9876543210.mp4';
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: NEW_URL })));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings).toMatchObject({ hero_bg_video: NEW_URL, hero_bg_video_poster: POSTER });
    expect(posts[0].settings).not.toHaveProperty('hero_bg_mode');
    expect(posts[0].hero_media_base).toEqual({ video: VIDEO_URL, poster: POSTER_URL });
  });

  it('warna teks & lapisan: dimuat (dinormalkan), dikirim saat simpan, perubahan ikut tersimpan', async () => {
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO, hero_text_tone: 'TERANG', hero_overlay: '55.4' } });
    renderSite();
    await readySave();
    // Nilai tidak dikenal → Otomatis, desimal → dibulatkan (sama dengan website & backend)
    expect(screen.getByRole('tab', { name: 'Otomatis' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('slider', { name: 'Lapisan' })).toHaveValue('55');

    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings).toMatchObject({ hero_text_tone: 'auto', hero_overlay: '55' });

    await readySave();
    fireEvent.click(screen.getByRole('tab', { name: 'Terang' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Lapisan' }), { target: { value: '30' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1].settings).toMatchObject({ hero_text_tone: 'light', hero_overlay: '30' });
    // Penanganan tab basi latar media tidak berubah
    for (const key of HERO_MEDIA_KEYS) expect(posts[1].settings).not.toHaveProperty(key);
    expect(posts[1].hero_media_base).toEqual({ video: VIDEO_URL, poster: POSTER_URL });
  });

  it('409 dari update_settings: pesan server tampil di toast error', async () => {
    mockSiteApi({ stored: { ...STORED_VIDEO }, post: () => json({ error: STALE_ERROR }, 409) });
    renderSite();
    fireEvent.click(await readySave());
    expect(await screen.findByText(STALE_ERROR)).toBeInTheDocument();
    expect(screen.getByText('Gagal menyimpan pengaturan')).toBeInTheDocument();
  });

  it('tombol simpan nonaktif sebelum pengaturan berhasil dimuat dan setelah muat gagal (ADM-1)', async () => {
    const firstLoad = deferred<Response>();
    const loads = [() => firstLoad.promise, async () => json({ ...STORED_VIDEO })];
    const { posts } = mockSiteApi({ get: () => loads.shift()!() });
    renderSite();

    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(posts).toHaveLength(0);

    await act(async () => firstLoad.resolve(new Response('<html>Server error</html>', { status: 500 })));
    expect(await screen.findByText('Gagal memuat pengaturan')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/Pengaturan gagal dimuat/)).toBeInTheDocument();
    fireEvent.click(saveButton());
    expect(posts).toHaveLength(0);

    // Muat ulang berhasil → bisa disimpan, dengan dasar dari muatan itu
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang' }));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].hero_media_base).toEqual({ video: VIDEO_URL, poster: POSTER_URL });
  });

  it('respons get_settings berisi error (mis. 500 JSON) dianggap gagal muat', async () => {
    const { posts } = mockSiteApi({ get: async () => json({ error: 'Database error' }, 500) });
    renderSite();
    expect(await screen.findByText('Gagal memuat pengaturan')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(posts).toHaveLength(0);
  });

  it('get_settings [] (tabel kosong) = pengaturan kosong yang bisa disimpan (ADM-A1)', async () => {
    const { posts } = mockSiteApi({ get: async () => json([]) });
    renderSite();
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(screen.queryByText('Gagal memuat pengaturan')).not.toBeInTheDocument();
    expect(posts[0].hero_media_base).toEqual({ video: '', poster: '' });
    expect(posts[0].settings).toHaveProperty('hero_title');
  });

  it('array berisi, bukan objek, atau {error} dari get_settings tetap gagal muat (ADM-A1)', async () => {
    for (const body of [[{ setting_key: 'hero_title', setting_value: 'x' }], ['x'], 'teks', 5, null, { error: 'Database error' }]) {
      const { posts } = mockSiteApi({ get: async () => json(body) });
      const view = renderSite();
      expect(await screen.findByText('Gagal memuat pengaturan')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      fireEvent.click(saveButton());
      expect(posts).toHaveLength(0);
      view.unmount();
    }
  });

  it('gambar dari tab Hero sebelumnya ikut dihitung batas 12 (ADM-A2)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO, hero_bg_mode: 'image', hero_images: JSON.stringify(storedImages(11)) } });
    renderSite();
    await readySave();
    fireEvent.change(addImageInput(), { target: { files: [imageFile('a.jpg')] } });
    expect(await screen.findByRole('button', { name: 'Memproses gambar...' })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('tab', { name: 'FAQ' })[0]);
    fireEvent.click(screen.getAllByRole('tab', { name: 'Hero' })[0]);
    fireEvent.change(addImageInput(), { target: { files: [imageFile('b.jpg')] } });
    expect(await screen.findByText('Maksimal 12 gambar latar. Hapus salah satu dulu.')).toBeInTheDocument();
    expect(resizeHeroImage).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Memproses...')).toBeInTheDocument();

    await act(async () => pending.resolve('data:image/jpeg;base64,a.jpg'));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(JSON.parse(posts[0].settings.hero_images)).toEqual([...storedImages(11), 'data:image/jpeg;base64,a.jpg']);
  });

  it('pesan gambar yang selesai diproses setelah tab Hero ditutup tampil sebagai pemberitahuan (ADM-A2)', async () => {
    let fail!: (error: Error) => void;
    vi.mocked(resizeHeroImage).mockImplementationOnce(
      () =>
        new Promise<string>((_, reject) => {
          fail = reject;
        }),
    );
    mockSiteApi({ stored: { ...STORED_VIDEO, hero_bg_mode: 'image' } });
    renderSite();
    await readySave();
    fireEvent.change(addImageInput(), { target: { files: [imageFile('rusak.jpg')] } });
    await waitFor(() => expect(resizeHeroImage).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getAllByRole('tab', { name: 'FAQ' })[0]);
    await act(async () => fail(new Error('decode')));
    expect(await screen.findByText('"rusak.jpg" tidak ditambahkan karena tidak bisa dibaca.')).toBeInTheDocument();
    expect(screen.getByText('Gambar latar tidak ditambahkan')).toBeInTheDocument();
    await readySave();
  });

  it('pindah tab saat sampul dibuat: simpan ditahan sampai sampul terpasang, lalu sampul ikut tersimpan (ADM-A3)', async () => {
    const poster = deferred<PosterResult>();
    vi.mocked(captureVideoPoster).mockImplementationOnce(() => poster.promise);
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO } });
    renderSite();
    await readySave();
    const NEW_URL = '/assets/bg/hero_video_ba9876543210.mp4';
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    await waitFor(() => expect(MockXHR.last).not.toBeNull());
    await act(async () => MockXHR.last!.respond(200, JSON.stringify({ success: true, url: NEW_URL })));
    expect(screen.getByText(/Menyiapkan gambar sampul/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('tab', { name: 'FAQ' })[0]);
    await act(async () => {});
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent('Menunggu unggahan video...');
    fireEvent.click(saveButton());
    expect(posts).toHaveLength(0);

    await act(async () => poster.resolve({ poster: POSTER, duration: 12 }));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings).toMatchObject({ hero_bg_video: NEW_URL, hero_bg_video_poster: POSTER });
  });

  it('pindah tab saat file masih dikirim: unggahan dibatalkan dan simpan tidak tertahan (ADM-A3)', async () => {
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO } });
    renderSite();
    await readySave();
    fireEvent.change(replaceInput(), { target: { files: [videoFile()] } });
    expect(await screen.findByRole('button', { name: 'Menunggu unggahan video...' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('tab', { name: 'FAQ' })[0]);
    expect(MockXHR.last!.aborted).toBe(true);
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    for (const key of HERO_MEDIA_KEYS) expect(posts[0].settings).not.toHaveProperty(key);
  });

  it('tombol simpan menunggu gambar yang sedang diproses (ADM-2)', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    const { posts } = mockSiteApi({ stored: { ...STORED_VIDEO, hero_bg_mode: 'image' } });
    renderSite();
    await readySave();

    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [imageFile('baru.jpg')] } });
    expect(await screen.findByRole('button', { name: 'Memproses gambar...' })).toBeDisabled();
    fireEvent.click(saveButton());
    expect(posts).toHaveLength(0);

    await act(async () => pending.resolve('data:image/jpeg;base64,BBBB'));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(JSON.parse(posts[0].settings.hero_images)).toEqual(['/assets/bg/hero_1.jpg', 'data:image/jpeg;base64,BBBB']);
  });

  it('gambar tetap dihitung diproses walau tab Hero ditutup', async () => {
    const pending = deferred<string>();
    vi.mocked(resizeHeroImage).mockImplementationOnce(() => pending.promise);
    mockSiteApi({ stored: { ...STORED_VIDEO, hero_bg_mode: 'image' } });
    renderSite();
    await readySave();
    fireEvent.change(screen.getByLabelText('Tambah'), { target: { files: [imageFile('baru.jpg')] } });
    expect(await screen.findByRole('button', { name: 'Memproses gambar...' })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('tab', { name: 'FAQ' })[0]);
    expect(screen.getByRole('button', { name: 'Memproses gambar...' })).toBeDisabled();
    await act(async () => pending.resolve('data:image/jpeg;base64,BBBB'));
    await readySave();
  });

  it('selama menyimpan latar hero terkunci, lalu terbuka lagi setelah dimuat ulang (ADM-2)', async () => {
    const reply = deferred<Response>();
    const { stored } = mockSiteApi({ stored: { ...STORED_VIDEO }, post: () => reply.promise });
    renderSite();
    fireEvent.click(await readySave());

    expect(await screen.findByRole('button', { name: 'Menyimpan...' })).toBeDisabled();
    for (const name of ['Bawaan', 'Gambar', 'Video']) expect(screen.getByRole('tab', { name })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ganti video/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hapus video/ })).toBeDisabled();

    stored.hero_bg_mode = 'image';
    await act(async () => reply.resolve(json({ success: true })));
    await readySave();
    // Hasil muat ulang sudah tampil saat kunci dibuka
    expect(screen.getByRole('tab', { name: 'Gambar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Video' })).toBeEnabled();
  });
});

describe('SiteSettings: tab mengikuti website (pemilik 2026-10-24)', () => {
  it('urutan tab = urutan website, tanpa Produk & paket harga; tab Panduan menyimpan teks pembuka', async () => {
    // Tanpa setting lama: halaman ini tidak lagi membuat products_* / pricing_* (setting lama yang ada diteruskan apa adanya)
    const { posts } = mockSiteApi({ stored: {} });
    renderSite();
    const nav = screen.getByRole('navigation', { name: 'Bagian pengaturan' });
    expect(within(nav).getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      'Hero',
      'Template',
      'Proyek',
      'Perbandingan',
      'Keunggulan',
      'FAQ',
      'Banner CTA',
      'Footer',
      'Harga template',
      'Panduan',
      'Tanya Nexa',
    ]);

    // Panduan: saklar (tautan navbar & footer), teks pembuka, daftar artikel dari database dengan status & jumlah dilihat
    fireEvent.click(within(nav).getByRole('button', { name: 'Panduan' }));
    expect(await screen.findByText('Halaman /panduan')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Tampil di website/ })).toBeInTheDocument();
    expect(await screen.findByText('Artikel (1)')).toBeInTheDocument();
    expect(screen.getByText('Artikel uji panduan')).toBeInTheDocument();
    expect(screen.getByText('Draf')).toBeInTheDocument();
    expect(screen.getByText('3 dilihat')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teks pembuka'), { target: { value: 'Panduan singkat untuk pemilik bisnis.' } });

    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings.guides_intro).toBe('Panduan singkat untuk pemilik bisnis.');
    for (const key of ['products_data', 'products_categories', 'pricing_data', 'pricing_title', 'pricing_subtitle']) {
      expect(posts[0].settings).not.toHaveProperty(key);
    }
  });

  it('tab Tanya Nexa: saklar widget → nexa_enabled; kunci & penyedia disimpan lewat nexa_save_config (kunci bertopeng)', async () => {
    const { posts } = mockSiteApi({ stored: {} });
    renderSite();
    const nav = screen.getByRole('navigation', { name: 'Bagian pengaturan' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Tanya Nexa' }));

    // Konfigurasi dimuat saat tab dibuka; kunci lama hanya tampil 4 karakter terakhir
    expect(await screen.findByText(/Kunci tersimpan: ••••9988/)).toBeInTheDocument();
    expect((posts[0] as { action?: string }).action).toBe('nexa_get_config');

    // Pilih penyedia Gemini, matikan Claude, isi kunci Gemini baru
    fireEvent.click(screen.getAllByRole('tab', { name: 'Gemini (Google)' })[0]);
    fireEvent.click(screen.getAllByRole('switch', { name: 'Aktif' })[0]); // Claude → Nonaktif (urutan: Claude dulu)
    fireEvent.change(screen.getByLabelText('Kunci API Gemini (Google)'), { target: { value: '  AIzaBaru123456  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan AI' }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toMatchObject({
      action: 'nexa_save_config',
      provider: 'gemini',
      anthropic: { on: false },
      gemini: { on: true, key: 'AIzaBaru123456' },
    });
    expect((posts[1] as unknown as { anthropic: { key?: unknown } }).anthropic).not.toHaveProperty('key');

    // Saklar kanan atas menulis nexa_enabled lewat simpan global
    fireEvent.click(screen.getByRole('switch', { name: 'Tampil di website' }));
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(3));
    expect(posts[2].settings.nexa_enabled).toBe('0');
  });
});

describe('SiteSettings: tab Harga template (domain terpisah & perpanjangan, pemilik 2026-10-25)', () => {
  const openPricing = async () => {
    const nav = screen.getByRole('navigation', { name: 'Bagian pengaturan' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Harga template' }));
    return screen.findByLabelText('Hosting & jasa per tahun (mulai tahun ke-2)');
  };

  it('hosting & jasa per tahun: bawaan Rp500.000, petunjuk ikut nilai, tersimpan sebagai angka bersama isi harga', async () => {
    const { posts } = mockSiteApi({ stored: {} });
    renderSite();
    await readySave();
    const field = (await openPricing()) as HTMLInputElement;
    expect(field).toHaveAttribute('type', 'number');
    expect(field).toHaveAttribute('min', '0');
    expect(field).toHaveAttribute('step', '1000');
    expect(field.value).toBe('500000');
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp500\.000\/tahun ditambah perpanjangan domain/);

    // Isi harga bawaan tanpa domain; harga domain per ekstensi tampil (hanya dibaca)
    expect((screen.getByLabelText('Sudah termasuk') as HTMLTextAreaElement).value).toBe(
      'Template website + setup awal\nHosting tahun pertama\nSertifikat SSL (HTTPS) tahun pertama',
    );
    const list = screen.getByRole('list', { name: 'Harga domain per tahun (tahun pertama & perpanjangan)' });
    const item = (tld: string) => within(list).getAllByRole('listitem').find((li) => li.textContent?.startsWith(tld))!;
    expect(item('.com')).toHaveTextContent('Rp250.000');
    expect(item('.my.id')).toHaveTextContent('Rp50.000');
    expect(item('.co.id')).toHaveTextContent('Untuk badan usaha: butuh NIB atau akta perusahaan');

    fireEvent.change(field, { target: { value: '750000' } });
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp750\.000\/tahun/);
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].action).toBe('update_settings');
    expect(posts[0].settings).toMatchObject({
      template_hosting_renewal_price: '750000',
      template_price_includes: 'Template website + setup awal\nHosting tahun pertama\nSertifikat SSL (HTTPS) tahun pertama',
    });
    expect(posts[0].settings.template_price_note).toMatch(/^Domain dipilih saat memesan, mulai Rp50\.000\/tahun\./);
  });

  it('nilai tersimpan dimuat; desimal dibulatkan, kosong = bawaan (dikirim kosong); tab lain tidak mengirimnya', async () => {
    const { posts } = mockSiteApi({ stored: { template_hosting_renewal_price: '650000' } });
    renderSite();
    await readySave();
    // Tab Harga belum dibuka: setting tersimpan diteruskan apa adanya
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings.template_hosting_renewal_price).toBe('650000');

    const field = (await openPricing()) as HTMLInputElement;
    expect(field.value).toBe('650000');
    fireEvent.change(field, { target: { value: '725000.6' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1].settings.template_hosting_renewal_price).toBe('725001');

    fireEvent.change(field, { target: { value: '' } });
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp500\.000\/tahun/);
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(3));
    expect(posts[2].settings.template_hosting_renewal_price).toBe('');
  });

  it('fitur Berita & Pengumuman (sekali bayar): bawaan Rp350.000, petunjuk ikut nilai, tersimpan sebagai angka (SITE-ADDONS-SPEC §7)', async () => {
    const { posts } = mockSiteApi({ stored: {} });
    renderSite();
    await readySave();
    await openPricing();
    const field = screen.getByLabelText('Fitur Berita & Pengumuman (sekali bayar)') as HTMLInputElement;
    expect(field).toHaveAttribute('type', 'number');
    expect(field).toHaveAttribute('min', '0');
    expect(field).toHaveAttribute('step', '1000');
    expect(field.value).toBe('350000');
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp350\.000 sekali, aktif selama situsnya aktif\..*Kosong atau 0 = bawaan Rp350\.000\./);

    fireEvent.change(field, { target: { value: '400000' } });
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp400\.000 sekali/);
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings).toMatchObject({ addon_posts_price: '400000', template_hosting_renewal_price: '500000' });

    // 0 atau kosong = bawaan (petunjuk menyebut harga efektif); desimal dibulatkan
    fireEvent.change(field, { target: { value: '0' } });
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp350\.000 sekali/);
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1].settings.addon_posts_price).toBe('0');

    fireEvent.change(field, { target: { value: '' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(3));
    expect(posts[2].settings.addon_posts_price).toBe('');

    fireEvent.change(field, { target: { value: '299999.5' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(4));
    expect(posts[3].settings.addon_posts_price).toBe('300000');
  });

  it('harga fitur tersimpan dimuat; tab Harga belum dibuka = diteruskan apa adanya', async () => {
    const { posts } = mockSiteApi({ stored: { addon_posts_price: '425000' } });
    renderSite();
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings.addon_posts_price).toBe('425000');

    await openPricing();
    const field = screen.getByLabelText('Fitur Berita & Pengumuman (sekali bayar)') as HTMLInputElement;
    expect(field.value).toBe('425000');
    expect(field).toHaveAccessibleDescription(/Pembeli membayar Rp425\.000 sekali/);
  });

  it('markup DewaBiz: dimuat dari admin_get_domain_pricing, bilangan bulat 0–500, di luar itu dikirim kosong (bawaan)', async () => {
    const { posts } = mockSiteApi({ stored: { domain_markup_percent: '30' } });
    renderSite();
    await readySave();
    await openPricing();
    const field = (await screen.findByLabelText('Markup harga domain dari DewaBiz (%)')) as HTMLInputElement;
    expect(field.value).toBe('30');
    expect(field).toHaveAttribute('max', '500');
    expect(field).toHaveAccessibleDescription(/selain \.com, \.id, \.my\.id, \.web\.id .*Kosong = bawaan 25%\. Belum berlaku: DewaBiz belum terhubung/);

    fireEvent.change(field, { target: { value: '40' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings.domain_markup_percent).toBe('40');

    fireEvent.change(field, { target: { value: '600' } });
    fireEvent.click(await readySave());
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1].settings.domain_markup_percent).toBe('');
  });
});
