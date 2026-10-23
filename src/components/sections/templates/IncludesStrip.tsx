import { Check } from 'lucide-react';
import { CMS_INCLUDE } from '../../../content/pricing';
import { getTemplatePricing, useSiteSettings } from '../../../hooks/useSiteSettings';

/**
 * Strip "Sudah termasuk" (isi yang sama dengan kotak harga template: setting template_price_includes + CMS) di bawah kolom
 * cari section Pilih Template (dipindah dari section #kategori yang dihapus, permintaan pemilik 2026-10-24). Desktop: satu
 * baris berbentuk pil (rounded-full); HP/tablet: daftar 1–2 kolom, jadi sudutnya cukup rounded-3xl.
 */
export function IncludesStrip({ className = '' }: { className?: string }) {
  const { settings } = useSiteSettings();
  const includes = [...getTemplatePricing(settings).includes, CMS_INCLUDE];

  return (
    <div
      className={`rounded-3xl bg-surface p-4 ring-1 ring-inset ring-line sm:px-6 lg:flex lg:items-center lg:gap-6 lg:rounded-full lg:py-3 ${className}`}
    >
      <p className="eyebrow shrink-0">Sudah termasuk</p>
      <ul className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:mt-0 lg:flex lg:flex-1 lg:flex-wrap lg:items-center lg:justify-between">
        {includes.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[13px] font-medium text-fg sm:text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
