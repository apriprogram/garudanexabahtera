// Layanan (kunci `services`) di latar kertas biru muda: kepala section, lalu ubin putih radius 12 bergaris tipis dengan
// ikon besar otomatis (kotak 56px), H3, satu kalimat, dan panah bila ubin bertautan (seluruh ubin = tautan; disorot →
// garis berwarna tema, tanpa angkat). 3 kolom di layar lebar, 2 di tablet; HP satu kartu berisi baris bergaris tipis
// (ikon di kiri) agar halaman HP tetap ringkas.
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { MedicareModel } from './model';
import { C, ICON_BOX, SECTION_PAD, T } from './styles';
import { AutoIcon, SectionHead } from './ui';

/** HP: baris di dalam satu kartu (tanpa garis sendiri); ≥ @2xl: kartu putih radius 12 bergaris tipis. */
const TILE =
  'transition-colors duration-200 @2xl:rounded-[12px] @2xl:bg-white @2xl:ring-1 @2xl:ring-inset @2xl:ring-[#0E1B2E]/[0.1]';

export function Services({ m }: { m: MedicareModel }) {
  const { services } = m;
  const items = m.items('services');
  return (
    <TemplateSection sectionKey="services" className={`${SECTION_PAD} ${C.paper}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(services, 'eyebrow')}
          title={text(services, 'title')}
          subtitle={text(services, 'subtitle')}
          srTitle={text(services, 'eyebrow') || 'Layanan'}
        />
        <ul className="mt-10 divide-y divide-[#0E1B2E]/[0.1] overflow-hidden rounded-[12px] bg-white ring-1 ring-inset ring-[#0E1B2E]/[0.1] @2xl:grid @2xl:grid-cols-2 @2xl:gap-4 @2xl:divide-y-0 @2xl:overflow-visible @2xl:rounded-none @2xl:bg-transparent @2xl:ring-0 @3xl:mt-14 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => {
            const title = field(item, 'title');
            const body = field(item, 'text');
            const action = m.linkOr(field(item, 'url'), null);
            const inner = (
              <>
                <span aria-hidden className={`${ICON_BOX} h-12! w-12! @2xl:h-14! @2xl:w-14!`}>
                  <AutoIcon name={title} />
                </span>
                <div className="min-w-0 flex-1 @2xl:mt-5">
                  <h3 className={`${T.h3} ${C.ink}`}>{title}</h3>
                  {body && <p className={`mt-1 @2xl:mt-1.5 ${T.body} ${C.muted}`}>{body}</p>}
                </div>
                {action && (
                  <ArrowRight
                    aria-hidden
                    className="mt-1 h-5 w-5 shrink-0 text-(--tpl-accent-ink) transition-transform duration-200 group-hover:translate-x-0.5 @2xl:absolute @2xl:right-6 @2xl:top-6 @2xl:mt-0"
                  />
                )}
              </>
            );
            const box = 'relative flex h-full items-start gap-4 px-4 py-4 @2xl:flex-col @2xl:gap-0 @2xl:p-6 @5xl:p-7';
            return (
              <Reveal as="li" key={`${title}-${i}`} delay={stagger(i, 70)} className="min-w-0">
                {action ? (
                  <ActionLink action={action} className={`group ${box} ${TILE} hover:bg-[#F8FAFD] @2xl:hover:bg-white @2xl:hover:ring-(--tpl-accent)`}>
                    {inner}
                  </ActionLink>
                ) : (
                  <div className={`${box} ${TILE}`}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
