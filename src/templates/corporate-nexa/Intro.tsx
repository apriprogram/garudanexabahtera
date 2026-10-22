// Hero (judul editorial + foto besar dengan kartu angka melayang) dan strip logo klien Corporate Nexa.
import { ArrowRight, Building2, Check } from 'lucide-react';
import { CountUp, Marquee, Reveal } from '../shared/Animated';
import { photoAlt } from '../shared/assets';
import { ClientLogo } from '../shared/clients';
import { CONTAINER, FONT_DISPLAY, SURFACE, TYPE } from '../shared/layout';
import { Avatar } from '../shared/media';
import { clientItems, type CompanyProfileModel } from '../shared/model';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, isEnabled, list, resolveAction, splitHighlight, text } from '../shared/utils';
import { BTN_OUTLINE, BTN_PRIMARY, LEAD, LINE } from './styles';
import { Visual } from './ui';

export function Hero({ m }: { m: CompanyProfileModel }) {
  const { hero, about, advantages, testimonials } = m;
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const primary = resolveAction(text(hero, 'primary_url'), m.contactAction);
  const secondaryLabel = text(hero, 'secondary_label');
  const secondary = secondaryLabel ? resolveAction(text(hero, 'secondary_url'), m.servicesAction) : null;
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');

  const stats = isEnabled(advantages) ? list(advantages, 'stats', 4) : [];
  const leadStat = stats[0] && field(stats[0], 'value') ? stats[0] : null;
  const proof = stats[1] && field(stats[1], 'value') ? stats[1] : null;
  const point = isEnabled(about) ? field(list(about, 'points', 1)[0], 'text') : '';
  const people = isEnabled(testimonials) ? list(testimonials, 'items', 9).filter((item) => field(item, 'quote')).slice(0, 3) : [];

  return (
    <TemplateSection sectionKey="hero" className="relative overflow-hidden">
      {/* Kisi titik sangat tipis di kanan atas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_62%)]"
        style={{ backgroundImage: 'radial-gradient(circle, var(--tpl-accent-200) 1px, transparent 1.2px)', backgroundSize: '24px 24px' }}
      />
      <div
        className={`${CONTAINER} relative grid gap-12 pb-16 pt-10 @3xl:gap-14 @3xl:pb-24 @3xl:pt-16 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-12 @5xl:pb-28 @5xl:pt-20`}
      >
        <div className="min-w-0 @5xl:col-span-7 @5xl:pr-4 @7xl:pr-10">
          {eyebrow && (
            <Reveal>
              <p className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-fg ring-1 ring-inset ring-black/[0.08]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" aria-hidden />
                <span className="truncate">{eyebrow}</span>
              </p>
            </Reveal>
          )}
          <Reveal
            as="h1"
            delay={80}
            className={`${eyebrow ? 'mt-6 @3xl:mt-8' : ''} ${FONT_DISPLAY} ${TYPE.display} font-semibold text-balance text-fg [overflow-wrap:anywhere]`}
          >
            {parts ? (
              <>
                {parts[0]}
                <span className="text-(--tpl-accent-ink)">{parts[1]}</span>
                {parts[2]}
              </>
            ) : (
              title
            )}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-6 max-w-[52ch] @3xl:mt-7 ${LEAD}`}>
              {subtitle}
            </Reveal>
          )}

          {(primary || secondary) && (
            <Reveal delay={240} className="mt-9 flex flex-col gap-3 @md:flex-row @3xl:mt-10">
              {primary && (
                <ActionLink action={primary} className={BTN_PRIMARY}>
                  {text(hero, 'primary_label') || 'Hubungi Kami'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </ActionLink>
              )}
              {secondary && (
                <ActionLink action={secondary} className={BTN_OUTLINE}>
                  {secondaryLabel}
                </ActionLink>
              )}
            </Reveal>
          )}

          {proof && (
            <Reveal delay={320} className={`mt-10 flex items-center gap-4 border-t ${LINE} pt-7 @3xl:mt-12 @3xl:pt-8`}>
              {people.length > 0 && (
                <span className="flex shrink-0 -space-x-3" aria-hidden>
                  {people.map((person, i) => (
                    <Avatar key={i} name={field(person, 'name')} photo={field(person, 'photo')} className="h-11 w-11 ring-2 ring-white" sizes="44px" />
                  ))}
                </span>
              )}
              <p className="min-w-0 text-[14px] leading-snug text-muted">
                <span className={`${FONT_DISPLAY} block text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-fg`}>{field(proof, 'value')}</span>
                {field(proof, 'label')}
              </p>
            </Reveal>
          )}
        </div>

        <Reveal variant="scale" delay={320} className="relative min-w-0 @5xl:col-span-5">
          <Visual
            src={image}
            alt={photoAlt(image, m.companyName)}
            priority
            parallax
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-[4/3] rounded-[24px] @3xl:aspect-[16/10] @3xl:rounded-[28px] @5xl:aspect-[4/5]"
          />
          {point && (
            <div className={`${SURFACE.glass} absolute right-4 top-4 hidden max-w-[280px] items-center gap-3 p-3 pr-4 @xl:flex @3xl:right-6 @3xl:top-6`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </span>
              <p className="text-[13px] font-semibold leading-snug text-fg">{point}</p>
            </div>
          )}
          {leadStat && (
            <div
              className={`${SURFACE.glass} absolute bottom-4 left-4 flex items-center gap-4 p-4 pr-6 @3xl:bottom-6 @3xl:left-6 @3xl:p-5 @3xl:pr-8 @5xl:-left-10 @5xl:bottom-10`}
            >
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink) @md:flex">
                <Building2 className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className={`${FONT_DISPLAY} text-[28px] font-semibold leading-none tracking-[-0.03em] text-fg @3xl:text-[36px]`}>
                  <CountUp value={field(leadStat, 'value')} />
                </p>
                {field(leadStat, 'label') && <p className="mt-1.5 text-[13px] font-medium text-muted">{field(leadStat, 'label')}</p>}
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function Clients({ m }: { m: CompanyProfileModel }) {
  const items = clientItems(m.clients);
  if (items.length === 0) return null;
  const title = text(m.clients, 'title');

  return (
    <TemplateSection sectionKey="clients" className="border-y border-black/[0.06]">
      <div className={`${CONTAINER} flex flex-col gap-7 py-10 @3xl:py-12 @5xl:flex-row @5xl:items-center @5xl:gap-12`}>
        {title && (
          <p
            className={`text-balance text-center text-[13px] font-medium leading-snug text-muted @5xl:w-[250px] @5xl:shrink-0 @5xl:border-r @5xl:pr-12 @5xl:text-left ${LINE}`}
          >
            {title}
          </p>
        )}
        <Reveal variant="fade" className="min-w-0 flex-1">
          <Marquee
            label={title || 'Klien kami'}
            duration={40}
            gap={64}
            staticClassName="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] items-center justify-items-center gap-x-6 gap-y-8"
          >
            {items.map((item, i) => (
              <ClientLogo key={i} name={item.name} logo={item.logo} className="h-7 @3xl:h-8" />
            ))}
          </Marquee>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
