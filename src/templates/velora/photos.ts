// Registry foto demo Velora (grup otomotif premium FIKTIF). Semua foto asli dari Unsplash (Unsplash License, bukan
// Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Velora"). Emblem, tulisan
// merek, dan plat nomor mobil asli dihapus (OpenCV inpaint) atau dipotong agar tidak ada merek nyata yang terbaca.
// Alt bawaan berbahasa Inggris karena salinan demo berbahasa Inggris.
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero & latar ajakan 16:9 1600×900; kartu 4:3 1200×900,
//             3:2 1200×800, 16:10 1200×750; foto tegak 4:5 960×1200)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp` (4:5 480×600; dinding testimoni & avatar)
import { definePhotos } from '../kit/photos';

export const VELORA_PHOTOS = definePhotos({
  scenes: [
    ['velora-hero', 1600, 900, 'Dark grand tourer on a winding mountain road at golden hour'],
    ['velora-review', 1200, 750, 'Black sports coupe parked in the desert at sunset with a saguaro cactus behind it'],
    ['velora-mobility', 960, 1200, 'Aerial view of a car on a hairpin mountain road above green valleys'],
    ['velora-craft', 1200, 800, 'Dark car interior with a red and carbon steering wheel and metal centre console'],
    ['velora-electric', 1200, 800, 'Charging cable plugged into the port of a grey electric car'],
    ['velora-aster', 1200, 900, 'White electric sedan cornering on a curved road'],
    ['velora-kestrel', 1200, 900, 'White grand touring coupe parked on a stone bridge on a misty morning'],
    ['velora-skarvane', 1200, 900, 'Dark blue SUV parked on a sunlit forest road'],
    ['velora-lumen', 1200, 900, 'White compact electric crossover charging from a wallbox in a parking garage'],
    ['velora-vanta', 1200, 900, 'White performance coupe with a rear wing on a dark reflective floor'],
    ['velora-how', 960, 1200, "Driver's seat view of a steering wheel and dashboard on a sunny day"],
    ['velora-research', 1200, 900, 'Three engineers reviewing data on a laptop next to a test rig'],
    ['velora-factory', 1200, 900, 'Robotic arms welding a car body on an assembly line in a brick factory hall'],
    ['velora-battery', 1200, 900, 'Orange robotic arms handling module trays on an automated production line'],
    ['velora-design', 1200, 900, 'Front of a car sculpture made of copper-coloured layers on a black background'],
    ['velora-safety', 1200, 900, 'Close-up of a car headlight with a projector lens'],
    ['velora-news-1', 1200, 800, 'Blue sports coupe leading two cars through a bend on a race track'],
    ['velora-news-2', 1200, 800, 'Home wallbox charging an SUV under a carport with solar panels'],
    ['velora-news-3', 1200, 800, 'Bronze car front with a glowing headlight in a dark studio'],
    ['velora-cta', 1600, 900, 'Empty motorway towards the mountains at dusk, seen from behind the windscreen'],
  ],
  portraits: [
    ['velora-portrait-1', 480, 600, 'Smiling woman in a white blazer seated on a leather chair'],
    ['velora-portrait-2', 480, 600, 'Smiling man with a beard in a dark sweater, arms crossed'],
    ['velora-portrait-3', 480, 600, 'Smiling woman in a white shirt against a light background'],
    ['velora-portrait-4', 480, 600, 'Man with dark hair in a grey sweater smiling at the camera'],
    ['velora-portrait-5', 480, 600, 'Smiling woman with curly hair in a striped jacket'],
    ['velora-portrait-6', 480, 600, 'Smiling man with glasses in a navy suit'],
    ['velora-portrait-7', 480, 600, 'Smiling woman with long hair in a white suit'],
    ['velora-portrait-8', 480, 600, 'Man with glasses in a dark blazer in an office'],
    ['velora-portrait-9', 480, 600, 'Smiling woman in a black blazer on a city street'],
    ['velora-portrait-10', 480, 600, 'Young man in a light blue shirt outdoors'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `veloraPhoto('hero')` → `/assets/templates/photos/velora-hero-1600.webp`. */
export const veloraPhoto = (name: string): string => VELORA_PHOTOS.src(`velora-${name}`);
