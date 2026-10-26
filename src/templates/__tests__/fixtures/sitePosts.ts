// Tulisan contoh (bentuk respons API publik get_site_posts / get_site_post) untuk tes berita & pengumuman situs sekolah.
import type { SitePostPublic, SitePostSummary } from '../../../types/sitePosts';

export const NEWS: SitePostSummary[] = [
  {
    id: 11,
    kind: 'berita',
    slug: 'juara-olimpiade-sains',
    title: 'Juara olimpiade sains nasional',
    excerpt: 'Tim sains sekolah membawa pulang dua medali emas dari Jakarta.',
    category: 'Prestasi',
    badge: '',
    image: '/assets/sites/7/posts/post_0123456789ab.webp',
    image_alt: 'Siswa memegang piala olimpiade',
    link_url: '',
    published_at: '2026-10-20',
    updated_at: '2026-10-20T08:00:00+07:00',
  },
  {
    id: 12,
    kind: 'berita',
    slug: 'kunjungan-industri-kelas-xi',
    title: 'Kunjungan industri kelas XI',
    excerpt: 'Siswa kelas XI belajar langsung di pabrik mitra.',
    category: 'Kegiatan',
    badge: '',
    image: null,
    image_alt: '',
    link_url: '',
    published_at: '2026-10-18',
    updated_at: '2026-10-18T08:00:00+07:00',
  },
];

export const ANNOUNCEMENTS: SitePostSummary[] = [
  {
    id: 21,
    kind: 'pengumuman',
    slug: 'jadwal-ujian-akhir-semester',
    title: 'Jadwal ujian akhir semester',
    excerpt: 'Ujian dimulai Senin, 1 Desember 2026. Siswa wajib hadir 30 menit lebih awal.',
    category: '',
    badge: 'Penting',
    image: null,
    image_alt: '',
    link_url: '',
    published_at: '2026-10-22',
    updated_at: '2026-10-22T08:00:00+07:00',
  },
];

/** Tulisan lengkap NEWS[0]: isi 3 paragraf (yang terakhir berisi teks mirip HTML), tautan tambahan Google Drive. */
export const POST: SitePostPublic = {
  ...NEWS[0],
  link_url: 'https://drive.google.com/file/d/abc',
  body: 'Paragraf pertama berita.\r\n\r\nParagraf kedua\nbaris kedua.\n\n<script>alert(1)</script> bukan HTML',
  seo_title: '',
  seo_description: '',
  noindex: false,
};
