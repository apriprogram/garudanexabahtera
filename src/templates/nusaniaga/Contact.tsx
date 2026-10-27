// Kontak (kunci `contact`), putih. Kiri (kolom 1–5): label, H2, deskripsi, baris kontak bergaris rambut (kotak ikon tint
// → label kecil → nilai: alamat → Google Maps, telepon, email, WhatsApp, jam operasional), lalu peta 16:10 + "Buka di
// Google Maps". Kanan (kolom 7–12): formulir permintaan penawaran di kartu bergaris aksen (./Inquiry).
// HP: label → H2 → deskripsi → formulir → baris kontak → peta.
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ComponentType } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { Inquiry } from './Inquiry';
import type { NusaNiagaModel } from './model';
import { C, DIVIDE, GRID, ICON_BOX, LINE, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

interface Row {
  key: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  action: LinkAction | null;
}

function InfoRow({ row }: { row: Row }) {
  const Icon = row.icon;
  // Baris bertautan: nilainya bergaris bawah tipis (berbeda dari "Jam operasional" yang bukan tautan) dan berwarna
  // tinta aksen saat disorot
  const link = row.action
    ? 'underline decoration-current/25 underline-offset-4 transition-colors duration-200 group-hover:text-(--nn-ink) group-hover:decoration-current'
    : '';
  const body = (
    <>
      <span aria-hidden className={ICON_BOX}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className={`block text-[13px] ${C.subtle}`}>{row.label}</span>
        <span className={`mt-0.5 block text-[15px] font-medium leading-snug [overflow-wrap:anywhere] ${C.ink} ${link}`}>{row.value}</span>
      </span>
    </>
  );
  return row.action ? (
    <ActionLink action={row.action} className="group flex items-start gap-4 py-4">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-4">{body}</div>
  );
}

export function Contact({ m }: { m: NusaNiagaModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [];
  if (address) rows.push({ key: 'address', icon: MapPin, label: 'Alamat', value: address, action: mapLink });
  if (phone) rows.push({ key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? { kind: 'external', href: tel } : null });
  if (email) rows.push({ key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? { kind: 'external', href: mail } : null });
  if (m.waAction && m.whatsapp) rows.push({ key: 'whatsapp', icon: WhatsAppIcon, label: 'WhatsApp', value: m.whatsapp, action: m.waAction });
  if (hours) rows.push({ key: 'hours', icon: Clock, label: 'Jam operasional', value: hours, action: null });

  return (
    <TemplateSection sectionKey="contact" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} ${GRID} @5xl:grid-rows-[auto_1fr]`}>
        <SectionHead
          layout="stack"
          eyebrow={text(contact, 'eyebrow')}
          title={text(contact, 'title')}
          srTitle="Kontak"
          subtitle={text(contact, 'subtitle')}
          className="min-w-0 @5xl:col-[1/6] @5xl:row-[1]"
        />
        <Reveal delay={120} className="mt-10 min-w-0 @5xl:col-[7/13] @5xl:row-[1/3] @5xl:mt-0">
          <Inquiry m={m} />
        </Reveal>
        {(rows.length > 0 || m.map.embed) && (
          <div className="mt-10 min-w-0 @5xl:col-[1/6] @5xl:row-[2]">
            {rows.length > 0 && (
              <ul className={`divide-y border-y ${LINE} ${DIVIDE}`}>
                {rows.map((row, i) => (
                  <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                    <InfoRow row={row} />
                  </Reveal>
                ))}
              </ul>
            )}
            {m.map.embed && (
              <Reveal delay={160} className={rows.length > 0 ? 'mt-8' : ''}>
                <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[16/10] rounded-2xl" />
                <TextLink action={mapLink} label="Buka di Google Maps" className="mt-2" />
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
