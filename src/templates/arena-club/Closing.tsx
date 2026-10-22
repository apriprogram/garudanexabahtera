// Ajakan (blok membulat dengan foto lapangan malam + scrim navy) dan kontak (jam, alamat, WhatsApp, peta membulat)
// — brief §1.4 #11–#12.
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, mapsInfo, resolveAction, telHref, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { ArenaModel } from './model';
import { BTN, C, CARD, TYPE_A } from './styles';
import { PillLink, SectionPill } from './ui';

// ─── Ajakan ───────────────────────────────────────────────────────────────────

export function Cta({ m }: { m: ArenaModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const label = text(cta, 'button_label');
  const action = resolveAction(text(cta, 'button_url'), m.bookAction);
  const image = text(cta, 'image');
  if (!title && !subtitle) return null;

  return (
    <TemplateSection sectionKey="cta" className="pb-16 @3xl:pb-24">
      <div className={CONTAINER}>
        <Reveal variant="scale">
          <div
            data-tpl-tone="inverse"
            className={`relative isolate overflow-hidden px-6 py-16 text-center text-white @3xl:px-12 @3xl:py-24 @5xl:py-28 ${CARD.radius} ${C.navyBg}`}
          >
            {hasImage(image) ? (
              <>
                <KitPhoto src={image} alt="" fallback="none" parallax={6} position="50% 70%" sizes="(min-width: 1680px) 1552px, 100vw" className="absolute inset-0" />
                <div aria-hidden className="absolute inset-0 bg-[#0E1B2E]/70" />
              </>
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 opacity-25 [background-image:linear-gradient(var(--tpl-accent)_1px,transparent_1px),linear-gradient(90deg,var(--tpl-accent)_1px,transparent_1px)] [background-position:center] [background-size:120px_80px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
              />
            )}
            <div className="relative mx-auto flex max-w-[720px] flex-col items-center">
              {title && <h2 className={`text-balance ${TYPE_A.h2} font-light`}>{title}</h2>}
              {subtitle && <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed text-white/85 @3xl:text-[17px]">{subtitle}</p>}
              <PillLink action={action} label={label} className={`${BTN.accent} ${BTN.lg} mt-9 w-full @xl:w-auto`} />
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

// ─── Kontak ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 border-t border-[#0B1220]/[0.08] py-4 first:border-t-0 first:pt-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-(--tpl-accent-ink)" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-medium uppercase tracking-[0.12em] ${C.muted}`}>{label}</span>
        <span className={`mt-1 block text-[15px] leading-relaxed ${C.ink}`}>{children}</span>
      </span>
    </li>
  );
}

export function Contact({ m }: { m: ArenaModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title');
  const subtitle = text(contact, 'subtitle');
  const address = text(contact, 'address');
  const email = text(contact, 'email');
  const phone = text(contact, 'phone');
  const hours = text(contact, 'hours');
  const mail = mailHref(email);
  const tel = telHref(phone);
  const map = mapsInfo(text(contact, 'maps_url'), address);
  const link = 'underline decoration-[#0B1220]/20 underline-offset-4 transition-colors hover:decoration-(--tpl-accent-ink) [overflow-wrap:anywhere]';

  return (
    <TemplateSection sectionKey="contact" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <Reveal className="@5xl:col-span-5">
          <SectionPill>{eyebrow}</SectionPill>
          {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${TYPE_A.h2} ${C.ink}`}>{title}</h2>}
          {subtitle && <p className={`mt-4 max-w-[46ch] ${TYPE_A.lead} ${C.muted}`}>{subtitle}</p>}
          {(hours || address || (phone && tel) || (email && mail)) && (
            <ul className="mt-8">
              {hours && (
                <InfoRow icon={<Clock className="h-[18px] w-[18px]" />} label="Jam buka">
                  {hours}
                </InfoRow>
              )}
              {address && (
                <InfoRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Alamat">
                  {map.link ? (
                    <ActionLink action={{ kind: 'external', href: map.link }} className={link}>
                      {address}
                    </ActionLink>
                  ) : (
                    address
                  )}
                </InfoRow>
              )}
              {phone && tel && (
                <InfoRow icon={<Phone className="h-[18px] w-[18px]" />} label="Telepon">
                  <ActionLink action={{ kind: 'external', href: tel }} className={link}>
                    {phone}
                  </ActionLink>
                </InfoRow>
              )}
              {email && mail && (
                <InfoRow icon={<Mail className="h-[18px] w-[18px]" />} label="Email">
                  <ActionLink action={{ kind: 'external', href: mail }} className={link}>
                    {email}
                  </ActionLink>
                </InfoRow>
              )}
            </ul>
          )}
          {m.waAction && (
            <ActionLink action={m.waAction} className={`${BTN.navy} ${BTN.lg} mt-8 w-full @xl:w-auto`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Chat lewat WhatsApp
            </ActionLink>
          )}
        </Reveal>
        <Reveal delay={120} className="@5xl:col-span-7">
          <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className={`h-[320px] @3xl:h-[420px] @5xl:h-full @5xl:min-h-[460px] ${CARD.radius}`} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
