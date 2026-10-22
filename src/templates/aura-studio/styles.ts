// Kelas gaya tetap Aura Studio ("quiet sage"). Kontras di putih: INK 16,7:1 · MUTED 6,5:1 · LABEL 5,3:1.
import { FONT_DISPLAY } from '../shared/layout';

export const INK = 'text-[#1C1C1C]';
export const MUTED = 'text-[#5E5E5E]';
export const LABEL_TONE = 'text-[#6B6B6B]';
/** Kartu abu tanpa ring (radius 20) */
export const CARD = 'rounded-[20px] bg-[#F0F0F0]';
/** Garis rambut (pakai dengan border-t / divide-y) */
export const HAIR = 'border-black/[0.08]';
/** Judul kapital editorial Jost 300 */
export const DISPLAY = `${FONT_DISPLAY} font-light uppercase tracking-[-0.01em] ${INK}`;
/** H2 section: 28 → 40 → 48px */
export const H2 = `${DISPLAY} text-[28px] leading-[1.04] @3xl:text-[40px] @5xl:text-[48px]`;
/** Paragraf isi */
export const BODY = `text-[15px] leading-relaxed ${MUTED} @3xl:text-[16px]`;
/** Wadah chip kaca di atas foto (tanpa bayangan) */
export const GLASS = 'bg-white/90 ring-1 ring-black/[0.06] backdrop-blur-md';
