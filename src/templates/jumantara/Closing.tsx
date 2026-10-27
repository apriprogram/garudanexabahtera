// Galeri (kunci `gallery`), tanya jawab (kunci `faq`), dan lokasi & kontak (kunci `contact`, anchor #kontak).
// Galeri: label + H2 + tombol bergaris (mis. Instagram), lalu foto 4:5 radius 12 dalam grid 4 kolom (HP 2 kolom), zoom-out
// halus saat masuk layar dan membesar pelan saat disorot, keterangan di bawahnya.
// FAQ: pita tint; kiri label + H2 + kartu bantuan putih (tombol ke WhatsApp sekolah), kanan akordeon di satu kartu putih
// bergaris rambut (tombol aria-expanded/aria-controls di dalam <h3>, panel role="region", tertutup `inert`, ikon "+"
// berputar 45°), satu terbuka.
// Kontak: kiri label + H2 + baris info berikon (alamat → Google Maps, telepon, WhatsApp, email, jam layanan) + dua
// tombol; kanan peta Google Maps (iframe ber-title, dimuat lazy) radius 12 bergaris rambut.
import { ArrowUpRight, Clock, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, safeUrl, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { JumantaraModel } from './model';
import { JUMANTARA_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, DIVIDE, LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead, SectionRule } from './ui';

export function Gallery({ m }: { m: JumantaraModel }) {
  const { gallery } = m;
  const items = m.items('gallery');
  if (items.length === 0) return null;
  const buttonLabel = text(gallery, 'button_label');
  const buttonUrl = safeUrl(text(gallery, 'button_url'));
  const button =
    buttonLabel && buttonUrl ? (
      <ActionLink action={{ kind: 'external', href: buttonUrl }} className={`group ${BTN.outline} ${BTN.md}`}>
        <span className="truncate">{buttonLabel}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </ActionLink>
    ) : undefined;

  return (
    <TemplateSection sectionKey="gallery" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('gallery')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} fallback="Galeri" aside={button} />
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-6 @3xl:mt-12 @5xl:grid-cols-4 @5xl:gap-x-4">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            return (
              <Reveal as="li" key={`${image}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                <figure className="group">
                  <KitPhoto
                    src={image}
                    alt={JUMANTARA_PHOTOS.alt(image, caption || `Kegiatan di ${m.companyName}`)}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    zoom
                    className="aspect-[4/5] rounded-[12px]"
                    imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {caption && <figcaption className={`mt-3 text-[14px] leading-snug ${C.muted}`}>{caption}</figcaption>}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Faq({ m }: { m: JumantaraModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = m.linkOr(text(faq, 'button_url'), m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);

  return (
    <TemplateSection sectionKey="faq" className={`bg-(--jm-tint) ${SECTION_PAD}`}>
      {/* HP: judul → pertanyaan → kartu bantuan; layar lebar: judul + kartu bantuan di kiri, pertanyaan di kanan */}
      <div className={`${CONTAINER} grid gap-8 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-12 @5xl:gap-y-8`}>
        <div className="min-w-0 @5xl:col-span-4 @5xl:row-start-1">
          <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} fallback="Tanya jawab" />
        </div>

        <div className="min-w-0 @5xl:col-span-8 @5xl:col-start-5 @5xl:row-[1/3]">
          <Reveal delay={120}>
            <ul className={`divide-y px-5 @3xl:px-7 ${DIVIDE} ${CARD.white}`}>
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
                        <span className={`${DISPLAY} text-[16px] font-medium leading-snug tracking-[-0.01em] ${C.ink} group-hover:text-(--jm-ink) @3xl:text-[17px]`}>
                          {field(item, 'question')}
                        </span>
                        <span
                          aria-hidden
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors duration-200 ${
                            isOpen ? 'border-transparent bg-(--tpl-accent) text-(--tpl-on-accent)' : `bg-white text-(--jm-ink) ${LINE}`
                          }`}
                        >
                          <Plus className={`jm-acc h-4 w-4 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                        </span>
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="jm-collapse">
                      <div className="overflow-hidden">
                        <p className={`max-w-[66ch] pb-6 @3xl:pr-12 ${TYPE_J.body} ${C.muted}`}>{field(item, 'answer')}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        {(helpTitle || helpText || (action && buttonLabel)) && (
          <Reveal delay={200} className="min-w-0 @5xl:col-span-4 @5xl:row-start-2 @5xl:self-start">
            <HelpCard title={helpTitle} body={helpText} label={buttonLabel} action={action} isWa={isWa} />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

function HelpCard({ title, body, label, action, isWa }: { title: string; body: string; label: string; action: LinkAction | null; isWa: boolean }) {
  return (
    <div className={`p-6 @3xl:p-7 ${CARD.white}`}>
      {title && <p className={`${C.ink} ${TYPE_J.h3}`}>{title}</p>}
      {body && <p className={`mt-2 ${TYPE_J.small} ${C.muted}`}>{body}</p>}
      {action && label && (
        <ActionLink action={action} className={`${BTN.primary} ${BTN.md} mt-5`}>
          {isWa && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{label}</span>
        </ActionLink>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--jm-tint) text-(--jm-ink)">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{label}</span>
        <span
          className={`mt-0.5 block text-[15.5px] font-medium leading-snug ${C.ink} [overflow-wrap:anywhere] ${
            action ? 'underline-offset-4 transition-colors duration-200 group-hover:text-(--jm-ink) group-hover:underline' : ''
          }`}
        >
          {value}
        </span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="group flex items-start gap-4 py-4">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-4">{body}</div>
  );
}

export function Contact({ m }: { m: JumantaraModel }) {
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
    m.waAction && m.whatsapp && { key: 'whatsapp', icon: WhatsAppIcon as unknown as typeof Mail, label: 'WhatsApp', value: m.whatsapp, action: m.waAction },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', icon: Clock, label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false | null | undefined> => !!row);
  const waLabel = text(contact, 'whatsapp_label');
  const mapsLabel = text(contact, 'maps_label');
  if (!title && rows.length === 0 && !m.map.embed) return null;

  return (
    <TemplateSection sectionKey="contact" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('contact')} />
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className={`min-w-0 ${m.map.embed ? '@5xl:col-span-5' : '@5xl:col-span-8'}`}>
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} title={title} fallback="Kontak" subtitle={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <ul className={`mt-8 divide-y border-y ${DIVIDE} ${LINE}`}>
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </Reveal>
              ))}
            </ul>
          )}
          {((m.waAction && waLabel) || (mapLink && mapsLabel)) && (
            <Reveal delay={200} className="mt-8 flex flex-col gap-3 @xl:flex-row">
              {m.waAction && waLabel && (
                <ActionLink action={m.waAction} className={`${BTN.primary} ${BTN.lg}`}>
                  <WhatsAppIcon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{waLabel}</span>
                </ActionLink>
              )}
              {mapLink && mapsLabel && (
                <ActionLink action={mapLink} className={`group ${BTN.outline} ${BTN.lg}`}>
                  <span className="truncate">{mapsLabel}</span>
                  <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>
        {m.map.embed && (
          <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
            <MapEmbed
              embed={m.map.embed}
              title={`Peta lokasi ${m.companyName}`}
              className={`aspect-[4/3] rounded-[12px] border @5xl:aspect-auto @5xl:h-full @5xl:min-h-[480px] ${LINE}`}
            />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
