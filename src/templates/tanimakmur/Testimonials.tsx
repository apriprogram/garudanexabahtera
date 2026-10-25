// Testimoni (kunci `testimonials`) di pita putih: judul terpusat, kartu ulasan krem radius 28 (bintang warna aksen,
// kutipan, chip produk yang dibeli, garis tipis, avatar foto/inisial + nama + keterangan). Kartu kedua tampil hijau tua
// sebagai sorotan (referensi Seram). HP: kartu bertumpuk.
import { Package } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { parseRating, type TaniModel } from './model';
import { C, TYPE_T } from './styles';
import { PersonPhoto, SectionLabel, Stars } from './ui';

export function Testimonials({ m }: { m: TaniModel }) {
  const { testimonials } = m;
  const eyebrow = text(testimonials, 'eyebrow');
  const title = text(testimonials, 'title');
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  // Sorotan hanya bila ada ≥ 3 kartu (kartu tengah baris pertama)
  const featured = items.length >= 3 ? 1 : -1;

  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_Y} bg-white`}>
      <div className={CONTAINER}>
        {(eyebrow || title) && (
          <div className="mx-auto max-w-[760px] text-center">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} mx-auto max-w-[20ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                {title}
              </Reveal>
            )}
          </div>
        )}
        <ul className="mt-10 grid gap-4 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => {
            const dark = i === featured;
            const rating = parseRating(field(item, 'rating'));
            const product = field(item, 'product');
            return (
              <Reveal
                as="li"
                key={`${field(item, 'name')}-${i}`}
                delay={stagger(i, 80)}
                data-tpl-tone={dark ? 'inverse' : undefined}
                className={`flex flex-col rounded-[28px] p-7 @3xl:p-8 ${dark ? 'bg-[#1E3A16] text-white' : 'bg-[#F6F2E3]'}`}
              >
                {rating !== null && <Stars value={rating} className="h-4 w-4" track={dark ? 'text-white/25' : undefined} />}
                <blockquote className={`mt-5 flex-1 text-[16px] leading-relaxed @3xl:text-[17px] ${dark ? 'text-white' : 'text-[#18230F]'}`}>“{field(item, 'quote')}”</blockquote>
                {product && (
                  <p
                    className={`mt-5 inline-flex max-w-full items-center gap-2 self-start rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${
                      dark ? 'bg-white/10 text-white' : 'bg-white text-[#18230F]'
                    }`}
                  >
                    <Package aria-hidden className={`h-3.5 w-3.5 shrink-0 ${dark ? 'text-(--tm-glow)' : 'text-[#1E3A16]'}`} />
                    <span className="truncate">Membeli: {product}</span>
                  </p>
                )}
                {(field(item, 'name') || field(item, 'role')) && (
                  <div className={`mt-6 flex items-center gap-3 border-t pt-6 ${dark ? 'border-transparent' : 'border-[#18230F]/[0.08]'}`}>
                    <PersonPhoto name={field(item, 'name')} photo={field(item, 'photo')} />
                    <div className="min-w-0">
                      {field(item, 'name') && <p className={`truncate text-[15px] font-semibold ${dark ? 'text-white' : 'text-[#18230F]'}`}>{field(item, 'name')}</p>}
                      {field(item, 'role') && <p className={`truncate text-[13px] ${dark ? 'text-white/75' : C.muted}`}>{field(item, 'role')}</p>}
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
