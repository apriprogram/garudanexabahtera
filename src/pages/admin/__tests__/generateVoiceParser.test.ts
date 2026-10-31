// Parser lokal transkrip suara menu Generate (src/pages/admin/generate/voiceParser.ts): angka yang diucapkan, tanggal,
// email yang dieja, item, dan pemetaan kata kunci ke isian form invoice/proposal.
// Jalankan: npx vitest run src/pages/admin/__tests__/generateVoiceParser.test.ts
import { describe, expect, it } from 'vitest';
import { findAmounts, normalizeNumbers, parseDate, parseItem, parseTranscript, spokenEmail } from '../generate/voiceParser';

const TODAY = '2026-11-01';

describe('angka yang diucapkan', () => {
  it.each([
    ['satu juta lima ratus ribu', '1500000'],
    ['dua puluh lima', '25'],
    ['seratus dua belas', '112'],
    ['tiga ratus lima puluh ribu', '350000'],
    ['satu setengah juta', '1500000'],
    ['setengah juta', '500000'],
    ['satu koma lima juta', '1500000'],
    ['sejuta', '1000000'],
    ['dua miliar lima ratus juta', '2500000000'],
    ['nol delapan satu dua tiga empat', '081234'],
  ])('%s → %s', (words, digits) => {
    expect(normalizeNumbers(words)).toBe(digits);
  });

  it('kata lain dan satuan setelah digit tidak berubah', () => {
    expect(normalizeNumbers('harga 500 ribu satuan')).toBe('harga 500 ribu satuan');
  });

  it.each([
    ['1,5 juta', 1500000],
    ['1.5jt', 1500000],
    ['500rb', 500000],
    ['Rp1.500.000', 1500000],
    ['2 juta 500 ribu', 2500000],
    ['750 ribu', 750000],
    ['2 m', 2000000000],
  ])('jumlah uang %s = %d', (text, value) => {
    expect(findAmounts(text.replace(/rp/i, ''))[0]?.value).toBe(value);
  });
});

describe('tanggal', () => {
  it.each([
    ['15 november 2026', '2026-11-15'],
    ['15 nov', '2026-11-15'],
    ['20/12/2026', '2026-12-20'],
    ['besok', '2026-11-02'],
    ['14 hari', '2026-11-15'],
    ['2 minggu lagi', '2026-11-15'],
    ['akhir bulan', '2026-11-30'],
    ['bulan depan', '2026-12-01'],
  ])('%s → %s', (text, iso) => {
    expect(parseDate(text, TODAY)).toBe(iso);
  });

  it('jatuh tempo tanpa tahun yang sudah lewat pindah ke tahun berikutnya', () => {
    expect(parseDate('10 januari', TODAY, true)).toBe('2027-01-10');
  });
});

it('email yang dieja', () => {
  expect(spokenEmail('Budi Santoso at gmail titik com')).toBe('budisantoso@gmail.com');
  expect(spokenEmail('info@majujaya.co.id')).toBe('info@majujaya.co.id');
  expect(spokenEmail('bukan email')).toBe('');
});

it('item: deskripsi, qty, satuan, harga', () => {
  expect(parseItem('pembuatan website company profile 1 paket harga 5 juta')).toEqual({
    description: 'Pembuatan website company profile',
    qty: 1,
    unit: 'paket',
    price: 5000000,
  });
  expect(parseItem('hosting 12 bulan 100 ribu per bulan')).toEqual({ description: 'Hosting', qty: 12, unit: 'bulan', price: 100000 });
  expect(parseItem('lisensi aplikasi sebanyak 3 total 1,5 juta')).toEqual({ description: 'Lisensi aplikasi', qty: 3, unit: '', price: 500000 });
});

describe('transkrip lengkap', () => {
  it('invoice', () => {
    const data = parseTranscript(
      'nama klien budi santoso dari pt maju jaya email budi at gmail titik com telepon 0812 3456 7890 alamat jalan merdeka nomor 10 bandung ' +
        'item pembuatan website company profile 1 paket harga satu juta lima ratus ribu item hosting 12 bulan 100 ribu per bulan ' +
        'diskon 10 persen ppn 11 persen jatuh tempo 14 hari catatan terima kasih atas kepercayaannya rekening bca 1234567890 atas nama pt garuda nexa bahtera',
      'invoice',
      TODAY,
    );
    expect(data).toMatchObject({
      client_name: 'Budi Santoso',
      client_company: 'PT Maju Jaya',
      client_email: 'budi@gmail.com',
      client_phone: '081234567890',
      client_address: 'Jalan Merdeka Nomor 10 Bandung',
      items: [
        { description: 'Pembuatan website company profile', qty: 1, unit: 'paket', price: 1500000 },
        { description: 'Hosting', qty: 12, unit: 'bulan', price: 100000 },
      ],
      discount_type: 'percent',
      discount_value: 10,
      tax_enabled: true,
      tax_rate: 11,
      due_date: '2026-11-15',
      notes: 'Terima kasih atas kepercayaannya',
      payment_info: 'Rekening BCA 1234567890 atas nama PT garuda nexa bahtera',
    });
  });

  it('proposal', () => {
    const data = parseTranscript(
      'klien ibu sari dari sma harapan bangsa judul proyek website sekolah dan ppdb online latar belakang sekolah butuh website untuk informasi dan pendaftaran siswa baru ' +
        'fitur profil sekolah, berita, galeri dan pendaftaran online tahapan analisis 1 minggu, desain 2 minggu, pengembangan 4 minggu ' +
        'biaya desain 2 juta biaya pengembangan 8 juta berlaku sampai 30 november',
      'proposal',
      TODAY,
    );
    expect(data.client_name).toBe('Ibu Sari');
    expect(data.client_company).toBe('SMA Harapan Bangsa');
    expect(data.title).toBe('Website Sekolah dan PPDB Online');
    expect(data.summary).toBe('Sekolah butuh website untuk informasi dan pendaftaran siswa baru.');
    expect(data.scope).toEqual(['Profil sekolah', 'Berita', 'Galeri', 'Pendaftaran online']);
    expect(data.timeline).toEqual([
      { phase: 'Analisis', duration: '1 minggu', description: '' },
      { phase: 'Desain', duration: '2 minggu', description: '' },
      { phase: 'Pengembangan', duration: '4 minggu', description: '' },
    ]);
    expect(data.items).toEqual([
      { description: 'Desain', qty: 1, unit: '', price: 2000000 },
      { description: 'Pengembangan', qty: 1, unit: '', price: 8000000 },
    ]);
    expect(data.valid_until).toBe('2026-11-30');
  });
});
