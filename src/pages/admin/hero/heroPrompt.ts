// Helper murni isian hero gaya Prompt AI di admin (Pengaturan website → Hero → Gaya hero "Prompt AI"). Parser dan batasnya
// sama dengan website: src/components/sections/hero/heroStyle.ts.
import {
  HERO_PROMPT_LABEL_MAX,
  HERO_PROMPT_MAX_CHIPS,
  HERO_PROMPT_TEXT_MAX,
  promptText,
  safeChipHref,
  type HeroPromptChip,
  type HeroPromptSettings,
} from '../../../components/sections/hero/heroStyle';

export const CHIP_HREF_ERROR = 'Tautan harus alamat halaman di website ini (mis. /template), https://…, atau #kontak.';

/** Pesan bila tautan chip tidak bisa dipakai website; null bila boleh (kosong = belum diisi, bukan salah). */
export function chipHrefError(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  return safeChipHref(value) === null ? CHIP_HREF_ERROR : null;
}

/** Chip yang akan tersimpan: label & tautan dirapikan, yang kosong atau tautannya tidak aman dibuang, maks. 6. */
export function cleanChips(chips: readonly HeroPromptChip[]): HeroPromptChip[] {
  const out: HeroPromptChip[] = [];
  for (const chip of chips) {
    const label = promptText(chip.label, HERO_PROMPT_LABEL_MAX);
    const href = safeChipHref(chip.href);
    if (!label || href === null) continue;
    out.push({ label, href });
    if (out.length >= HERO_PROMPT_MAX_CHIPS) break;
  }
  return out;
}

/**
 * Kunci setting gaya Prompt AI untuk update_settings (semua string): judul & placeholder satu baris ('' = teks bawaan
 * website), chip sebagai JSON array {label, href}, saklar animasi '1' / '0'. Bentuknya sama dengan yang disimpan backend.
 */
export function heroPromptPayload(prompt: HeroPromptSettings): Record<string, string> {
  return {
    hero_prompt_title: promptText(prompt.title, HERO_PROMPT_TEXT_MAX),
    hero_prompt_placeholder: promptText(prompt.placeholder, HERO_PROMPT_TEXT_MAX),
    hero_prompt_chips: JSON.stringify(cleanChips(prompt.chips)),
    hero_prompt_garuda: prompt.garuda ? '1' : '0',
  };
}

export const canAddChip = (chips: readonly HeroPromptChip[]): boolean => chips.length < HERO_PROMPT_MAX_CHIPS;
