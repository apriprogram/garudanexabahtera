// Kontak (kunci `contact`): label bernomor selebar wadah; kiri (kolom 1-5) H2, deskripsi, baris kontak manifest (label
// mono kiri: ALAMAT, TELEPON, EMAIL, WHATSAPP, JAM KERJA; nilai kanan bertautan tel:/mailto:/WhatsApp), peta Google
// Maps 4:3 bersudut persegi + "Buka di Google Maps"; kanan (kolom 7-12) panel formulir permintaan penawaran (./Inquiry).
// HP: H2 → deskripsi → formulir → baris kontak → peta.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { Inquiry } from './Inquiry';
import type { DermagaModel } from './model';
import { C, GRID_GAP, MONO_LABEL, SECTION_PAD } from './styles';
import { SectionHead, SectionLabel, TextLink } from './ui';

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
}

export function Contact({ m }: { m: DermagaModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Alamat', value: address, action: null },
    phone && { key: 'phone', label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: m.whatsapp, action: m.waAction },
    hours && { key: 'hours', label: 'Jam kerja', value: hours, action: null },
  ].filter((row): row is Row => !!row);

  return (
    <TemplateSection sectionKey="contact" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        {eyebrow && (
          <Reveal variant="fade" className="@5xl:col-span-12 @5xl:row-start-1">
            <SectionLabel label={eyebrow} number={m.number('contact')} />
          </Reveal>
        )}
        <div className={`min-w-0 @5xl:col-span-5 @5xl:row-start-2 ${eyebrow ? 'mt-7 @3xl:mt-10' : ''}`}>
          <SectionHead layout="stack" eyebrow="" title={text(contact, 'title') || 'Kontak'} subtitle={text(contact, 'subtitle')} />
        </div>
        <Reveal
          delay={120}
          className={`mt-10 min-w-0 @5xl:col-span-6 @5xl:col-start-7 @5xl:row-span-2 @5xl:row-start-2 ${eyebrow ? '@5xl:mt-10' : '@5xl:mt-0'}`}
        >
          <Inquiry m={m} />
        </Reveal>
        {(rows.length > 0 || m.map.embed) && (
          <div className="mt-10 min-w-0 @5xl:col-span-5 @5xl:row-start-3 @5xl:mt-10">
            {rows.length > 0 && (
              <dl className={`divide-y border-y ${C.line} divide-[#0F1D20]/[0.14]`}>
                {rows.map((row, i) => (
                  <Reveal key={row.key} delay={stagger(i, 60)} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                    <dt className={`${MONO_LABEL} ${C.muted}`}>{row.label}</dt>
                    <dd className={`ml-auto max-w-[34ch] text-balance text-right text-[15px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                      {row.action ? (
                        <ActionLink action={row.action} className="underline decoration-[#0F1D20]/25 underline-offset-4 transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)">
                          {row.value}
                        </ActionLink>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </Reveal>
                ))}
              </dl>
            )}
            {m.map.embed && (
              <Reveal delay={160} className={rows.length > 0 ? 'mt-8' : ''}>
                <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] ring-1 ring-[#0F1D20]/[0.14]" />
                <TextLink action={mapLink} label="Buka di Google Maps" className="mt-3" />
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
