// Registry foto demo Altura (developer properti fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan
// Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Altura"). Logo kecil
// pengembang asli di foto hero dan nama toko di foto podium disamarkan (inpaint); foto keluarga dengan anak tidak dipakai.
// Foto TIDAK diubah ke SVG (foto sebagai SVG menjadi berkas megabyte yang tampak seperti lukisan), jadi WebP + srcset.
//
// Alt bawaan berbahasa Inggris (bahasa konten demo), dipakai bila pembeli belum mengganti foto.
//
// Konvensi file (kit/photos.ts): `<kunci>-<lebar>.webp` + `<kunci>-800.webp`
//   hero menara    → 1200×1600 (3:4)
//   tegak 4:5      → 960×1200 (kartu pilar, potret pimpinan, foto testimoni)
//   persegi        → 1200×1200 (kartu proyek akordion: lebar di desktop, tegak di HP)
//   mendatar       → 1200×900 (4:3, portofolio & tim), 1200×800 (3:2, artikel), 1600×900 (16:9, pita angka & CTA)
import { definePhotos } from '../kit/photos';

export const ALTURA_PHOTOS = definePhotos({
  scenes: [
    ['altura-hero', 1200, 1600, 'White high-rise residential tower with planted balconies, seen from the street at dusk'],
    ['altura-impact', 960, 1200, 'Slender apartment tower with stacked balconies against a blue sky'],
    ['altura-values', 960, 1200, 'Cardboard architectural model with miniature trees on a table'],
    ['altura-skyline', 1600, 900, 'City skyline with towers and construction cranes at dusk'],
    ['altura-team', 1200, 900, 'Architects discussing floor plans and a tablet around a table, seen from above'],
    ['altura-dev-1', 1200, 1200, 'Residential tower with curved balconies full of greenery'],
    ['altura-dev-2', 1200, 1200, 'Blue glass tower with a glazed crown at the top'],
    ['altura-dev-3', 1200, 1200, 'Slender white-ribbed apartment tower between other facades'],
    ['altura-dev-4', 1200, 1200, 'White apartment building with balconies and pergolas under a bright sky'],
    ['altura-dev-5', 1200, 1200, 'Terraced building with cascading plants behind trees'],
    ['altura-res-1', 1200, 900, 'Modern stone villa with a swimming pool, parasols and a lawn'],
    ['altura-res-2', 1200, 900, 'White modern house with a long pool and lawn under a blue sky'],
    ['altura-com-1', 1200, 900, 'Marble office lobby with a reception desk, timber panels and plants'],
    ['altura-com-2', 1200, 900, 'Open office lounge with a curved sofa and city windows'],
    ['altura-hos-1', 1200, 900, 'Resort pool deck with timber sun loungers and a pavilion'],
    ['altura-hos-2', 1200, 900, 'Resort villa with a blue swimming pool and palm trees'],
    ['altura-mix-1', 1200, 900, 'Mixed-use district with residential towers, a podium, palm trees and a fountain'],
    ['altura-mix-2', 1200, 900, 'High-rise residential tower with balconies under a clear sky'],
    ['altura-leader-1', 960, 1200, 'Portrait of a smiling woman with blonde hair in a houndstooth blazer'],
    ['altura-leader-2', 960, 1200, 'Portrait of a smiling man in a navy suit and white shirt'],
    ['altura-leader-3', 960, 1200, 'Portrait of a man in a dark suit and striped tie on a white background'],
    ['altura-living', 960, 1200, 'Luxury apartment living room with cream sofas and tall windows facing trees'],
    ['altura-insight-1', 1200, 800, 'Close-up of a white architectural model with curved forms'],
    ['altura-insight-2', 1200, 800, 'Aerial view of a residential neighborhood with mid-rise towers among trees'],
    ['altura-insight-3', 1200, 800, 'Cream-toned apartment living room with an open kitchen'],
    ['altura-night', 1600, 900, 'City skyline silhouette at night'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `alturaPhoto('hero')` → `/assets/templates/photos/altura-hero-1200.webp`. */
export const alturaPhoto = (name: string): string => ALTURA_PHOTOS.src(`altura-${name}`);
