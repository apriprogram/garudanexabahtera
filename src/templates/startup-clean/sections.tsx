// Section Startup Clean setelah Fitur: strip logo, Cerita, Dampak, Galeri, Testimoni, Ajakan, Kontak.
// Datar (garis tipis, tanpa bayangan), satu aksen, foto asli; slot foto kosong → tata letak menyesuaikan.
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  GraduationCap,
  HandHeart,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';
import { CountUp, Marquee, Reveal } from '../shared/Animated';
import { photoAlt } from '../shared/assets';
import { ClientLogo } from '../shared/clients';
import { ContactForm } from '../shared/ContactForm';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER, FONT_DISPLAY, MEASURE, SECTION_GAP, SECTION_Y, SECTION_Y_SM, SURFACE, TYPE } from '../shared/layout';
import { Avatar, MapEmbed } from '../shared/media';
import { clientItems, type CompanyProfileModel } from '../shared/model';
import { stagger } from '../shared/motion';
import { Photo } from '../shared/Photo';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, mailHref, mapsInfo, paragraphs, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import { BTN, H2, H3, ICON_TINT, PHOTO_HOVER, RAIL_BLEED, RAIL_BLEED_SM, STAT } from './styles';
import { Eyebrow, GlassStat, SectionHeader, Stars } from './ui';

// ─── Strip logo klien ─────────────────────────────────────────────────────────

export function Clients({ m }: { m: CompanyProfileModel }) {
  const items = clientItems(m.clients);
  if (items.length === 0) return null;
  const title = text(m.clients, 'title');
  const label = title || 'Klien kami';
  return (
    <TemplateSection sectionKey="clients" aria-label={label} className="pb-10 pt-2 @3xl:pb-12 @5xl:pb-14">
      <div className={CONTAINER}>
        {title && (
          <Reveal as="p" className="text-center text-[14px] font-medium text-muted">
            {title}
          </Reveal>
        )}
        <Reveal variant="fade" delay={120} className={title ? 'mt-7 @3xl:mt-9' : ''}>
          <Marquee label={label} duration={36} gap={64} staticClassName="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {items.map((item, i) => (
              <ClientLogo key={i} name={item.name} logo={item.logo} className="h-7 @3xl:h-8" />
            ))}
          </Marquee>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Cerita (about) ───────────────────────────────────────────────────────────

function Points({ points }: { points: string[] }) {
  if (points.length === 0) return null;
  return (
    <ul className="mt-8 grid gap-x-8 gap-y-3.5 border-t border-black/[0.08] pt-8 @xl:grid-cols-2">
      {points.map((point, i) => (
        <li key={i} className="flex gap-3 text-[15px] font-medium leading-snug text-fg">
          <CircleCheck className="mt-px h-5 w-5 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
          {point}
        </li>
      ))}
    </ul>
  );
}

export function Story({ m }: { m: CompanyProfileModel }) {
  const { about } = m;
  const body = paragraphs(text(about, 'body'));
  const points = list(about, 'points', 6)
    .map((p) => field(p, 'text'))
    .filter(Boolean);
  const title = text(about, 'title');
  const eyebrow = text(about, 'eyebrow');
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const image = text(about, 'image');
  if (!title && body.length === 0) return null;

  const heading = (
    <>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${H2}`}>{title}</h2>}
    </>
  );
  const copy = (
    <>
      {body.length > 0 && (
        <div className="space-y-4">
          {body.map((p, i) => (
            <p key={i} className={`whitespace-pre-line ${TYPE.body} text-muted @3xl:text-[17px]`}>
              {p}
            </p>
          ))}
        </div>
      )}
      <Points points={points} />
    </>
  );

  if (!hasImage(image)) {
    // Tanpa foto (mis. situs lama): judul kiri, isi kanan — tetap tersusun rapi tanpa bidang kosong
    return (
      <TemplateSection sectionKey="about" className={`bg-alt ${SECTION_Y}`}>
        <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
          <Reveal className="@5xl:col-span-5">
            {heading}
            {badgeValue && <GlassStat value={badgeValue} label={badgeLabel} icon={false} className="mt-8 inline-flex bg-white" />}
          </Reveal>
          <Reveal delay={120} className="@5xl:col-span-6 @5xl:col-start-7">
            {copy}
          </Reveal>
        </div>
      </TemplateSection>
    );
  }

  return (
    <TemplateSection sectionKey="about" className={`bg-alt ${SECTION_Y}`}>
      <div className={`${CONTAINER} grid items-center gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <Reveal variant="fade" className="@5xl:col-span-5 @5xl:col-start-8 @5xl:row-start-1">
          <Photo
            src={image}
            alt={photoAlt(image, title || m.companyName)}
            sizes="(min-width: 1024px) 42vw, 100vw"
            zoom
            position="58% 50%"
            className="aspect-[4/3] rounded-[28px] @3xl:aspect-[16/10] @5xl:aspect-[4/5] @5xl:rounded-[32px]"
          >
            {badgeValue && (
              <div className="absolute bottom-4 left-4 @3xl:bottom-6 @3xl:left-6">
                <GlassStat value={badgeValue} label={badgeLabel} icon={false} />
              </div>
            )}
          </Photo>
        </Reveal>
        <Reveal delay={120} className="min-w-0 @5xl:col-span-6 @5xl:col-start-1 @5xl:row-start-1">
          {heading}
          <div className="mt-6">{copy}</div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Dampak (advantages) ──────────────────────────────────────────────────────

const BENEFIT_ICONS: LucideIcon[] = [GraduationCap, Wallet, ShieldCheck, Users, Zap, HandHeart];

/** Kolom grid angka: 3 angka → 1 kolom di HP (angka besar tidak terpotong), 4 angka → 2×2 lalu 4 sebaris. */
const STAT_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 @xl:grid-cols-3',
  4: 'grid-cols-2 @4xl:grid-cols-4',
};

export function Impact({ m }: { m: CompanyProfileModel }) {
  const { advantages } = m;
  const stats = list(advantages, 'stats', 4);
  const items = list(advantages, 'items', 6);
  const eyebrow = text(advantages, 'eyebrow');
  const title = text(advantages, 'title');
  const subtitle = text(advantages, 'subtitle');
  if (stats.length === 0 && items.length === 0) return null;
  const hasHeader = !!(eyebrow || title || subtitle);

  return (
    <TemplateSection sectionKey="advantages" className={SECTION_Y}>
      <div className={CONTAINER}>
        {stats.length > 0 && (
          <Reveal
            as="dl"
            // Garis tepi & pemisah antar sel = celah 1px di atas latar garis; berapa pun jumlah angka
            className={`grid gap-px overflow-hidden rounded-[28px] bg-black/[0.07] p-px ${STAT_COLS[stats.length]}`}
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex min-w-0 flex-col-reverse bg-white px-5 py-7 @3xl:px-6 @3xl:py-10 @7xl:px-10">
                <dt className="mt-3 text-[14px] font-medium leading-snug text-muted @3xl:text-[15px]">{field(stat, 'label')}</dt>
                <dd className={`${STAT} [overflow-wrap:anywhere] text-(--tpl-accent-ink)`}>
                  <CountUp value={field(stat, 'value') || '–'} />
                </dd>
              </div>
            ))}
          </Reveal>
        )}

        {(hasHeader || items.length > 0) && (
          <div className={`grid gap-10 @5xl:grid-cols-12 @5xl:gap-12 ${stats.length > 0 ? 'mt-16 @3xl:mt-20 @5xl:mt-24' : ''}`}>
            {hasHeader && (
              <SectionHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                align="left"
                className={`@5xl:col-span-5 ${items.length > 0 ? '@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)] @5xl:self-start' : ''}`}
              />
            )}
            {items.length > 0 && (
              <ul className={`space-y-8 @3xl:space-y-10 ${hasHeader ? '@5xl:col-span-6 @5xl:col-start-7' : '@5xl:col-span-12'}`}>
                {items.map((item, i) => {
                  const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
                  return (
                    <Reveal as="li" key={i} delay={stagger(i)} className="group">
                      {/* Garis kiri: segmen aksen yang memanjang saat disorot */}
                      <div className="relative border-l-2 border-black/[0.08] pl-6 @3xl:pl-8">
                        <span
                          aria-hidden
                          className="absolute -left-[2px] top-0 h-10 w-[2px] bg-(--tpl-accent) transition-[height] duration-500 ease-out group-hover:h-full motion-reduce:transition-none"
                        />
                        <div className="flex items-center gap-3">
                          <span className={`${ICON_TINT} h-9 w-9`}>
                            <Icon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <h3 className={H3}>{field(item, 'title') || `Keunggulan ${i + 1}`}</h3>
                        </div>
                        {field(item, 'description') && (
                          <p className={`mt-3 max-w-[60ch] ${TYPE.body} text-muted`}>{field(item, 'description')}</p>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Galeri ───────────────────────────────────────────────────────────────────

const GRID_COLS: Record<number, string> = { 1: '@5xl:grid-cols-2', 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3', 4: '@5xl:grid-cols-4' };

export function Gallery({ m }: { m: CompanyProfileModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 12);
  const rowRef = useRef<HTMLUListElement>(null);
  if (items.length === 0) return null;
  // ≤ 4 foto: sejajar di desktop; lebih → rel gulir dengan tombol panah. HP selalu rel gulir.
  const rail = items.length > 4;

  const scroll = (dir: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.8), behavior: 'smooth' });
  };
  const arrow = 'flex h-11 w-11 items-center justify-center rounded-full bg-white text-fg ring-1 ring-inset ring-black/[0.08] transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-transparent';

  return (
    <TemplateSection sectionKey="gallery" className={`bg-alt ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <SectionHeader eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} align="left" />
          {items.length > 1 && (
            <div className={`hidden shrink-0 gap-2 @3xl:flex ${rail ? '' : '@5xl:hidden'}`}>
              <button type="button" onClick={() => scroll(-1)} aria-label="Foto sebelumnya" className={arrow}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" onClick={() => scroll(1)} aria-label="Foto berikutnya" className={arrow}>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
        {/* Reveal pada wadah rel (bukan per kartu): kartu di luar layar tidak tertahan tersembunyi */}
        <Reveal className={SECTION_GAP}>
          <ul
            ref={rowRef}
            className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 @3xl:gap-5 ${
              rail ? RAIL_BLEED : `${RAIL_BLEED_SM} @5xl:grid @5xl:overflow-visible @5xl:pb-0 ${GRID_COLS[items.length]}`
            }`}
          >
            {items.map((item, i) => {
              const caption = field(item, 'caption');
              const image = field(item, 'image');
              return (
                <li
                  key={i}
                  className={`w-[80%] shrink-0 snap-start @2xl:w-[46%] ${rail ? '@5xl:w-[calc((100%-60px)/4)]' : '@5xl:w-auto'}`}
                >
                  <figure className="group">
                    <Photo
                      src={image}
                      alt={photoAlt(image, caption || `Foto ${i + 1}`)}
                      sizes="(min-width: 1024px) 25vw, (min-width: 672px) 46vw, 80vw"
                      zoom
                      imgClassName={PHOTO_HOVER}
                      className="aspect-[4/5] rounded-[28px]"
                    />
                    {caption && <figcaption className="mt-4 px-1 text-[14px] leading-snug text-muted">{caption}</figcaption>}
                  </figure>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Testimoni ────────────────────────────────────────────────────────────────

export function Testimonials({ m }: { m: CompanyProfileModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 9).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  const cols = items.length >= 3 ? '@3xl:grid-cols-2 @5xl:grid-cols-3' : items.length === 2 ? '@3xl:grid-cols-2' : `${MEASURE} max-w-[640px]`;

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHeader eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} />
        <ul className={`${SECTION_GAP} grid gap-4 @5xl:gap-5 ${cols}`}>
          {items.map((item, i) => (
            <Reveal as="li" key={i} delay={stagger(i)} className="flex min-w-0">
              <figure className={`${SURFACE.card} flex w-full flex-col p-7 @5xl:p-8`}>
                <Stars />
                <blockquote className="mt-5 flex-1 text-[16px] leading-relaxed text-fg @7xl:text-[17px]">“{field(item, 'quote')}”</blockquote>
                <figcaption className="mt-8 flex items-center gap-3 border-t border-black/[0.06] pt-6">
                  <Avatar name={field(item, 'name')} photo={field(item, 'photo')} className="h-11 w-11" sizes="44px" />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-fg">{field(item, 'name') || 'Pelanggan kami'}</p>
                    {field(item, 'role') && <p className="text-[13px] leading-snug text-muted">{field(item, 'role')}</p>}
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}

// ─── Ajakan (CTA) ─────────────────────────────────────────────────────────────

const CTA_GRID = {
  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, #000 10%, transparent 75%)',
  WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, #000 10%, transparent 75%)',
};

export function Cta({ m }: { m: CompanyProfileModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  if (!title) return null;
  const action = resolveAction(text(cta, 'button_url'), m.waAction ?? m.contactAction);
  const subtitle = text(cta, 'subtitle');
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);

  return (
    <TemplateSection sectionKey="cta" className={SECTION_Y_SM}>
      <div className={CONTAINER}>
        <Reveal
          variant="scale"
          data-tpl-tone="inverse"
          className="relative isolate overflow-hidden rounded-[28px] bg-(--tpl-accent) px-6 py-14 text-center text-(--tpl-on-accent) @3xl:rounded-[32px] @3xl:px-12 @3xl:py-20 @5xl:py-24"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0" style={CTA_GRID} />
            <div className="absolute -left-28 -top-44 h-[420px] w-[420px] rounded-full bg-white/10" />
            <div className="absolute -bottom-52 -right-24 h-[460px] w-[460px] rounded-full bg-white/10" />
          </div>
          <div className={MEASURE}>
            <h2 className={`text-balance ${FONT_DISPLAY} ${TYPE.h2} font-bold`}>{title}</h2>
            {subtitle && <p className={`mx-auto mt-5 max-w-[56ch] ${TYPE.lead}`}>{subtitle}</p>}
            {action && (
              <ActionLink action={action} className={`${BTN} mt-9 w-full bg-white text-(--tpl-accent-ink) hover:bg-white/90 @md:w-auto`}>
                {isWa && <WhatsAppIcon className="h-4 w-4" />}
                {text(cta, 'button_label') || 'Hubungi Kami'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ActionLink>
            )}
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Kontak ───────────────────────────────────────────────────────────────────

function InfoCard({
  icon: Icon,
  label,
  value,
  action,
  wide = false,
}: {
  icon: LucideIcon | typeof WhatsAppIcon;
  label: string;
  value: string;
  action?: LinkAction | null;
  wide?: boolean;
}) {
  return (
    // Selebar baris hanya saat daftar 2 kolom (col-span-2 di grid 1 kolom membuat kolom implisit)
    <li className={`flex gap-3.5 rounded-[20px] bg-white p-4 ring-1 ring-inset ring-black/[0.06] @3xl:p-5 ${wide ? '@xl:col-span-2 @5xl:col-span-1 @7xl:col-span-2' : ''}`}>
      <span className={`${ICON_TINT} h-10 w-10`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-subtle">{label}</p>
        {action ? (
          <ActionLink action={action} className="-mb-1 block py-1 text-[15px] font-semibold text-fg [overflow-wrap:anywhere] hover:text-(--tpl-accent-ink)">
            {value}
          </ActionLink>
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-[15px] font-semibold text-fg [overflow-wrap:anywhere]">{value}</p>
        )}
      </div>
    </li>
  );
}

export function Contact({ m }: { m: CompanyProfileModel }) {
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
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title') || 'Hubungi kami';
  const subtitle = text(contact, 'subtitle');

  return (
    <TemplateSection sectionKey="contact" className={`bg-alt ${SECTION_Y}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16`}>
        <div className="flex min-w-0 flex-col @5xl:col-span-5">
          <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} align="left" />
          {hasInfo && (
            <Reveal as="ul" delay={80} className="mt-10 grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-1 @7xl:grid-cols-2">
              {whatsapp && <InfoCard icon={WhatsAppIcon} label="WhatsApp" value={whatsapp} action={m.waAction} />}
              {email && <InfoCard icon={Mail} label="Email" value={email} action={mail ? { kind: 'external', href: mail } : null} />}
              {phone && <InfoCard icon={Phone} label="Telepon" value={phone} action={tel ? { kind: 'external', href: tel } : null} />}
              {hours && <InfoCard icon={Clock} label="Jam operasional" value={hours} />}
              {address && (
                <InfoCard icon={MapPin} label="Alamat" value={address} action={maps.link ? { kind: 'external', href: maps.link } : null} wide />
              )}
            </Reveal>
          )}
          {address && (
            <MapEmbed
              embed={maps.embed}
              title={`Peta lokasi ${m.companyName}`}
              className="mt-3 aspect-[16/10] rounded-[24px] ring-1 ring-black/[0.06] @5xl:aspect-auto @5xl:min-h-[220px] @5xl:flex-1"
            />
          )}
        </div>
        <div className="min-w-0 @5xl:col-span-7">
          <Reveal delay={120} className={`${SURFACE.card} p-6 @3xl:p-10`}>
            <h3 className={`${FONT_DISPLAY} text-[20px] font-bold tracking-[-0.02em] text-fg @3xl:text-[24px]`}>Kirim pesan</h3>
            <p className="mt-2 text-[15px] text-muted">Isi formulir berikut, pesan Anda akan terkirim ke tim kami.</p>
            <ContactForm companyName={m.companyName} whatsapp={whatsapp} email={email} className="mt-7" />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}

