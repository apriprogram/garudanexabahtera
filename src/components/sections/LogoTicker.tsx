import React, { useEffect, useRef, useState } from 'react';
import { Code2, Fingerprint, LayoutTemplate, ScanBarcode, Smartphone, type LucideIcon } from 'lucide-react';
import { readList, useSiteSettings } from '../../hooks/useSiteSettings';
import { LogoMark } from '../ui/LogoMark';

interface Logo {
  name: string;
  /** Logo produk (SVG/PNG satu warna). Kosong / logo Garuda Nexa = ikon layanan dipilih dari nama. */
  src?: string;
}

// Tanda produk SVG satu warna (±2 KB), pengganti PNG 4134-5906 px (±300 KB per file) yang tampil 16 px
const ISCHOOL_MARK = '/assets/logo/ischool-mark.svg';
const ISANTRI_MARK = '/assets/logo/isantri-mark.svg';
const INVITATION_MARK = '/assets/logo/invitation-mark.svg';

// Bawaan bila admin belum mengisi `hero_logos` (Pengaturan website > Hero)
const DEFAULT_LOGOS: Logo[] = [
  { name: 'Template Company Profile' },
  { name: 'Website Custom' },
  { name: 'Aplikasi Mobile' },
  { name: 'i-School', src: ISCHOOL_MARK },
  { name: 'i-Santri', src: ISANTRI_MARK },
  { name: 'Kasir POS' },
  { name: 'Absensi Digital' },
  { name: 'Digital Invitation', src: INVITATION_MARK },
];

/** PNG raksasa lama (bisa masih tersimpan di setting admin `hero_logos`) → tanda SVG ringan yang sama. */
const LIGHT_MARKS: Record<string, string> = {
  'ischool.png': ISCHOOL_MARK,
  'logoischool.png': ISCHOOL_MARK,
  'isantri.png': ISANTRI_MARK,
  'logoisantri.png': ISANTRI_MARK,
  'logowedding.png': INVITATION_MARK,
  'logoweddingputih.png': INVITATION_MARK,
  'wedding.png': INVITATION_MARK,
};

// Logo Garuda Nexa sendiri tidak memberi informasi bila diulang di tiap layanan → pakai ikon layanan
const BRAND_LOGO = /\/(?:logogarudanexa\.(?:png|svg)|brand\/logo-(?:wings|mark)\.svg)$/i;

/** Ikon layanan dari namanya (urutan penting: "Aplikasi Mobile" bukan website). */
const SERVICE_ICONS: [RegExp, LucideIcon][] = [
  [/template/i, LayoutTemplate],
  [/mobile|android|ios/i, Smartphone],
  [/kasir|\bpos\b/i, ScanBarcode],
  [/absen/i, Fingerprint],
  [/web|custom/i, Code2],
];

const assetPath = (src: string) => src.trim().replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '');

/** Gambar yang dipakai untuk satu item, atau null = pakai ikon layanan. */
const markFor = (logo: Logo): string | null => {
  const path = assetPath(logo.src || '');
  if (!path || BRAND_LOGO.test(path)) return null;
  const file = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return LIGHT_MARKS[file] ?? logo.src!.trim();
};

/** Ejaan nama produk: "I-SCHOOL" / "I-School" → "i-School" (lihat design.md). */
const displayName = (name: string) =>
  name.trim().replace(/\bi-(school|santri)\b/gi, (_, word: string) => `i-${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`);

const ItemMark: React.FC<{ logo: Logo }> = ({ logo }) => {
  const mark = markFor(logo);
  if (mark) {
    // Masker CSS: bentuk logo diwarnai `currentColor`, jadi warnanya persis sama dengan ikon layanan
    const mask = `url(${JSON.stringify(mark)}) center / contain no-repeat`;
    return <span className="h-4 w-4 shrink-0 bg-current" style={{ WebkitMask: mask, mask }} />;
  }
  const Icon = SERVICE_ICONS.find(([pattern]) => pattern.test(logo.name))?.[1];
  return Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : <LogoMark className="h-3 shrink-0" />;
};

/** true selama elemen terlihat di viewport (belum ada callback / tanpa IntersectionObserver = dianggap terlihat). */
const useOnScreen = (ref: React.RefObject<Element | null>, enabled: boolean): boolean => {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setOnScreen(entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);

  return onScreen;
};

/**
 * Strip nama produk/layanan di bawah hero: terang & datar (garis rambut atas-bawah, tanpa latar),
 * label di kiri pada layar lebar, isi bergeser pelan (diam bila reduced motion, dijeda saat di luar layar; hanya
 * transform). Satu perlakuan untuk semua item: ikon layanan lucide atau tanda produk SVG satu warna (`text-subtle`)
 * + nama dengan ejaan aslinya (tanpa huruf besar). Selama setting belum dimuat, strip kosong setinggi aslinya
 * tetap dipasang agar konten di bawahnya tidak bergeser (CLS).
 */
const LogoTicker: React.FC = () => {
  const { settings, loaded } = useSiteSettings();
  const stripRef = useRef<HTMLDivElement>(null);
  const logos = readList<Logo>(settings.hero_logos, DEFAULT_LOGOS, { allowEmpty: false })
    .filter((logo) => logo && typeof logo.name === 'string' && logo.name.trim())
    .map((logo) => ({ ...logo, name: displayName(logo.name) }));
  const onScreen = useOnScreen(stripRef, loaded && logos.length > 0);

  if (loaded && logos.length === 0) return null;

  // Isi digandakan 3x agar putaran tanpa celah (animasi menggeser sepertiga lebar)
  const tickerLogos = loaded ? [...logos, ...logos, ...logos] : [];

  return (
    <div ref={stripRef} className="border-y border-line">
      <div className="container-site flex items-center gap-6 py-4 sm:py-5 lg:gap-10">
        <p className="eyebrow hidden shrink-0 lg:block">
          Produk &amp; layanan <span className="text-fg">Garuda Nexa</span>
        </p>
        <span className="hidden h-6 w-px shrink-0 bg-line lg:block" aria-hidden />
        {loaded && <p className="sr-only">Produk dan layanan kami: {logos.map((logo) => logo.name).join(', ')}.</p>}
        <div
          className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          aria-hidden
        >
          <div
            className="flex w-max animate-ticker items-center gap-10 motion-reduce:animate-none lg:gap-14"
            style={onScreen ? undefined : { animationPlayState: 'paused' }}
          >
            {/* Belum dimuat: satu baris kosong setinggi item (ikon 16px + teks 13px) sebagai pengganti */}
            {!loaded && (
              <div className="invisible flex items-center gap-2 whitespace-nowrap">
                <span className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-medium">&nbsp;</span>
              </div>
            )}
            {tickerLogos.map((logo, index) => (
              <div key={index} className="flex items-center gap-2 whitespace-nowrap text-subtle" data-ticker-item>
                <ItemMark logo={logo} />
                <span className="text-[13px] font-medium text-muted">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoTicker;
