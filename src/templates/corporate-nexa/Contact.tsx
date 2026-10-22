// Kontak Corporate Nexa: baris kontak tanpa kotak (dipisah garis tipis) + peta besar bergaris tipis.
import { ArrowUpRight, Clock, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import type { CompanyProfileModel } from '../shared/model';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, mapsInfo, telHref, text, type LinkAction } from '../shared/utils';
import { BTN_PRIMARY, LINE } from './styles';
import { SectionHeader } from './ui';

interface Row {
  icon: LucideIcon | typeof WhatsAppIcon;
  label: string;
  value: string;
  action?: LinkAction | null;
}

function ContactRow({ row, index }: { row: Row; index: number }) {
  const { icon: Icon, label, value, action } = row;
  return (
    <Reveal as="li" delay={stagger(index)} className={`flex items-start gap-4 border-b py-5 ${LINE}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--tpl-accent-50) text-(--tpl-accent-ink) ring-1 ring-inset ring-(--tpl-accent-100)">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] font-medium text-subtle">{label}</p>
        {action ? (
          <ActionLink action={action} className="mt-1 block text-[16px] font-medium text-fg [overflow-wrap:anywhere] hover:text-(--tpl-accent-ink)">
            {value}
          </ActionLink>
        ) : (
          <p className="mt-1 whitespace-pre-line text-[16px] font-medium text-fg [overflow-wrap:anywhere]">{value}</p>
        )}
      </div>
    </Reveal>
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

  const rows: Row[] = [];
  if (address) rows.push({ icon: MapPin, label: 'Alamat', value: address, action: maps.link ? { kind: 'external', href: maps.link } : null });
  if (phone) rows.push({ icon: Phone, label: 'Telepon', value: phone, action: tel ? { kind: 'external', href: tel } : null });
  if (email) rows.push({ icon: Mail, label: 'Email', value: email, action: mail ? { kind: 'external', href: mail } : null });
  if (whatsapp) rows.push({ icon: WhatsAppIcon, label: 'WhatsApp', value: whatsapp, action: m.waAction });
  if (hours) rows.push({ icon: Clock, label: 'Jam operasional', value: hours });

  return (
    <TemplateSection sectionKey="contact" className={`bg-alt ${SECTION_Y}`}>
      <div className={`${CONTAINER} grid gap-12 @4xl:grid-cols-12 @4xl:gap-10 @6xl:gap-16`}>
        <div className="min-w-0 @4xl:col-span-5">
          <SectionHeader eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title') || 'Hubungi kami'} lead={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <ul className={`mt-10 border-t ${LINE}`}>
              {rows.map((row, i) => (
                <ContactRow key={row.label} row={row} index={i} />
              ))}
            </ul>
          )}
          {m.waAction && (
            <Reveal delay={160} className="mt-8">
              <ActionLink action={m.waAction} className={`${BTN_PRIMARY} w-full @xl:w-auto`}>
                <WhatsAppIcon className="h-4 w-4" />
                Chat via WhatsApp
              </ActionLink>
            </Reveal>
          )}
        </div>
        <Reveal variant="fade" delay={120} className="flex min-h-[320px] min-w-0 flex-col @4xl:col-span-7">
          <MapEmbed
            embed={maps.embed}
            title={`Peta lokasi ${m.companyName}`}
            className="min-h-[320px] flex-1 rounded-[24px] ring-1 ring-black/[0.07] @3xl:rounded-[28px] @4xl:min-h-[520px]"
          />
          {maps.link && (
            <ActionLink
              action={{ kind: 'external', href: maps.link }}
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold text-(--tpl-accent-ink) hover:underline"
            >
              Buka di Google Maps
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </ActionLink>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
