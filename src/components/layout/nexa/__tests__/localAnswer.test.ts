// Jawaban bawaan Nexa (tanpa AI): pertanyaan umum harus mendapat jawaban & halaman yang tepat, termasuk yang diawali
// salam, memakai imbuhan ("diedit", "harganya"), atau menanyakan aplikasi custom (bukan harga template).
import { describe, expect, it } from 'vitest';
import { answerLocally } from '../localAnswer';

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
});
