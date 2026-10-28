// Cerita pembeli (kunci `testimonials`), putih hangat: label + H2 rata tengah, lalu kutipan dalam kolom (3 di layar
// lebar, dipisah garis rambut tegak): tanda kutip Cormorant besar warna tema, kutipan Cormorant miring, nama Inter tebal
// sedang + keterangan. HP & tablet: rel geser mendatar (kartu 84% lebar, kartu berikutnya mengintip, garis atas) agar
// kutipan tidak bertumpuk panjang. Tanpa foto wajah (nama pembeli fiktif). Reveal membungkus relnya, bukan tiap kartu.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { HomeNestModel } from './model';
import { C, SECTION_PAD, SERIF, TYPE } from './styles';
import { SectionHead } from './ui';

const COLS: Record<number, string> = { 1: '@5xl:grid-cols-1', 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3' };

export function Testimonials({ m }: { m: HomeNestModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  const cols = COLS[Math.min(items.length, 3)] ?? '@5xl:grid-cols-3';
  const single = items.length === 1;
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${C.warm}`}>
      <div className={CONTAINER}>
        <SectionHead layout="center" eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} srTitle="Cerita pembeli" />
        <Reveal className="mt-12 @3xl:mt-20">
          <ul
            aria-label="Kutipan pembeli"
            className={`-mx-5 flex max-w-[1320px] snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-auto @5xl:grid @5xl:gap-0 @5xl:overflow-visible @5xl:px-0 @5xl:pb-0 ${cols}`}
          >
            {items.map((item, i) => (
              <li
                key={`${field(item, 'name')}-${i}`}
                className={`min-w-0 shrink-0 snap-start border-t pt-8 ${single ? 'w-full' : 'w-[84%] @2xl:w-[46%]'} @5xl:w-auto @5xl:border-t-0 @5xl:px-10 @5xl:pt-2 ${i % 3 > 0 ? '@5xl:border-l' : '@5xl:pl-0'} ${i >= 3 ? '@5xl:mt-14' : ''} ${C.line}`}
              >
                <figure className="flex h-full flex-col">
                  <span aria-hidden className={`${SERIF} block h-10 text-[72px] leading-[0.9] ${C.accent}`}>
                    “
                  </span>
                  <blockquote className={`mt-4 text-pretty ${TYPE.quote} ${C.ink}`}>{field(item, 'quote')}</blockquote>
                  {(field(item, 'name') || field(item, 'place')) && (
                    <figcaption className="mt-auto pt-7 text-[14px] leading-snug">
                      {field(item, 'name') && <span className={`block font-semibold ${C.ink}`}>{field(item, 'name')}</span>}
                      {field(item, 'place') && <span className={`mt-0.5 block ${C.muted}`}>{field(item, 'place')}</span>}
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
