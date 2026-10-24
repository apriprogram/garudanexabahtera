// Ajakan + kontak. Ajakan: panel foto senja radius 40 di dalam gutter halaman (lapisan gelap tipis, tanpa bayangan),
// judul terpusat dengan kata sorotan pastel, tombol pil putih + tombol kaca ke Paket. Tanpa foto → gradasi warna
// aksen. Kontak: teks + baris info berikon (alamat, telepon, email, jam buka) + tombol WhatsApp di kiri, peta di kanan.
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, isEnabled, list, mailHref, mapsInfo, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SerenityModel } from './model';
import { BTN, C, TYPE_S } from './styles';
import { Highlighted, PillLink, SectionLabel } from './ui';

export function Cta({ m }: { m: SerenityModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const image = text(cta, 'image');
  const label = text(cta, 'button_label');
  const action = resolveAction(text(cta, 'button_url'), m.startAction);
  const pricingShown = isEnabled(m.pricing) && list(m.pricing, 'items').length > 0;
  if (!title && !subtitle && !(action && label)) return null;

  return (
    <TemplateSection sectionKey="cta" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <Reveal
          variant="fade"
          data-tpl-tone="inverse"
          className="relative isolate overflow-hidden rounded-[32px] px-6 py-16 text-center text-white @3xl:rounded-[40px] @3xl:px-12 @3xl:py-24 @6xl:py-28"
        >
          {hasImage(image) ? (
            <KitPhoto src={image} alt="" fallback="none" parallax={5} sizes="(min-width: 1680px) 1600px, 100vw" className="absolute inset-0 -z-20" />
          ) : (
            <div aria-hidden className="sr-cta-fallback absolute inset-0 -z-20" />
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(12_14_42/0.62)_0%,rgb(12_14_42/0.4)_70%)]" />
          {title && (
            <h2 className={`mx-auto max-w-[18ch] text-balance text-white ${TYPE_S.h2}`}>
              <Highlighted title={title} highlight={text(cta, 'highlight')} tone="dark" />
            </h2>
          )}
          {subtitle && <p className={`mx-auto mt-5 max-w-[50ch] text-white/90 ${TYPE_S.lead}`}>{subtitle}</p>}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 @xl:flex-row">
            <PillLink action={action} label={label} className={`${BTN.white} ${BTN.lg}`} />
            {pricingShown && (
              <ActionLink action={{ kind: 'section', target: 'pricing' }} className={`${BTN.glass} ${BTN.lg}`}>
                Lihat paket
              </ActionLink>
            )}
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F4FA] text-(--tpl-accent-ink)">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] ${C.muted}`}>{label}</span>
        <span className="mt-0.5 block text-[16px] font-medium leading-snug text-[#151833] [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="flex items-start gap-4 rounded-2xl py-1 transition-colors hover:text-(--tpl-accent-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: SerenityModel }) {
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
  const map = mapsInfo(text(contact, 'maps_url'), address);
  const rows = [
    address && { key: 'address', icon: MapPin, label: 'Alamat', value: address, action: map.link ? ({ kind: 'external', href: map.link } as LinkAction) : null },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', icon: Clock, label: 'Jam buka', value: hours, action: null },
  ].filter((row): row is Exclude<typeof row, '' | false> => !!row);
  if (!title && rows.length === 0 && !m.waAction) return null;

  return (
    <TemplateSection sectionKey="contact" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionLabel>{eyebrow}</SectionLabel>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] ${TYPE_S.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {rows.length > 0 && (
            <ul className="mt-9 space-y-4">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)}>
                  <InfoRow icon={row.icon} label={row.label} value={row.value} action={row.action} />
                </Reveal>
              ))}
            </ul>
          )}
          {m.waAction && m.whatsapp && (
            <Reveal delay={240} className="mt-9">
              <ActionLink action={m.waAction} className={`${BTN.ink} ${BTN.lg} group`}>
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                WhatsApp {m.whatsapp}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </ActionLink>
            </Reveal>
          )}
        </div>
        {map.embed && (
          <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
            <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[28px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[440px]" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
