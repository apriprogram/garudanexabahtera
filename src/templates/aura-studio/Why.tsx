// "Mengapa kami?" (section `advantages`): judul kapital terpusat di dalam tiga lingkaran konsentris tipis (digambar
// saat muncul), dikelilingi 4 kartu abu bernomor "01 / 04" (2 kiri + 2 kanan). Jumlah alasan ≠ 4 atau layar sempit →
// lingkaran mengecil di atas, kartu dalam grid biasa.
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import type { AuraModel } from './model';
import { CARD, DISPLAY, INK, MUTED } from './styles';
import { Label } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** Tiga lingkaran tipis (dekoratif); digambar lewat stroke-dashoffset (aura-studio.css). */
function Circles({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" fill="none" aria-hidden className={`aura-circles pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}>
      {[296, 232, 168].map((r, i) => (
        <circle
          key={r}
          cx="300"
          cy="300"
          r={r}
          pathLength={1}
          stroke="#000"
          strokeOpacity={0.12}
          strokeWidth={1.25}
          transform="rotate(-90 300 300)"
          style={{ '--aura-delay': `${i * 160}ms` } as CSSProperties}
        />
      ))}
    </svg>
  );
}

export function Why({ m }: { m: AuraModel }) {
  const { advantages } = m;
  const eyebrow = text(advantages, 'eyebrow');
  const title = text(advantages, 'title');
  const subtitle = text(advantages, 'subtitle');
  const items = list(advantages, 'items', 6)
    .map((item) => ({ title: field(item, 'title'), description: field(item, 'description') }))
    .filter((item) => item.title || item.description);
  if (!title && !items.length) return null;
  const ring = items.length === 4;
  const total = pad(items.length);

  // Penempatan kartu tata letak lingkaran (desktop): 01 kiri-atas, 02 kiri-bawah, 03 kanan-atas, 04 kanan-bawah
  const ringPlace = ['@4xl:col-start-1 @4xl:row-start-1 @4xl:self-start', '@4xl:col-start-1 @4xl:row-start-2 @4xl:self-end', '@4xl:col-start-3 @4xl:row-start-1 @4xl:self-start', '@4xl:col-start-3 @4xl:row-start-2 @4xl:self-end'];

  return (
    <TemplateSection sectionKey="advantages" aria-labelledby={title ? 'aura-why-title' : undefined} className="overflow-hidden pb-4 pt-16 @3xl:pb-8 @3xl:pt-24 @5xl:pt-28 @7xl:pt-32">
      <div className={CONTAINER}>
        <div
          className={`grid gap-4 @2xl:grid-cols-2 ${ring ? '@4xl:min-h-[560px] @4xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)_minmax(0,1fr)] @4xl:grid-rows-2 @4xl:gap-x-8 @4xl:gap-y-10 @6xl:min-h-[600px]' : '@4xl:grid-cols-3'}`}
        >
          {/* Judul di tengah lingkaran */}
          <Reveal
            variant="fade"
            className={`relative flex min-h-[320px] flex-col items-center justify-center px-6 text-center @2xl:col-span-2 ${ring ? '@4xl:col-span-1 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:min-h-0' : '@4xl:col-span-3 @4xl:min-h-[380px]'}`}
          >
            <Circles className={`h-[340px] w-[340px] ${ring ? '@4xl:h-[600px] @4xl:w-[600px] @6xl:h-[640px] @6xl:w-[640px]' : '@4xl:h-[420px] @4xl:w-[420px]'}`} />
            <div className="relative max-w-[300px] @4xl:max-w-[360px]">
              {eyebrow && <Label className="mb-4">{eyebrow}</Label>}
              {title && (
                <h2 id="aura-why-title" className={`${DISPLAY} text-[32px] leading-[1.02] @3xl:text-[44px] @5xl:text-[52px]`}>
                  {title}
                </h2>
              )}
            </div>
            {subtitle && <p className={`relative mt-4 max-w-[30ch] text-[14px] leading-relaxed ${MUTED}`}>{subtitle}</p>}
          </Reveal>

          <ul className="contents">
            {items.map((item, i) => (
              <Reveal
                as="li"
                key={i}
                variant={ring ? (i < 2 ? 'left' : 'right') : 'up'}
                delay={400 + stagger(i, 120)}
                className={`relative z-10 flex w-full flex-col justify-between gap-6 p-6 ${CARD} @2xl:min-h-[200px] @4xl:gap-8 @5xl:min-h-[220px] @5xl:p-7 ${ring ? `@4xl:max-w-[380px] ${ringPlace[i]} ${i < 2 ? '@4xl:justify-self-end' : '@4xl:justify-self-start'}` : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`text-[17px] font-medium leading-snug ${INK} @5xl:text-[18px]`}>{item.title}</h3>
                  <span className={`shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] tabular-nums ${INK}`}>
                    {pad(i + 1)}
                    <span className="text-[#767676]"> / {total}</span>
                  </span>
                </div>
                {item.description && <p className={`max-w-[34ch] text-[14px] leading-relaxed ${MUTED}`}>{item.description}</p>}
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </TemplateSection>
  );
}
