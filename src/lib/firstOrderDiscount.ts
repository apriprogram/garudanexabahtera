/**
 * Diskon otomatis pembelian template pertama (keputusan pemilik 2026-10-23). Persen & pembulatan SAMA dengan server
 * (PF_FIRST_ORDER_DISCOUNT_PERCENT + pf_first_order_quote di backend/modules/templates.php, firstOrderQuote di
 * templates.js): potongan dibulatkan ke rupiah utuh. Harga yang ditampilkan di kartu = harga yang benar-benar dibayar
 * akun baru; harga coret = harga template yang sebenarnya (bukan harga yang dinaikkan).
 */
export const FIRST_ORDER_DISCOUNT_PERCENT = 20;

/** Harga yang dibayar pada pembelian pertama; template gratis tetap 0. */
export const firstOrderPrice = (price: number): number =>
  price > 0 ? price - Math.round((price * FIRST_ORDER_DISCOUNT_PERCENT) / 100) : 0;
