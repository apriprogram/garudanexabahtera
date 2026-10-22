// Program (rel kartu foto horizontal dengan tombol ← →) dan paket membership (pita abu membulat, paket unggulan
// berwarna aksen pejal) — brief §1.4 #4–#5.
import { ArrowUpRight, Check } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { featureLines, splitPlans, type ArenaModel } from './model';
import { ARENA_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, RAIL, TYPE_A } from './styles';
import { PillLink, RailArrows, SectionPill } from './ui';

// ─── Program ──────────────────────────────────────────────────────────────────

export function Services({ m }: { m: ArenaModel }) {
  const { services } = m;
  const railRef = useRef<HTMLUListElement>(null);
  const eyebrow = text(services, 'eyebrow');
  const title = text(services, 'title');
  const subtitle = text(services, 'subtitle');
  const buttonLabel = text(services, 'button_label');
  const button = resolveAction(text(services, 'button_url'), m.bookAction);
  const items = list(services, 'items', 8).filter((item) => field(item, 'title') || field(item, 'description') || hasImage(field(item, 'image')));
  if (!title && items.length === 0) return null;

  return (
    <TemplateSection sectionKey="services" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-8`}>
        <Reveal className="flex flex-col @5xl:col-span-4 @5xl:pr-6">
          <SectionPill>{eyebrow}</SectionPill>
          {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${TYPE_A.side} ${C.ink}`}>{title}</h2>}
          {subtitle && <p className={`mt-4 max-w-[46ch] ${TYPE_A.body} ${C.muted}`}>{subtitle}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3 @5xl:mt-auto @5xl:pt-10">
            <PillLink action={button} label={buttonLabel} className={`${BTN.navy} ${BTN.md}`} />
          </div>
        </Reveal>

        {items.length > 0 && (
          <div className="min-w-0 @5xl:col-span-8">
            <Reveal>
              <ul ref={railRef} className={RAIL} aria-label={title || 'Program'}>
                {items.map((item, i) => {
                  const name = field(item, 'title');
                  const tag = field(item, 'tag');
                  const description = field(item, 'description');
                  const image = field(item, 'image');
                  const ask = name ? m.askAction(`Halo ${m.companyName}, saya ingin tanya program ${name}.`) : m.bookAction;
                  return (
                    <li key={i} className="w-[80%] shrink-0 snap-start @xl:w-[58%] @3xl:w-[46%] @5xl:w-[47%] @7xl:w-[40%]">
                      <div className={`group relative isolate aspect-[4/5] overflow-hidden ${CARD.radius} ${C.navyBg}`}>
                        {hasImage(image) && (
                          <KitPhoto
                            src={image}
                            alt={ARENA_PHOTOS.alt(image, name)}
                            fallback="none"
                            sizes="(min-width: 1280px) 34vw, (min-width: 768px) 46vw, 80vw"
                            imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                            className="absolute inset-0"
                          />
                        )}
                        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-[#0E1B2E]/85 via-[#0E1B2E]/35 to-transparent" />
                        {tag && (
                          <p className="absolute left-4 top-4 max-w-[calc(100%-32px)] truncate rounded-full bg-[#0E1B2E]/45 px-3 py-1 text-[12px] font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur-md @3xl:left-5 @3xl:top-5">
                            {tag}
                          </p>
                        )}
                        <div data-tpl-tone="inverse" className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 @3xl:p-6">
                          {name && (
                            <h3 className="text-[20px] font-medium leading-snug tracking-[-0.01em] text-white @3xl:text-[22px]">{name}</h3>
                          )}
                          {ask && (
                            <ActionLink
                              action={ask}
                              aria-label={name ? `Tanya program ${name}` : 'Tanya program'}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0E1B2E] transition-colors hover:bg-(--tpl-accent)"
                            >
                              <ArrowUpRight className="h-[18px] w-[18px]" aria-hidden />
                            </ActionLink>
                          )}
                        </div>
                      </div>
                      {description && <p className={`mt-4 max-w-[40ch] text-[14px] leading-relaxed ${C.muted}`}>{description}</p>}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            <RailArrows railRef={railRef} label="Geser program" className="mt-6 justify-end" />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Paket membership ─────────────────────────────────────────────────────────

function planAction(m: ArenaModel, url: string, name: string) {
  return resolveAction(url, name ? m.askAction(`Halo ${m.companyName}, saya tertarik paket ${name}.`) : m.bookAction);
}

export function Pricing({ m }: { m: ArenaModel }) {
  const { pricing } = m;
  const eyebrow = text(pricing, 'eyebrow');
  const title = text(pricing, 'title');
  const subtitle = text(pricing, 'subtitle');
  const note = text(pricing, 'note');
  const items = list(pricing, 'items', 4).filter((item) => field(item, 'name') || field(item, 'price'));
  const { featured, others } = splitPlans(items);
  if (!title && !featured) return null;

  const featuredName = featured ? field(featured, 'name') : '';
  const featuredFeatures = featured ? featureLines(field(featured, 'features')) : [];
  const featuredButton = featured ? field(featured, 'button_label') || 'Pilih paket' : '';

  return (
    <TemplateSection sectionKey="pricing" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <div className={`rounded-[28px] px-5 py-12 @3xl:rounded-[40px] @3xl:px-10 @3xl:py-16 @5xl:px-14 @5xl:py-20 ${C.surface}`}>
          <div className="grid gap-10 @5xl:grid-cols-12 @5xl:gap-12">
            <Reveal className="@5xl:col-span-5 @5xl:col-start-8 @5xl:row-start-1 @5xl:pt-4">
              <SectionPill>{eyebrow}</SectionPill>
              {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${DISPLAY} text-[28px] font-normal leading-[1.12] @3xl:text-[36px] @7xl:text-[44px] ${C.ink}`}>{title}</h2>}
              {subtitle && <p className={`mt-5 max-w-[48ch] ${TYPE_A.lead} ${C.muted}`}>{subtitle}</p>}
              {note && <p className={`mt-6 max-w-[48ch] border-t border-[#0B1220]/[0.08] pt-5 text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
            </Reveal>

            {featured && (
              <div className="@5xl:col-span-7 @5xl:row-start-1">
                <Reveal variant="scale" className={`p-6 text-(--tpl-on-accent) @3xl:p-8 @5xl:p-10 ${CARD.radius} bg-(--tpl-accent)`}>
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                    <div className="min-w-0">
                      {field(featured, 'badge') && (
                        <p className="inline-flex rounded-full bg-white/30 px-3 py-1 text-[12px] font-medium ring-1 ring-inset ring-white/50">
                          {field(featured, 'badge')}
                        </p>
                      )}
                      {featuredName && (
                        <h3 className={`${field(featured, 'badge') ? 'mt-4' : ''} ${TYPE_A.h2} font-medium`}>{featuredName}</h3>
                      )}
                    </div>
                    {field(featured, 'price') && (
                      <p className="flex items-baseline gap-1.5">
                        <span className={`${TYPE_A.stat} text-[36px] @3xl:text-[44px]`}>{field(featured, 'price')}</span>
                        {field(featured, 'period') && <span className="text-[14px] opacity-80">{field(featured, 'period')}</span>}
                      </p>
                    )}
                  </div>
                  {field(featured, 'description') && <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed opacity-90">{field(featured, 'description')}</p>}
                  {featuredFeatures.length > 0 && (
                    <ul className="mt-6 flex flex-wrap gap-2" aria-label={`Benefit paket ${featuredName}`.trim()}>
                      {featuredFeatures.map((feature, i) => (
                        <li key={i} className="inline-flex items-center gap-2 rounded-full bg-white/30 px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-inset ring-white/45">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <PillLink
                    action={planAction(m, field(featured, 'button_url'), featuredName)}
                    label={featuredButton}
                    className={`${BTN.navy} ${BTN.lg} mt-8 w-full @xl:w-auto`}
                  />
                </Reveal>

                {others.length > 0 && (
                  <ul className={`mt-4 grid gap-4 @3xl:mt-5 @3xl:gap-5 ${others.length > 1 ? '@3xl:grid-cols-2' : ''}`}>
                    {others.map((plan, i) => {
                      const name = field(plan, 'name');
                      const features = featureLines(field(plan, 'features'));
                      return (
                        <Reveal as="li" key={i} delay={stagger(i + 1)} className={`flex flex-col bg-white p-6 @3xl:p-7 ${CARD.radius}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            {name && <h3 className={`text-[20px] font-medium ${C.ink}`}>{name}</h3>}
                            {field(plan, 'price') && (
                              <p className={`flex items-baseline gap-1 ${C.ink}`}>
                                <span className={`${TYPE_A.stat} text-[26px]`}>{field(plan, 'price')}</span>
                                {field(plan, 'period') && <span className={`text-[13px] ${C.muted}`}>{field(plan, 'period')}</span>}
                              </p>
                            )}
                          </div>
                          {field(plan, 'badge') && (
                            <p className="mt-2 w-fit rounded-full bg-(--tpl-accent-100) px-2.5 py-0.5 text-[12px] font-medium text-(--tpl-accent-ink)">
                              {field(plan, 'badge')}
                            </p>
                          )}
                          {field(plan, 'description') && <p className={`mt-3 text-[14px] leading-relaxed ${C.muted}`}>{field(plan, 'description')}</p>}
                          {features.length > 0 && (
                            <ul className="mt-5 space-y-2.5" aria-label={`Benefit paket ${name}`.trim()}>
                              {features.map((feature, j) => (
                                <li key={j} className={`flex items-start gap-2.5 text-[14px] ${C.ink}`}>
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-(--tpl-accent-ink)">
                                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                                  </span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-auto pt-6">
                            <PillLink
                              action={planAction(m, field(plan, 'button_url'), name)}
                              label={field(plan, 'button_label') || 'Pilih paket'}
                              className={`${BTN.ghost} ${BTN.md} w-full`}
                            />
                          </div>
                        </Reveal>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
