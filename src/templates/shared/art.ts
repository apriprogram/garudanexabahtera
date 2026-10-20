// Jenis ilustrasi pengganti foto (digambar oleh <Art> di ./media) dan urutan bakunya untuk daftar/galeri.

export type ArtKind = 'city' | 'team' | 'workspace' | 'landscape' | 'abstract' | 'product';

/** Urutan ilustrasi untuk galeri / daftar (berdasarkan indeks). */
export const ART_SEQUENCE: ArtKind[] = ['city', 'workspace', 'team', 'landscape', 'product', 'abstract'];
