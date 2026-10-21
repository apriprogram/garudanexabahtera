// Rute & label halaman legal publik (dipakai Footer, checkout, form daftar, dan halaman legal itu sendiri).
// Halaman: src/pages/public/legal/*. Rute didaftarkan di src/App.tsx.

export const LEGAL_PATHS = {
  terms: '/syarat-ketentuan',
  privacy: '/kebijakan-privasi',
  refund: '/kebijakan-pengembalian-dana',
} as const;

export type LegalPageKey = keyof typeof LEGAL_PATHS;

export const LEGAL_LABELS: Record<LegalPageKey, string> = {
  terms: 'Syarat & Ketentuan',
  privacy: 'Kebijakan Privasi',
  refund: 'Kebijakan Pengembalian Dana',
};

/** Urutan tampil di Footer dan tautan "Dokumen terkait". */
export const LEGAL_LINKS: { key: LegalPageKey; to: string; label: string }[] = (['terms', 'privacy', 'refund'] as const).map(
  (key) => ({ key, to: LEGAL_PATHS[key], label: LEGAL_LABELS[key] }),
);

/**
 * Tanggal "Terakhir diperbarui" ketiga dokumen (ISO, untuk <time dateTime>). Ubah setiap kali isinya diubah.
 * Draf 2026-10-21: teks disusun dari cara kerja platform dan keputusan pemilik; perlu ditinjau pemilik sebelum terbit.
 */
export const LEGAL_UPDATED_AT = '2026-10-21';
