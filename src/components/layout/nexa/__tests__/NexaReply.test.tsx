// @vitest-environment jsdom
// Jawaban Nexa yang rapi (replyModel.ts + NexaReply.tsx): pengurai teks tidak mengubah teks biasa (".co.id"), kode
// [proyek:…] hilang tanpa sisa tanda baca, nomor daftar tetap, dan label tautan tidak mengulang kata di sekitarnya.
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { Template } from '../../../../types/platform';
import { NexaReply } from '../NexaReply';
import { PROJECT_QUESTION, parseReply, type NexaCatalog } from '../replyModel';

afterEach(cleanup);

const AURA = { id: 4, slug: 'aura-studio', name: 'Aura Studio', category: 'Kecantikan & Klinik', price: 1390000, preview_image: '/a.webp', status: 'published' } as unknown as Template;
const FREE = { id: 5, slug: 'gratis-kit', name: 'Gratis Kit', category: 'Starter', price: 0, preview_image: '', status: 'published' } as unknown as Template;
const CATALOG: NexaCatalog = { templates: new Map([[AURA.slug, AURA], [FREE.slug, FREE]]), templateList: [AURA, FREE], projects: [] };

const renderReply = (text: string, cards?: 'templates' | 'projects') =>
  render(
    <MemoryRouter>
      <NexaReply text={text} cards={cards} catalog={CATALOG} onNavigate={() => {}} />
    </MemoryRouter>,
  );

describe('parseReply', () => {
  it('teks tanpa kode proyek tidak diubah: ".co.id", spasi sebelum koma, "- .NET" tetap butir', () => {
    expect(parseReply('Bisa pakai domain .com, .id, atau .co.id.').blocks).toEqual([{ kind: 'p', text: 'Bisa pakai domain .com, .id, atau .co.id.' }]);
    expect(parseReply('- .NET dan PHP\n- Laravel').blocks).toEqual([{ kind: 'ul', items: ['.NET dan PHP', 'Laravel'] }]);
  });

  it('kode proyek dibuang beserta pemisahnya; butir yang diawali kode tetap butir; butir berisi kode saja hilang', () => {
    const parsed = parseReply('Proyek kami:\n- [proyek:p-1] Kasir Toko\n- **Klinik** — Kode: [proyek:p-2].\n- Desa ([proyek:f-desa])\n- [proyek:p-1]');
    expect(parsed.projectKeys).toEqual(['p-1', 'p-2', 'f-desa']);
    expect(parsed.blocks).toEqual([
      { kind: 'p', text: 'Proyek kami:' },
      { kind: 'ul', items: ['Kasir Toko', '**Klinik**.', 'Desa'] },
    ]);
  });

  it('daftar bernomor menyimpan nomor awalnya; baris menjorok = lanjutan butir', () => {
    expect(parseReply('1. **Pilih template**\n   - Lihat /template\n2. Bayar lewat Midtrans\n3. Selesai').blocks).toEqual([
      { kind: 'ol', start: 1, items: ['**Pilih template**'] },
      { kind: 'ul', items: ['Lihat /template'], indent: true },
      { kind: 'ol', start: 2, items: ['Bayar lewat Midtrans', 'Selesai'] },
    ]);
    // Sub-langkah bernomor menjorok = sub-daftar sendiri; langkah induk tetap 1-2-3
    expect(parseReply('1. Pilih paket\n   1. Basic\n   2. Pro\n2. Bayar\n3. Selesai').blocks).toEqual([
      { kind: 'ol', start: 1, items: ['Pilih paket'] },
      { kind: 'ol', start: 1, items: ['Basic', 'Pro'], indent: true },
      { kind: 'ol', start: 2, items: ['Bayar', 'Selesai'] },
    ]);
    expect(parseReply('1. Pilih template\n   Lihat katalog di /template.\n2. Bayar').blocks).toEqual([
      { kind: 'ol', start: 1, items: ['Pilih template Lihat katalog di /template.', 'Bayar'] },
    ]);
  });
});

describe('PROJECT_QUESTION: hasil kerja kami, bukan proyek pengunjung', () => {
  it.each([
    'Boleh lihat proyek yang sudah kalian kerjakan?',
    'Proyek apa saja yang pernah dikerjakan?',
    'Ada portofolio?',
    'Contoh project sebelumnya?',
    'Klien kalian siapa saja?',
    'Apa saja proyek yang pernah kalian buat?',
    'Project apa saja yang sudah kalian kerjakan?',
  ])('galeri: %s', (question) => {
    expect(PROJECT_QUESTION.test(question)).toBe(true);
  });
  it.each([
    'Berapa lama pengerjaan project website?',
    'Template apa yang cocok untuk project klinik saya?',
    'Bisa buat web app client-side untuk klien saya?',
    'Apakah ada diskon untuk proyek pertama?',
    'Apakah data proyek saya aman?',
    // "kalian" hanya menyapa usaha kami, bukan menanyakan hasil kerja
    'Apakah kalian bisa bikin aplikasi android untuk klien saya?',
    'Bisakah kalian mengerjakan proyek aplikasi android?',
    'Apakah kalian menerima proyek toko online?',
    'Bisa pakai domain sendiri untuk project yang kalian buat?',
    'Apa saja yang termasuk dalam proyek?',
    'Berapa lama kalian mengerjakan proyek?',
    'Saya sudah bayar proyek, kapan dikerjakan?',
    'Do you have a portfolio of templates?',
  ])('tanpa galeri: %s', (question) => {
    expect(PROJECT_QUESTION.test(question)).toBe(false);
  });
});

describe('NexaReply', () => {
  it('"**Aura Studio** (/template/aura-studio)" jadi satu tautan tebal, tanpa "(Aura Studio)"; kartu tetap tampil', () => {
    renderReply('Pilihan untuk klinik:\n- **Aura Studio** (/template/aura-studio): desain lembut.\n- Atau Aura Studio (/template/aura-studio) versi lain.');
    const items = screen.getAllByRole('listitem').filter((li) => li.closest('[data-block="ul"]'));
    expect(items[0]).toHaveTextContent(/^Aura Studio: desain lembut\.$/);
    expect(within(items[0]).getByRole('link', { name: 'Aura Studio' }).closest('strong')).not.toBeNull();
    expect(items[1]).toHaveTextContent(/^Atau Aura Studio versi lain\.$/);
    expect(screen.getByRole('list', { name: 'Template yang disebut' })).toBeInTheDocument();
  });

  it('label tautan tidak mengulang kata di sekitarnya: "halaman /harga", "katalog template di /template", WhatsApp', () => {
    renderReply('Cek di halaman /harga. Lihat katalog template di /template. Chat WhatsApp kami di wa.me/6285188009152. Atau hubungi WhatsApp wa.me/6285188009152.');
    const text = screen.getByText(/Cek di/).textContent;
    expect(text).toBe('Cek di halaman Harga. Lihat katalog template di sini. Chat WhatsApp kami di 0851-8800-9152. Atau hubungi WhatsApp.');
    expect(screen.getByRole('link', { name: 'halaman Harga' })).toHaveAttribute('href', '/harga');
    expect(screen.getByRole('link', { name: 'sini' })).toHaveAttribute('href', '/template');
    // Nama aksesibel memuat teks yang terlihat (WCAG 2.5.3)
    expect(screen.getByRole('link', { name: '0851-8800-9152 (WhatsApp, tab baru)' })).toHaveAttribute('href', 'https://wa.me/6285188009152');
    expect(screen.getByRole('link', { name: 'WhatsApp (wa.me/6285188009152, tab baru)' })).toHaveAttribute('href', 'https://wa.me/6285188009152');
  });

  it('kata yang ditebalkan model ikut diperiksa; nama halaman + path dalam kurung = satu tautan', () => {
    renderReply('Cek **halaman Harga** di /harga. Chat **WhatsApp** kami di wa.me/6285188009152. Lihat halaman Harga (/harga).');
    expect(screen.getByText(/^Cek/).textContent).toBe('Cek halaman Harga di sini. Chat WhatsApp kami di 0851-8800-9152. Lihat halaman Harga.');
    expect(screen.getAllByRole('link', { name: /halaman Harga/ })).toHaveLength(1);
  });

  it('jawaban berbahasa Inggris memakai label Inggris', () => {
    renderReply('You can check our prices on /harga, or send your requirements through /pesan-custom.\n- **Aura Studio** (/template/aura-studio): a soft design for clinics.');
    expect(screen.getByText(/^You can/).textContent).toBe('You can check our prices on pricing page, or send your requirements through custom order form.');
    expect(screen.getByText('Related templates')).toBeInTheDocument();
  });

  it('daftar bernomor melanjutkan nomor model', () => {
    renderReply('1. Pilih\n   - Lihat /template\n2. Bayar');
    const lists = document.querySelectorAll('[data-block="ol"]');
    expect(lists[1]).toHaveAttribute('start', '2');
    expect(lists[1]).toHaveTextContent(/^2Bayar$/);
  });

  it('kartu template: harga berlabel untuk pembaca layar, template gratis → "Gratis"', () => {
    renderReply('Template pilihan kami.', 'templates');
    const list = screen.getByRole('list', { name: 'Template yang disebut' });
    const [aura, free] = within(list).getAllByRole('link');
    expect(aura).toHaveTextContent(/Harga pembelian pertama Rp\s?1\.112\.000/);
    expect(aura).toHaveTextContent(/Harga normal Rp\s?1\.390\.000/);
    expect(free).toHaveTextContent(/Gratis/);
    expect(free.querySelector('img')).toBeNull();
  });
});
