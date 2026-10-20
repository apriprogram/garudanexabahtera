import React from 'react';
import { readList, useSiteSettings } from '../../hooks/useSiteSettings';
import { LogoMark } from '../ui/LogoMark';

interface Logo {
  name: string;
  src: string;
}

// Bawaan bila admin belum mengisi `hero_logos` (Pengaturan website > Hero)
const DEFAULT_LOGOS: Logo[] = [
  { name: 'Template Company Profile', src: '/assets/logo/logogarudanexa.png' },
  { name: 'Website Custom', src: '/assets/logo/logogarudanexa.png' },
  { name: 'Aplikasi Mobile', src: '/assets/logo/logogarudanexa.png' },
  { name: 'I-School', src: '/assets/logo/ischool.png' },
  { name: 'I-Santri', src: '/assets/logo/isantri.png' },
  { name: 'Kasir POS', src: '/assets/logo/logogarudanexa.png' },
  { name: 'Absensi Digital', src: '/assets/logo/logogarudanexa.png' },
  { name: 'Digital Invitation', src: '/assets/logo/logoweddingputih.png' },
];

/**
 * Strip nama produk/layanan di bawah hero: terang & datar (garis rambut atas-bawah, tanpa latar),
 * label di kiri pada layar lebar, isi bergeser pelan (diam bila reduced motion).
 */
const LogoTicker: React.FC = () => {
  const { settings, loaded } = useSiteSettings();
  const logos = readList<Logo>(settings.hero_logos, DEFAULT_LOGOS, { allowEmpty: false }).filter(
    (logo) => logo && typeof logo.name === 'string' && logo.name.trim(),
  );

  if (!loaded || logos.length === 0) return null;

  // Isi digandakan 3x agar putaran tanpa celah (animasi menggeser sepertiga lebar)
  const tickerLogos = [...logos, ...logos, ...logos];

  return (
    <div className="border-y border-line">
      <div className="container-site flex items-center gap-6 py-4 sm:py-5 lg:gap-10">
        <p className="eyebrow hidden shrink-0 lg:block">
          Produk &amp; layanan <span className="text-fg">Garuda Nexa</span>
        </p>
        <span className="hidden h-6 w-px shrink-0 bg-line lg:block" aria-hidden />
        <p className="sr-only">Produk dan layanan kami: {logos.map((logo) => logo.name).join(', ')}.</p>
        <div
          className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          aria-hidden
        >
          <div className="flex w-max animate-ticker items-center gap-10 motion-reduce:animate-none lg:gap-14">
            {tickerLogos.map((logo, index) => (
              <div key={index} className="flex items-center gap-2.5 whitespace-nowrap">
                {!logo.src || logo.src.endsWith('/logogarudanexa.png') ? (
                  // Logo PNG ini 776 KB; versi SVG-nya identik dan jauh lebih ringan
                  <LogoMark className="h-3 text-primary lg:h-3.5" />
                ) : (
                  <img src={logo.src} alt="" loading="lazy" className="h-4 w-auto opacity-50 brightness-0 lg:h-5" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle lg:text-xs">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoTicker;
