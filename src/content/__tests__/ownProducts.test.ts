// @vitest-environment node
// Jalankan: npx vitest run src/content/__tests__/ownProducts.test.ts
// Produk sendiri (i-School, i-Santri, …; SEO-PLAN Lampiran B: "[konfirmasi pemilik]") hanya boleh disebut di teks
// halaman publik setelah pemilik mengonfirmasinya di COMPANY_FACTS.ownProducts. Selama nilainya null, nama produk tidak
// boleh muncul di isi halaman (src/content, src/pages/public), sama seperti /tentang yang tidak merendernya.
// Strip produk & layanan di beranda (LogoTicker, data dari pengaturan admin) adalah keputusan pemilik terpisah.
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS } from '../../lib/companyFacts';

/** Nama produk sendiri yang direncanakan (Lampiran B), menunggu konfirmasi pemilik. */
const PLANNED_OWN_PRODUCTS = ['i-School', 'i-Santri'];

const sources = {
  ...import.meta.glob<string>(['../**/*.{ts,tsx,md}', '!../**/__tests__/**'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../../pages/public/**/*.{ts,tsx}', '!../../pages/public/**/__tests__/**'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

describe('produk sendiri di teks halaman publik', () => {
  it('membaca isi halaman publik', () => {
    expect(Object.keys(sources).some((file) => file.endsWith('/services.ts'))).toBe(true);
    expect(Object.keys(sources).some((file) => file.endsWith('/Tentang.tsx'))).toBe(true);
  });

  it.skipIf(COMPANY_FACTS.ownProducts !== null)('tidak menyebut produk yang belum dikonfirmasi pemilik (ownProducts = null)', () => {
    const found = Object.entries(sources).flatMap(([file, text]) =>
      PLANNED_OWN_PRODUCTS.filter((name) => text.toLowerCase().includes(name.toLowerCase())).map((name) => `${file}: ${name}`),
    );
    expect(found).toEqual([]);
  });
});
