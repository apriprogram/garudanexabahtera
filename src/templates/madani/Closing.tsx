// Ajakan + lokasi & kontak. Ajakan (kunci `cta`): pita warna tema tua membulat dengan ornamen bintang segi delapan
// samar, judul terpusat, tombol warna sorotan (Daftar PPDB) + tombol kaca (tanya panitia lewat WhatsApp).
// Lokasi & kontak (kunci `contact`): kiri baris info berikon (alamat, telepon, email, WhatsApp, jam layanan) dan media
// sosial; kanan peta Google Maps (iframe lazy dengan title, dibuat dari kata kunci peta/alamat) + tombol
// "Buka di Google Maps".
import { Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { mailHref, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import { mapFor, type MadaniModel } from './model';
import { BTN, C, INSET, PANEL_RADIUS, SECTION_PAD, TYPE_M } from './styles';
import { ArrowLink, Eyebrow } from './ui';

export function Cta({ m }: { m: MadaniModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const label = text(cta, 'button_label');
  const secondaryLabel = text(cta, 'secondary_label');
  const action = resolveAction(text(cta, 'button_url'), m.ppdbAction);
  const secondary = resolveAction(text(cta, 'secondary_url'), m.ppdbAskAction);
  if (!title && !subtitle && !(action && label)) return null;

  return (
    <TemplateSection sectionKey="cta" className="py-2">
      <Reveal variant="fade" data-tpl-tone="inverse" className={`${INSET} ${PANEL_RADIUS} relative isolate overflow-hidden bg-(--md-deep) text-white`}>
        <div aria-hidden className="md-pattern pointer-events-none absolute inset-0 -z-10 opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,transparent_35%,#000_95%)]" />
        <div className={`${CONTAINER} py-16 text-center @3xl:py-24`}>
          {title && <h2 className={`mx-auto max-w-[20ch] text-balance text-white ${TYPE_M.h2}`}>{title}</h2>}
          {subtitle && <p className={`mx-auto mt-5 max-w-[52ch] text-white/85 ${TYPE_M.lead}`}>{subtitle}</p>}
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 @md:flex-row @md:items-center">
            <ArrowLink action={action} label={label} variant="hl" className="justify-between @md:justify-center" />
            <ArrowLink action={secondary} label={secondaryLabel} variant="glass" className="justify-between @md:justify-center" />
          </div>
        </div>
      </Reveal>
    </TemplateSection>
  );
}

type IconType = typeof Mail;

function InfoRow({ icon: Icon, label, value, action }: { icon: IconType | typeof WhatsAppIcon; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--md-tint) text-(--md-ink)">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] ${C.muted}`}>{label}</span>
        <span className="mt-0.5 block text-[15.5px] font-semibold leading-snug text-(--md-deep) [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="flex items-start gap-4 rounded-2xl py-1 transition-colors hover:text-(--md-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: MadaniModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title');
  const subtitle = text(contact, 'subtitle');
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const map = mapFor(contact);
  const ext = (href: string | null): LinkAction | null => (href ? { kind: 'external', href } : null);
  const rows = [
    address && { key: 'address', icon: MapPin, label: 'Alamat', value: address, action: ext(map.link) },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: ext(tel) },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: ext(mail) },
    m.whatsapp && m.waAction && { key: 'whatsapp', icon: WhatsAppIcon, label: 'WhatsApp', value: m.whatsapp, action: m.waAction },
    hours && { key: 'hours', icon: Clock, label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false | null | undefined> => !!row);
  const socials = SOCIAL_FIELDS.flatMap((s) => {
    const link = m.socials.find((item) => item.key === s.key);
    return link ? [{ ...s, href: link.href }] : [];
  });
  if (!title && rows.length === 0 && !map.embed) return null;

  return (
    <TemplateSection sectionKey="contact" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[16ch] text-balance text-(--md-deep) ${TYPE_M.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={120} className={`mt-4 max-w-[46ch] ${TYPE_M.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {rows.length > 0 && (
            <ul className="mt-8 space-y-3">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 50)}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </Reveal>
              ))}
            </ul>
          )}
          {socials.length > 0 && (
            <div className="mt-8">
              <p className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>Media sosial</p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Media sosial sekolah">
                {socials.map(({ key, label, Icon, href }) => (
                  <li key={key}>
                    <ActionLink
                      action={{ kind: 'external', href }}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-[#F6F4EC] px-4 text-[14px] font-semibold text-(--md-deep) transition-colors hover:bg-(--md-tint-2)"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {map.embed && (
          <Reveal delay={120} className="flex min-w-0 flex-col gap-3 @5xl:col-span-7">
            <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[28px] @5xl:aspect-auto @5xl:min-h-[460px] @5xl:flex-1" />
            {map.link && (
              <ActionLink action={{ kind: 'external', href: map.link }} className={`${BTN.ghost} ${BTN.md} self-start px-5`}>
                <Navigation className="h-4 w-4" aria-hidden />
                Buka di Google Maps
              </ActionLink>
            )}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
