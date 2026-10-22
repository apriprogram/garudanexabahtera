// Huruf judul (display) per template. Inter sudah dimuat aplikasi (index.html); huruf lain dimuat sekali dari
// Google Fonts saat template dirender. Dipakai lewat TemplateShell `displayFont` → variabel --tpl-font-display,
// lalu kelas FONT_DISPLAY (./layout) pada judul.
import { useEffect } from 'react';

export type TemplateFont = 'inter' | 'jakarta';

export const TEMPLATE_FONTS: Record<TemplateFont, { family: string; href: string | null }> = {
  inter: { family: '"Inter", ui-sans-serif, system-ui, sans-serif', href: null },
  // Plus Jakarta Sans (SIL Open Font License), dirancang di Jakarta
  jakarta: {
    family: '"Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap',
  },
};

/** Muat stylesheet huruf sekali per dokumen (tidak dihapus saat unmount agar tidak berkedip saat berpindah). */
export function useTemplateFont(font: TemplateFont | undefined): void {
  useEffect(() => {
    const href = font ? TEMPLATE_FONTS[font]?.href : null;
    if (!href || typeof document === 'undefined') return;
    const id = `tpl-font-${font}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [font]);
}
