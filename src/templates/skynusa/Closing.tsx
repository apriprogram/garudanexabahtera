// Ajakan + kontak. Ajakan: panel foto radius 24 di dalam gutter halaman (foto bukit berkabut + lapisan gelap teal,
// cincin garis tipis bergaya indikator di kanan — aksen referensi Lanot), judul dua nada rata kiri, deskripsi, tombol
// mint WhatsApp + tombol kaca ke Sewa. Tanpa foto → gradasi teal-arang. Kontak: teks + baris info berikon (alamat,
// telepon, email, jam buka) + tombol WhatsApp di kiri, peta di kanan.
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, mapsInfo, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SkyNusaModel } from './model';
import { BTN, C, MONO, TYPE_S } from './styles';
import { ButtonLink, SectionHead, Toned } from './ui';

/** Cincin indikator bergaris tipis (dekoratif). */
function Rings() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden focusable="false" className="pointer-events-none absolute -right-16 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 text-white @5xl:block">
      <g fill="none" stroke="currentColor">
        <circle cx="160" cy="160" r="158" strokeOpacity=".14" />
        <circle cx="160" cy="160" r="118" strokeOpacity=".22" strokeDasharray="2 7" />
        <circle cx="160" cy="160" r="78" strokeOpacity=".3" />
        <path d="M160 0v24M160 296v24M0 160h24M296 160h24" strokeOpacity=".35" />
      </g>
    </svg>
  );
}

export function Cta({ m }: { m: SkyNusaModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const image = text(cta, 'image');
  const label = text(cta, 'button_label');
  const action = resolveAction(text(cta, 'button_url'), m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const rentalAction: LinkAction | null = m.shown('rental') ? { kind: 'section', target: 'rental' } : null;
  if (!title && !subtitle && !(action && label)) return null;

  return (
    <TemplateSection sectionKey="cta" className="bg-white py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <Reveal variant="fade" data-tpl-tone="inverse" className="relative isolate overflow-hidden rounded-[24px] px-6 py-14 text-white @3xl:px-12 @3xl:py-20 @6xl:px-16 @6xl:py-24">
          {hasImage(image) ? (
            <KitPhoto src={image} alt="" fallback="none" parallax={5} sizes="(min-width: 1680px) 1600px, 100vw" className="absolute inset-0 -z-20" />
          ) : (
            <div aria-hidden className="sn-cta-fallback absolute inset-0 -z-20" />
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(9_17_19/0.86)_0%,rgb(9_17_19/0.62)_55%,rgb(9_17_19/0.35)_100%)]" />
          <Rings />
          <div className="max-w-[640px]">
            {title && (
              <h2 className={`text-balance text-white ${TYPE_S.h2}`}>
                <Toned title={title} highlight={text(cta, 'highlight')} tone="dark" />
              </h2>
            )}
            {subtitle && <p className={`mt-5 max-w-[48ch] text-white/80 ${TYPE_S.lead}`}>{subtitle}</p>}
            <div className="mt-9 flex flex-col items-stretch gap-3 @xl:flex-row @xl:items-center">
              <ButtonLink
                action={action}
                label={label}
                variant="mint"
                icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                className={`${BTN.mint} ${BTN.lg} justify-between`}
              />
              {rentalAction && <ButtonLink action={rentalAction} label="Lihat Sewa Harian" variant="glass" className={`${BTN.glass} ${BTN.lg} justify-between`} />}
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#F2F5F5] text-(--tpl-accent-ink) ring-1 ring-inset ring-black/[0.04]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block ${MONO} ${C.muted}`}>{label}</span>
        <span className="mt-1 block text-[16px] font-medium leading-snug text-[#0E1A1C] [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  return action ? (
    <ActionLink action={action} className="flex items-start gap-4 rounded-[12px] py-1 transition-colors hover:text-(--tpl-accent-ink)">
      {body}
    </ActionLink>
  ) : (
    <div className="flex items-start gap-4 py-1">{body}</div>
  );
}

export function Contact({ m }: { m: SkyNusaModel }) {
  const { contact } = m;
  const title = text(contact, 'title');
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
    <TemplateSection sectionKey="contact" className={`${SECTION_Y} bg-white`}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} title={title} subtitle={text(contact, 'subtitle')} />
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
              <ButtonLink action={m.waAction} label={`WhatsApp ${m.whatsapp}`} variant="ink" icon={<WhatsAppIcon className="h-5 w-5 shrink-0" />} className={`${BTN.ink} ${BTN.lg}`} />
            </Reveal>
          )}
        </div>
        {map.embed && (
          <Reveal delay={160} className="min-w-0 @5xl:col-span-7">
            <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[20px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[460px]" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
