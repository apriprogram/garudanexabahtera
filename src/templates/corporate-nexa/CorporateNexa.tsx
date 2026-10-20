// Template "Corporate Nexa": company profile korporat yang rapi dan tegas (terang, aksen bisa diganti).
// Tata letak memakai container query (@xl, @3xl, @5xl …) agar akurat di pratinjau CMS berukuran HP.
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Factory,
  HardHat,
  Landmark,
  Mail,
  MapPin,
  Menu,
  PaintRoller,
  Phone,
  Quote,
  Ruler,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { TemplateRenderProps } from '../types';
import { ART_SEQUENCE } from '../shared/art';
import { WhatsAppIcon } from '../shared/icons';
import { Avatar, BrandMark, Img, MapEmbed } from '../shared/media';
import { readCompanyProfile, type CompanyProfileModel } from '../shared/model';
import { ActionLink, TemplateSection, TemplateShell } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  field,
  isEnabled,
  list,
  mailHref,
  mapsInfo,
  paragraphs,
  resolveAction,
  safeUrl,
  splitHighlight,
  telHref,
  text,
  type LinkAction,
} from '../shared/utils';
import { CORPORATE_NEXA_ACCENT } from './defaultContent';

const WRAP = 'mx-auto w-full max-w-[1200px] px-5 @2xl:px-8 @5xl:px-10';
const SECTION_Y = 'py-14 @3xl:py-20 @5xl:py-24';
const H2 = 'text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg @3xl:text-[34px] @5xl:text-[40px]';
const LEAD = 'text-[15px] leading-relaxed text-muted @3xl:text-[17px]';
// Tanpa kelas display agar bisa digabung dengan `hidden @xl:inline-flex` tanpa bentrok
const BTN_SHAPE = 'relative h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition-colors';
const ACCENT_FILL = 'bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)';
const BTN = `inline-flex ${BTN_SHAPE}`;
const BTN_PRIMARY = `${BTN} ${ACCENT_FILL}`;
const BTN_SECONDARY = `${BTN} bg-white text-fg ring-1 ring-inset ring-line-strong hover:bg-alt`;

const SERVICE_ICONS: LucideIcon[] = [Ruler, Building2, Warehouse, PaintRoller, ClipboardCheck, Wrench, HardHat, Landmark, Factory];

function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
  if (!children) return null;
  return (
    <p className={`flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-(--tpl-accent-ink) ${center ? 'justify-center' : ''}`}>
      <span className="h-px w-6 bg-(--tpl-accent)" aria-hidden />
      {children}
    </p>
  );
}

function SectionHeader({ eyebrow, title, subtitle, center = false }: { eyebrow: string; title: string; subtitle?: string; center?: boolean }) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Eyebrow center={center}>{eyebrow}</Eyebrow>
      {title && <h2 className={`${eyebrow ? 'mt-3' : ''} ${H2}`}>{title}</h2>}
      {subtitle && <p className={`mt-4 ${LEAD}`}>{subtitle}</p>}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ m }: { m: CompanyProfileModel }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const desktopNav = m.contactAction ? m.nav.filter((item) => item.key !== 'contact') : m.nav;
  const close = () => setOpen(false);

  return (
    <header className="sticky top-[var(--tpl-sticky-top,0px)] z-30 border-b border-line/80 bg-white/90 backdrop-blur-md">
      <div className={`${WRAP} flex h-16 items-center justify-between gap-4 @5xl:h-[72px]`}>
        <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-lg" onNavigate={close}>
          <BrandMark name={m.companyName} logo={m.logo} nameClassName="text-[15px] text-fg @3xl:text-[17px]" />
        </ActionLink>

        {desktopNav.length > 0 && (
          <nav aria-label="Menu utama" className="hidden items-center gap-1 @4xl:flex">
            {desktopNav.map((item) => (
              <ActionLink
                key={item.key}
                action={{ kind: 'section', target: item.key }}
                className="rounded-lg px-3 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-alt hover:text-fg"
              >
                {item.label}
              </ActionLink>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {m.contactAction && (
            <ActionLink action={m.contactAction} className={`${BTN_SHAPE} ${ACCENT_FILL} hidden h-10 @xl:inline-flex`}>
              Hubungi Kami
            </ActionLink>
          )}
          {m.nav.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-fg ring-1 ring-inset ring-line transition-colors hover:bg-alt @4xl:hidden after:absolute after:-inset-1"
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white @4xl:hidden">
          <nav aria-label="Menu utama" className={`${WRAP} flex flex-col py-2`}>
            {m.nav.map((item) => (
              <ActionLink
                key={item.key}
                action={{ kind: 'section', target: item.key }}
                onNavigate={close}
                className="flex h-12 items-center justify-between border-b border-line/70 text-[15px] font-medium text-fg last:border-0"
              >
                {item.label}
                <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
              </ActionLink>
            ))}
            {m.contactAction && (
              <ActionLink action={m.contactAction} onNavigate={close} className={`${BTN_SHAPE} ${ACCENT_FILL} my-3 flex w-full @xl:hidden`}>
                Hubungi Kami
              </ActionLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function Hero({ m }: { m: CompanyProfileModel }) {
  const { hero, about, advantages } = m;
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const primary = resolveAction(text(hero, 'primary_url'), m.contactAction);
  const secondaryLabel = text(hero, 'secondary_label');
  const secondary = secondaryLabel ? resolveAction(text(hero, 'secondary_url'), m.servicesAction) : null;
  const stats = isEnabled(advantages) ? list(advantages, 'stats', 3) : [];
  const point = isEnabled(about) ? field(list(about, 'points', 1)[0], 'text') : '';
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');

  return (
    <TemplateSection sectionKey="hero" className="relative overflow-hidden bg-gradient-to-b from-(--tpl-accent-50) to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_60%)]"
        style={{ backgroundImage: 'radial-gradient(circle, var(--tpl-accent-200) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
      />
      <div className={`${WRAP} relative grid items-center gap-12 pb-14 pt-10 @3xl:pb-20 @3xl:pt-16 @5xl:grid-cols-[1.05fr_1fr] @5xl:gap-14 @5xl:pb-24 @5xl:pt-20`}>
        <div className="min-w-0">
          {eyebrow && (
            <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-(--tpl-accent-ink) ring-1 ring-inset ring-(--tpl-accent-200)">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" aria-hidden />
              <span className="truncate">{eyebrow}</span>
            </p>
          )}
          <h1 className="mt-5 text-[30px] font-semibold leading-[1.12] tracking-[-0.025em] text-fg [overflow-wrap:anywhere] @2xl:text-[40px] @5xl:text-[50px] @7xl:text-[56px]">
            {parts ? (
              <>
                {parts[0]}
                <span className="text-(--tpl-accent-ink)">{parts[1]}</span>
                {parts[2]}
              </>
            ) : (
              title
            )}
          </h1>
          {subtitle && <p className={`mt-5 max-w-xl ${LEAD}`}>{subtitle}</p>}

          {(primary || secondary) && (
            <div className="mt-8 flex flex-col gap-3 @md:flex-row">
              {primary && (
                <ActionLink action={primary} className={`${BTN_PRIMARY} h-12 px-6 text-[15px]`}>
                  {text(hero, 'primary_label') || 'Hubungi Kami'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </ActionLink>
              )}
              {secondary && (
                <ActionLink action={secondary} className={`${BTN_SECONDARY} h-12 px-6 text-[15px]`}>
                  {secondaryLabel}
                </ActionLink>
              )}
            </div>
          )}

          {stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
              {stats.map((stat, i) => (
                <div key={i} className="min-w-0">
                  <dt className="sr-only">{field(stat, 'label')}</dt>
                  <dd className="truncate text-[22px] font-semibold tabular-nums tracking-tight text-fg @3xl:text-[26px]">{field(stat, 'value')}</dd>
                  <dd className="mt-0.5 text-[12px] leading-snug text-muted @3xl:text-[13px]" aria-hidden>
                    {field(stat, 'label')}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative mr-3 mt-3 @5xl:mr-5 @5xl:mt-5">
          <div aria-hidden className="absolute -right-3 -top-3 h-full w-full rounded-[28px] bg-(--tpl-accent-100) @5xl:-right-5 @5xl:-top-5" />
          <Img
            src={text(hero, 'image')}
            alt={`Gambar ${m.companyName}`}
            art="city"
            eager
            className="relative aspect-[4/3] rounded-[28px] shadow-[0_24px_48px_-24px_rgba(18,22,32,0.35)] ring-1 ring-black/5"
          />
          {point && (
            <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_16px_40px_-16px_rgba(18,22,32,0.3)] ring-1 ring-line @xl:left-6 @xl:right-auto @xl:max-w-[320px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink)">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-[13px] font-semibold leading-snug text-fg">{point}</p>
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

function About({ m }: { m: CompanyProfileModel }) {
  const { about } = m;
  const body = paragraphs(text(about, 'body'));
  const points = list(about, 'points', 6).map((p) => field(p, 'text')).filter(Boolean);
  const badgeValue = text(about, 'badge_value');
  const title = text(about, 'title');
  if (!title && body.length === 0) return null;

  return (
    <TemplateSection sectionKey="about" className={SECTION_Y}>
      <div className={`${WRAP} grid items-center gap-12 @4xl:grid-cols-2 @5xl:gap-16`}>
        <div className="relative pb-6">
          <Img src={text(about, 'image')} alt={title || 'Tentang kami'} art="team" className="aspect-[4/3] rounded-[28px] ring-1 ring-black/5" />
          {badgeValue && (
            <div className="absolute bottom-0 right-4 rounded-2xl bg-(--tpl-accent) px-5 py-4 text-(--tpl-on-accent) shadow-[0_16px_40px_-16px_rgba(18,22,32,0.4)] @xl:right-6">
              <p className="text-[28px] font-semibold leading-none tabular-nums @3xl:text-[34px]">{badgeValue}</p>
              {text(about, 'badge_label') && <p className="mt-1.5 text-[12px] font-medium opacity-90">{text(about, 'badge_label')}</p>}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Eyebrow>{text(about, 'eyebrow')}</Eyebrow>
          {title && <h2 className={`mt-3 ${H2}`}>{title}</h2>}
          <div className="mt-5 space-y-4">
            {body.map((p, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-muted @3xl:text-[16px]">
                {p}
              </p>
            ))}
          </div>
          {points.length > 0 && (
            <ul className="mt-7 grid gap-3 @xl:grid-cols-2">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] font-medium text-fg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

function Services({ m }: { m: CompanyProfileModel }) {
  const { services } = m;
  const items = list(services, 'items', 9);
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="services" className={`bg-alt ${SECTION_Y}`}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(services, 'eyebrow')} title={text(services, 'title')} subtitle={text(services, 'subtitle')} />
        <ul className="mt-10 grid gap-4 @2xl:grid-cols-2 @5xl:mt-12 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => {
            const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
            const image = field(item, 'image');
            // Grid 2 kolom: item terakhir yang sendirian dibuat selebar baris
            const lonely = i === items.length - 1 && items.length % 2 === 1 && items.length > 1;
            return (
              <li
                key={i}
                className={`group relative flex flex-col rounded-[20px] bg-white p-6 ring-1 ring-inset ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(18,22,32,0.3)] hover:ring-(--tpl-accent-200) ${
                  lonely ? '@2xl:col-span-2 @5xl:col-span-1' : ''
                }`}
              >
                {image ? (
                  <Img src={image} alt={field(item, 'title')} art={ART_SEQUENCE[i % ART_SEQUENCE.length]} className="-mx-2 -mt-2 mb-5 aspect-[16/10] rounded-xl" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink) transition-colors group-hover:bg-(--tpl-accent) group-hover:text-(--tpl-on-accent)">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                )}
                <span className="absolute right-6 top-6 text-[12px] font-semibold tabular-nums text-subtle" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={`${image ? '' : 'mt-5'} text-[17px] font-semibold tracking-tight text-fg`}>{field(item, 'title') || `Layanan ${i + 1}`}</h3>
                {field(item, 'description') && <p className="mt-2 text-[14px] leading-relaxed text-muted">{field(item, 'description')}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

function Advantages({ m }: { m: CompanyProfileModel }) {
  const { advantages } = m;
  const stats = list(advantages, 'stats', 4);
  const items = list(advantages, 'items', 6);
  if (stats.length === 0 && items.length === 0) return null;
  const split = items.length > 0;

  return (
    <TemplateSection sectionKey="advantages" className={SECTION_Y}>
      <div className={`${WRAP} grid gap-10 ${split ? '@5xl:grid-cols-[0.95fr_1.05fr] @5xl:gap-16' : ''}`}>
        <div className="min-w-0">
          <SectionHeader eyebrow={text(advantages, 'eyebrow')} title={text(advantages, 'title')} subtitle={text(advantages, 'subtitle')} />
          {stats.length > 0 && (
            <dl
              className={`mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-line ring-1 ring-line ${split ? '' : '@3xl:grid-cols-4'}`}
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col-reverse bg-white p-5 @3xl:p-6">
                  <dt className="mt-1 text-[13px] text-muted">{field(stat, 'label')}</dt>
                  <dd className="truncate text-[28px] font-semibold tabular-nums tracking-tight text-(--tpl-accent-ink) @3xl:text-[36px]">
                    {field(stat, 'value') || '–'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {split && (
          <ol className="grid content-start gap-3 @2xl:grid-cols-2 @5xl:grid-cols-1">
            {items.map((item, i) => (
              <li key={i} className="flex gap-4 rounded-[20px] bg-white p-5 ring-1 ring-inset ring-line">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-[13px] font-semibold tabular-nums text-(--tpl-on-accent)">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold tracking-tight text-fg">{field(item, 'title') || `Keunggulan ${i + 1}`}</h3>
                  {field(item, 'description') && <p className="mt-1 text-[14px] leading-relaxed text-muted">{field(item, 'description')}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </TemplateSection>
  );
}

function Gallery({ m }: { m: CompanyProfileModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 12);
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="gallery" className={`bg-alt ${SECTION_Y}`}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} />
        <ul className="mt-10 grid grid-cols-2 gap-3 [grid-auto-flow:dense] @3xl:grid-cols-3 @3xl:gap-4">
          {items.map((item, i) => {
            const caption = field(item, 'caption');
            const featured = i === 0 && items.length > 2;
            // Grid 2 kolom (HP): item terakhir yang sendirian dibuat selebar baris
            const rest = items.length > 2 ? items.length - 1 : items.length;
            const lonely = !featured && i === items.length - 1 && rest % 2 === 1;
            return (
              <li key={i} className={featured ? 'col-span-2 @3xl:row-span-2' : lonely ? 'col-span-2 @3xl:col-span-1' : ''}>
                <figure className="group relative h-full overflow-hidden rounded-2xl">
                  <Img
                    src={field(item, 'image')}
                    alt={caption || `Foto ${i + 1}`}
                    art={ART_SEQUENCE[i % ART_SEQUENCE.length]}
                    className={`w-full ${featured ? 'aspect-[16/9] @3xl:aspect-auto @3xl:h-full' : lonely ? 'aspect-[16/9] @3xl:aspect-[4/3]' : 'aspect-[4/3]'}`}
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  {caption && (
                    <figcaption className="absolute bottom-2 left-2 right-2 @3xl:bottom-3 @3xl:left-3 @3xl:right-auto @3xl:max-w-[85%]">
                      <span className="inline-block rounded-lg bg-white/95 px-2.5 py-1.5 text-[12px] font-medium leading-snug text-fg shadow-sm backdrop-blur @3xl:px-3 @3xl:text-[13px]">
                        {caption}
                      </span>
                    </figcaption>
                  )}
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

function Testimonials({ m }: { m: CompanyProfileModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 9).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} center />
        <ul className="mt-10 grid gap-4 @3xl:grid-cols-2 @5xl:mt-12 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => (
            <li key={i}>
              <figure className="flex h-full flex-col rounded-[20px] bg-white p-6 ring-1 ring-inset ring-line">
                <Quote className="h-7 w-7 text-(--tpl-accent-300)" aria-hidden />
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-fg">“{field(item, 'quote')}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <Avatar name={field(item, 'name')} photo={field(item, 'photo')} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-fg">{field(item, 'name') || 'Klien kami'}</p>
                    {field(item, 'role') && <p className="text-[12px] leading-snug text-muted">{field(item, 'role')}</p>}
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}

function Cta({ m }: { m: CompanyProfileModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  if (!title) return null;
  const action = resolveAction(text(cta, 'button_url'), m.waAction ?? m.contactAction);
  return (
    <TemplateSection sectionKey="cta" className="py-10 @3xl:py-14 @5xl:py-16">
      <div className={WRAP}>
        <div className="relative overflow-hidden rounded-[28px] bg-(--tpl-accent) px-6 py-10 text-(--tpl-on-accent) @3xl:px-12 @3xl:py-14">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative grid items-center gap-6 @4xl:grid-cols-[1fr_auto] @4xl:gap-10">
            <div className="max-w-2xl">
              <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] @3xl:text-[34px]">{title}</h2>
              {text(cta, 'subtitle') && <p className="mt-3 text-[15px] leading-relaxed opacity-90 @3xl:text-[17px]">{text(cta, 'subtitle')}</p>}
            </div>
            {action && (
              <ActionLink action={action} className={`${BTN} h-12 bg-white px-6 text-[15px] text-(--tpl-accent-ink) shadow-sm hover:bg-white/90`}>
                {action.kind === 'external' && /wa\.me/.test(action.href) && <WhatsAppIcon className="h-4 w-4" />}
                {text(cta, 'button_label') || 'Hubungi Kami'}
              </ActionLink>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function ContactRow({ icon: Icon, label, value, action }: { icon: LucideIcon | typeof WhatsAppIcon; label: string; value: string; action?: LinkAction | null }) {
  return (
    <li className="flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-inset ring-line">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink)">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-subtle">{label}</p>
        {action ? (
          <ActionLink action={action} className="mt-0.5 block text-[15px] font-medium text-fg [overflow-wrap:anywhere] hover:text-(--tpl-accent-ink)">
            {value}
          </ActionLink>
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-[15px] font-medium text-fg [overflow-wrap:anywhere]">{value}</p>
        )}
      </div>
    </li>
  );
}

function Contact({ m }: { m: CompanyProfileModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const whatsapp = text(contact, 'whatsapp');
  const hours = text(contact, 'hours');
  const maps = mapsInfo(text(contact, 'maps_url'), address);
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    <TemplateSection sectionKey="contact" className={`bg-alt ${SECTION_Y}`}>
      <div className={`${WRAP} grid gap-10 @4xl:grid-cols-[0.95fr_1.05fr] @5xl:gap-14`}>
        <div className="min-w-0">
          <SectionHeader eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title') || 'Hubungi kami'} subtitle={text(contact, 'subtitle')} />
          <ul className="mt-8 space-y-3">
            {address && <ContactRow icon={MapPin} label="Alamat" value={address} action={maps.link ? { kind: 'external', href: maps.link } : null} />}
            {phone && <ContactRow icon={Phone} label="Telepon" value={phone} action={tel ? { kind: 'external', href: tel } : null} />}
            {email && <ContactRow icon={Mail} label="Email" value={email} action={mail ? { kind: 'external', href: mail } : null} />}
            {whatsapp && <ContactRow icon={WhatsAppIcon} label="WhatsApp" value={whatsapp} action={m.waAction} />}
            {hours && <ContactRow icon={Clock} label="Jam operasional" value={hours} />}
          </ul>
          {m.waAction && (
            <ActionLink action={m.waAction} className={`${BTN_PRIMARY} mt-6 h-12 w-full px-6 text-[15px] @xl:w-auto`}>
              <WhatsAppIcon className="h-4 w-4" />
              Chat via WhatsApp
            </ActionLink>
          )}
        </div>
        <div className="flex min-h-[280px] flex-col">
          <MapEmbed embed={maps.embed} title={`Peta lokasi ${m.companyName}`} className="min-h-[280px] flex-1 rounded-[24px] ring-1 ring-line @4xl:min-h-[420px]" />
          {maps.link && (
            <ActionLink action={{ kind: 'external', href: maps.link }} className="mt-3 inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-(--tpl-accent-ink) hover:underline">
              Buka di Google Maps
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ActionLink>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

function Footer({ m }: { m: CompanyProfileModel }) {
  const { footer, contact } = m;
  const socials = SOCIAL_FIELDS.map((s) => ({ ...s, href: safeUrl(text(footer, s.key)) })).filter((s) => s.href);
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;
  const contactLines = [text(contact, 'address'), text(contact, 'phone'), text(contact, 'email')].filter(Boolean);

  return (
    <footer className="border-t border-line bg-white">
      <div className={`${WRAP} grid gap-10 py-12 @3xl:grid-cols-[1.4fr_1fr_1fr] @3xl:py-16`}>
        <div className="min-w-0">
          <BrandMark name={m.companyName} logo={m.logo} nameClassName="text-[16px] text-fg" />
          {description && <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted">{description}</p>}
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map(({ key, label, Icon, href }) => (
                <li key={key}>
                  <ActionLink
                    action={{ kind: 'external', href: href! }}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-line transition-colors hover:bg-(--tpl-accent-50) hover:text-(--tpl-accent-ink)"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </ActionLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        {m.nav.length > 0 && (
          <nav aria-label="Navigasi footer">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-fg">Navigasi</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 @3xl:grid-cols-1">
              {m.nav.map((item) => (
                <li key={item.key}>
                  <ActionLink
                    action={{ kind: 'section', target: item.key }}
                    className="inline-flex min-h-9 items-center text-[14px] text-muted transition-colors hover:text-(--tpl-accent-ink)"
                  >
                    {item.label}
                  </ActionLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {contactLines.length > 0 && (
          <div className="min-w-0">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-fg">Kontak</h3>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-muted [overflow-wrap:anywhere]">
              {contactLines.map((line, i) => (
                <li key={i} className="whitespace-pre-line">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-line">
        <div className={`${WRAP} flex flex-col gap-1 py-5 text-[13px] text-subtle @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}

// ─── Template ────────────────────────────────────────────────────────────────

export default function CorporateNexa({ content, preview = false }: TemplateRenderProps) {
  const m = readCompanyProfile(content);
  return (
    <TemplateShell content={content} preview={preview} defaultAccent={CORPORATE_NEXA_ACCENT}>
      <Header m={m} />
      <main>
        {isEnabled(m.hero) && <Hero m={m} />}
        {isEnabled(m.about) && <About m={m} />}
        {isEnabled(m.services) && <Services m={m} />}
        {isEnabled(m.advantages) && <Advantages m={m} />}
        {isEnabled(m.gallery) && <Gallery m={m} />}
        {isEnabled(m.testimonials) && <Testimonials m={m} />}
        {isEnabled(m.cta) && <Cta m={m} />}
        {isEnabled(m.contact) && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </TemplateShell>
  );
}
