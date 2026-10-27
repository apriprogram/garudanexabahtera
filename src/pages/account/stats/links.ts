// Alamat halaman Statistik kunjungan satu situs (docs/platform/SITE-STATS-SPEC.md §4). Modul kecil tersendiri supaya
// SiteNav dan kartu situs di /akun tidak ikut memuat halaman statistik (recharts dimuat lazy bersama halamannya).

/** /akun/situs/{id}/statistik */
export const siteStatsPath = (siteId: number) => `/akun/situs/${siteId}/statistik`;
