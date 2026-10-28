// Tanya jawab & Lokasi Sparring Padel.
// - `faq` (pita abu-dingin): kiri (4/12) kepala section + tautan WhatsApp (menempel saat digulir di layar lebar); kanan
//   (8/12) akordeon kartu putih radius 14: pertanyaan Saira + tombol bulat "+" yang menjadi neon saat terbuka (tombol
//   aria-expanded/aria-controls di dalam H3, panel role="region", tertutup `inert`), satu terbuka sekaligus.
// - `contact` (putih): kiri (5/12) kepala section, baris info berikon (Alamat, Jam buka, Telepon, Email), tombol neon
//   "Book via WhatsApp" + "Buka di Google Maps"; kanan (7/12) peta Google Maps radius 14. HP: bertumpuk.
import { Clock, Mail, MapPin, Phone, Plus, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { displayPhone, type SparringModel } from './model';
import { BTN, C, CARD, DISPLAY, GRID_GAP, MONO_LABEL, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

export function Faq({ m }: { m: SparringModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waAction);

  return (
    <TemplateSection sectionKey="faq" className={`${C.band} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-8 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+108px)] @5xl:col-span-4 @5xl:self-start">
            <SectionHead eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle="Tanya jawab" />
            <TextLink action={linkAction} label={text(faq, 'link_label')} icon={m.waAction && linkAction === m.waAction ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined} className="mt-6" />
          </div>
          <ul className="grid gap-3 @5xl:col-span-8">
            {items.map((item, i) => {
              const isOpen = open === i;
              const buttonId = `${baseId}-q${i}`;
              const panelId = `${baseId}-a${i}`;
              return (
                <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className={CARD.light}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className={`group flex min-h-16 w-full items-center justify-between gap-5 px-5 py-4 text-left @3xl:px-6 ${C.ink}`}
                    >
                      <span className={`${DISPLAY} text-balance text-[18px] font-semibold leading-snug @3xl:text-[19px]`}>{field(item, 'question')}</span>
                      <span
                        aria-hidden
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                          isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--sp-night) text-white group-hover:text-(--sp-neon)'
                        }`}
                      >
                        <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    data-open={isOpen ? 'true' : 'false'}
                    inert={!isOpen}
                    className="sp-collapse"
                  >
                    <div className="overflow-hidden">
                      <p className={`max-w-[62ch] px-5 pb-5 text-[15px] leading-relaxed @3xl:px-6 @3xl:pb-6 ${C.muted}`}>{field(item, 'answer')}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </TemplateSection>
  );
}

interface Row {
  key: string;
  label: string;
  value: string;
  Icon: LucideIcon;
  action: LinkAction | null;
}

export function Contact({ m }: { m: SparringModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Alamat', value: address, Icon: MapPin, action: null },
    hours && { key: 'hours', label: 'Jam buka', value: hours, Icon: Clock, action: null },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), Icon: Phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', label: 'Email', value: email, Icon: Mail, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
  ].filter((row): row is Row => !!row);
  const buttonLabel = text(contact, 'button_label');

  return (
    <TemplateSection sectionKey="contact" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-5">
            <SectionHead eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} srTitle="Lokasi" />
            {rows.length > 0 && (
              <dl className={`mt-8 divide-y border-y ${C.line} divide-[#0A1622]/[0.1]`}>
                {rows.map(({ key, label, value, Icon, action }, i) => (
                  <Reveal key={key} delay={stagger(i, 60)} className="flex items-start gap-4 py-4">
                    <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--sp-night) text-(--sp-neon)">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className={`${MONO_LABEL} text-[11px] ${C.muted}`}>{label}</dt>
                      <dd className={`mt-1 text-[15.5px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                        {action ? (
                          <ActionLink
                            action={action}
                            className="-my-3 inline-block py-3 underline decoration-[#0A1622]/25 underline-offset-4 transition-colors hover:text-(--sp-ink) hover:decoration-(--sp-ink)"
                          >
                            {value}
                          </ActionLink>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  </Reveal>
                ))}
              </dl>
            )}
            {(m.waAction && buttonLabel) || mapLink ? (
              <div className="mt-8 flex flex-col items-stretch gap-2 @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-6">
                {m.waAction && buttonLabel && (
                  <ActionLink action={m.waAction} className={`${BTN.neon} ${BTN.md}`}>
                    <WhatsAppIcon className="h-5 w-5 shrink-0" />
                    {buttonLabel}
                  </ActionLink>
                )}
                <TextLink action={mapLink} label="Buka di Google Maps" className="self-center" />
              </div>
            ) : null}
          </div>
          {m.map.embed && (
            <Reveal delay={120} className="min-w-0 @5xl:col-span-7">
              <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[14px] ring-1 ring-[#0A1622]/[0.1] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[460px]" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
