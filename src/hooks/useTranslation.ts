/**
 * Teks UI website publik. Website hanya berbahasa Indonesia (keputusan pemilik 2026-10-21): sakelar ID/EN dan
 * Google Translate sudah dihapus. Kunci tetap dipakai agar pemanggil (Navbar, Home, HeroIntro) cukup memanggil t().
 */
export const translations = {
  "nav-process": "Proses",
  "nav-templates": "Template",
  "nav-projects": "Projects",
  "nav-faq": "FAQ",
  "nav-home": "Beranda",
  "nav-contact": "Kontak",
  "nav-login": "Masuk",
  "nav-account": "Akun Saya",
  "nav-admin": "Panel Admin",
  "nav-consult": "Konsultasi Gratis",
  "nav-consult-short": "Konsultasi",

  // Hero: toggle mode, sentence case seperti segmen Proses (label pendek dipakai di layar sempit; ikon template /
  // HP di depannya menjelaskan konteksnya)
  "home-hero-mode-template": "Template siap pakai",
  "home-hero-mode-template-short": "Siap pakai",
  "home-hero-mode-custom": "Website & aplikasi custom",
  "home-hero-mode-custom-short": "Jasa custom",

  // Hero mode Template. Judul bawaan = H1 beranda (wajib memuat "template website", heroHeadline.ts); admin bisa
  // menggantinya lewat setting hero_title.
  "home-hero-template-lead": "Template website siap pakai,",
  "home-hero-template-accent": "termasuk domain & hosting.",
  "home-hero-template-point-1": "Pilih desain siap pakai, lihat demonya dulu",
  "home-hero-template-point-2": "Harga jelas, bayar aman lewat Midtrans",
  "home-hero-template-point-3": "Domain kami urus, isi Anda kelola lewat CMS",
  "home-hero-btn-templates": "Pilih Template",
  "home-hero-demo": "Lihat Demo",

  // Hero mode Custom (judulnya <p>, bukan H1)
  "home-hero-custom-lead": "Jasa pembuatan website",
  "home-hero-custom-accent": "& aplikasi mobile custom.",
  "home-hero-custom-point-1": "Website atau aplikasi Android/iOS sesuai alur bisnis Anda",
  "home-hero-custom-point-2": "Konsultasi gratis, penawaran jelas sebelum mulai",
  "home-hero-custom-point-3": "Didampingi dari desain sampai rilis",
  "home-hero-btn-custom": "Pesan Website / Aplikasi Mobile Custom",
} as const;

export type TranslationKey = keyof typeof translations;

/** Teks Indonesia untuk `key` (kunci yang tidak dikenal dikembalikan apa adanya). */
export const t = (key: TranslationKey): string => translations[key] ?? key;

const API = { t } as const;

/** Bentuk lama tetap dipertahankan (`const { t } = useTranslation()`); tidak lagi bergantung pada store bahasa. */
export const useTranslation = () => API;
