// Prestasi (kunci `achievements`): pita warna tema tua yang membulat dan menjorok (ornamen bintang segi delapan samar di
// pojok). Kiri: label, H2, deskripsi, dan kartu angka warna sorotan; kanan: daftar prestasi bergaris tipis (tahun, nama
// prestasi, siswa/tim, chip tingkat). Tanpa bayangan.
import { Trophy } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import type { MadaniModel } from './model';
import { INSET, PANEL_RADIUS, TYPE_M } from './styles';
import { Chip, Eyebrow } from './ui';

export function Achievements({ m }: { m: MadaniModel }) {
  const { achievements: a } = m;
  const items = list(a, 'items', 10).filter((item) => field(item, 'title'));
  const eyebrow = text(a, 'eyebrow');
  const title = text(a, 'title');
  const subtitle = text(a, 'subtitle');
  const statValue = text(a, 'stat_value');
  const statLabel = text(a, 'stat_label');
  if (items.length === 0 && !title) return null;

  return (
    <TemplateSection sectionKey="achievements" className="py-2">
      <div data-tpl-tone="inverse" className={`${INSET} ${PANEL_RADIUS} relative isolate overflow-hidden bg-(--md-deep) text-white`}>
        <div aria-hidden className="md-pattern pointer-events-none absolute -right-10 -top-10 -z-10 h-[420px] w-[520px] opacity-[0.07] [mask-image:radial-gradient(closest-side,#000,transparent)]" />
        <div className={`${CONTAINER} grid gap-10 py-14 @3xl:py-20 @5xl:grid-cols-12 @5xl:gap-12 @5xl:py-24`}>
          <div className="min-w-0 @5xl:col-span-5">
            {eyebrow && (
              <Reveal>
                <Eyebrow tone="dark">{eyebrow}</Eyebrow>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance text-white ${TYPE_M.h2}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={120} className={`mt-4 max-w-[44ch] text-white/80 ${TYPE_M.lead}`}>
                {subtitle}
              </Reveal>
            )}
            {(statValue || statLabel) && (
              <Reveal delay={180} className="mt-8 flex max-w-[400px] items-center gap-5 rounded-[24px] bg-(--md-hl) p-5 text-(--md-on-hl) @3xl:p-6">
                <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--md-deep) text-(--md-hl-ink)">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  {statValue && (
                    <span className={`block ${TYPE_M.stat}`}>
                      <CountUp value={statValue} />
                    </span>
                  )}
                  {statLabel && <span className="mt-1 block text-[14px] font-medium leading-snug">{statLabel}</span>}
                </span>
              </Reveal>
            )}
          </div>

          {items.length > 0 && (
            <ul aria-label="Daftar prestasi" className="min-w-0 border-t border-white/[0.14] @5xl:col-span-7">
              {items.map((item, i) => (
                <Reveal
                  as="li"
                  key={`${field(item, 'title')}-${i}`}
                  delay={stagger(i, 50)}
                  className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 border-b border-white/[0.14] py-5 @3xl:grid-cols-[64px_1fr_auto] @3xl:items-center @3xl:gap-x-6"
                >
                  <span className="pt-0.5 text-[13px] font-semibold tabular-nums text-(--md-hl-ink) @3xl:pt-0">{field(item, 'year')}</span>
                  <span className="min-w-0">
                    <h3 className="text-[16px] font-semibold leading-snug text-white @3xl:text-[17px]">{field(item, 'title')}</h3>
                    {field(item, 'detail') && <span className="mt-0.5 block text-[13.5px] text-white/70">{field(item, 'detail')}</span>}
                  </span>
                  {field(item, 'level') && (
                    <span className="col-start-2 @3xl:col-start-3">
                      <Chip tone="dark">{field(item, 'level')}</Chip>
                    </span>
                  )}
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
