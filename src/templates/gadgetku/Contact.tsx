// Kontak & toko (kunci `contact`): kiri label + H2 + deskripsi + tombol WhatsApp hitam dan "Buka peta"; kanan kartu abu
// muda berikon: alamat toko, jam buka, telepon & email, dan toko di marketplace (Shopee, Tokopedia). Tanpa peta tersemat
// agar halaman tetap ringan (peta dibuka di Google Maps). HP: semua bertumpuk.
import { Clock, Mail, MapPin, Phone, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, mapsInfo, safeUrl, telHref, text } from '../shared/utils';
import type { GadgetkuModel } from './model';
import { BTN, C, TYPE_G } from './styles';
import { PillLink, SectionLabel } from './ui';

const LINK = 'font-medium text-[#0B0C0E] underline-offset-4 hover:underline';

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex h-full gap-4 rounded-[24px] bg-[#F2F3F5] p-5 @3xl:p-6">
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0B0C0E]">
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-[15px] font-semibold text-[#0B0C0E]">{title}</h3>
        <div className={`mt-1 space-y-1 text-[14.5px] leading-relaxed [overflow-wrap:anywhere] ${C.muted}`}>{children}</div>
      </div>
    </div>
  );
}

export function Contact({ m }: { m: GadgetkuModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title');
  const subtitle = text(contact, 'subtitle');
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const maps = mapsInfo(text(contact, 'maps_url'), address).link;
  const markets = [
    { key: 'shopee', label: 'Shopee', href: safeUrl(text(contact, 'shopee_url')) },
    { key: 'tokopedia', label: 'Tokopedia', href: safeUrl(text(contact, 'tokopedia_url')) },
  ].filter((s): s is { key: string; label: string; href: string } => !!s.href);

  const cards = [
    address && (
      <InfoCard key="address" icon={<MapPin className="h-5 w-5" />} title="Alamat toko">
        <p>{address}</p>
        {maps && (
          <ActionLink action={{ kind: 'external', href: maps }} className={LINK}>
            Buka peta
          </ActionLink>
        )}
      </InfoCard>
    ),
    hours && (
      <InfoCard key="hours" icon={<Clock className="h-5 w-5" />} title="Jam buka">
        <p>{hours}</p>
      </InfoCard>
    ),
    (phone || email) && (
      <InfoCard key="reach" icon={phone ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />} title="Telepon & email">
        {phone && (tel ? <ActionLink action={{ kind: 'external', href: tel }} className={`${LINK} block`}>{phone}</ActionLink> : <p>{phone}</p>)}
        {email && (mail ? <ActionLink action={{ kind: 'external', href: mail }} className={`${LINK} block`}>{email}</ActionLink> : <p>{email}</p>)}
      </InfoCard>
    ),
    markets.length > 0 && (
      <InfoCard key="markets" icon={<Store className="h-5 w-5" />} title="Juga ada di marketplace">
        <ul className="flex flex-wrap gap-2 pt-1">
          {markets.map((s) => (
            <li key={s.key}>
              <ActionLink
                action={{ kind: 'external', href: s.href }}
                className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13.5px] font-medium text-[#0B0C0E] ring-1 ring-inset ring-black/[0.08] transition-colors hover:ring-black/25"
              >
                {s.label}
              </ActionLink>
            </li>
          ))}
        </ul>
      </InfoCard>
    ),
  ].filter(Boolean);

  if (!title && cards.length === 0 && !m.waAction) return null;

  return (
    <TemplateSection sectionKey="contact" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionLabel>{eyebrow}</SectionLabel>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[15ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-4 max-w-[44ch] ${TYPE_G.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {(m.waAction || maps) && (
            <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row">
              <PillLink
                action={m.waAction}
                label={`WhatsApp ${m.whatsapp}`}
                arrow={false}
                icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />}
                className={`${BTN.ink} ${BTN.lg}`}
              />
              {maps && (
                <ActionLink action={{ kind: 'external', href: maps }} className={`${BTN.ghost} ${BTN.lg}`}>
                  <MapPin className="h-4 w-4" aria-hidden />
                  Buka peta toko
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>
        {cards.length > 0 && (
          <ul className="grid gap-3 @xl:grid-cols-2 @5xl:col-span-7">
            {cards.map((card, i) => (
              <Reveal as="li" key={i} delay={stagger(i, 70)}>
                {card}
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
