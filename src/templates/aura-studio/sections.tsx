// Section Aura Studio setelah perawatan unggulan: Tentang, Produk & mitra, Galeri, Testimoni, Tim, Ajakan, Kontak.
// Gaya: putih + abu netral, garis rambut, kartu abu radius 20 tanpa ring, foto potret radius 24–28.
import { Check, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { Marquee, Reveal } from '../shared/Animated';
import { ClientLogo } from '../shared/clients';
import { ContactForm } from '../shared/ContactForm';
import { CONTAINER, SECTION_Y, SECTION_Y_SM } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { clientItems } from '../shared/model';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, mailHref, mapsInfo, paragraphs, resolveAction, telHref, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { usePhotoSet } from '../kit/context';
import type { AuraModel } from './model';
import { BODY, CARD, DISPLAY, GLASS, H2, HAIR, INK, LABEL_TONE, MUTED } from './styles';
import { Label, SageButton, SectionHead } from './ui';

// ─── Tentang ──────────────────────────────────────────────────────────────────

export function About({ m }: { m: AuraModel }) {
  const photos = usePhotoSet();
  const { about } = m;
  const image = text(about, 'image');
  const body = paragraphs(text(about, 'body'));
  const points = list(about, 'points', 6)
    .map((p) => field(p, 'text'))
    .filter(Boolean);
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const withPhoto = hasImage(image);

  return (
    <TemplateSection sectionKey="about" className={`bg-[#F5F5F3] ${SECTION_Y}`}>
      <div className={`${CONTAINER} grid gap-10 @4xl:grid-cols-12 @4xl:items-center @4xl:gap-8`}>
        {withPhoto && (
          <Reveal variant="scale" className="@4xl:col-span-5">
            <KitPhoto
              src={image}
              alt={photos.alt(image, text(about, 'title') || m.companyName)}
              sizes="(min-width: 896px) 40vw, 100vw"
              zoom
              className="aspect-[4/5] w-full rounded-[28px] @2xl:aspect-[5/4] @4xl:aspect-[4/5]"
            >
              {badgeValue && (
                <span className={`absolute bottom-3 left-3 flex items-center gap-3 rounded-[20px] px-4 py-3 @3xl:bottom-4 @3xl:left-4 ${GLASS}`}>
                  <span className={`${DISPLAY} text-[32px] leading-none @3xl:text-[40px]`}>{badgeValue}</span>
                  {badgeLabel && <span className={`max-w-[16ch] text-[12px] leading-snug ${MUTED}`}>{badgeLabel}</span>}
                </span>
              )}
            </KitPhoto>
          </Reveal>
        )}
        <div className={withPhoto ? '@4xl:col-span-6 @4xl:col-start-7' : '@4xl:col-span-8'}>
          <SectionHead eyebrow={text(about, 'eyebrow')} title={text(about, 'title')} />
          {body.length > 0 && (
            <Reveal delay={120} className="mt-6 space-y-4">
              {body.map((p, i) => (
                <p key={i} className={BODY}>
                  {p}
                </p>
              ))}
            </Reveal>
          )}
          {!withPhoto && badgeValue && (
            <Reveal delay={160} className="mt-6 flex items-baseline gap-3">
              <span className={`${DISPLAY} text-[40px] leading-none`}>{badgeValue}</span>
              <span className={`text-[13px] ${MUTED}`}>{badgeLabel}</span>
            </Reveal>
          )}
          {points.length > 0 && (
            <ul className={`mt-8 grid border-t ${HAIR} @xl:grid-cols-2 @xl:gap-x-8`}>
              {points.map((point, i) => (
                <Reveal as="li" key={i} delay={stagger(i)} className={`flex items-center gap-3 border-b ${HAIR} py-3.5`}>
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className={`text-[14px] ${INK} @3xl:text-[15px]`}>{point}</span>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

// ─── Produk & mitra ───────────────────────────────────────────────────────────

export function Clients({ m }: { m: AuraModel }) {
  const items = clientItems(m.clients);
  if (!items.length) return null;
  const title = text(m.clients, 'title');
  return (
    <TemplateSection sectionKey="clients" className={SECTION_Y_SM}>
      <div className={`${CONTAINER}`}>
        <div className={`border-y ${HAIR} py-8`}>
          {title && <Label className="mb-6 text-center">{title}</Label>}
          <Marquee label={title || 'Produk & mitra'} gap={64}>
            {items.map((item, i) => (
              <ClientLogo key={i} name={item.name} logo={item.logo} className="h-7" />
            ))}
          </Marquee>
        </div>
      </div>
    </TemplateSection>
  );
}

// ─── Galeri ───────────────────────────────────────────────────────────────────

export function Gallery({ m }: { m: AuraModel }) {
  const photos = usePhotoSet();
  const { gallery } = m;
  const items = list(gallery, 'items', 9)
    .map((item) => ({ image: field(item, 'image'), caption: field(item, 'caption') }))
    .filter((item) => hasImage(item.image));
  if (!items.length) return null;

  return (
    <TemplateSection sectionKey="gallery" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} split />
        <Reveal className="mt-10 @3xl:mt-14">
          <ul className="aura-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 @2xl:scroll-px-8 gap-3 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:grid-cols-3 @3xl:gap-5 @3xl:overflow-visible @3xl:px-0 @3xl:pb-0 @5xl:gap-6">
            {items.map((item, i) => (
              <li key={i} className={`w-[78%] shrink-0 snap-start @3xl:w-auto ${i % 3 === 1 ? '@3xl:mt-14' : ''}`}>
                <figure>
                  <KitPhoto
                    src={item.image}
                    alt={photos.alt(item.image, item.caption || `Foto galeri ${i + 1}`)}
                    sizes="(min-width: 768px) 33vw, 78vw"
                    zoom
                    className="group aspect-[4/5] w-full rounded-[24px]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.03]"
                  />
                  {item.caption && (
                    <figcaption className="mt-3 flex gap-3 text-[14px] leading-snug">
                      <span className="tabular-nums text-[#6B6B6B]">{String(i + 1).padStart(2, '0')}</span>
                      <span className={INK}>{item.caption}</span>
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Testimoni ────────────────────────────────────────────────────────────────

export function Testimonials({ m }: { m: AuraModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6)
    .map((item) => ({ name: field(item, 'name'), role: field(item, 'role'), quote: field(item, 'quote'), photo: field(item, 'photo') }))
    .filter((item) => item.quote);
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  const index = Math.min(active, items.length - 1);
  const current = items[index];

  return (
    <TemplateSection sectionKey="testimonials" className={`bg-[#F5F5F3] ${SECTION_Y}`}>
      <div className={`${CONTAINER} text-center`}>
        <Reveal>
          <Label>{text(testimonials, 'eyebrow')}</Label>
          {text(testimonials, 'title') && <h2 className={`mx-auto mt-4 max-w-[22ch] text-balance ${H2}`}>{text(testimonials, 'title')}</h2>}
        </Reveal>
        <Reveal delay={120}>
          <figure key={index} className="aura-quote mx-auto mt-10 max-w-[900px] @3xl:mt-14">
            <blockquote>
              <p className={`font-[family-name:var(--tpl-font-display)] text-[22px] font-light leading-[1.35] ${INK} @3xl:text-[30px] @5xl:text-[34px]`}>
                “{current.quote}”
              </p>
            </blockquote>
            {(current.name || current.role) && (
              <figcaption className="mt-8">
                {current.name && <span className={`block text-[15px] font-medium ${INK}`}>{current.name}</span>}
                {current.role && <span className={`mt-1 block text-[13px] ${MUTED}`}>{current.role}</span>}
              </figcaption>
            )}
          </figure>
          {items.length > 1 && (
            <div role="group" aria-label="Pilih testimoni" className="mt-8 flex flex-wrap justify-center gap-3">
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === index}
                  aria-label={`Testimoni dari ${item.name || `pelanggan ${i + 1}`}`}
                  onClick={() => setActive(i)}
                  className={`rounded-full p-1 transition-[box-shadow,opacity] ${i === index ? 'ring-1 ring-[#1C1C1C]' : 'opacity-70 ring-1 ring-transparent hover:opacity-100'}`}
                >
                  <KitAvatar name={item.name} photo={item.photo} className="h-12 w-12 @3xl:h-14 @3xl:w-14" sizes="56px" />
                </button>
              ))}
            </div>
          )}
          {items.length === 1 && (current.photo || current.name) && (
            <div className="mt-6 flex justify-center">
              <KitAvatar name={current.name} photo={current.photo} className="h-14 w-14" sizes="56px" />
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Tim ──────────────────────────────────────────────────────────────────────

export function Team({ m }: { m: AuraModel }) {
  const photos = usePhotoSet();
  const { team } = m;
  const items = list(team, 'items', 6)
    .map((item) => ({ name: field(item, 'name'), role: field(item, 'role'), photo: field(item, 'photo') }))
    .filter((item) => item.name || hasImage(item.photo));
  if (!items.length) return null;
  const four = items.length % 4 === 0;

  return (
    <TemplateSection sectionKey="team" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(team, 'eyebrow')} title={text(team, 'title')} subtitle={text(team, 'subtitle')} split />
        <Reveal className="mt-10 @3xl:mt-14">
          <ul
            className={`aura-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 @2xl:scroll-px-8 gap-3 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:gap-5 @3xl:overflow-visible @3xl:px-0 @3xl:pb-0 ${four ? '@3xl:grid-cols-2 @5xl:grid-cols-4' : '@3xl:grid-cols-3'}`}
          >
            {items.map((item, i) => (
              <li key={i} className="w-[70%] shrink-0 snap-start @3xl:w-auto">
                <KitPhoto
                  src={item.photo}
                  alt={photos.alt(item.photo, item.name ? `Foto ${item.name}` : 'Foto anggota tim')}
                  sizes="(min-width: 768px) 33vw, 70vw"
                  zoom
                  position="50% 25%"
                  className="aspect-[4/5] w-full rounded-[24px]"
                />
                <div className={`mt-4 flex flex-col gap-1 border-t ${HAIR} pt-3 @6xl:flex-row @6xl:items-baseline @6xl:justify-between @6xl:gap-3`}>
                  <p className={`${DISPLAY} text-[20px] leading-tight @3xl:text-[22px]`}>{item.name}</p>
                  {item.role && <p className={`text-[13px] ${MUTED} @6xl:shrink-0 @6xl:text-right`}>{item.role}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Ajakan ───────────────────────────────────────────────────────────────────

export function Cta({ m }: { m: AuraModel }) {
  const photos = usePhotoSet();
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const label = text(cta, 'button_label');
  const action = label ? resolveAction(text(cta, 'button_url'), m.waAction ?? m.contactAction) : null;
  const image = text(cta, 'image');
  const withPhoto = hasImage(image);
  if (!title && !subtitle && !action) return null;

  return (
    <TemplateSection sectionKey="cta" className={SECTION_Y_SM}>
      <div className={CONTAINER}>
        <Reveal variant="scale" className="relative grid overflow-hidden rounded-[32px] bg-(--tpl-accent-100) @4xl:grid-cols-12">
          <svg viewBox="0 0 400 400" fill="none" aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px]">
            <circle cx="200" cy="200" r="198" stroke="#000" strokeOpacity={0.08} />
            <circle cx="200" cy="200" r="150" stroke="#000" strokeOpacity={0.08} />
            <circle cx="200" cy="200" r="102" stroke="#000" strokeOpacity={0.08} />
          </svg>
          <div className={`relative flex flex-col justify-center px-6 py-10 @3xl:px-12 @3xl:py-14 @5xl:px-16 @5xl:py-20 ${withPhoto ? '@4xl:col-span-7' : '@4xl:col-span-12 @4xl:items-center @4xl:text-center'}`}>
            {title && <h2 className={`max-w-[18ch] text-balance ${H2}`}>{title}</h2>}
            {subtitle && <p className={`mt-5 max-w-[46ch] text-[15px] leading-relaxed text-[#3F3F3F] @3xl:text-[16px]`}>{subtitle}</p>}
            {action && (
              <div className="mt-8">
                <SageButton action={action}>{label}</SageButton>
              </div>
            )}
          </div>
          {withPhoto && (
            <div className="relative p-3 pt-0 @4xl:col-span-5 @4xl:p-4 @4xl:pl-0">
              <KitPhoto
                src={image}
                alt={photos.alt(image, title || m.companyName)}
                sizes="(min-width: 896px) 40vw, 100vw"
                fallback="none"
                position="50% 18%"
                className="aspect-[4/3] w-full rounded-[24px] @4xl:aspect-auto @4xl:h-full @4xl:min-h-[420px]"
              />
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Kontak ───────────────────────────────────────────────────────────────────

export function Contact({ m }: { m: AuraModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const maps = mapsInfo(text(contact, 'maps_url'), address);
  const rows = [
    address && { key: 'address', label: 'Alamat', Icon: MapPin, value: address, href: maps.link },
    hours && { key: 'hours', label: 'Jam buka', Icon: Clock, value: hours, href: null },
    phone && tel && { key: 'phone', label: 'Telepon', Icon: Phone, value: phone, href: tel },
    email && mail && { key: 'email', label: 'Email', Icon: Mail, value: email, href: mail },
  ].filter(Boolean) as { key: string; label: string; Icon: typeof MapPin; value: string; href: string | null }[];

  return (
    <TemplateSection sectionKey="contact" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-10 @4xl:grid-cols-12 @4xl:gap-8`}>
        <div className="@4xl:col-span-5">
          <SectionHead eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <Reveal delay={120}>
              <dl className={`mt-8 border-t ${HAIR}`}>
                {rows.map(({ key, label, Icon, value, href }) => (
                  <div key={key} className={`grid grid-cols-[auto_1fr] items-start gap-4 border-b ${HAIR} py-4 @xl:grid-cols-[132px_1fr]`}>
                    <dt className={`flex items-center gap-2 pt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] ${LABEL_TONE}`}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      <span className="hidden @xl:inline">{label}</span>
                      <span className="sr-only @xl:hidden">{label}</span>
                    </dt>
                    <dd className={`text-[15px] leading-relaxed ${INK} [overflow-wrap:anywhere]`}>
                      {href ? (
                        <ActionLink action={{ kind: 'external', href }} className="underline decoration-black/20 underline-offset-4 hover:decoration-black">
                          {value}
                        </ActionLink>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
          {m.waAction && (
            <Reveal delay={200} className="mt-8">
              <SageButton action={m.waAction}>Reservasi lewat WhatsApp</SageButton>
            </Reveal>
          )}
        </div>

        <div className="grid gap-4 @4xl:col-span-7">
          {maps.embed && (
            <Reveal variant="fade">
              <MapEmbed embed={maps.embed} title={`Peta lokasi ${m.companyName}`} className="h-[260px] rounded-[24px] ring-1 ring-black/[0.06] @3xl:h-[320px]" />
            </Reveal>
          )}
          {/* Teks "subtle" form bersama (mis. "(opsional)") digelapkan sedikit: 4,3:1 → 5,2:1 di kartu abu #F0F0F0 */}
          <Reveal delay={120} className={`${CARD} p-5 [--site-subtle:#5E6470] @3xl:p-8`}>
            <p className={`${DISPLAY} text-[20px] @3xl:text-[24px]`}>Kirim pesan</p>
            <p className={`mt-1 text-[14px] ${MUTED}`}>Ceritakan perawatan yang Anda inginkan, kami balas secepatnya.</p>
            <ContactForm companyName={m.companyName} whatsapp={text(contact, 'whatsapp')} email={email} className="mt-6" />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
