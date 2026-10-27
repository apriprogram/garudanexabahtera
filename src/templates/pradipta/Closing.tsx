// Tanya jawab (kunci `faq`) + lokasi & kontak (kunci `contact`).
// FAQ: kiri label + H2 + kartu bantuan (tombol bawaan ke WhatsApp panitia SPMB); kanan satu kartu putih berisi
// pertanyaan bergaris tipis: tombol aria-expanded/aria-controls dengan bulatan "+" yang berputar 45°, panel
// role="region" yang membuka (0fr → 1fr), satu terbuka. HP: kartu bantuan di BAWAH daftar pertanyaan.
// Kontak: kiri label + H2 + deskripsi + baris info berikon (alamat → Google Maps, telepon, email, WhatsApp, jam layanan)
// + tautan "Buka di Google Maps"; kanan peta Google Maps (iframe ber-title, dimuat lazy) radius 24 bercincin langit.
import { Clock, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import type { PradiptaModel } from './model';
import { BAND, C, DISPLAY, SECTION_PAD, TYPE_P, cardOn } from './styles';
import { Head, PillLink, TextLink } from './ui';

export function Faq({ m }: { m: PradiptaModel }) {
  const { faq } = m;
  const tone = m.tone('faq');
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = m.linkOr(text(faq, 'button_url'), m.waWith(`Halo Panitia SPMB ${m.companyName}, saya ingin bertanya.`, m.spmbWhatsapp) ?? m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);

  return (
    <TemplateSection sectionKey="faq" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={`${CONTAINER} grid items-start gap-8 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-12 @5xl:gap-y-8`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <Head sectionKey="faq" layout="stack" eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} fallback="Tanya jawab" tone={tone} />
        </div>

        <Reveal className={`min-w-0 px-5 @3xl:px-7 @5xl:col-span-7 @5xl:col-start-6 @5xl:row-span-2 @5xl:row-start-1 ${cardOn(tone)}`}>
          <ul className="divide-y divide-(--pd-ring)">
            {items.map((item, i) => {
              const isOpen = open === i;
              const buttonId = `${baseId}-q${i}`;
              const panelId = `${baseId}-a${i}`;
              return (
                <li key={`${field(item, 'question')}-${i}`}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-5 py-5 text-left"
                    >
                      <span className={`${DISPLAY} text-[16px] font-medium leading-snug @3xl:text-[16.5px] ${C.ink}`}>{field(item, 'question')}</span>
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                          isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--pd-sky2) text-(--pd-ink) group-hover:bg-(--pd-ring)'
                        }`}
                      >
                        <Plus className={`pd-turn h-4 w-4 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="pd-collapse">
                    <div className="overflow-hidden">
                      <p className={`max-w-[62ch] pb-6 pr-10 ${C.body} ${TYPE_P.body}`}>{field(item, 'answer')}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {(helpTitle || helpText || (action && buttonLabel)) && (
          <Reveal delay={120} className={`min-w-0 self-start p-6 @3xl:p-7 @5xl:col-span-5 @5xl:row-start-2 ${tone === 'sky' ? 'rounded-[20px] bg-white' : 'rounded-[20px] bg-(--pd-sky)'}`}>
            {helpTitle && <p className={`${C.ink} ${TYPE_P.h3}`}>{helpTitle}</p>}
            {helpText && <p className={`mt-2 ${C.body} ${TYPE_P.small}`}>{helpText}</p>}
            <PillLink
              action={action}
              label={buttonLabel}
              variant="primary"
              icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
              className="mt-5 w-full @xl:w-auto"
            />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink)">
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12.5px] font-medium ${C.muted}`}>{label}</span>
        <span className={`mt-0.5 block text-[15.5px] font-medium leading-snug ${C.ink} [overflow-wrap:anywhere]`}>{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="group flex items-start gap-4 rounded-[14px] py-1 transition-colors hover:text-(--pd-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: PradiptaModel }) {
  const { contact } = m;
  const tone = m.tone('contact');
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

  return (
    <TemplateSection sectionKey="contact" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          <Head sectionKey="contact" layout="stack" eyebrow={text(contact, 'eyebrow')} title={title} fallback="Lokasi & kontak" subtitle={text(contact, 'subtitle')} tone={tone} />
          {rows.length > 0 && (
            <Reveal as="ul" delay={120} className="mt-8 space-y-4">
              {rows.map((row) => (
                <li key={row.key}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </li>
              ))}
            </Reveal>
          )}
          {mapLink && <TextLink action={mapLink} label="Buka di Google Maps" className="mt-6" />}
        </div>
        {m.map.embed && (
          // Layar lebar: peta setinggi kolom info (tanpa sisa kosong di bawahnya), minimal 440px
          <Reveal delay={160} className="relative min-w-0 self-start @5xl:col-span-7 @5xl:self-stretch">
            <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[24px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[440px]" />
            {/* Cincin langit di atas peta (iframe menutupi cincin milik wadahnya) */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-(--pd-ring)" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
