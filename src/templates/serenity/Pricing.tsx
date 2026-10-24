// Paket (kunci `pricing`): judul terpusat, kartu paket berdampingan. Paket berlabel sorotan = kartu tinta gelap
// dengan cahaya aksen lembut di sudut (bukan bayangan) dan label bergradasi pastel; paket lain = kartu abu lavender.
// Isi paket satu baris satu poin bertanda centang; tombol pil penuh lebar (WhatsApp berisi nama paket bila tautan
// kosong). HP: kartu bertumpuk.
import { Check } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import { featureLines, featuredPlan, type SerenityModel } from './model';
import { BTN, C, CARD, DISPLAY, TYPE_S } from './styles';
import { PillLink, SectionLabel } from './ui';

const COLS: Record<number, string> = {
  1: 'mx-auto max-w-[480px]',
  2: '@3xl:grid-cols-2 mx-auto max-w-[980px]',
  3: '@3xl:grid-cols-2 @6xl:grid-cols-3',
  4: '@3xl:grid-cols-2 @7xl:grid-cols-4',
};

export function Pricing({ m }: { m: SerenityModel }) {
  const { pricing } = m;
  const eyebrow = text(pricing, 'eyebrow');
  const title = text(pricing, 'title');
  const subtitle = text(pricing, 'subtitle');
  const note = text(pricing, 'note');
  const items = list(pricing, 'items', 4).filter((item) => field(item, 'name') || field(item, 'price'));
  if (items.length === 0) return null;
  const featured = featuredPlan(items);

  return (
    <TemplateSection sectionKey="pricing" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="mx-auto max-w-[760px] text-center">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} mx-auto max-w-[20ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mx-auto mt-5 max-w-[54ch] ${TYPE_S.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-5 ${COLS[items.length]}`}>
          {items.map((item, i) => {
            const dark = i === featured;
            const name = field(item, 'name');
            const badge = field(item, 'badge');
            const period = field(item, 'period');
            const lines = featureLines(field(item, 'features'));
            const action = resolveAction(field(item, 'button_url'), m.askAbout(name ? `paket ${name}` : ''));
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                variant={dark ? 'scale' : 'up'}
                delay={stagger(i, 90)}
                data-tpl-tone={dark ? 'inverse' : undefined}
                className={`relative isolate flex flex-col overflow-hidden p-7 @3xl:p-8 ${dark ? 'rounded-[28px] bg-[#151833] text-white' : CARD.soft}`}
              >
                {dark && <div aria-hidden className="sr-aura absolute -right-20 -top-28 -z-10 h-72 w-72" />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {name && <h3 className={`${TYPE_S.h3} ${dark ? 'text-white' : 'text-[#151833]'}`}>{name}</h3>}
                  {badge && (
                    <span className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${dark ? 'sr-badge-pastel text-[#151833]' : 'bg-white text-(--tpl-accent-ink)'}`}>{badge}</span>
                  )}
                </div>
                {field(item, 'description') && (
                  <p className={`mt-3 text-[15px] leading-relaxed ${dark ? 'text-white/75' : C.muted}`}>{field(item, 'description')}</p>
                )}
                {field(item, 'price') && (
                  <p className="mt-7 flex flex-wrap items-baseline gap-x-1.5">
                    <span className={`${DISPLAY} text-[38px] leading-none tracking-[-0.03em] @3xl:text-[44px] ${dark ? 'text-white' : 'text-[#151833]'}`}>
                      {field(item, 'price')}
                    </span>
                    {period && <span className={`text-[15px] ${dark ? 'text-white/70' : C.muted}`}>{period}</span>}
                  </p>
                )}
                {lines.length > 0 && (
                  <ul className={`mt-7 space-y-3 border-t pt-7 ${dark ? 'border-white/12' : 'border-black/[0.07]'}`}>
                    {lines.map((line, li) => (
                      <li key={`${line}-${li}`} className={`flex items-start gap-3 text-[15px] leading-snug ${dark ? 'text-white/90' : 'text-[#151833]'}`}>
                        <span
                          aria-hidden
                          className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/[0.14] text-white' : 'bg-white text-(--tpl-accent-ink)'}`}
                        >
                          <Check className="h-3 w-3" strokeWidth={2.75} />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-8">
                  <PillLink
                    action={action}
                    label={field(item, 'button_label')}
                    className={`${dark ? BTN.white : BTN.ink} ${BTN.lg} flex w-full`}
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mx-auto mt-8 max-w-[60ch] text-center text-[14px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
