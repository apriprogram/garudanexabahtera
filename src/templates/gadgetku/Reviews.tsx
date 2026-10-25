// Ulasan pembeli (kunci `testimonials`, referensi "Bose · What our customer say"): label + H2 di kiri, ringkasan rating
// toko di kanan (angka besar + bintang + keterangan); lalu kartu abu muda radius 24: bintang, chip produk yang dibeli,
// kutipan, garis tipis, avatar foto/inisial + nama + keterangan. HP: kartu bertumpuk.
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import { stars, type GadgetkuModel } from './model';
import { C, TYPE_G } from './styles';
import { SectionLabel, Stars } from './ui';

export function Reviews({ m }: { m: GadgetkuModel }) {
  const { testimonials } = m;
  const eyebrow = text(testimonials, 'eyebrow');
  const title = text(testimonials, 'title');
  const ratingValue = text(testimonials, 'rating_value');
  const ratingLabel = text(testimonials, 'rating_label');
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-6 @5xl:flex-row @5xl:items-end @5xl:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                {title}
              </Reveal>
            )}
          </div>
          {(ratingValue || ratingLabel) && (
            <Reveal delay={160} className="flex items-center gap-4 @5xl:pb-1">
              {ratingValue && <span className={`${TYPE_G.price} text-[44px] leading-none text-[#0B0C0E] @3xl:text-[52px]`}>{ratingValue}</span>}
              <span className="min-w-0">
                <Stars value={5} className="h-[18px] w-[18px]" />
                {ratingLabel && <span className={`mt-1 block max-w-[30ch] text-[13.5px] leading-snug ${C.muted}`}>{ratingLabel}</span>}
              </span>
            </Reveal>
          )}
        </div>

        <ul className="mt-10 grid gap-4 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className="flex flex-col rounded-[24px] bg-[#F2F3F5] p-6 @3xl:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={stars(field(item, 'rating'))} />
                {field(item, 'product') && (
                  <span className="max-w-full truncate rounded-full bg-white px-3 py-1 text-[12.5px] font-medium text-[#0B0C0E]">
                    <span className={C.muted}>Beli: </span>
                    {field(item, 'product')}
                  </span>
                )}
              </div>
              <blockquote className="mt-5 flex-1 text-[16px] leading-relaxed text-[#0B0C0E]">“{field(item, 'quote')}”</blockquote>
              {(field(item, 'name') || field(item, 'role')) && (
                <div className="mt-6 flex items-center gap-3 border-t border-black/[0.08] pt-5">
                  <KitAvatar name={field(item, 'name')} photo={field(item, 'photo')} sizes="44px" className="h-11 w-11" />
                  <div className="min-w-0">
                    {field(item, 'name') && <p className="truncate text-[15px] font-semibold text-[#0B0C0E]">{field(item, 'name')}</p>}
                    {field(item, 'role') && <p className={`truncate text-[13px] ${C.muted}`}>{field(item, 'role')}</p>}
                  </div>
                </div>
              )}
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
