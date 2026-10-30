// Cerita penumpang (kunci `testimonials`), putih dengan garis rambut di atas (memisahkan dari Cara pesan). Kartu pita
// radius 18: tanda kutip SVG warna tema (bulat, bukan garis miring), kutipan, lalu inisial (lingkaran tint), nama, dan
// rute + kelas huruf mono (rute dan kelas di dua baris, jadi nama sejajar di semua kartu). Layar lebar ≥ @7xl: 4 kolom;
// tablet/laptop 2 kolom; HP rel geser mendatar (kartu 84%, berikutnya mengintip). Tanpa foto wajah (penumpang fiktif).
// Reveal membungkus relnya, bukan tiap kartu.
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { splitRoute, type NusalineModel } from './model';
import { C, MONO, WRAP } from './styles';
import { SectionHead } from './ui';

/** Kolom per jumlah kartu (kelas utuh agar terbaca Tailwind): 4 kartu → 2×2 di laptop, 4 sebaris di layar lebar. */
const COLS: Record<number, string> = { 1: '@5xl:grid-cols-1', 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3', 4: '@5xl:grid-cols-2 @7xl:grid-cols-4' };

/** Tanda kutip pembuka (dua tetes bulat), dekoratif. */
function QuoteMark() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 34 24" className="h-6 w-[34px] text-(--nl-ink)" fill="currentColor">
      <path d="M0 24V14.6C0 6.9 4.3 1.6 12 0l1.5 3.3C9.4 4.9 7.4 7.8 7.2 11.2H13V24ZM19 24V14.6C19 6.9 23.3 1.6 31 0l1.5 3.3c-4.1 1.6-6.1 4.5-6.3 7.9H32V24Z" />
    </svg>
  );
}

export function Testimonials({ m }: { m: NusalineModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  const cols = COLS[items.length] ?? '@5xl:grid-cols-3';
  return (
    <TemplateSection sectionKey="testimonials" className="bg-white pb-16 pt-2 @3xl:pb-24 @3xl:pt-4 @5xl:pb-28">
      <div className={WRAP}>
        <div className={`border-t pt-12 @3xl:pt-16 ${C.line}`}>
          <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} subtitle={text(testimonials, 'subtitle')} srTitle="Cerita penumpang" />
        </div>
        <Reveal className="mt-10 @3xl:mt-12">
          <ul
            aria-label="Kutipan penumpang"
            className={`relative -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-0 @5xl:grid @5xl:gap-4 @5xl:overflow-visible @5xl:px-0 @5xl:pb-0 ${cols}`}
          >
            {items.map((item, i) => {
              const [route, cls] = splitRoute(field(item, 'route'));
              return (
                <li
                  key={`${field(item, 'name')}-${i}`}
                  className={`min-w-0 shrink-0 snap-start ${items.length === 1 ? 'w-full' : 'w-[84%] @2xl:w-[46%]'} @5xl:w-auto`}
                >
                  <figure className="flex h-full flex-col rounded-[18px] bg-[#F2F4FA] p-6 @3xl:p-7">
                    <QuoteMark />
                    <blockquote className={`mt-5 text-pretty text-[16px] leading-relaxed ${C.ink} @3xl:text-[17px]`}>{field(item, 'quote')}</blockquote>
                    {(field(item, 'name') || route) && (
                      <figcaption className="mt-auto flex items-center gap-3 pt-6">
                        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-[13px] font-bold text-(--nl-ink)">
                          {initials(field(item, 'name'), 'P')}
                        </span>
                        <span className="min-w-0">
                          {field(item, 'name') && <span className={`block text-[15px] font-semibold ${C.ink}`}>{field(item, 'name')}</span>}
                          {route && (
                            <span className={`mt-0.5 block ${MONO} text-[12px] leading-snug ${C.muted}`}>
                              <span className="block">{route}</span>
                              {cls && (
                                <span className="block">
                                  <span className="sr-only">, kelas </span>
                                  {cls}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
