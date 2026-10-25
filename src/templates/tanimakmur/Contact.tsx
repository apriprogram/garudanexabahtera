// Kontak (kunci `contact`): kartu putih besar membulat — kiri label, H2, deskripsi, baris info berikon (alamat,
// telepon, email, jam buka, pengiriman) dan tombol WhatsApp; kanan peta Google Maps membulat. HP: peta di bawah.
import { ArrowRight, Clock, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, mapsInfo, telHref, text, type LinkAction } from '../shared/utils';
import type { TaniModel } from './model';
import { BTN, C, CARD, TYPE_T } from './styles';
import { SectionLabel } from './ui';

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F6F2E3] text-[#1E3A16]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] ${C.muted}`}>{label}</span>
        <span className="mt-0.5 block text-[16px] font-medium leading-snug text-[#18230F] [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="flex items-start gap-4 rounded-2xl py-1 transition-colors hover:text-[#1E3A16]">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: TaniModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title');
  const subtitle = text(contact, 'subtitle');
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const shipping = text(contact, 'shipping');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const map = mapsInfo(text(contact, 'maps_url'), address);
  const rows = [
    address && { key: 'address', icon: MapPin, label: 'Alamat kios', value: address, action: map.link ? ({ kind: 'external', href: map.link } as LinkAction) : null },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', icon: Clock, label: 'Jam buka', value: hours, action: null },
    shipping && { key: 'shipping', icon: Truck, label: 'Pengiriman', value: shipping, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false> => !!row);
  if (!title && rows.length === 0 && !m.waAction) return null;

  return (
    <TemplateSection sectionKey="contact" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <div className={`grid gap-10 p-6 @3xl:p-10 @5xl:grid-cols-12 @5xl:gap-12 @6xl:p-12 ${CARD.white} @3xl:rounded-[40px]`}>
          <div className="min-w-0 @5xl:col-span-5">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] ${TYPE_T.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            {rows.length > 0 && (
              <ul className="mt-9 space-y-4">
                {rows.map((row, i) => (
                  <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                    <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                  </Reveal>
                ))}
              </ul>
            )}
            {m.waAction && m.whatsapp && (
              <Reveal delay={240} className="mt-9">
                <ActionLink action={m.waAction} className={`${BTN.ink} ${BTN.lg} group max-w-full`}>
                  <WhatsAppIcon className="h-5 w-5 shrink-0" />
                  <span className="truncate">WhatsApp {m.whatsapp}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </ActionLink>
              </Reveal>
            )}
          </div>
          {map.embed && (
            <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
              <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[28px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[460px]" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
