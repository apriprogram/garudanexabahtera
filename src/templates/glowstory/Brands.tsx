// Brand lokal (kunci `brands`): garis tipis atas-bawah, label + judul kecil terpusat, lalu strip nama brand yang
// bergerak pelan. Tanpa logo, nama brand ditulis bergantian dengan gaya huruf berbeda (serif, serif miring, mono
// kapital, sans tebal) agar terasa seperti deretan logo; kota asal kecil di bawahnya. Logo unggahan tampil apa adanya.
import { Marquee, Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y_SM } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeImage, text } from '../shared/utils';
import type { GlowModel } from './model';
import { C, MONO, SERIF } from './styles';
import { Eyebrow } from './ui';

const WORDMARK = [
  `${SERIF} text-[30px] tracking-[-0.01em]`,
  `${SERIF} italic text-[30px]`,
  'font-mono text-[17px] font-semibold uppercase tracking-[0.22em]',
  'text-[21px] font-semibold uppercase tracking-[0.08em]',
];

export function Brands({ m }: { m: GlowModel }) {
  const { brands } = m;
  const items = list(brands, 'items', 12).filter((item) => field(item, 'name') || hasImage(field(item, 'logo')));
  if (items.length === 0) return null;
  const eyebrow = text(brands, 'eyebrow');
  const title = text(brands, 'title');

  return (
    <TemplateSection sectionKey="brands" className={`${SECTION_Y_SM} border-y border-[#2B211C]/10`}>
      {(eyebrow || title) && (
        <div className={`${CONTAINER} text-center`}>
          {eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`mx-auto mt-3 max-w-[30ch] text-balance ${SERIF} text-[26px] leading-tight text-[#2B211C] @3xl:text-[30px]`}>
              {title}
            </Reveal>
          )}
        </div>
      )}
      <Marquee label="Brand lokal yang kami jual" duration={40} gap={64} className="mt-8 @3xl:mt-10" staticClassName="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 px-5">
        {items.map((item, i) => {
          const name = field(item, 'name');
          const logo = field(item, 'logo');
          const city = field(item, 'city');
          return (
            <span key={`${name}-${i}`} className="flex flex-col items-center text-[#2B211C]">
              {hasImage(logo) ? (
                <img src={safeImage(logo)} alt={name} loading="lazy" decoding="async" className="h-9 w-auto max-w-[160px] object-contain" />
              ) : (
                <span className={`whitespace-nowrap leading-none ${WORDMARK[i % WORDMARK.length]}`}>{name}</span>
              )}
              {city && <span className={`mt-2 ${MONO} text-[10px] ${C.muted}`}>{city}</span>}
            </span>
          );
        })}
      </Marquee>
    </TemplateSection>
  );
}
