// Tanya jawab (kunci `faq`) + lokasi & kontak (kunci `contact`).
// FAQ: panel pasir membulat: kiri label bernomor + H2 + kartu bantuan putih (tombol WhatsApp panitia); kanan kartu
// pertanyaan terpisah bergaya Bienes dengan tombol bulat "+" (tombol aria-expanded/aria-controls, panel role="region",
// tertutup `inert`), satu terbuka.
// Kontak: kiri label bernomor + H2 + baris info berikon (alamat → Google Maps, telepon, email, WhatsApp, jam layanan) dan
// media sosial; kanan peta Google Maps membulat (iframe ber-title, dimuat lazy) + tombol "Buka di Google Maps".
import { Clock, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import type { BestariModel } from './model';
import { C, CARD, PANEL, PANEL_OUTER, SECTION_PAD, TYPE_B } from './styles';
import { PillLink, SectionHead } from './ui';

export function Faq({ m }: { m: BestariModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = m.linkOr(text(faq, 'button_url'), m.waWith(`Halo Panitia PPDB ${m.companyName}, saya ingin bertanya.`, m.ppdbWhatsapp) ?? m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);

  return (
    <TemplateSection sectionKey="faq" className="py-2">
      <div className={PANEL_OUTER}>
        <div className={`${PANEL} ${SECTION_PAD}`}>
          <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
            <div className="min-w-0 @5xl:col-span-5">
              <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} number={m.number('faq')} title={text(faq, 'title')} />
              {(helpTitle || helpText || (action && buttonLabel)) && (
                <Reveal delay={200} className={`mt-8 p-6 @3xl:max-w-[440px] @3xl:p-7 ${CARD.white}`}>
                  {helpTitle && <p className={`${C.ink} ${TYPE_B.h3}`}>{helpTitle}</p>}
                  {helpText && <p className={`mt-2 ${TYPE_B.small} ${C.muted}`}>{helpText}</p>}
                  <PillLink
                    action={action}
                    label={buttonLabel}
                    variant="primary"
                    icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                    className="mt-5"
                  />
                </Reveal>
              )}
            </div>

            <ul className="grid content-start gap-3 @5xl:col-span-7">
              {items.map((item, i) => {
                const isOpen = open === i;
                const buttonId = `${baseId}-q${i}`;
                const panelId = `${baseId}-a${i}`;
                return (
                  <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 50)} className={`px-5 @3xl:px-6 ${CARD.white}`}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? null : i)}
                        className="flex w-full items-center justify-between gap-5 py-5 text-left"
                      >
                        <span className={`text-[16px] font-semibold leading-snug tracking-[-0.01em] ${C.ink} @3xl:text-[17px]`}>{field(item, 'question')}</span>
                        <span
                          aria-hidden
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                            isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-[#1C1917] text-white'
                          }`}
                        >
                          <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                        </span>
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="bs-collapse">
                      <div className="overflow-hidden">
                        <p className={`max-w-[62ch] pb-6 pr-10 ${TYPE_B.body} ${C.muted}`}>{field(item, 'answer')}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--bs-tint) text-(--bs-ink)">
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12.5px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{label}</span>
        <span className={`mt-0.5 block text-[15.5px] font-medium leading-snug ${C.ink} [overflow-wrap:anywhere]`}>{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="group flex items-start gap-4 rounded-[14px] py-1 transition-colors hover:text-(--bs-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: BestariModel }) {
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
    address && { key: 'address', icon: MapPin, label: 'Alamat', value: address, action: mapLink },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', icon: WhatsAppIcon as unknown as typeof Mail, label: 'WhatsApp', value: m.whatsapp, action: m.waAction },
    hours && { key: 'hours', icon: Clock, label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false | null | undefined> => !!row);
  if (!title && rows.length === 0 && !m.map.embed) return null;

  return (
    <TemplateSection sectionKey="contact" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} number={m.number('contact')} title={title} subtitle={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <ul className="mt-8 space-y-3.5">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </Reveal>
              ))}
            </ul>
          )}
          {m.socials.length > 0 && (
            <Reveal delay={240} className="mt-8">
              <p className={`text-[12.5px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>Media sosial</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {m.socials.map((s) => {
                  const Icon = SOCIAL_FIELDS.find((f) => f.key === s.key)?.Icon;
                  return (
                    <li key={s.key}>
                      <ActionLink
                        action={{ kind: 'external', href: s.href }}
                        aria-label={s.label}
                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2ED] transition-colors duration-300 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) ${C.ink}`}
                      >
                        {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}
        </div>
        {m.map.embed && (
          <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
            <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[28px] @5xl:aspect-auto @5xl:h-[calc(100%-60px)] @5xl:min-h-[440px]" />
            {mapLink && <PillLink action={mapLink} label="Buka di Google Maps" variant="ink" className="mt-3" />}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
