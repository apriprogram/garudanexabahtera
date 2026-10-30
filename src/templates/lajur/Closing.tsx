// Tanya jawab (kunci `faq`, abu hangat) + Kontak & garasi (kunci `contact`, putih).
// FAQ: kiri (1-4) label, H2, kalimat pengantar, tautan "Tanya lewat WhatsApp"; kanan (6-12) akordeon bergaris rambut:
// pertanyaan Inter tebal + kotak persegi radius 6 "+" yang berputar jadi "×" (amber saat terbuka); tombol
// aria-expanded/aria-controls di dalam H3, panel role="region" (tertutup `inert`), pertanyaan pertama terbuka.
// Kontak: kiri (1-5) kepala section + baris kontak bergaris rambut (label kapital kecil, nilai bertautan tel:/WhatsApp/
// mailto:, area sentuh ≥ 44px); kanan (6-12) peta Google Maps yang MENEMBUS tepi kanan layar (HP: selebar layar).
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { displayPhone, type LajurModel } from './model';
import { C, GRID_GAP, LABEL_SM, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, TextLink } from './ui';

export function Faq({ m }: { m: LajurModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="faq" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={`${WRAP} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="contents @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)] @5xl:col-span-4 @5xl:block @5xl:min-w-0 @5xl:self-start">
          <div className="min-w-0">
            <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} index={m.numbers.faq} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle="Tanya jawab" />
          </div>
          <TextLink
            action={linkAction}
            label={text(faq, 'link_label')}
            icon={linkAction?.kind === 'external' && /wa\.me/.test(linkAction.href) ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
            className="order-last mt-6 justify-self-start @5xl:order-none @5xl:mt-8"
          />
        </div>
        <ul className={`mt-10 border-t @5xl:col-span-7 @5xl:col-start-6 @5xl:mt-0 ${C.line}`}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className={`border-b ${C.line}`}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-14 w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6 ${C.ink}`}
                  >
                    <span className="text-balance text-[17px] font-semibold leading-snug @3xl:text-[18px]">{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] ring-1 ring-inset transition-colors duration-200 ${
                        isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-(--tpl-accent)' : 'ring-[#14161A]/25 group-hover:ring-[#14161A]/60'
                      }`}
                    >
                      <Plus className={`lj-acc h-4 w-4 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="lj-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE.body} ${C.muted}`}>{field(item, 'answer')}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
}

export function Contact({ m }: { m: LajurModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Garasi & kantor', value: address, action: null },
    hours && { key: 'hours', label: 'Jam buka', value: hours, action: null },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction },
    email && { key: 'email', label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
  ].filter((row): row is Row => !!row);

  return (
    <TemplateSection sectionKey="contact" className={`${SECTION_PAD} overflow-x-clip ${C.white}`}>
      <div className={`${WRAP} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 @5xl:items-stretch ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} index={m.numbers.contact} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} srTitle="Kontak" />
          {rows.length > 0 && (
            <dl className={`mt-10 divide-y border-y ${C.line} ${C.divide}`}>
              {rows.map((row, i) => (
                <Reveal key={row.key} delay={stagger(i, 60)} className="grid gap-1 py-4 @xl:grid-cols-[140px_1fr] @xl:gap-6">
                  <dt className={`pt-0.5 ${LABEL_SM} ${C.muted}`}>{row.label}</dt>
                  <dd className={`text-[15.5px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                    {row.action ? (
                      // Area sentuh ± 47px (py-3.5) tanpa menambah tinggi baris (-my-3.5)
                      <ActionLink
                        action={row.action}
                        className="-my-3.5 inline-block py-3.5 font-medium underline decoration-[#14161A]/25 underline-offset-4 transition-colors hover:decoration-(--tpl-accent) hover:decoration-2"
                      >
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
        </div>
        {m.map.embed && (
          <Reveal delay={120} className="min-w-0 @5xl:col-span-7 @5xl:col-start-6 @5xl:flex @5xl:flex-col">
            <div className="-mx-5 @2xl:-mx-8 @5xl:-mr-12 @5xl:ml-0 @min-[96rem]:-mr-16 @5xl:flex-1">
              <MapEmbed
                embed={m.map.embed}
                title={`Peta lokasi ${m.companyName}`}
                className="aspect-[4/3] @3xl:aspect-[16/9] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[440px] @5xl:rounded-l-[10px]"
              />
            </div>
            <TextLink action={mapLink} label="Buka di Google Maps" className="mt-3" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
