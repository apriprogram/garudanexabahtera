// Aset demo template: foto asli (Unsplash License, lihat public/assets/templates/photos/CREDITS.md), logo perusahaan
// demo, dan logo klien fiktif. Konten menyimpan SATU path (varian terbesar); <Photo>/<Img>/<Avatar> menambahkan
// srcset dari registry ini. Path lain (unggahan pembeli, URL luar) tetap dipakai apa adanya.

const PHOTO_DIR = '/assets/templates/photos';

export interface PhotoAsset {
  /** Varian terbesar = nilai yang disimpan di konten */
  src: string;
  /** Ukuran intrinsik varian terbesar (atribut width/height) */
  width: number;
  height: number;
  /** srcset lengkap ("…-800.webp 800w, …-1600.webp 1600w") */
  srcSet: string;
  /** Deskripsi isi foto (bahasa Indonesia) untuk alt bawaan */
  alt: string;
}

type PhotoSpec = [key: string, width: number, height: number, alt: string];

/** Foto suasana: dua lebar 1600 & 800 (rasio asli; foto vertikal dipotong 4:5). */
const SCENES: PhotoSpec[] = [
  ['corporate-nexa-hero', 1600, 1067, 'Sudut gedung kantor modern berfasad putih dan kaca'],
  ['corporate-nexa-engineers', 1600, 1067, 'Dua insinyur berhelm membahas gambar kerja di kantor proyek'],
  ['corporate-nexa-site-team', 1600, 2000, 'Pengawas lapangan berdiskusi di lokasi proyek'],
  ['corporate-nexa-blueprint', 1600, 1077, 'Gambar kerja arsitektur dengan pensil dan penggaris'],
  ['corporate-nexa-steel', 1600, 1697, 'Rangka baja dan atap bangunan yang sedang dibangun'],
  ['corporate-nexa-warehouse', 1600, 1067, 'Gudang berstruktur baja bentang lebar'],
  ['corporate-nexa-meeting-room', 1600, 900, 'Ruang rapat berdinding kaca di kantor modern'],
  ['corporate-nexa-meeting', 1600, 964, 'Tim berdiskusi di ruang rapat dengan pemandangan kota'],
  ['corporate-nexa-facade', 1600, 900, 'Fasad kaca gedung dilihat dari bawah'],
  ['corporate-nexa-lobby', 1600, 900, 'Lobi kantor dengan meja resepsionis marmer'],
  ['startup-clean-hero', 1600, 1067, 'Barista mencatat pesanan di tablet kasir'],
  ['startup-clean-owner', 1600, 1063, 'Pemilik kedai tersenyum di balik meja kasir'],
  ['startup-clean-pos', 1600, 1067, 'Transaksi di layar sentuh mesin kasir'],
  ['startup-clean-stock', 1600, 900, 'Memeriksa stok di rak toko dengan tablet'],
  ['startup-clean-qris', 1600, 1067, 'Ponsel menampilkan kode QR pembayaran'],
  ['startup-clean-report', 1600, 896, 'Laptop menampilkan grafik laporan penjualan'],
  ['startup-clean-boutique', 1600, 1200, 'Pemilik butik memakai tablet kasir'],
  ['startup-clean-team', 1600, 1067, 'Tim produk bekerja bersama dengan laptop'],
  ['startup-clean-cafe', 1600, 1067, 'Interior kedai kopi modern dengan tanaman'],
];

/** Potret persegi untuk testimoni: 480 & 240. */
const PORTRAITS: PhotoSpec[] = [
  ['corporate-nexa-portrait-1', 480, 480, 'Foto klien'],
  ['corporate-nexa-portrait-2', 480, 480, 'Foto klien'],
  ['corporate-nexa-portrait-3', 480, 480, 'Foto klien'],
  ['startup-clean-portrait-1', 480, 480, 'Foto pengguna'],
  ['startup-clean-portrait-2', 480, 480, 'Foto pengguna'],
  ['startup-clean-portrait-3', 480, 480, 'Foto pengguna'],
];

const toAsset = ([key, width, height, alt]: PhotoSpec, small: number): PhotoAsset => ({
  src: `${PHOTO_DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${PHOTO_DIR}/${key}-${small}.webp ${small}w, ${PHOTO_DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

/** Semua foto demo, berdasarkan kunci (mis. "corporate-nexa-hero"). */
export const TEMPLATE_PHOTOS: Readonly<Record<string, PhotoAsset>> = Object.freeze(
  Object.fromEntries([...SCENES.map((s) => [s[0], toAsset(s, 800)]), ...PORTRAITS.map((s) => [s[0], toAsset(s, 240)])]),
);

const BY_SRC: ReadonlyMap<string, PhotoAsset> = new Map(Object.values(TEMPLATE_PHOTOS).map((p) => [p.src, p]));

/**
 * Path foto demo untuk defaultContent, mis. `templatePhoto('corporate-nexa-hero')`
 * → "/assets/templates/photos/corporate-nexa-hero-1600.webp". Kunci tidak dikenal → "" (gagal kelihatan di uji).
 */
export const templatePhoto = (key: string): string => TEMPLATE_PHOTOS[key]?.src ?? '';

/**
 * Foto demo dari nilai konten (path persis, boleh tanpa "/" di depan atau dengan ?query). Bukan foto demo → null:
 * gambar unggahan pembeli dan URL luar dipakai apa adanya tanpa srcset.
 */
export function photoAsset(src: string | null | undefined): PhotoAsset | null {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  if (!value) return null;
  return BY_SRC.get(value.startsWith('/') ? value : `/${value}`) ?? null;
}

/**
 * Teks alternatif foto: deskripsi registry untuk foto demo, selain itu `fallback` (keterangan/judul dari konten).
 * Konten tidak punya field alt, jadi template menurunkannya dari teks di sekitarnya.
 */
export const photoAlt = (src: string | null | undefined, fallback: string): string => photoAsset(src)?.alt ?? fallback;

// ─── Logo ─────────────────────────────────────────────────────────────────────

const LOGO_DIR = '/assets/templates/logos';

/**
 * Logo lengkap perusahaan demo (mark + wordmark, SVG currentColor). Header template TIDAK memakai file ini sebagai
 * bawaan brand.logo (agar pembeli tidak tampil dengan logo perusahaan lain): header memakai mark yang sama
 * (StructureMark / BloomMark di ./marks) + nama perusahaan dari konten. File ini untuk materi lain (pratinjau, OG).
 */
export const DEMO_LOGOS = {
  'corporate-nexa': { lockup: `${LOGO_DIR}/samudra-karya.svg`, mark: `${LOGO_DIR}/samudra-karya-mark.svg`, name: 'Samudra Karya' },
  'startup-clean': { lockup: `${LOGO_DIR}/kirana-labs.svg`, mark: `${LOGO_DIR}/kirana-labs-mark.svg`, name: 'Kirana Labs' },
} as const;

export interface ClientLogoItem {
  name: string;
  logo: string;
}

const client = (file: string, name: string): ClientLogoItem => ({ name, logo: `${LOGO_DIR}/clients/${file}.svg` });

/**
 * Logo klien/mitra FIKTIF (wordmark SVG orisinal, warna tinta #121620, tinggi 32). Untuk defaultContent section
 * `clients.items` ({ name, logo }). Tidak ada merek asli.
 */
export const DEMO_CLIENTS: Readonly<Record<'corporate-nexa' | 'startup-clean', readonly ClientLogoItem[]>> = {
  'corporate-nexa': [
    client('arunika-land', 'Arunika Land'),
    client('baskara', 'Baskara Logistik'),
    client('nawasena', 'Nawasena Properti'),
    client('pradipta', 'Pradipta Industri'),
    client('selaras-graha', 'Selaras Graha'),
    client('kencana-mitra', 'Kencana Mitra'),
  ],
  'startup-clean': [
    client('kedai-senja', 'Kedai Senja'),
    client('berkah-jaya', 'Toko Berkah Jaya'),
    client('butik-lestari', 'Butik Lestari'),
    client('roti-mentari', 'Roti Mentari'),
    client('kopi-rimba', 'Kopi Rimba'),
    client('dapur-nala', 'Dapur Nala'),
  ],
};

/** Salinan list siap pakai untuk defaultContent: `clients: { items: demoClients('corporate-nexa') }`. */
export const demoClients = (code: keyof typeof DEMO_CLIENTS): { name: string; logo: string }[] =>
  DEMO_CLIENTS[code].map(({ name, logo }) => ({ name, logo }));
