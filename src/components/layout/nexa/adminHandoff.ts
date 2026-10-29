/**
 * Jalur "Hubungi admin" widget Nexa ke WhatsApp Garuda Nexa (permintaan pemilik 2026-10-29). Tautan wa.me membuka chat
 * dengan pesan awal yang sudah terisi; pengunjung tinggal mengirimnya. Bila nomor itu terhubung ke bot WhatsApp (WAHA,
 * backend/modules/waha.php), frasa "butuh bantuan admin" + "dari chat Nexa" (WAHA_WEBSITE_PHRASE / WAHA_WEBSITE_SOURCE)
 * membuat bot langsung mengalihkan chat ke admin manusia: notifikasi "Klien butuh respons admin (human)" terkirim ke
 * nomor WA admin dan bot dijeda untuk chat itu. Tanpa bot, pesannya tetap jelas bagi admin yang membaca.
 */
export const NEXA_ADMIN_WA_TEXT = 'Halo Admin Garuda Nexa, saya butuh bantuan admin (dari chat Nexa di website).';

/** Pertanyaan pengunjung yang ikut di pesan awal (code point; pesan WhatsApp klien dibaca bot sampai 1000). */
const QUESTION_MAX = 300;

/**
 * Tautan wa.me ke nomor `whatsappHref` dengan pesan awal NEXA_ADMIN_WA_TEXT, ditambah pertanyaan terakhir pengunjung
 * bila ada (admin langsung tahu konteksnya). Query lama pada `whatsappHref` diganti.
 */
export function adminWhatsappHref(whatsappHref: string, question = ''): string {
  const base = whatsappHref.split('?')[0];
  const chars = [...question.trim()];
  const asked = chars.length > QUESTION_MAX ? `${chars.slice(0, QUESTION_MAX).join('')}…` : chars.join('');
  const text = asked ? `${NEXA_ADMIN_WA_TEXT}\nPertanyaan saya: ${asked}` : NEXA_ADMIN_WA_TEXT;
  return `${base}?text=${encodeURIComponent(text)}`;
}
