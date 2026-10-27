// Tanya jawab (kunci `faq`, pita putih) + lokasi & kontak (kunci `contact`, anchor #kontak, pita abu kertas).
// FAQ: kiri 4 kolom label + H2 + kartu bantuan abu (tombol WhatsApp panitia SPMB / sekolah); kanan 8 kolom daftar
// buka-tutup bergaris tipis, semua tertutup (tombol aria-expanded/aria-controls dengan kotak "+"/"−", panel role="region",
// tertutup `inert`). HP: kartu bantuan setelah daftar.
// Kontak: kiri 5 kolom label + H2 + deskripsi + baris kontak bergaris tipis (ikon persegi warna tema muda, label mono,
// isi; telepon & email bisa diklik) + tombol WhatsApp + "Buka di Google Maps"; kanan 7 kolom peta Google Maps (iframe
// ber-title, dimuat lazy) radius 8 bergaris tipis.
import { Clock, Mail, MapPin, Minus, Phone, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import type { NawasenaModel } from './model';
import { C, CARD, SECTION_PAD, TYPE_N } from './styles';
import { ButtonLink, SectionHead, TextLink } from './ui';

export function Faq({ m }: { m: NawasenaModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  if (items.length === 0) return null;
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = m.linkOr(text(faq, 'button_url'), m.waWith(`Halo Panitia SPMB ${m.companyName}, saya ingin bertanya.`, m.spmbWhatsapp) ?? m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const help = (helpTitle || helpText || (action && buttonLabel)) && (
    <Reveal delay={160} className={`min-w-0 self-start p-6 @3xl:p-7 @5xl:col-span-4 @5xl:row-start-2 ${CARD.surface}`}>
      {helpTitle && <h3 className={`${C.navy} ${TYPE_N.h3}`}>{helpTitle}</h3>}
      {helpText && <p className={`mt-2 ${TYPE_N.small} ${C.body}`}>{helpText}</p>}
      <ButtonLink action={action} label={buttonLabel} variant="primary" icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined} className="mt-5" />
    </Reveal>
  );

  return (
    <TemplateSection sectionKey="faq" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-x-8 @5xl:gap-y-8 @7xl:gap-x-12`}>
        <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} number={m.number('faq')} title={text(faq, 'title') || 'Tanya jawab'} className="min-w-0 @5xl:col-span-4 @5xl:row-start-1" />
        <ul className="min-w-0 border-b border-black/[0.08] @5xl:col-span-8 @5xl:col-start-5 @5xl:row-span-2 @5xl:row-start-1">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 50)} className="border-t border-black/[0.08]">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left"
                  >
                    <span className={`${C.navy} ${TYPE_N.h3Sans}`}>{field(item, 'question')}</span>
                    <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] ring-1 ring-inset transition-colors duration-300 ${isOpen ? 'bg-(--nw-navy) text-white ring-(--nw-navy)' : 'text-(--nw-navy) ring-black/[0.14]'}`}>
                      {isOpen ? <Minus className="h-4 w-4" strokeWidth={2} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="nw-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[68ch] pb-6 pr-12 text-[16px] leading-relaxed ${C.body}`}>{field(item, 'answer')}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
        {help}
      </div>
    </TemplateSection>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-(--nw-tint) text-(--nw-ink)">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={`block ${TYPE_N.mono} ${C.muted}`}>{label}</span>
        <span className={`mt-1 block text-[15.5px] font-medium leading-snug ${C.navy} [overflow-wrap:anywhere]`}>{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="group flex items-start gap-4 py-4 transition-colors hover:text-(--nw-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-4">{body}</div>
  );
}

export function Contact({ m }: { m: NawasenaModel }) {
  const { contact } = m;
  const title = text(contact, 'title');
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows = [
    address && { key: 'address', icon: MapPin, label: 'Alamat', value: address, action: null },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', icon: Clock, label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false | null | undefined> => !!row);
  // Aturan tampil sama dengan menu & tujuan tautan "#kontak" (model sectionShown → contactShown)
  if (!m.shown('contact')) return null;
  const waLabel = text(contact, 'whatsapp_label') || 'Hubungi lewat WhatsApp';

  return (
    <TemplateSection sectionKey="contact" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} number={m.number('contact')} title={title || 'Kontak'} subtitle={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <ul className="mt-8 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </Reveal>
              ))}
            </ul>
          )}
          {(m.waAction || mapLink) && (
            <Reveal delay={200} className="mt-7 flex flex-col items-start gap-3 @xl:flex-row @xl:items-center @xl:gap-6">
              <ButtonLink action={m.waAction} label={waLabel} variant="primary" icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />} />
              <TextLink action={mapLink} label="Buka di Google Maps" />
            </Reveal>
          )}
        </div>
        {m.map.embed && (
          <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
            <MapEmbed
              embed={m.map.embed}
              title={`Peta lokasi ${m.companyName}`}
              className="aspect-[4/3] rounded-[8px] ring-1 ring-inset ring-black/[0.08] @3xl:aspect-[16/10] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[460px]"
            />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
