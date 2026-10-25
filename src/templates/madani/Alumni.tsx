// Alumni (kunci `alumni`): panel krem membulat. Kepala section dengan kartu angka kecil (angka + keterangan + tumpukan
// foto alumni), lalu kartu cerita putih: tanda kutip warna sorotan, cerita, foto bulat (atau inisial), nama, angkatan,
// dan kegiatan sekarang. HP: 1 kolom; tablet: 2; layar lebar: 3.
import { Quote } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import type { MadaniModel } from './model';
import { C, DISPLAY, INSET, PANEL_RADIUS } from './styles';
import { SectionHead } from './ui';

export function Alumni({ m }: { m: MadaniModel }) {
  const { alumni } = m;
  const items = list(alumni, 'items', 6).filter((item) => field(item, 'name') && field(item, 'quote'));
  const statValue = text(alumni, 'stat_value');
  const statLabel = text(alumni, 'stat_label');
  if (items.length === 0) return null;
  const faces = items.filter((item) => hasImage(field(item, 'photo'))).slice(0, 3);

  const stat =
    statValue || statLabel ? (
      <div className="mt-6 inline-flex max-w-full items-center gap-4 rounded-[22px] bg-white p-4 pr-6 ring-1 ring-inset ring-black/[0.06] @5xl:mt-8">
        {faces.length > 0 && (
          <span aria-hidden className="flex shrink-0 -space-x-3">
            {faces.map((item, i) => (
              <KitAvatar key={i} name={field(item, 'name')} photo={field(item, 'photo')} className="h-11 w-11 ring-2 ring-white" sizes="44px" />
            ))}
          </span>
        )}
        <span className="min-w-0">
          {statValue && (
            <span className={`block text-[30px] leading-none tracking-[-0.03em] text-(--md-deep) ${DISPLAY}`}>
              <CountUp value={statValue} />
            </span>
          )}
          {statLabel && <span className={`mt-1 block text-[13.5px] leading-snug ${C.muted}`}>{statLabel}</span>}
        </span>
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="alumni" className="py-2">
      <div className={`${INSET} ${PANEL_RADIUS} bg-[#F6F4EC]`}>
        <div className={`${CONTAINER} py-14 @3xl:py-20 @5xl:py-24`}>
          <SectionHead eyebrow={text(alumni, 'eyebrow')} title={text(alumni, 'title')} subtitle={text(alumni, 'subtitle')} />
          {stat && <Reveal delay={120}>{stat}</Reveal>}
          <ul className="mt-10 grid gap-4 @3xl:mt-12 @2xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-5">
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 70)} className="flex min-w-0 flex-col rounded-[24px] bg-white p-6 ring-1 ring-inset ring-black/[0.05] @3xl:p-7">
                <figure className="flex flex-1 flex-col">
                  <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-(--md-hl) text-(--md-on-hl)">
                    <Quote className="h-4 w-4 fill-current" />
                  </span>
                  <blockquote className={`mt-5 flex-1 text-[16px] leading-relaxed ${C.body}`}>
                    <p>{field(item, 'quote')}</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3.5 border-t border-black/[0.08] pt-5">
                    <KitAvatar name={field(item, 'name')} photo={field(item, 'photo')} className="h-12 w-12" sizes="48px" />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-(--md-deep)">{field(item, 'name')}</span>
                      <span className={`block text-[13px] leading-snug ${C.muted}`}>{[field(item, 'year'), field(item, 'now')].filter(Boolean).join(' · ')}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </TemplateSection>
  );
}
