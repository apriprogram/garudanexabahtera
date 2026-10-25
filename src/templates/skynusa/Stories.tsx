// Cerita pelanggan (kunci `testimonials`): pita abu sangat muda, kepala terpusat, kartu putih bergaris tipis radius 16
// (nomor mono + garis, kutipan, avatar foto/inisial + nama + keterangan). Tanpa bintang/rating (tidak mengarang angka).
// HP: kartu bertumpuk.
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import type { SkyNusaModel } from './model';
import { C, CARD, MONO } from './styles';
import { SectionHead } from './ui';

export function Stories({ m }: { m: SkyNusaModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_Y} ${C.surface}`}>
      <div className={CONTAINER}>
        <SectionHead layout="center" eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} subtitle="" />
        <ul className="mt-10 grid gap-4 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className={`flex flex-col p-6 @3xl:p-7 ${CARD.white}`}>
              <p aria-hidden className={`flex items-center gap-3 ${MONO} ${C.muted}`}>
                {String(i + 1).padStart(2, '0')}
                <span className="h-px flex-1 bg-black/[0.08]" />
              </p>
              <blockquote className="mt-5 flex-1 text-[16px] leading-relaxed text-[#0E1A1C] @3xl:text-[17px]">“{field(item, 'quote')}”</blockquote>
              {(field(item, 'name') || field(item, 'role')) && (
                <div className="mt-7 flex items-center gap-3 border-t border-black/[0.07] pt-5">
                  <KitAvatar name={field(item, 'name')} photo={field(item, 'photo')} sizes="44px" className="h-11 w-11" />
                  <div className="min-w-0">
                    {field(item, 'name') && <p className="truncate text-[15px] font-medium text-[#0E1A1C]">{field(item, 'name')}</p>}
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
