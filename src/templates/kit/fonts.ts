// Huruf judul LOKAL untuk template baru. `shared/fonts.ts` (TemplateFont = 'inter' | 'jakarta') milik perombakan
// template lama, jadi huruf tambahan dimuat di sini tanpa menyentuh index.html maupun Shell:
//
//   const fontStyle = useKitFont(KIT_FONTS.urbanist);         // memuat stylesheet sekali per dokumen
//   <TemplateShell displayFont="inter" …>                      // Inter = cadangan saat huruf belum termuat
//     <div style={fontStyle}> …FONT_DISPLAY di judul… </div>   // menimpa --tpl-font-display untuk isi template
//
// Isi (body) tetap Inter. Semua huruf di bawah berlisensi SIL Open Font License (Google Fonts).
import { useEffect, useMemo, type CSSProperties } from 'react';

export interface KitFont {
  /** id <link> (unik per huruf) */
  id: string;
  /** Nilai font-family lengkap dengan cadangan */
  family: string;
  /** Stylesheet Google Fonts (hanya ketebalan yang dipakai, display=swap) */
  href: string;
}

export const KIT_FONTS = {
  /** Arena Club: sans geometris membulat, sporty tapi rapi; judul besar TIPIS (300/400), label 500/600 */
  urbanist: {
    id: 'tpl-font-urbanist',
    family: '"Urbanist", "Inter", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600&display=swap',
  },
  /** Aura Studio: geometris elegan, bagus untuk judul huruf kapital tipis (300) */
  jost: {
    id: 'tpl-font-jost',
    family: '"Jost", "Inter", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap',
  },
} as const satisfies Record<string, KitFont>;

/**
 * Muat huruf (sekali per dokumen, tidak dihapus saat unmount agar tidak berkedip) dan kembalikan style yang menimpa
 * `--tpl-font-display`. Tanpa huruf (undefined) → {} sehingga FONT_DISPLAY tetap memakai huruf Shell.
 */
export function useKitFont(font: KitFont | undefined): CSSProperties {
  useEffect(() => {
    if (!font || typeof document === 'undefined' || document.getElementById(font.id)) return;
    const link = document.createElement('link');
    link.id = font.id;
    link.rel = 'stylesheet';
    link.href = font.href;
    document.head.appendChild(link);
  }, [font]);
  const family = font?.family;
  return useMemo(() => (family ? ({ '--tpl-font-display': family } as CSSProperties) : {}), [family]);
}
