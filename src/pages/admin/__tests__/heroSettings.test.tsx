// @vitest-environment jsdom
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/pages/admin/__tests__/heroSettings.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  heroUploadErrorMessage,
  heroVideoContentType,
  imageRejectMessage,
  normalizeHeroBgMode,
  parseHeroImages,
  parseHeroLogos,
  posterFrameTime,
  stableListKeys,
  uploadedVideoUrl,
  validateHeroVideoFile,
  type HeroBgMode,
} from '../hero/heroMedia';
import { HeroUploadError, uploadHeroVideo } from '../hero/heroVideo';

const POSTER = 'data:image/jpeg;base64,AAAA';
const VIDEO_URL = '/assets/bg/hero_video_0123456789ab.mp4';
const MB = 1024 * 1024;

// Token login tiruan (XHR tidak lewat pembungkus fetch, jadi header dipasang sendiri)
vi.mock('../../../lib/auth', () => ({ getToken: () => 'test-token' }));

// Gambar sampul butuh dekode video sungguhan; di jsdom diganti hasil tetap
vi.mock('../hero/heroVideo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hero/heroVideo')>();
  return { ...actual, captureVideoPoster: vi.fn(async () => ({ poster: POSTER, duration: 12 })) };
});

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

beforeEach(() => {
  MockXHR.last = null;
  vi.stubGlobal('XMLHttpRequest', MockXHR);
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

function Harness({ initialMode = 'default', onBusyChange }: { initialMode?: HeroBgMode; onBusyChange?: (busy: boolean) => void }) {
  const [mode, setMode] = useState<HeroBgMode>(initialMode);
  const [images, setImages] = useState<string[]>([]);
  const [logos, setLogos] = useState<{ name: string; src: string }[]>([]);
  const [video, setVideo] = useState('');
  const [poster, setPoster] = useState('');
  return (
    <>
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
        onBusyChange={onBusyChange}
      />
      <output data-testid="state">{JSON.stringify({ mode, video, poster })}</output>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId('state').textContent || '{}') as { mode: string; video: string; poster: string };

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

// ─── SiteSettings: muat & simpan setting latar ────────────────────────────────

describe('SiteSettings: setting latar hero', () => {
  it('memuat walau hero_images rusak dan mengirim hero_bg_* saat disimpan', async () => {
    const posts: { settings: Record<string, string> }[] = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          hero_images: '{rusak',
          hero_bg_mode: 'video',
          hero_bg_video: VIDEO_URL,
          hero_bg_video_poster: '/assets/bg/hero_poster_0123456789ab.jpg',
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <SiteSettings />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByLabelText('Pratinjau video latar')).toHaveAttribute('src', VIDEO_URL);
    expect(screen.queryByText('Gagal memuat pengaturan')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Simpan semua perubahan/ }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].settings).toMatchObject({
      hero_images: '[]',
      hero_bg_mode: 'video',
      hero_bg_video: VIDEO_URL,
      hero_bg_video_poster: '/assets/bg/hero_poster_0123456789ab.jpg',
    });
  });
});
