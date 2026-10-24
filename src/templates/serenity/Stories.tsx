// Cerita peserta (kunci `testimonials`): pita abu lavender selebar layar, judul terpusat, kartu putih radius 28
// (ikon kutip warna aksen, kutipan, garis tipis, avatar foto/inisial + nama + keterangan). HP: kartu bertumpuk.
import { Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import type { SerenityModel } from './model';
import { C, CARD, TYPE_S } from './styles';
import { SectionLabel } from './ui';

export function Stories({ m }: { m: SerenityModel }) {
  const { testimonials } = m;
  const eyebrow = text(testimonials, 'eyebrow');
  const title = text(testimonials, 'title');
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_Y} ${C.surface}`}>
      <div className={CONTAINER}>
        {(eyebrow || title) && (
          <div className="mx-auto max-w-[760px] text-center">
            {eyebrow && (
              <Reveal>
                <SectionLabel tone="white">{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} mx-auto max-w-[20ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
                {title}
              </Reveal>
            )}
          </div>
        )}
        <ul className="mt-10 grid gap-4 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className={`flex flex-col p-7 @3xl:p-8 ${CARD.white}`}>
              <Quote aria-hidden className="h-7 w-7 fill-(--sr-tint) text-(--tpl-accent-ink)" strokeWidth={1.75} />
              <blockquote className="mt-5 flex-1 text-[16px] leading-relaxed text-[#151833] @3xl:text-[17px]">{field(item, 'quote')}</blockquote>
              {(field(item, 'name') || field(item, 'role')) && (
                <div className="mt-7 flex items-center gap-3 border-t border-black/[0.07] pt-6">
                  <KitAvatar name={field(item, 'name')} photo={field(item, 'photo')} sizes="44px" className="h-11 w-11" />
                  <div className="min-w-0">
                    {field(item, 'name') && <p className="truncate text-[15px] font-semibold text-[#151833]">{field(item, 'name')}</p>}
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
