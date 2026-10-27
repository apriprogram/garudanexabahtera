// Registry foto demo Portline (grup pelayaran & logistik fiktif). Semua foto asli dari Unsplash (Unsplash License,
// bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Portline"). Tulisan
// merek nyata di lambung kapal, kontainer, tangga pesawat, mesin, dan trailer DIHAPUS (inpaint OpenCV) atau dipotong;
// lihat CREDITS.md. Foto TIDAK diubah ke SVG (foto sebagai SVG menjadi berkas megabyte yang tampak seperti lukisan),
// jadi disimpan WebP + srcset. Alt bawaan berbahasa Inggris karena konten demo situs ini berbahasa Inggris.
//
// Konvensi file (kit/photos.ts):
//   slide hero   → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; hero selebar layar)
//   suasana      → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (berita 3:2 1200×800, divisi 4:3 1080×810, armada
//                  16:10 1400×875, pita besar 16:10 1600×1000, pimpinan 4:5 960×1200)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['portline-hero-1', 1920, 1080, 'Container ship under way on deep blue open sea, seen from above with a long white wake'],
  ['portline-hero-2', 1920, 1080, 'Aerial view of red and blue ship-to-shore cranes working a container vessel at the quay'],
  ['portline-hero-3', 1920, 1080, 'Container terminal at night with lit gantry cranes reflected in the harbour water'],
];

const BASE = definePhotos({
  scenes: [
    ['portline-news-1', 1200, 800, 'Cargo ship sailing past green hills on a calm blue sea'],
    ['portline-news-2', 1200, 800, 'Navigation consoles and screens on a ship bridge at night'],
    ['portline-news-3', 1200, 800, 'Red crude tanker at anchor under a pink sunset sky'],
    ['portline-news-4', 1200, 800, 'Harbour tug moored beside an old quay crane at dusk'],
    ['portline-news-5', 1200, 800, 'White wide-body aircraft with boarding stairs on the apron'],
    ['portline-lines', 1080, 810, 'Container ship loaded with colourful boxes, seen straight from above with a tug alongside'],
    ['portline-terminals', 1080, 810, 'Aerial view of a container terminal with a vessel berthed under blue gantry cranes'],
    ['portline-energy', 1080, 810, 'Red product tanker on dark blue sea, seen straight from above'],
    ['portline-airroad', 1080, 810, 'Articulated trucks driving along a mountain highway in soft morning light'],
    ['portline-shipyards', 1080, 810, 'Heavy-lift crane vessel working at sea, seen from above'],
    ['portline-fleet-1', 1400, 875, 'Large container ship leaving a white wake on green-blue water, seen from above'],
    ['portline-fleet-2', 1400, 875, 'Red bulk carrier with deck cranes sailing on a calm turquoise sea at sunrise'],
    ['portline-fleet-3', 1400, 875, 'Product and LPG tanker with a green deck heading straight towards the camera'],
    ['portline-fleet-4', 1400, 875, 'Hopper dredger on the horizon behind rolling waves'],
    ['portline-network', 1600, 1000, 'Harbour quay with port cranes in front of a city skyline under a clear blue sky'],
    ['portline-sustainability', 1600, 1000, 'Deck of a bulk carrier at sea under dramatic blue clouds at dawn'],
    ['portline-careers', 1600, 1000, 'Bridge wing of a ship with an officer on watch above a green island'],
    ['portline-exec-1', 960, 1200, 'Portrait of a man in a navy suit and striped tie against a grey backdrop'],
    ['portline-exec-2', 960, 1200, 'Portrait of a smiling woman with glasses in a blue dress in a glass-walled office'],
    ['portline-exec-3', 960, 1200, 'Portrait of a man in a dark suit leaning against a granite column'],
    ['portline-exec-4', 960, 1200, 'Portrait of a smiling woman in a grey blazer by an office window'],
  ],
});

/** Slide hero: srcset 800 / 1280 / 1920. */
const heroAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-800.webp 800w, ${DIR}/${key}-1280.webp 1280w, ${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const HERO_BY_KEY = new Map(HERO.map((spec) => [spec[0], heroAsset(spec)] as const));
const HERO_BY_SRC = new Map(Array.from(HERO_BY_KEY.values(), (asset) => [asset.src, asset] as const));

const clean = (src: string | null | undefined) => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  return value && !value.startsWith('/') ? `/${value}` : value;
};

const heroOf = (src: string | null | undefined): PhotoAsset | null => HERO_BY_SRC.get(clean(src)) ?? null;

export const PORTLINE_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `portlinePhoto('hero-1')` → `/assets/templates/photos/portline-hero-1-1920.webp`. */
export const portlinePhoto = (name: string): string => PORTLINE_PHOTOS.src(`portline-${name}`);
