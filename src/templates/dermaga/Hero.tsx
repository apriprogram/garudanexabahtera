// Hero Dermaga — "Route" (data-hero-layout="route"). Layar lebar: label mono + H1 besar di kolom 1-8, deskripsi dan
// tombol di kolom 9-12 rata bawah; di bawahnya foto terminal peti kemas saat senja 21:9 selebar wadah dengan garis rute
// putih abstrak (SVG) + tiga chip putih pelabuhan, lalu strip manifest empat sel (label mono, angka berjalan, garis
// pemisah). HP 390: label, H1, deskripsi, foto 4:5 penuh ke tepi layar dengan rute TEGAK, manifest 2×2, lalu tombol
// penuh-lebar (urutan visual lewat `order`; isi fokus tetap berurutan karena foto & strip tidak berisi tautan).
// Gerak khas (./dermaga.css): garis rute tergambar sekali (stroke-dashoffset), pin & chip muncul berurutan. Foto hero
// (LCP) TIDAK pernah disembunyikan: tanpa reveal, zoom, atau parallax.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { CSSProperties } from 'react';
import { PIN_DELAYS, ROUTE_TALL, ROUTE_WIDE, pad2, percent, routeSlots, type DermagaModel, type RouteLayout } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { C, MONO_LABEL, TYPE_D } from './styles';
import { ButtonLink, Highlighted, TextLink } from './ui';

/** Garis rute + pin untuk satu rasio foto. Garis hanya bila ≥ 2 titik; dekoratif (aria-hidden). */
function RouteLines({ layout, slots, className }: { layout: RouteLayout; slots: number[]; className: string }) {
  if (slots.length < 2) return null;
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
      focusable="false"
    >
      <path d={layout.path} pathLength={1} className="dm-route-path" stroke="#0F1D20" strokeOpacity={0.35} strokeWidth={layout.stroke[0]} {...line} />
      <path d={layout.path} pathLength={1} className="dm-route-path" stroke="#FFFFFF" strokeWidth={layout.stroke[1]} {...line} />
      {slots.map((slot) => {
        const [x, y] = layout.pins[slot];
        return (
          <g key={slot} className="dm-pin" style={{ '--dm-at': `${PIN_DELAYS[slot]}s` } as CSSProperties}>
            <circle cx={x} cy={y} r={layout.radius[0]} fill="#FFFFFF" />
            <circle cx={x} cy={y} r={layout.radius[1]} style={{ fill: 'var(--tpl-accent)' }} />
            <circle cx={x} cy={y} r={layout.radius[2]} fill="#FFFFFF" />
          </g>
        );
      })}
    </svg>
  );
}

/** Garis rute (HP tegak, layar lebar mendatar) + chip putih pelabuhan (satu daftar, posisinya ikut lebar wadah). */
function RouteOverlay({ m }: { m: DermagaModel }) {
  const ports = m.ports;
  if (ports.length === 0) return null;
  const slots = routeSlots(ports.length);
  return (
    <div className="absolute inset-0">
      <RouteLines layout={ROUTE_TALL} slots={slots} className="@3xl:hidden" />
      <RouteLines layout={ROUTE_WIDE} slots={slots} className="hidden @3xl:block" />
      <ul aria-label="Contoh rute pengiriman" className="pointer-events-none absolute inset-0">
        {ports.map((port, i) => {
          const slot = slots[i];
          const [tx, ty] = ROUTE_TALL.pins[slot];
          const [wx, wy] = ROUTE_WIDE.pins[slot];
          const style = {
            '--dm-mx': percent(tx, ROUTE_TALL.width),
            '--dm-my': percent(ty, ROUTE_TALL.height),
            '--dm-mt': ROUTE_TALL.chips[slot],
            '--dm-dx': percent(wx, ROUTE_WIDE.width),
            '--dm-dy': percent(wy, ROUTE_WIDE.height),
            '--dm-dt': ROUTE_WIDE.chips[slot],
            '--dm-at': `${PIN_DELAYS[slot]}s`,
          } as CSSProperties;
          const code = field(port, 'code');
          const name = field(port, 'name');
          return (
            <li key={`${code}-${name}-${i}`} className="dm-port w-max max-w-[58%] @3xl:max-w-[240px]" style={style}>
              {/* Putih solid (bukan kaca): kode pelabuhan --tpl-accent-ink hanya dijamin ≥ 4,5:1 di atas putih murni */}
              <div className="dm-chip rounded-[2px] bg-white px-3 py-2">
                {code && <span className={`block ${MONO_LABEL} leading-none text-(--tpl-accent-ink)`}>{code}</span>}
                {name && (
                  <span className={`${code ? 'mt-1 block @3xl:hidden @5xl:block' : 'block'} text-[13px] font-medium leading-snug ${C.ink}`}>{name}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Garis pemisah sel manifest: HP 2 kolom (garis kiri di kolom 2, garis atas di baris 2; 3 angka → sel ketiga selebar
 * strip), layar lebar satu baris.
 */
function cellBorders(i: number, n: number): string {
  const wide = i === 0 ? '@3xl:pl-0' : '@3xl:border-l @3xl:pl-5 @5xl:pl-7';
  if (n === 4) {
    const phone = ['pr-4', 'border-l pl-4 pr-2', 'border-t pr-4', 'border-l border-t pl-4 pr-2'][i];
    return `${phone} @3xl:border-t-0 @3xl:pr-5 ${wide}`;
  }
  if (n === 3) {
    const phone = ['pr-4', 'border-l pl-4 pr-2', 'col-span-2 border-t pr-4 @3xl:col-span-1 @3xl:border-t-0'][i];
    return `${phone} @3xl:pr-5 ${wide}`;
  }
  return `${i === 0 ? 'pr-3' : 'border-l pl-3 pr-2'} @3xl:pr-5 ${wide}`;
}

const STRIP_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 @3xl:grid-cols-3',
  4: 'grid-cols-2 @3xl:grid-cols-4',
};

function Manifest({ m }: { m: DermagaModel }) {
  const stats = m.stats;
  if (stats.length === 0) return null;
  return (
    <dl className={`grid ${STRIP_COLS[stats.length]} border-b border-[#0F1D20]/[0.14]`}>
      {stats.map((item, i) => (
        <div key={`${field(item, 'label')}-${i}`} className={`flex min-w-0 flex-col border-[#0F1D20]/[0.14] py-5 @3xl:py-6 ${cellBorders(i, stats.length)}`}>
          <dt className={`flex items-start justify-between gap-3 ${MONO_LABEL} ${C.muted}`}>
            <span className="min-w-0">{field(item, 'label')}</span>
            <span aria-hidden className="shrink-0 text-(--tpl-accent-ink)">
              {pad2(i + 1)}
            </span>
          </dt>
          {/* mt-auto: angka sejajar di dasar strip walau label sel lain terbungkus 2 baris */}
          <dd className={`mt-auto pt-5 ${TYPE_D.stat} ${C.ink} @3xl:pt-7`}>
            {field(item, 'value') ? <CountUp value={field(item, 'value')} /> : '–'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Hero({ m }: { m: DermagaModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="route" className="pt-9 @3xl:pt-14 @5xl:pt-20">
      <div className={CONTAINER}>
        <div className="grid grid-cols-1 @5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-12">
          <div className="order-1 min-w-0 @5xl:col-span-8 @5xl:col-start-1 @5xl:row-start-1 @5xl:self-end">
            {eyebrow && (
              <Reveal as="p" className={`flex items-center gap-3 ${MONO_LABEL} ${C.muted}`}>
                <span aria-hidden className="h-2 w-2 shrink-0 bg-(--tpl-accent)" />
                <span className="min-w-0 text-balance">{eyebrow}</span>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @5xl:mt-7' : ''} max-w-[18ch] ${TYPE_D.h1} ${C.ink}`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} />
            </Reveal>
          </div>

          {/* HP: dua anak di bawah jadi item grid sendiri (urutan lewat order); layar lebar: satu kolom 9-12 rata bawah */}
          <div className="contents @5xl:col-span-4 @5xl:col-start-9 @5xl:row-start-1 @5xl:flex @5xl:min-w-0 @5xl:flex-col @5xl:self-end @5xl:pb-1.5">
            {subtitle && (
              <Reveal as="p" delay={160} className={`order-2 mt-5 max-w-[46ch] text-pretty @5xl:mt-0 @5xl:max-w-[40ch] ${TYPE_D.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal
                delay={240}
                className="order-5 mt-8 flex flex-col items-stretch gap-1 @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-7 @xl:gap-y-3 @3xl:order-3 @5xl:mt-7"
              >
                <ButtonLink action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
                {/* Tidak terbungkus; kolom sempit (1024-1179px) → turun ke bawah tombol utuh */}
                <TextLink action={m.secondaryAction} label={secondaryLabel} arrow={false} className="self-center whitespace-nowrap" />
              </Reveal>
            )}
          </div>

          <div className="relative order-3 -mx-5 mt-8 @2xl:-mx-8 @3xl:order-4 @3xl:mx-0 @3xl:mt-12 @5xl:col-span-12 @5xl:row-start-2 @5xl:mt-16">
            {/* sizes HP 223vw: kotak 4:5 selebar layar memotong foto 16:9, jadi lebar gambar ± 2,22 × lebar layar */}
            <KitPhoto
              src={image}
              alt={DERMAGA_PHOTOS.alt(image, `Foto kegiatan pengiriman barang ${m.companyName}`)}
              priority
              fallback="tint"
              sizes="(min-width: 1536px) 1552px, (min-width: 768px) 100vw, 223vw"
              className="aspect-[4/5] @3xl:aspect-[21/9]"
              imgClassName="object-[45%_50%] @3xl:object-[50%_50%]"
            >
              <RouteOverlay m={m} />
            </KitPhoto>
          </div>

          {m.stats.length > 0 && (
            <Reveal delay={320} className="order-4 @3xl:order-5 @5xl:col-span-12 @5xl:row-start-3">
              <Manifest m={m} />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
