// Jawaban bawaan Nexa (tanpa AI): pertanyaan umum harus mendapat jawaban & halaman yang tepat, termasuk yang diawali
// salam, memakai imbuhan ("diedit", "harganya"), atau menanyakan aplikasi custom (bukan harga template).
import { describe, expect, it } from 'vitest';
import { DOMAIN_PRICE_FROM, HOSTING_RENEWAL_DEFAULT, rupiahCompact } from '../../../../lib/domainPricing';
import { answerLocally, DOMAIN_PRICE_TEXT, renewalText, TEMPLATE_INCLUDES_TEXT, TEMPLATES_INTRO } from '../localAnswer';

const WA = 'https://wa.me/6285188009152';
const linkOf = (question: string) => answerLocally(question, WA).action;

describe('answerLocally', () => {
  it.each([
    ['Halo, apakah bisa refund?', '/kebijakan-pengembalian-dana'],
    ['apakah template bisa dibatalkan?', '/kebijakan-pengembalian-dana'],
    ['halo kak, berapa harganya?', '/harga'],
    ['hello, how much is a template?', '/harga'],
    ['harga website custom berapa?', '/pesan-custom'],
    ['berapa harga aplikasi?', '/pesan-custom'],
    ['berapa lama pembuatan aplikasi?', '/pesan-custom'],
    ['pagi min, bisa bayar pakai qris?', '/template'],
    ['permisi, ada diskon?', '/template'],
    ['malam, cara pesan gimana?', '/template'],
    ['website template bisa diedit?', '/template'],
    ['ada template website untuk sekolah?', '/template'],
    ['punya untuk studio yoga atau pilates?', '/template'],
    ['Bisa bikin toko online?', '/jasa-pembuatan-website'],
    ['bisa rilis ke play store?', '/jasa-aplikasi-mobile'.replace('jasa-aplikasi-mobile', 'jasa-pembuatan-aplikasi-mobile')],
    ['domain saya bagaimana?', '/harga'],
  ])('%s -> %s', (question, path) => {
    expect(linkOf(question)?.to).toBe(path);
  });

  it('kontak & pertanyaan yang tidak dikenal -> WhatsApp; salam saja -> sapaan tanpa tautan', () => {
    expect(linkOf('Hai, nomor whatsapp admin berapa?')?.href).toBe(WA);
    expect(answerLocally('Siapa juara piala dunia?', WA)).toEqual({
      text: expect.stringMatching(/belum punya jawabannya/),
      action: { label: 'Chat WhatsApp', href: WA },
      mood: 'maaf',
    });
    const hello = answerLocally('Halo kak', WA);
    expect(hello.text).toMatch(/^Halo! Saya Nexa/);
    expect(hello.action).toBeUndefined();
    expect(hello.mood).toBe('kedip');
  });

  // Kata "proyek/klien" dalam pertanyaan lain tetap mendapat jawaban khususnya; galeri proyek hanya untuk hasil kerja kami
  it.each([
    ['Apakah ada diskon untuk proyek pertama?', '/template'],
    ['Bagaimana cara bayar proyek?', '/template'],
    ['Berapa harga proyek website?', '/harga'],
    ['Bisa pakai domain sendiri untuk project saya?', '/harga'],
    ['Saya mau pesan website custom untuk klien saya', '/pesan-custom'],
    ['Saya mau bikin aplikasi android untuk klien', '/jasa-pembuatan-aplikasi-mobile'],
    ['Apakah data proyek saya aman?', '/harga'],
    ['Template apa yang cocok untuk project klinik saya?', '/template'],
    ['Apakah kalian bisa bikin aplikasi android untuk klien saya?', '/jasa-pembuatan-aplikasi-mobile'],
    ['Apakah kalian menerima proyek toko online?', '/jasa-pembuatan-website'],
    ['Apakah kalian bisa membuat proyek custom?', '/pesan-custom'],
    ['Apakah kalian menjamin keamanan data proyek?', '/harga'],
    ['Bisa pakai domain sendiri untuk project yang kalian buat?', '/harga'],
    ['Boleh lihat portofolio templatenya?', '/template'],
  ])('tanpa galeri proyek: %s -> %s', (question, path) => {
    const answer = answerLocally(question, WA);
    expect(answer.action?.to).toBe(path);
    expect(answer.cards).not.toBe('projects');
  });

  it.each(['Boleh lihat proyek yang sudah kalian kerjakan?', 'Proyek apa saja yang pernah dikerjakan?', 'Ada portofolio?'])(
    'galeri proyek: %s',
    (question) => {
      const answer = answerLocally(question, WA);
      expect(answer.cards).toBe('projects');
      expect(answer.action?.to).toBe('/pesan-custom');
    },
  );

  it('jawaban harga aplikasi custom = tanya jawab biaya custom, bukan harga template', () => {
    expect(answerLocally('berapa harga aplikasi?', WA).text).toMatch(/penawaran/i);
    expect(answerLocally('berapa harga aplikasi?', WA).text).not.toMatch(/sudah termasuk setup, domain/);
  });

  // Domain tidak termasuk harga template (pemilik 2026-10-25): dijawab jujur, angka dari domainPricing.ts
  it.each(['Apakah sudah termasuk domain?', 'Apakah sudah termasuk hosting dan domain?', 'Dapat domain gratis?', 'Berapa harga domain .com?', 'is the domain included?'])(
    'domain tidak termasuk: %s',
    (question) => {
      const answer = answerLocally(question, WA);
      expect(answer.text).toMatch(/^Domain belum termasuk harga template\./);
      expect(answer.text).toContain(`mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun`);
      expect(answer.text).toContain('.com dan .id Rp250.000/tahun');
      expect(answer.text).toContain('Harga template sudah termasuk setup awal, hosting, dan SSL tahun pertama.');
      expect(answer.text).toContain(`hosting & jasa ${rupiahCompact(HOSTING_RENEWAL_DEFAULT)} ditambah domain sesuai ekstensinya`);
      expect(answer.text).not.toMatch(/termasuk (setup, )?domain|domain, hosting/i);
      expect(answer.action?.to).toBe('/harga');
    },
  );

  it.each([
    'Berapa biaya perpanjangan tahun ke-2?',
    'biaya tahun kedua berapa?',
    'Bagaimana cara perpanjang domain dan hosting?',
    'Kalau masa aktif habis bagaimana?',
    'how do I renew my website?',
  ])('perpanjangan: %s', (question) => {
    const answer = answerLocally(question, WA);
    expect(answer.text).toMatch(/^Mulai tahun ke-2, biaya per tahun adalah hosting & jasa Rp500\.000 ditambah perpanjangan domain/);
    expect(answer.text).toContain('.com Rp250.000, .web.id Rp50.000');
    expect(answer.text).toContain('1, 2, atau 3 tahun sekaligus dari halaman pesanan di Akun Saya');
    expect(answer.text).toContain('Midtrans');
    expect(answer.action?.to).toBe('/harga');
  });

  it('biaya hosting & jasa mengikuti setting admin', () => {
    expect(answerLocally('biaya perpanjangan berapa?', WA, 750_000).text).toContain('hosting & jasa Rp750.000');
    expect(answerLocally('sudah termasuk domain?', WA, 750_000).text).toContain('hosting & jasa Rp750.000');
    expect(renewalText()).toBe('Mulai tahun ke-2, biaya per tahun adalah hosting & jasa Rp500.000 ditambah domain sesuai ekstensinya.');
  });

  it('teks bersama topik cepat: tanpa "termasuk domain", domain mulai Rp50.000/tahun', () => {
    expect(TEMPLATE_INCLUDES_TEXT).toBe('setup awal, hosting, dan SSL tahun pertama');
    expect(DOMAIN_PRICE_TEXT).toBe('Domain dipilih saat memesan, mulai Rp50.000/tahun (.com dan .id Rp250.000).');
    expect(TEMPLATES_INTRO).toContain('Harganya sudah termasuk setup awal, hosting, dan SSL tahun pertama, plus diskon 20%');
    expect(TEMPLATES_INTRO).toContain(DOMAIN_PRICE_TEXT);
    const catalog = answerLocally('ada template untuk klinik?', WA);
    expect(catalog.text).toBe(TEMPLATES_INTRO);
    expect(catalog.cards).toBe('templates');
    for (const text of [TEMPLATES_INTRO, catalog.text]) expect(text).not.toMatch(/termasuk (setup, )?domain|domain, hosting/i);
  });
});
