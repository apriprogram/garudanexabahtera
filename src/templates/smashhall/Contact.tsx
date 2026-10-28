// Kontak (kunci `contact`) di latar pasir: layar lebar kepala section + baris kontak berikon (alamat, WhatsApp,
// telepon, email, jam buka; tautan tel:/mailto:/WhatsApp) di kolom 1-5; formulir booking & pendaftaran
// (./BookingForm) di kolom 7-12; peta Google Maps radius 20 selebar wadah di bawah keduanya. HP: judul → formulir →
// baris kontak → peta.
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ComponentType } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { BookingForm } from './BookingForm';
import { displayPhone, type SmashModel } from './model';
import { C, GRID_GAP, SECTION_PAD, TYPE_S } from './styles';
import { SectionLabel, TextLink } from './ui';

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
  Icon: ComponentType<{ className?: string }>;
}

export function Contact({ m }: { m: SmashModel }) {
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
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const candidates: (Row | null | false | "")[] = [
    address && { key: 'address', label: 'Alamat', value: address, action: null, Icon: MapPin },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction, Icon: WhatsAppIcon },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null, Icon: Phone },
    email && { key: 'email', label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null, Icon: Mail },
    hours && { key: 'hours', label: 'Jam buka', value: hours, action: null, Icon: Clock },
  ];
  const rows = candidates.filter((row): row is Row => !!row);

  return (
    <TemplateSection sectionKey="contact" className={`${C.sand} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr_auto] ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          {eyebrow && (
            <Reveal variant="fade">
              <SectionLabel label={eyebrow} />
            </Reveal>
          )}
          {title ? (
            <Reveal as="h2" delay={80} className={`max-w-[18ch] ${eyebrow ? 'mt-5' : ''} ${TYPE_S.h2} ${C.ink}`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">{eyebrow || 'Kontak'}</h2>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-4 max-w-[42ch] ${TYPE_S.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
        </div>

        <Reveal delay={120} className="mt-10 min-w-0 @5xl:col-span-7 @5xl:col-start-6 @5xl:row-span-2 @5xl:row-start-1 @5xl:mt-0 @6xl:col-span-6 @6xl:col-start-7">
          <BookingForm m={m} />
        </Reveal>

        {rows.length > 0 && (
          <div className="mt-10 min-w-0 @5xl:col-span-5 @5xl:row-start-2">
            <ul className="grid gap-1">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)} className="flex items-start gap-3.5 py-2.5">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-(--tpl-accent-ink) ring-1 ring-inset ring-[#171512]/[0.08]">
                    <row.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-[12.5px] font-semibold uppercase tracking-[0.1em] ${C.muted}`}>{row.label}</p>
                    <p className={`text-[15.5px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                      {row.action ? (
                        <ActionLink
                          action={row.action}
                          className="-my-3 inline-block py-3 underline decoration-[#171512]/25 underline-offset-4 transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)"
                        >
                          {row.value}
                        </ActionLink>
                      ) : (
                        row.value
                      )}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        )}

        {/* Peta selebar wadah di bawah kontak & formulir (layar lebar): tinggi kedua kolom tetap seimbang */}
        {m.map.embed && (
          <Reveal delay={160} className="mt-10 min-w-0 @5xl:col-span-12 @5xl:row-start-3 @5xl:mt-14">
            <MapEmbed
              embed={m.map.embed}
              title={`Peta lokasi ${m.companyName}`}
              className="aspect-[4/3] overflow-hidden rounded-[20px] ring-1 ring-[#171512]/10 @3xl:aspect-[16/9] @5xl:aspect-auto @5xl:h-[340px]"
            />
            <TextLink action={mapLink} label="Buka di Google Maps" className="mt-3" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
