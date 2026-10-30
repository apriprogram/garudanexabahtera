// Ukuran gambar kendaraan Lajur (unit SVG), dipisah dari ./vehicles.tsx agar file komponen hanya mengekspor komponen.
import type { BusSize, SeatPlan } from './model';

/** Lebar viewBox gambar samping per kelas (tinggi sama 126 = garis tanah; skala sama → ukuran relatif benar). */
export const BUS_WIDTH: Record<BusSize, number> = { big: 400, medium: 304, micro: 236 };

/** Denah kursi tampak atas: ukuran kursi, jarak, lorong, jarak baris, dinding, kabin depan, hidung. */
export const SEAT_GEOMETRY = { seat: 14, gap: 4, aisle: 16, pitch: 20, wall: 8, cab: 46, nose: 12 } as const;

/** Lebar kursi satu blok (n kursi berjajar melintang). */
export const seatBlock = (n: number): number => n * SEAT_GEOMETRY.seat + Math.max(0, n - 1) * SEAT_GEOMETRY.gap;

/** Ukuran denah (unit SVG): panjang = dinding + bangku belakang (+ WC) + baris + kabin + hidung. */
export function seatMapSize(plan: SeatPlan, toilet: boolean): { w: number; h: number } {
  const g = SEAT_GEOMETRY;
  const h = g.wall * 2 + seatBlock(plan.left) + g.aisle + seatBlock(plan.right);
  const w = g.wall + g.pitch + (toilet ? g.pitch : 0) + plan.rows * g.pitch + g.cab + g.nose;
  return { w, h };
}
