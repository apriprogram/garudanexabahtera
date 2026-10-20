// Template "Startup Clean": company profile modern & lapang untuk startup, UMKM, dan bisnis digital.
// Tata letak memakai container query (@xl, @3xl, @5xl …) agar akurat di pratinjau CMS berukuran HP.
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Headphones,
  Layers,
  Mail,
  MapPin,
  Menu,
  Phone,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TemplateRenderProps } from '../types';
import { ContactForm } from '../shared/ContactForm';
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
import { STARTUP_CLEAN_ACCENT } from './defaultContent';

const WRAP = 'mx-auto w-full max-w-[1120px] px-5 @2xl:px-8';
const SECTION_Y = 'py-16 @3xl:py-24 @5xl:py-28';
const H2 = 'text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-fg @3xl:text-[40px] @5xl:text-[46px]';
const LEAD = 'text-[15px] leading-relaxed text-muted @3xl:text-[18px]';
// Tanpa kelas display agar bisa digabung dengan `hidden @xl:inline-flex` tanpa bentrok
const BTN_SHAPE = 'relative h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[15px] font-semibold transition-colors';
const ACCENT_FILL = 'bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)';
const BTN = `inline-flex ${BTN_SHAPE}`;
const BTN_PRIMARY = `${BTN} ${ACCENT_FILL}`;
const BTN_SECONDARY = `${BTN} bg-white text-fg ring-1 ring-inset ring-line-strong hover:bg-alt`;

const FEATURE_ICONS: LucideIcon[] = [Zap, Boxes, BarChart3, Layers, QrCode, Headphones, ShieldCheck, Rocket, Sparkles];

function Pill({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="inline-flex items-center rounded-full bg-(--tpl-accent-50) px-3 py-1 text-[12px] font-semibold text-(--tpl-accent-ink) ring-1 ring-inset ring-(--tpl-accent-100)">
      {children}
    </p>
  );
}

function SectionHeader({ eyebrow, title, subtitle, center = true }: { eyebrow: string; title: string; subtitle?: string; center?: boolean }) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Pill>{eyebrow}</Pill>
      {title && <h2 className={`${eyebrow ? 'mt-4' : ''} ${H2}`}>{title}</h2>}
      {subtitle && <p className={`mt-4 ${LEAD}`}>{subtitle}</p>}
    </div>
  );
}

// ─── Header (pill melayang) ─────────────────────────────────────────────────

function Header({ m }: { m: CompanyProfileModel }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const desktopNav = m.contactAction ? m.nav.filter((item) => item.key !== 'contact') : m.nav;

  return (
    <header className="sticky top-[calc(var(--tpl-sticky-top,0px)+12px)] z-30 px-3 pt-3 @2xl:px-6">
      <div className="mx-auto max-w-[1120px] rounded-[28px] bg-white/85 shadow-[0_10px_30px_-12px_rgba(18,22,32,0.18)] ring-1 ring-line backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-2 @3xl:h-16 @3xl:pl-5">
          <ActionLink action={{ kind: 'section', target: 'hero' }} className="min-w-0 rounded-lg" onNavigate={close}>
            <BrandMark name={m.companyName} logo={m.logo} nameClassName="text-[15px] font-bold text-fg @3xl:text-[17px]" />
          </ActionLink>

          {desktopNav.length > 0 && (
            <nav aria-label="Menu utama" className="hidden items-center gap-0.5 @4xl:flex">
              {desktopNav.map((item) => (
                <ActionLink
                  key={item.key}
                  action={{ kind: 'section', target: item.key }}
                  className="rounded-full px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-alt hover:text-fg"
                >
                  {item.label}
                </ActionLink>
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {m.contactAction && (
              <ActionLink action={m.contactAction} className={`${BTN_SHAPE} ${ACCENT_FILL} hidden h-10 px-5 text-[14px] @xl:inline-flex`}>
                Hubungi Kami
              </ActionLink>
            )}
            {m.nav.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-alt @4xl:hidden after:absolute after:-inset-1"
              >
                {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            )}
          </div>
        </div>

        {open && (
          <nav aria-label="Menu utama" className="flex flex-col border-t border-line px-3 pb-3 pt-2 @4xl:hidden">
            {m.nav.map((item) => (
              <ActionLink
                key={item.key}
                action={{ kind: 'section', target: item.key }}
                onNavigate={close}
                className="flex h-12 items-center justify-between rounded-2xl px-3 text-[15px] font-medium text-fg hover:bg-alt"
              >
                {item.label}
                <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
              </ActionLink>
            ))}
            {m.contactAction && (
              <ActionLink action={m.contactAction} onNavigate={close} className={`${BTN_SHAPE} ${ACCENT_FILL} mt-2 flex h-11 w-full @xl:hidden`}>
                Hubungi Kami
              </ActionLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function Hero({ m }: { m: CompanyProfileModel }) {
  const { hero } = m;
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const primary = resolveAction(text(hero, 'primary_url'), m.contactAction);
  const secondaryLabel = text(hero, 'secondary_label');
  const secondary = secondaryLabel ? resolveAction(text(hero, 'secondary_url'), m.servicesAction) : null;
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');

  return (
    <TemplateSection sectionKey="hero" className="relative isolate -mt-[68px] overflow-hidden pt-[68px] @3xl:-mt-[76px] @3xl:pt-[76px]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full bg-(--tpl-accent-100) opacity-70 blur-3xl" />
        <div className="absolute -right-24 top-10 h-[360px] w-[360px] rounded-full bg-(--tpl-accent-50) blur-3xl" />
        <div
          className="absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
          style={{ backgroundImage: 'linear-gradient(var(--tpl-accent-50) 1px, transparent 1px), linear-gradient(90deg, var(--tpl-accent-50) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
        />
      </div>

      <div className={`${WRAP} pb-16 pt-14 text-center @3xl:pb-24 @3xl:pt-20 @5xl:pt-24`}>
        {eyebrow && (
          <p className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-(--tpl-accent-ink) shadow-sm ring-1 ring-inset ring-(--tpl-accent-100) @3xl:text-[13px]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{eyebrow}</span>
          </p>
        )}
        <h1 className="mx-auto mt-6 max-w-4xl text-[34px] font-bold leading-[1.06] tracking-[-0.035em] text-fg [overflow-wrap:anywhere] @2xl:text-[48px] @5xl:text-[64px]">
          {parts ? (
            <>
              {parts[0]}
              {/* Garis bawah per baris (tetap rapi saat sorotan terpotong ke dua baris) */}
              <span className="bg-[linear-gradient(var(--tpl-accent-200),var(--tpl-accent-200))] bg-[length:100%_0.14em] bg-[position:0_96%] bg-no-repeat text-(--tpl-accent-ink) [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                {parts[1]}
              </span>
              {parts[2]}
            </>
          ) : (
            title
          )}
        </h1>
        {subtitle && <p className={`mx-auto mt-6 max-w-2xl ${LEAD}`}>{subtitle}</p>}

        {(primary || secondary) && (
          <div className="mx-auto mt-9 flex max-w-sm flex-col justify-center gap-3 @md:max-w-none @md:flex-row">
            {primary && (
              <ActionLink action={primary} className={BTN_PRIMARY}>
                {text(hero, 'primary_label') || 'Hubungi Kami'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ActionLink>
            )}
            {secondary && (
              <ActionLink action={secondary} className={BTN_SECONDARY}>
                {secondaryLabel}
              </ActionLink>
            )}
          </div>
        )}

        <div className="relative mx-auto mt-12 max-w-5xl @3xl:mt-16">
          <div className="rounded-[24px] bg-white/70 p-1.5 shadow-[0_30px_60px_-30px_rgba(18,22,32,0.35)] ring-1 ring-line backdrop-blur @3xl:rounded-[32px] @3xl:p-2.5">
            <div className="flex items-center gap-1.5 px-3 pb-2 pt-1.5 @3xl:pb-2.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            </div>
            <Img src={text(hero, 'image')} alt={`Gambar ${m.companyName}`} art="product" eager className="aspect-[16/10] rounded-[18px] @3xl:aspect-[16/9] @3xl:rounded-[24px]" />
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function About({ m }: { m: CompanyProfileModel }) {
  const { about } = m;
  const body = paragraphs(text(about, 'body'));
  const points = list(about, 'points', 6).map((p) => field(p, 'text')).filter(Boolean);
  const title = text(about, 'title');
  const badgeValue = text(about, 'badge_value');
  if (!title && body.length === 0) return null;

  return (
    <TemplateSection sectionKey="about" className={SECTION_Y}>
      <div className={`${WRAP} grid items-center gap-12 @4xl:grid-cols-[1.05fr_0.95fr] @5xl:gap-20`}>
        <div className="min-w-0">
          <Pill>{text(about, 'eyebrow')}</Pill>
          {title && <h2 className={`mt-4 ${H2}`}>{title}</h2>}
          <div className="mt-5 space-y-4">
            {body.map((p, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-muted @3xl:text-[17px]">
                {p}
              </p>
            ))}
          </div>
          {points.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {points.map((point, i) => (
                <li key={i} className="inline-flex items-center gap-2 rounded-full bg-alt px-3.5 py-2 text-[13px] font-medium text-fg ring-1 ring-inset ring-line">
                  <CircleCheck className="h-4 w-4 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative">
          <Img src={text(about, 'image')} alt={title || 'Tentang kami'} art="team" className="aspect-[4/5] max-h-[560px] w-full rounded-[32px] @4xl:aspect-[4/5]" />
          {badgeValue && (
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_40px_-16px_rgba(18,22,32,0.3)] ring-1 ring-line @xl:left-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--tpl-accent) text-(--tpl-on-accent)">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[20px] font-bold leading-none tabular-nums text-fg">{badgeValue}</p>
                {text(about, 'badge_label') && <p className="mt-1 text-[12px] text-muted">{text(about, 'badge_label')}</p>}
              </div>
            </div>
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
  // Kartu unggulan selebar baris hanya bila sisanya pas mengisi grid 3 kolom (4, 7, 10 item)
  const featured = items.length >= 4 && (items.length - 1) % 3 === 0;
  const rest = featured ? items.length - 1 : items.length;

  return (
    <TemplateSection sectionKey="services" className={`bg-alt ${SECTION_Y}`}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(services, 'eyebrow')} title={text(services, 'title')} subtitle={text(services, 'subtitle')} />
        <ul className="mt-12 grid gap-4 @2xl:grid-cols-2 @5xl:mt-14 @5xl:grid-cols-3">
          {items.map((item, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            const image = field(item, 'image');
            const big = featured && i === 0;
            // Grid 2 kolom: item terakhir yang sendirian dibuat selebar baris
            const lonely = i === items.length - 1 && rest % 2 === 1 && rest > 1;
            return (
              <li
                key={i}
                className={`group relative flex flex-col overflow-hidden rounded-[24px] p-6 transition-shadow duration-300 hover:shadow-[0_20px_40px_-24px_rgba(18,22,32,0.3)] @3xl:p-7 ${
                  big ? 'bg-(--tpl-accent-50) ring-1 ring-inset ring-(--tpl-accent-100) @2xl:col-span-2 @5xl:col-span-3' : 'bg-white ring-1 ring-inset ring-line'
                } ${lonely ? '@2xl:col-span-2 @5xl:col-span-1' : ''}`}
              >
                <div className={big ? 'grid gap-6 @4xl:grid-cols-[1fr_1.1fr] @4xl:items-center' : ''}>
                  <div className="min-w-0">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        big ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)'
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className={`mt-5 font-bold tracking-tight text-fg ${big ? 'text-[20px] @3xl:text-[24px]' : 'text-[17px]'}`}>
                      {field(item, 'title') || `Layanan ${i + 1}`}
                    </h3>
                    {field(item, 'description') && (
                      <p className={`mt-2 leading-relaxed text-muted ${big ? 'text-[15px] @3xl:text-[16px]' : 'text-[14px]'}`}>{field(item, 'description')}</p>
                    )}
                  </div>
                  {(big || image) && (
                    <Img
                      src={image}
                      alt={field(item, 'title')}
                      art={big ? 'product' : ART_SEQUENCE[i % ART_SEQUENCE.length]}
                      className={`${big ? 'aspect-[16/10]' : 'mt-5 aspect-[16/10]'} rounded-2xl ring-1 ring-black/5`}
                    />
                  )}
                </div>
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

  return (
    <TemplateSection sectionKey="advantages" className={SECTION_Y}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(advantages, 'eyebrow')} title={text(advantages, 'title')} subtitle={text(advantages, 'subtitle')} />
        {stats.length > 0 && (
          <dl
            className={`mt-12 grid grid-cols-2 gap-y-8 rounded-[28px] bg-(--tpl-accent-50) px-4 py-8 ring-1 ring-inset ring-(--tpl-accent-100) @3xl:px-8 @3xl:py-10 ${
              stats.length >= 4 ? '@3xl:grid-cols-4' : stats.length === 3 ? '@3xl:grid-cols-3' : ''
            }`}
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex min-w-0 flex-col-reverse items-center px-2 text-center @3xl:border-l @3xl:border-(--tpl-accent-200) @3xl:first:border-l-0">
                <dt className="mt-1 text-[13px] font-medium text-muted @3xl:text-[14px]">{field(stat, 'label')}</dt>
                <dd className="max-w-full truncate text-[30px] font-bold tabular-nums tracking-[-0.03em] text-(--tpl-accent-ink) @3xl:text-[44px]">
                  {field(stat, 'value') || '–'}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {items.length > 0 && (
          <ul className="mt-10 grid gap-x-10 gap-y-6 @2xl:grid-cols-2 @5xl:mt-14">
            {items.map((item, i) => (
              <li key={i} className="flex gap-4">
                <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold tracking-tight text-fg">{field(item, 'title') || `Keunggulan ${i + 1}`}</h3>
                  {field(item, 'description') && <p className="mt-1 text-[14px] leading-relaxed text-muted @3xl:text-[15px]">{field(item, 'description')}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

function Gallery({ m }: { m: CompanyProfileModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 12);
  const rowRef = useRef<HTMLUListElement>(null);
  if (items.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <TemplateSection sectionKey="gallery" className={`bg-alt ${SECTION_Y}`}>
      <div className={WRAP}>
        <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <SectionHeader eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} center={false} />
          {items.length > 1 && (
            <div className="hidden shrink-0 gap-2 @3xl:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Foto sebelumnya"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-fg ring-1 ring-inset ring-line transition-colors hover:bg-(--tpl-accent-50) hover:text-(--tpl-accent-ink)"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Foto berikutnya"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-fg ring-1 ring-inset ring-line transition-colors hover:bg-(--tpl-accent-50) hover:text-(--tpl-accent-ink)"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Geser ke samping di dalam baris (bukan halaman) */}
      <div className={`${WRAP} mt-10`}>
        <ul ref={rowRef} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8">
          {items.map((item, i) => {
            const caption = field(item, 'caption');
            return (
              <li key={i} className="w-[78%] shrink-0 snap-start @2xl:w-[46%] @5xl:w-[31.5%]">
                <figure>
                  <Img
                    src={field(item, 'image')}
                    alt={caption || `Foto ${i + 1}`}
                    art={ART_SEQUENCE[i % ART_SEQUENCE.length]}
                    className="aspect-[4/3] rounded-[24px] ring-1 ring-black/5"
                  />
                  {caption && <figcaption className="mt-3 px-1 text-[14px] font-medium text-fg">{caption}</figcaption>}
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
        <SectionHeader eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} />
        <ul className="mt-12 columns-1 gap-4 @3xl:columns-2 @5xl:mt-14 @5xl:columns-3">
          {items.map((item, i) => (
            <li key={i} className="mb-4 break-inside-avoid">
              <figure className={`rounded-[24px] p-6 @3xl:p-7 ${i === 0 ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white ring-1 ring-inset ring-line'}`}>
                <blockquote className={`text-[15px] leading-relaxed @3xl:text-[16px] ${i === 0 ? '' : 'text-fg'}`}>“{field(item, 'quote')}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Avatar name={field(item, 'name')} photo={field(item, 'photo')} />
                  <div className="min-w-0">
                    <p className={`truncate text-[14px] font-bold ${i === 0 ? '' : 'text-fg'}`}>{field(item, 'name') || 'Pelanggan kami'}</p>
                    {field(item, 'role') && <p className={`text-[12px] leading-snug ${i === 0 ? 'opacity-85' : 'text-muted'}`}>{field(item, 'role')}</p>}
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
    <TemplateSection sectionKey="cta" className="py-10 @3xl:py-14">
      <div className={WRAP}>
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-(--tpl-accent) to-(--tpl-accent-hover) px-6 py-12 text-center text-(--tpl-on-accent) @3xl:px-12 @3xl:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[28px] font-bold leading-tight tracking-[-0.03em] @3xl:text-[40px]">{title}</h2>
            {text(cta, 'subtitle') && <p className="mt-4 text-[15px] leading-relaxed opacity-90 @3xl:text-[18px]">{text(cta, 'subtitle')}</p>}
            {action && (
              <ActionLink action={action} className={`${BTN} mt-8 bg-white text-(--tpl-accent-ink) shadow-sm hover:bg-white/90`}>
                {action.kind === 'external' && /wa\.me/.test(action.href) && <WhatsAppIcon className="h-4 w-4" />}
                {text(cta, 'button_label') || 'Hubungi Kami'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ActionLink>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function InfoCard({ icon: Icon, label, value, action, wide = false }: { icon: LucideIcon | typeof WhatsAppIcon; label: string; value: string; action?: LinkAction | null; wide?: boolean }) {
  return (
    <li className={`rounded-[20px] bg-white p-4 ring-1 ring-inset ring-line ${wide ? '@xl:col-span-2' : ''}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink)">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="mt-3 text-[12px] font-medium text-subtle">{label}</p>
      {action ? (
        <ActionLink action={action} className="mt-0.5 block text-[14px] font-semibold text-fg [overflow-wrap:anywhere] hover:text-(--tpl-accent-ink)">
          {value}
        </ActionLink>
      ) : (
        <p className="mt-0.5 whitespace-pre-line text-[14px] font-semibold text-fg [overflow-wrap:anywhere]">{value}</p>
      )}
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
  const hasInfo = !!(address || phone || email || whatsapp || hours);

  return (
    <TemplateSection sectionKey="contact" className={`bg-alt ${SECTION_Y}`}>
      <div className={WRAP}>
        <SectionHeader eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title') || 'Hubungi kami'} subtitle={text(contact, 'subtitle')} />
        <div className={`mt-12 grid gap-6 ${hasInfo ? '@4xl:grid-cols-[0.9fr_1.1fr]' : 'mx-auto max-w-2xl'}`}>
          {hasInfo && (
            <div className="flex min-w-0 flex-col gap-4">
              <ul className="grid gap-3 @xl:grid-cols-2">
                {whatsapp && <InfoCard icon={WhatsAppIcon} label="WhatsApp" value={whatsapp} action={m.waAction} />}
                {email && <InfoCard icon={Mail} label="Email" value={email} action={mail ? { kind: 'external', href: mail } : null} />}
                {phone && <InfoCard icon={Phone} label="Telepon" value={phone} action={tel ? { kind: 'external', href: tel } : null} />}
                {hours && <InfoCard icon={Clock} label="Jam operasional" value={hours} />}
                {address && <InfoCard icon={MapPin} label="Alamat" value={address} action={maps.link ? { kind: 'external', href: maps.link } : null} wide />}
              </ul>
              {address && <MapEmbed embed={maps.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[16/10] rounded-[20px] ring-1 ring-line @4xl:aspect-auto @4xl:min-h-[220px] @4xl:flex-1" />}
            </div>
          )}
          <div className="rounded-[28px] bg-white p-5 shadow-[0_20px_50px_-30px_rgba(18,22,32,0.3)] ring-1 ring-line @3xl:p-8">
            <h3 className="text-[19px] font-bold tracking-tight text-fg @3xl:text-[22px]">Kirim pesan</h3>
            <p className="mt-1.5 text-[14px] text-muted">Isi formulir berikut, pesan Anda akan terkirim ke tim kami.</p>
            <ContactForm companyName={m.companyName} whatsapp={whatsapp} email={email} className="mt-6" />
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function Footer({ m }: { m: CompanyProfileModel }) {
  const { footer } = m;
  const socials = SOCIAL_FIELDS.map((s) => ({ ...s, href: safeUrl(text(footer, s.key)) })).filter((s) => s.href);
  const description = text(footer, 'description') || m.tagline;
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}. Semua hak dilindungi.`;

  return (
    <footer className="bg-white">
      <div className={`${WRAP} py-12 @3xl:py-16`}>
        <div className="flex flex-col gap-8 @4xl:flex-row @4xl:items-start @4xl:justify-between">
          <div className="max-w-sm">
            <BrandMark name={m.companyName} logo={m.logo} nameClassName="text-[16px] font-bold text-fg" />
            {description && <p className="mt-4 text-[14px] leading-relaxed text-muted">{description}</p>}
          </div>
          {m.nav.length > 0 && (
            <nav aria-label="Navigasi footer">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink
                      action={{ kind: 'section', target: item.key }}
                      className="inline-flex min-h-10 items-center text-[14px] font-medium text-muted transition-colors hover:text-(--tpl-accent-ink)"
                    >
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        <div className="mt-10 flex flex-col-reverse gap-5 border-t border-line pt-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p className="text-[13px] text-subtle">{copyright}</p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {socials.map(({ key, label, Icon, href }) => (
                <li key={key}>
                  <ActionLink
                    action={{ kind: 'external', href: href! }}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-alt text-muted transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </ActionLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Template ────────────────────────────────────────────────────────────────

export default function StartupClean({ content, preview = false }: TemplateRenderProps) {
  const m = readCompanyProfile(content);
  return (
    <TemplateShell content={content} preview={preview} defaultAccent={STARTUP_CLEAN_ACCENT}>
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
