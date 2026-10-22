/**
 * TIDAK DIPAKAI LAGI (no-op sejak SEO WP3, docs/platform/SEO-PLAN.md §5.3 langkah 5).
 *
 * Judul tab, description, canonical, robots, OG dan JSON-LD halaman publik host utama sekarang datang dari satu
 * tempat: modul *.seo.ts → getHead() → renderHeadTags (prerender) dan SeoManager (navigasi klien). Mengubah
 * document.title dari halaman akan bertabrakan dengan head itu, jadi hook ini sengaja tidak melakukan apa pun.
 * Halaman akun/checkout (noindex) memakai useDocumentTitle milik src/pages/account/components/payment.ts.
 * Hapus pemanggilnya saat halaman itu disentuh; hook ini dihapus setelah tidak ada pemanggil lagi.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useDocumentTitle(_title: string | null | undefined): void {}
