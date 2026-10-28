// Dua pita PayNow. Strip jenis usaha (kunci `trust`): pita putih tipis tepat di bawah hero, judul kecil di kiri dan
// deretan chip jenis usaha (ikon otomatis, tanpa logo perusahaan) yang bergerak pelan lewat <Marquee> — satu-satunya
// gerak tanpa henti; gerak mati → chip membungkus statis. Angka (kunci `stats`): pita GRADASI selebar layar (biru →
// indigo → ungu dari warna tema, putih ≥ 4,6:1 di setiap titik), judul + catatan di kiri, hingga empat angka yang
// menghitung naik di kanan, dipisah garis rambut putih; tiga lingkaran tipis seperti gelombang nirsentuh (dekoratif).
import { CountUp, Marquee, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { businessIcon } from './icons';
import type { PaynowModel } from './model';
import { C, DISPLAY, TYPE } from './styles';
import { AutoIcon } from './ui';

export function Trust({ m }: { m: PaynowModel }) {
  const items = m.items('trust');
  const title = text(m.trust, 'title');
  return (
    <TemplateSection sectionKey="trust" className={`border-b bg-white py-7 @3xl:py-9 ${C.line}`}>
      <div className={`${CONTAINER} grid items-center gap-y-5 @5xl:grid-cols-12 @5xl:gap-x-8`}>
        {title ? (
          <h2 className={`max-w-[26ch] text-balance text-[15px] font-semibold leading-snug ${C.ink} ${DISPLAY} @5xl:col-span-3 @5xl:text-[16px]`}>{title}</h2>
        ) : (
          <h2 className="sr-only">Jenis usaha pengguna</h2>
        )}
        <div className="pn-fade-x min-w-0 @5xl:col-span-9">
          <Marquee label={title || 'Jenis usaha'} duration={46} gap={12} staticClassName="pn-scroll-x -mx-5 flex gap-2.5 overflow-x-auto px-5 @2xl:-mx-8 @2xl:px-8 @5xl:mx-0 @5xl:flex-wrap @5xl:overflow-visible @5xl:px-0">
            {items.map((item, i) => {
              const label = field(item, 'label');
              return (
                <span key={`${label}-${i}`} className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-(--pn-mist) px-4 text-[14px] font-medium ${C.ink}`}>
                  <AutoIcon name={businessIcon(label)} className="h-[18px] w-[18px] text-(--pn-ink)" />
                  {label}
                </span>
              );
            })}
          </Marquee>
        </div>
      </div>
    </TemplateSection>
  );
}

/** Garis pemisah angka: HP 2 kolom (garis kiri di kolom 2, garis atas di baris 2), layar ≥ @3xl satu baris. */
const statCell = (i: number, n: number) =>
  [
    i % 2 === 1 ? 'border-l pl-5' : 'pr-4',
    i >= 2 ? 'border-t pt-6' : '',
    i >= 2 ? '@3xl:border-t-0 @3xl:pt-0' : '',
    i > 0 ? '@3xl:border-l @3xl:pl-6' : '@3xl:pl-0',
    n > 1 ? 'pb-6 @3xl:pb-0' : '',
  ].join(' ');

const STAT_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 @3xl:grid-cols-3', 4: 'grid-cols-2 @3xl:grid-cols-4' };

export function Stats({ m }: { m: PaynowModel }) {
  const items = m.items('stats');
  const title = text(m.stats, 'title');
  const note = text(m.stats, 'note');
  return (
    <TemplateSection sectionKey="stats" data-tpl-tone="inverse" className="pn-grad relative isolate overflow-hidden py-14 text-white @3xl:py-20">
      <svg aria-hidden focusable="false" viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] @5xl:-right-24 @5xl:-top-52 @5xl:h-[720px] @5xl:w-[720px]">
        {[120, 190, 260].map((r) => (
          <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={1.5} />
        ))}
      </svg>
      <div className={`${CONTAINER} relative`}>
        <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-10">
          {title ? (
            <Reveal as="h2" className={`max-w-[22ch] text-[26px] leading-[1.15] tracking-[-0.02em] @3xl:text-[32px] ${DISPLAY} font-bold`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">Angka</h2>
          )}
          {note && <p className="shrink-0 text-[13.5px] leading-snug text-white/85 @5xl:pb-1.5">{note}</p>}
        </div>
        <Reveal as="dl" delay={120} className={`mt-10 grid min-w-0 border-t border-white/25 pt-8 @3xl:mt-14 @3xl:pt-10 ${STAT_COLS[items.length]}`}>
          {items.map((item, i) => (
            <div key={`${field(item, 'label')}-${i}`} className={`flex min-w-0 flex-col border-white/25 ${statCell(i, items.length)}`}>
              <dt className="order-last mt-2 text-[14px] leading-snug text-white/90">{field(item, 'label')}</dt>
              <dd className={TYPE.stat}>
                <CountUp value={field(item, 'value')} duration={1600} />
              </dd>
            </div>
          ))}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
