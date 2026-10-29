// @vitest-environment jsdom
// Editor proyek Pengaturan website > Proyek (permintaan pemilik 2026-10-24): deskripsi, tools, tautan situs, gambar kartu,
// gambar detail (banyak, hapus, geser), video; entri lama tersimpan apa adanya. Juga pembersih isian di
// src/components/sections/projects/portfolio.ts (sama dengan backend, lihat __tests__/backend/portfolio-media.test.ts).
// Jalankan: npx vitest run src/pages/admin/__tests__/portfolioEditor.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioEditor from '../portfolio/PortfolioEditor';
import {
  PROJECT_VIDEO_UPLOAD_URL,
  checkProjectImage,
  cleanPortfolioItem,
  dataUriBytes,
  imageUploadMessage,
} from '../portfolio/portfolioMedia';
import { uploadHeroVideo, type HeroVideoUpload } from '../hero/heroVideo';
import { ApiError } from '../../../lib/api';
import {
  mediaLink,
  projectDescription,
  projectGallery,
  projectTools,
  projectUrl,
  type PortfolioItem,
} from '../../../components/sections/projects/portfolio';

vi.mock('../../../lib/auth', () => ({ getToken: () => 'test-token' }));
// jsdom tanpa canvas: hasil kecil tiruan (yang diuji: data URI inilah yang dikirim)
vi.mock('../hero/heroImage', () => ({ resizeHeroImage: vi.fn(async () => 'data:image/jpeg;base64,/9j/AAAA') }));
vi.mock('../hero/heroVideo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hero/heroVideo')>();
  return { ...actual, uploadHeroVideo: vi.fn() };
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LEGACY: PortfolioItem = { title: 'Mobile POS App', desc: 'RETAIL / ANDROID', image: 'data:image/jpeg;base64,/9j/LAMA', span: 'md:col-span-4' };

let uploads: string[] = [];
let uploadReply: (n: number) => Response = (n) => json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` });

beforeEach(() => {
  uploads = [];
  uploadReply = (n) => json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_hero_media_limits') return json(200, { success: true, video_max_mb: 30, max_images: 12 });
      if (action === 'upload_project_image') {
        uploads.push(String((JSON.parse(String(init?.body)) as { data: string }).data));
        return uploadReply(uploads.length);
      }
      return json(200, {});
    }),
  );
  vi.mocked(uploadHeroVideo).mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderEditor = (item: PortfolioItem | null) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const notify = vi.fn();
  render(<PortfolioEditor open item={item} onSave={onSave} onClose={onClose} notify={notify} />);
  return { onSave, onClose, notify, dialog: screen.getByRole('dialog') };
};

const file = (name: string, type: string, size = 64) => new File([new Uint8Array(size)], name, { type });
const pick = (input: HTMLInputElement, files: File[]) => fireEvent.change(input, { target: { files } });
const fileInput = (dialog: HTMLElement, label: string) => within(dialog).getByLabelText(label) as HTMLInputElement;
const save = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: /Simpan proyek|Menunggu unggahan/ }));
/** Setiap hapus dikonfirmasi dulu (pemilik 2026-10-29): klik "Ya, hapus" di dialog berjudul `title` (di atas editor). */
const confirmDelete = async (title: string) =>
  fireEvent.click(within(await screen.findByRole('dialog', { name: title })).getByRole('button', { name: 'Ya, hapus' }));
const SAVE_HINT = 'Perubahan tersimpan setelah kamu klik Simpan proyek, lalu Simpan semua perubahan.';

describe('PortfolioEditor', () => {
  it('entri lama tanpa perubahan tersimpan persis seperti sebelumnya (lebar grid & gambar base64 tetap, tanpa isian baru)', () => {
    const { onSave, dialog } = renderEditor(LEGACY);
    expect(within(dialog).getByLabelText(/Nama proyek/)).toHaveValue('Mobile POS App');
    expect(within(dialog).getByLabelText(/Tag \/ kategori/)).toHaveValue('RETAIL / ANDROID');
    expect(within(dialog).getByRole('img', { name: 'Gambar kartu proyek' })).toHaveAttribute('src', LEGACY.image);
    save(dialog);
    expect(onSave).toHaveBeenCalledWith(LEGACY);
  });

  it('isian wajib & tautan: pesan per kolom; domain saja → https://; proyek baru wajib punya gambar kartu', () => {
    const { onSave, notify, dialog } = renderEditor(null);
    const url = within(dialog).getByLabelText(/Tautan situs/);
    fireEvent.change(url, { target: { value: 'bukan tautan' } });
    save(dialog);
    expect(onSave).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('Nama proyek wajib diisi.');
    expect(dialog).toHaveTextContent('Tag / kategori wajib diisi.');
    expect(dialog).toHaveTextContent('Isi alamat situs, mis. https://contoh.com atau contoh.com.');
    expect(dialog).toHaveTextContent('Gambar kartu wajib: proyek tanpa gambar tidak tampil di website.');
    // Notifikasi juga, karena kolom yang salah bisa tergulir di luar layar
    expect(notify).toHaveBeenCalledWith('warning', 'Proyek belum bisa disimpan.', expect.stringContaining('Nama proyek wajib diisi.'));

    fireEvent.change(url, { target: { value: '  Contoh.com/portofolio?id=1 ' } });
    fireEvent.blur(url);
    expect(url).toHaveValue('https://Contoh.com/portofolio?id=1');
  });

  it('tools: Enter & koma menambah chip, kembar diabaikan, saran sekali klik, chip bisa dihapus (dikonfirmasi)', async () => {
    const { onSave, dialog } = renderEditor(LEGACY);
    const input = within(dialog).getByLabelText(/Tools \/ teknologi/);
    fireEvent.change(input, { target: { value: 'React JS' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'laravel,  Flutter ,' } });
    fireEvent.change(input, { target: { value: 'react js' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(within(within(dialog).getByRole('group', { name: 'Saran tools' })).getByRole('button', { name: 'Figma' }));
    expect(within(within(dialog).getByRole('group', { name: 'Saran tools' })).queryByRole('button', { name: 'Laravel' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus laravel' }));
    await confirmDelete('Hapus tools "laravel"?');
    save(dialog);
    expect(onSave).toHaveBeenCalledWith({ ...LEGACY, tools: ['React JS', 'Flutter', 'Figma'] });
  });

  it('gambar detail: diunggah satu per satu sebagai data URI kecil, bisa digeser & dihapus; urutan ikut tersimpan', async () => {
    const { onSave, notify, dialog } = renderEditor(LEGACY);
    pick(fileInput(dialog, 'Tambah gambar detail'), [file('a.png', 'image/png'), file('b.jpg', 'image/jpeg'), file('c.webp', 'image/webp')]);
    // Selama mengunggah: simpan ditahan
    expect(within(dialog).getByRole('button', { name: 'Menunggu unggahan...' })).toBeDisabled();
    await waitFor(() => expect(within(dialog).getAllByRole('img', { name: /^Gambar detail/ })).toHaveLength(3));
    expect(uploads).toEqual(Array(3).fill('data:image/jpeg;base64,/9j/AAAA'));
    // Satu notifikasi untuk semua file yang dipilih
    await waitFor(() => expect(notify).toHaveBeenCalledWith('success', '3 gambar detail berhasil diunggah.', SAVE_HINT));
    expect(notify).toHaveBeenCalledTimes(1);

    const right = within(dialog).getByRole('button', { name: 'Geser gambar 1 ke kanan' });
    right.focus();
    fireEvent.click(right);
    // Fokus ikut gambar yang digeser (kini #2)
    expect(within(dialog).getByRole('button', { name: 'Geser gambar 2 ke kanan' })).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Geser gambar 1 ke kiri' })).toBeDisabled();
    // Hapus: Batal di dialog = gambar tetap; "Ya, hapus" = dilepas, dengan notifikasi
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus gambar 3' }));
    const confirm = await screen.findByRole('dialog', { name: 'Hapus gambar detail 3?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hapus gambar detail 3?' })).not.toBeInTheDocument());
    expect(within(dialog).getAllByRole('img', { name: /^Gambar detail/ })).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus gambar 3' }));
    await confirmDelete('Hapus gambar detail 3?');
    expect(notify).toHaveBeenLastCalledWith('success', 'Gambar detail 3 dihapus.', SAVE_HINT);
    save(dialog);
    expect(onSave).toHaveBeenCalledWith({
      ...LEGACY,
      gallery: ['/assets/projects/project_000000000002.jpg', '/assets/projects/project_000000000001.jpg'],
    });
  });

  it('gambar detail yang dihapus selagi/sebelum diunggah: tidak dipakai, tidak diunggah, dan tidak dihitung di notifikasi', async () => {
    // Unggahan pertama ditahan sampai dilepas, supaya gambar lain masih menunggu giliran saat dihapus
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const action = new URL(String(input), 'http://localhost').searchParams.get('action');
        if (action !== 'upload_project_image') return json(200, { success: true, video_max_mb: 30, max_images: 12 });
        uploads.push(String((JSON.parse(String(init?.body)) as { data: string }).data));
        const n = uploads.length;
        await gate;
        return json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` });
      }),
    );
    const { onSave, notify, dialog } = renderEditor(LEGACY);
    pick(fileInput(dialog, 'Tambah gambar detail'), [file('a.png', 'image/png'), file('b.png', 'image/png'), file('c.png', 'image/png')]);
    await waitFor(() => expect(uploads).toHaveLength(1));

    // c belum gilirannya, a sedang diunggah: keduanya dihapus lewat dialog
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus gambar 3' }));
    await confirmDelete('Hapus gambar detail 3?');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hapus gambar detail 3?' })).not.toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus gambar 1' }));
    await confirmDelete('Hapus gambar detail 1?');
    expect(notify).toHaveBeenLastCalledWith('success', 'Gambar detail 1 dihapus.', SAVE_HINT);

    await act(async () => release());
    await waitFor(() => expect(notify).toHaveBeenLastCalledWith('success', 'Gambar detail berhasil diunggah.', SAVE_HINT));
    // Hanya a (sudah terkirim) dan b; c tidak diunggah
    expect(uploads).toHaveLength(2);
    save(dialog);
    expect(onSave).toHaveBeenCalledWith({ ...LEGACY, gallery: ['/assets/projects/project_000000000002.jpg'] });
  });

  it('gambar ditolak dengan pesan jelas: bukan JPG/PNG/WEBP/GIF, terlalu besar, atau ditolak server; GIF dikirim apa adanya', async () => {
    const { notify, dialog } = renderEditor(LEGACY);
    uploadReply = () => json(400, { error: 'Ukuran gambar maksimal 10 MB.' });
    pick(fileInput(dialog, 'Tambah gambar detail'), [
      file('logo.svg', 'image/svg+xml'),
      file('besar.png', 'image/png', 26 * 1024 * 1024),
      file('ok.png', 'image/png'),
    ]);
    await waitFor(() =>
      expect(dialog).toHaveTextContent(
        '"logo.svg": Gambar proyek harus JPG, PNG, WEBP, atau GIF. "besar.png" lebih dari 25 MB. Ukuran gambar maksimal 10 MB.',
      ),
    );
    expect(within(dialog).queryAllByRole('img', { name: /^Gambar detail/ })).toHaveLength(0);
    // Pesan di kolom tetap; notifikasi gagal merangkum semuanya
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'error',
        'Gagal mengunggah gambar detail.',
        '"logo.svg": Gambar proyek harus JPG, PNG, WEBP, atau GIF. "besar.png" lebih dari 25 MB. Ukuran gambar maksimal 10 MB.',
      ),
    );

    uploadReply = (n) => json(200, { success: true, url: `/assets/projects/project_00000000000${n}.gif` });
    pick(fileInput(dialog, 'Ganti gambar kartu'), [new File(['GIF89a'], 'anim.gif', { type: 'image/gif' })]);
    await waitFor(() => expect(within(dialog).getByRole('img', { name: 'Gambar kartu proyek' })).toHaveAttribute('src', '/assets/projects/project_000000000002.gif'));
    expect(uploads[1]).toMatch(/^data:image\/gif;base64,R0lGODlh/);
    expect(notify).toHaveBeenLastCalledWith('success', 'Gambar kartu berhasil diunggah.', SAVE_HINT);
  });

  it('video: batas dari server, unggah mentah ke upload_project_video dengan progres, simpan ditahan sampai selesai', async () => {
    let finish: (url: string) => void = () => {};
    const abort = vi.fn();
    vi.mocked(uploadHeroVideo).mockImplementation((_file, options) => {
      options.onProgress?.(40);
      return { promise: new Promise<string>((resolve) => (finish = resolve)), abort } satisfies HeroVideoUpload;
    });
    const { onSave, notify, dialog } = renderEditor(LEGACY);
    await waitFor(() => expect(dialog).toHaveTextContent('MP4 atau WebM, maks. 30 MB.'));

    pick(fileInput(dialog, 'Tambah video'), [file('besar.mp4', 'video/mp4', 31 * 1024 * 1024)]);
    expect(dialog).toHaveTextContent('Ukuran video maksimal 30 MB.');
    expect(uploadHeroVideo).not.toHaveBeenCalled();
    pick(fileInput(dialog, 'Tambah video'), [file('film.mov', 'video/quicktime')]);
    expect(dialog).toHaveTextContent('Format video harus MP4 atau WebM.');
    expect(notify).toHaveBeenLastCalledWith('error', 'Gagal mengunggah video.', 'Format video harus MP4 atau WebM.');

    pick(fileInput(dialog, 'Tambah video'), [file('demo.mp4', 'video/mp4')]);
    expect(vi.mocked(uploadHeroVideo).mock.calls[0][1]).toMatchObject({ token: 'test-token', url: PROJECT_VIDEO_UPLOAD_URL });
    expect(await within(dialog).findByRole('progressbar', { name: 'Mengunggah demo.mp4' })).toHaveAttribute('aria-valuenow', '40');
    expect(within(dialog).getByRole('button', { name: 'Menunggu unggahan...' })).toBeDisabled();
    await act(async () => finish('/assets/projects/project_video_0123456789ab.mp4'));
    expect(dialog.querySelector('video')).toHaveAttribute('src', '/assets/projects/project_video_0123456789ab.mp4');
    expect(notify).toHaveBeenLastCalledWith('success', 'Video berhasil diunggah.', SAVE_HINT);
    save(dialog);
    expect(onSave).toHaveBeenCalledWith({ ...LEGACY, video: '/assets/projects/project_video_0123456789ab.mp4' });
  });

  it('Batal saat video diunggah membatalkan unggahannya', () => {
    const abort = vi.fn();
    vi.mocked(uploadHeroVideo).mockReturnValue({ promise: new Promise<string>(() => {}), abort });
    const { onClose, dialog } = renderEditor(LEGACY);
    pick(fileInput(dialog, 'Tambah video'), [file('demo.mp4', 'video/mp4')]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    expect(abort).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('isian lengkap tersimpan rapi (deskripsi dirapikan, tautan, tools, galeri, video), lalu bisa dikosongkan lagi', async () => {
    const full: PortfolioItem = {
      ...LEGACY,
      description: 'Kasir Android.',
      tools: ['Flutter'],
      url: 'https://pos.contoh.com',
      gallery: ['/assets/projects/project_0123456789ab.jpg'],
      video: '/assets/projects/project_video_0123456789ab.mp4',
    };
    const { onSave, dialog } = renderEditor(full);
    fireEvent.change(within(dialog).getByLabelText(/Deskripsi proyek/), { target: { value: '  Kasir Android.\r\nStruk Bluetooth.  ' } });
    save(dialog);
    expect(onSave).toHaveBeenLastCalledWith({ ...full, description: 'Kasir Android.\nStruk Bluetooth.' });

    fireEvent.change(within(dialog).getByLabelText(/Deskripsi proyek/), { target: { value: '   ' } });
    fireEvent.change(within(dialog).getByLabelText(/Tautan situs/), { target: { value: '' } });
    // Tiap hapus lewat dialog konfirmasi
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus Flutter' }));
    await confirmDelete('Hapus tools "Flutter"?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus gambar 1' }));
    await confirmDelete('Hapus gambar detail 1?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus video' }));
    await confirmDelete('Hapus video proyek?');
    save(dialog);
    expect(onSave).toHaveBeenLastCalledWith(LEGACY);
  });
});

describe('isian proyek (portfolio.ts, sama dengan backend)', () => {
  it('projectUrl: http(s) atau domain saja, karakter URL ASCII saja', () => {
    const cases: [unknown, string][] = [
      ['https://garudanexa.com', 'https://garudanexa.com'],
      ['HTTP://Garudanexa.com/a?b=1#c', 'http://Garudanexa.com/a?b=1#c'],
      ['garudanexa.com', 'https://garudanexa.com'],
      [' pos.contoh.co.id:8080/demo ', 'https://pos.contoh.co.id:8080/demo'],
      ['localhost', ''],
      ['https://', ''],
      ['javascript:alert(1)', ''],
      ['ftp://contoh.com', ''],
      ['//contoh.com', ''],
      ['https://contoh.com/"onmouseover', ''],
      ['https://contoh.com/ spasi', ''],
      ['https://cöntoh.com', ''],
      [`https://contoh.com/${'a'.repeat(481)}`, `https://contoh.com/${'a'.repeat(481)}`],
      [`https://contoh.com/${'a'.repeat(482)}`, ''],
      [42, ''],
    ];
    for (const [value, expected] of cases) expect(projectUrl(value), String(value)).toBe(expected);
  });

  it('projectTools, projectGallery, mediaLink, projectDescription', () => {
    expect(projectTools(['  React   JS ', 'react js', 'REACT JS', '', '\tVue\n', 7, 'x'.repeat(50)])).toEqual(['React JS', 'Vue', 'x'.repeat(40)]);
    expect(projectTools(Array.from({ length: 20 }, (_, i) => `Tool ${i}`))).toHaveLength(12);
    expect(projectTools('React')).toEqual([]);
    expect(projectGallery([' /a.jpg ', 'javascript:alert(1)', '\u0001vbscript:x', '', null, '/b.png'])).toEqual(['/a.jpg', '/b.png']);
    expect(projectGallery(Array(20).fill('/a.jpg'))).toHaveLength(12);
    expect(mediaLink(' JavaScript:alert(1)')).toBe('');
    expect(mediaLink('/v.mp4')).toBe('/v.mp4');
    expect(projectDescription('\u0000 Halo\r\ndunia\u0007 ')).toBe('Halo\ndunia');
    expect(projectDescription(`${'é'.repeat(2999)}ab`)).toBe(`${'é'.repeat(2999)}a`);
  });

  it('cleanPortfolioItem, checkProjectImage, dataUriBytes, imageUploadMessage', () => {
    expect(cleanPortfolioItem({ ...LEGACY, description: ' ', tools: [], url: '', gallery: [], video: '' })).toEqual(LEGACY);
    expect(checkProjectImage({ name: 'a.txt', type: 'text/plain', size: 1 })).toBe('"a.txt" bukan file gambar.');
    expect(checkProjectImage({ name: 'a.svg', type: 'image/svg+xml', size: 1 })).toBe('"a.svg": Gambar proyek harus JPG, PNG, WEBP, atau GIF.');
    expect(checkProjectImage({ name: 'a.png', type: 'image/png', size: 25 * 1024 * 1024 + 1 })).toBe('"a.png" lebih dari 25 MB.');
    expect(checkProjectImage({ name: 'a.webp', type: 'image/webp', size: 1 })).toBeNull();
    expect(dataUriBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(imageUploadMessage(new ApiError('Sesi tidak valid', 401))).toBe('Sesi kamu berakhir. Masuk lagi lalu unggah ulang.');
    expect(imageUploadMessage(new ApiError('Permintaan gagal (413).', 413))).toBe('Ukuran gambar terlalu besar untuk server.');
    expect(imageUploadMessage(new ApiError('Ukuran gambar melebihi batas server.', 413))).toBe('Ukuran gambar melebihi batas server.');
  });
});
