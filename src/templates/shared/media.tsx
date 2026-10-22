// Gambar template lama: foto pengguna bila ada, ilustrasi SVG bernuansa warna aksen bila kosong/gagal dimuat.
// Desain baru memakai <Photo> (./Photo) yang tanpa ilustrasi; <Img>, <Art>, <BrandMark>, <Avatar>, <MapEmbed> tetap
// tersedia. Foto demo (./assets) otomatis mendapat srcset di <Img> dan <Avatar>.
import { MapPin } from 'lucide-react';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { ArtKind } from './art';
import { photoAsset } from './assets';
import { initials, safeImage } from './utils';

const fill = (variable: string, opacity?: number): CSSProperties => ({ fill: `var(${variable})`, opacity });
const WHITE: CSSProperties = { fill: '#ffffff' };

/** Jendela gedung (grid kotak kecil putih). */
const windows = (x: number, y: number, w: number, h: number, key: string) => {
  const cells: ReactNode[] = [];
  for (let cy = y + 14; cy + 10 < y + h - 8; cy += 20) {
    for (let cx = x + 10; cx + 10 <= x + w - 8; cx += 18) {
      cells.push(<rect key={`${key}-${cx}-${cy}`} x={cx} y={cy} width="10" height="10" rx="2" style={WHITE} opacity={0.55} />);
    }
  }
  return cells;
};

const SCENES: Record<ArtKind, ReactNode> = {
  city: (
    <>
      <circle cx="372" cy="78" r="36" style={fill('--tpl-accent-200')} />
      <rect x="0" y="252" width="480" height="48" style={fill('--tpl-accent-100')} />
      <rect x="36" y="128" width="72" height="132" rx="6" style={fill('--tpl-accent', 0.55)} />
      {windows(36, 128, 72, 132, 'a')}
      <rect x="118" y="66" width="92" height="194" rx="6" style={fill('--tpl-accent')} />
      {windows(118, 66, 92, 194, 'b')}
      <rect x="220" y="146" width="62" height="114" rx="6" style={fill('--tpl-accent-300')} />
      {windows(220, 146, 62, 114, 'c')}
      <rect x="292" y="98" width="84" height="162" rx="6" style={fill('--tpl-accent', 0.8)} />
      {windows(292, 98, 84, 162, 'd')}
      <rect x="386" y="168" width="62" height="92" rx="6" style={fill('--tpl-accent', 0.45)} />
      {windows(386, 168, 62, 92, 'e')}
    </>
  ),
  team: (
    <>
      <rect x="150" y="38" width="180" height="104" rx="10" style={WHITE} />
      <rect x="168" y="58" width="80" height="8" rx="4" style={fill('--tpl-accent-200')} />
      <rect x="168" y="74" width="120" height="8" rx="4" style={fill('--tpl-accent-100')} />
      <rect x="170" y="112" width="14" height="18" rx="3" style={fill('--tpl-accent', 0.5)} />
      <rect x="190" y="100" width="14" height="30" rx="3" style={fill('--tpl-accent', 0.75)} />
      <rect x="210" y="92" width="14" height="38" rx="3" style={fill('--tpl-accent')} />
      <circle cx="292" cy="108" r="18" style={fill('--tpl-accent-200')} />
      <path d="M292 90 A18 18 0 0 1 310 108 L292 108 Z" style={fill('--tpl-accent')} />
      <circle cx="120" cy="160" r="22" style={fill('--tpl-accent-300')} />
      <rect x="84" y="186" width="72" height="80" rx="32" style={fill('--tpl-accent-300')} />
      <circle cx="240" cy="168" r="22" style={fill('--tpl-accent')} />
      <rect x="204" y="194" width="72" height="80" rx="32" style={fill('--tpl-accent')} />
      <circle cx="360" cy="160" r="22" style={fill('--tpl-accent', 0.7)} />
      <rect x="324" y="186" width="72" height="80" rx="32" style={fill('--tpl-accent', 0.7)} />
      <rect x="48" y="232" width="384" height="18" rx="9" style={fill('--tpl-accent-200')} />
      <rect x="0" y="250" width="480" height="50" style={fill('--tpl-accent-100')} />
    </>
  ),
  workspace: (
    <>
      <rect x="0" y="232" width="480" height="68" style={fill('--tpl-accent-100')} />
      <rect x="40" y="222" width="400" height="12" rx="6" style={fill('--tpl-accent-300')} />
      <rect x="138" y="52" width="204" height="136" rx="12" style={WHITE} />
      <rect x="138" y="52" width="204" height="20" rx="10" style={fill('--tpl-accent-200')} />
      <rect x="156" y="140" width="18" height="34" rx="3" style={fill('--tpl-accent', 0.45)} />
      <rect x="182" y="120" width="18" height="54" rx="3" style={fill('--tpl-accent', 0.7)} />
      <rect x="208" y="100" width="18" height="74" rx="3" style={fill('--tpl-accent')} />
      <rect x="244" y="92" width="80" height="8" rx="4" style={fill('--tpl-accent-200')} />
      <rect x="244" y="108" width="62" height="8" rx="4" style={fill('--tpl-accent-100')} />
      <rect x="244" y="124" width="72" height="8" rx="4" style={fill('--tpl-accent-100')} />
      <rect x="226" y="188" width="28" height="34" style={fill('--tpl-accent-300')} />
      <rect x="196" y="214" width="88" height="8" rx="4" style={fill('--tpl-accent-300')} />
      <rect x="370" y="176" width="34" height="46" rx="8" style={fill('--tpl-accent', 0.8)} />
      <ellipse cx="376" cy="160" rx="12" ry="24" style={fill('--tpl-accent-300')} transform="rotate(-20 376 160)" />
      <ellipse cx="398" cy="156" rx="12" ry="26" style={fill('--tpl-accent-200')} transform="rotate(18 398 156)" />
      <rect x="84" y="196" width="26" height="26" rx="6" style={fill('--tpl-accent-200')} />
    </>
  ),
  landscape: (
    <>
      <circle cx="120" cy="86" r="34" style={fill('--tpl-accent-200')} />
      <path d="M0 210 Q110 140 220 196 T480 176 V300 H0 Z" style={fill('--tpl-accent-300')} />
      <path d="M0 246 Q140 186 280 236 T480 222 V300 H0 Z" style={fill('--tpl-accent', 0.75)} />
      <path d="M0 276 Q160 246 320 272 T480 262 V300 H0 Z" style={fill('--tpl-accent')} />
      <rect x="330" y="150" width="8" height="40" style={fill('--tpl-accent', 0.8)} />
      <circle cx="334" cy="140" r="20" style={fill('--tpl-accent', 0.8)} />
      <rect x="370" y="160" width="6" height="30" style={fill('--tpl-accent', 0.65)} />
      <circle cx="373" cy="152" r="15" style={fill('--tpl-accent', 0.65)} />
    </>
  ),
  abstract: (
    <>
      <circle cx="140" cy="130" r="92" style={fill('--tpl-accent-200')} />
      <rect x="230" y="70" width="150" height="150" rx="32" style={fill('--tpl-accent', 0.85)} transform="rotate(12 305 145)" />
      <circle cx="372" cy="226" r="40" style={fill('--tpl-accent-300')} />
      <circle cx="140" cy="130" r="40" style={WHITE} opacity={0.7} />
      <circle cx="74" cy="236" r="14" style={fill('--tpl-accent')} />
      <circle cx="420" cy="62" r="10" style={fill('--tpl-accent', 0.6)} />
    </>
  ),
  product: (
    <>
      <rect x="44" y="70" width="230" height="160" rx="18" style={WHITE} />
      <rect x="64" y="90" width="90" height="10" rx="5" style={fill('--tpl-accent-200')} />
      <rect x="64" y="108" width="60" height="18" rx="5" style={fill('--tpl-accent')} />
      <path d="M64 206 L104 176 L140 188 L180 150 L220 162 L254 126" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--tpl-accent)' }} />
      <path d="M64 206 L104 176 L140 188 L180 150 L220 162 L254 126 L254 214 L64 214 Z" style={fill('--tpl-accent-100')} opacity={0.8} />
      <rect x="300" y="32" width="128" height="240" rx="24" style={fill('--tpl-accent', 0.92)} />
      <rect x="310" y="44" width="108" height="216" rx="16" style={WHITE} />
      <rect x="322" y="60" width="84" height="40" rx="10" style={fill('--tpl-accent-100')} />
      <rect x="322" y="110" width="84" height="12" rx="6" style={fill('--tpl-accent-200')} />
      <rect x="322" y="130" width="60" height="12" rx="6" style={fill('--tpl-accent-100')} />
      <rect x="322" y="150" width="72" height="12" rx="6" style={fill('--tpl-accent-100')} />
      <rect x="322" y="220" width="84" height="26" rx="13" style={fill('--tpl-accent')} />
    </>
  ),
};

/** Ilustrasi pengganti foto; mengikuti warna aksen template. */
export function Art({ kind, className = '', label }: { kind: ArtKind; className?: string; label?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Pemanggil yang memosisikan sendiri (absolute) tidak boleh bentrok dengan `relative` bawaan
  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';
  return (
    <div className={`${position} overflow-hidden bg-(--tpl-accent-50) ${className}`} role={label ? 'img' : undefined} aria-label={label || undefined}>
      <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--tpl-accent-100)' }} />
            <stop offset="1" style={{ stopColor: 'var(--tpl-accent-50)' }} />
          </linearGradient>
        </defs>
        <rect width="480" height="300" fill={`url(#${id}-bg)`} />
        {SCENES[kind] ?? SCENES.abstract}
      </svg>
    </div>
  );
}

/**
 * Gambar konten. `className` mengatur ukuran/bentuk wadah (mis. "aspect-[4/3] rounded-3xl").
 * Sumber kosong, tidak aman, atau gagal dimuat → ilustrasi `art`.
 */
export function Img({
  src,
  alt,
  art,
  className = '',
  imgClassName = '',
  eager = false,
  sizes = '100vw',
}: {
  src: string;
  alt: string;
  art: ArtKind;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  /** Atribut sizes untuk foto demo yang punya srcset */
  sizes?: string;
}) {
  const url = safeImage(src);
  const asset = photoAsset(url);
  const [broken, setBroken] = useState<string | null>(null);
  if (!url || broken === url) return <Art kind={art} className={className} label={alt || undefined} />;
  return (
    <div className={`relative overflow-hidden bg-(--tpl-accent-50) ${className}`}>
      <img
        src={url}
        srcSet={asset?.srcSet}
        sizes={asset ? sizes : undefined}
        width={asset?.width}
        height={asset?.height}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        onError={() => setBroken(url)}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  );
}

/**
 * Logo + nama perusahaan. Logo lebar (wordmark, rasio ≥ 2.6) tampil sendiri; logo ikon/persegi tampil dengan nama.
 * Tanpa logo → `mark` bawaan template (mis. <StructureMark className="h-8 w-8 text-(--tpl-accent)" />) + nama,
 * atau monogram inisial berwarna aksen bila `mark` tidak diberikan (perilaku lama).
 */
export function BrandMark({
  name,
  logo,
  className = '',
  nameClassName = '',
  mark,
}: {
  name: string;
  logo: string;
  className?: string;
  nameClassName?: string;
  /** Mark SVG bawaan template, dipakai bila belum ada logo (atau logo gagal dimuat) */
  mark?: ReactNode;
}) {
  const url = safeImage(logo);
  const [state, setState] = useState<{ url: string; wide: boolean; broken: boolean } | null>(null);
  const current = state?.url === url ? state : null;
  const showLogo = !!url && !current?.broken;
  const showName = !showLogo || !current?.wide;
  const label = name || 'Beranda';

  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {showLogo ? (
        <img
          src={url}
          alt={showName ? '' : label}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            setState({ url, wide: h > 0 && w / h >= 2.6, broken: false });
          }}
          onError={() => setState({ url, wide: false, broken: true })}
          className={`w-auto shrink-0 object-contain ${current?.wide ? 'h-8 max-w-[180px]' : 'h-9 max-w-[56px]'}`}
        />
      ) : mark ? (
        <span className="flex shrink-0 items-center" aria-hidden>
          {mark}
        </span>
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--tpl-accent) text-[13px] font-bold tracking-tight text-(--tpl-on-accent)"
          aria-hidden
        >
          {initials(name, 'S')}
        </span>
      )}
      {showName && <span className={`min-w-0 truncate font-semibold tracking-tight ${nameClassName}`}>{label}</span>}
    </span>
  );
}

/** Foto bulat atau inisial. `sizes` = lebar tampil (untuk srcset potret demo 240/480). */
export function Avatar({ name, photo, className = 'h-11 w-11', sizes = '48px' }: { name: string; photo: string; className?: string; sizes?: string }) {
  const url = safeImage(photo);
  const asset = photoAsset(url);
  const [broken, setBroken] = useState<string | null>(null);
  if (url && broken !== url) {
    return (
      <img
        src={url}
        srcSet={asset?.srcSet}
        sizes={asset ? sizes : undefined}
        width={asset?.width}
        height={asset?.height}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(url)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-[13px] font-semibold text-(--tpl-accent-ink) ${className}`}
      aria-hidden
    >
      {initials(name, '?')}
    </span>
  );
}

/** Peta Google Maps (iframe) atau kotak ilustrasi bila tidak ada alamat/URL embed. */
export function MapEmbed({ embed, title, className = '' }: { embed: string | null; title: string; className?: string }) {
  if (!embed) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-(--tpl-accent-50) ${className}`}>
        <Art kind="landscape" className="absolute inset-0 opacity-60" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-(--tpl-accent-ink) ring-1 ring-black/10">
          <MapPin className="h-6 w-6" aria-hidden />
        </span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-(--tpl-accent-50) ${className}`}>
      {/* Terlihat selama peta dimuat (atau bila diblokir browser) */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <Art kind="landscape" className="absolute inset-0 opacity-60" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-(--tpl-accent-ink) ring-1 ring-black/10">
          <MapPin className="h-6 w-6" />
        </span>
      </div>
      <iframe
        src={embed}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
      />
    </div>
  );
}
