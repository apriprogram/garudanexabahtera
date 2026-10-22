// Ajakan + kontak (brief §3.4 #8–#9). Ajakan: pita hijau gelap radius 32 berkisi (gradasi panel yang sama dengan hero)
// dengan cahaya limau tipis di tepi atas, H2 putih terpusat, tombol limau + tombol unduh generik (BUKAN badge resmi
// toko aplikasi). Kontak ringkas: teks + WhatsApp di kiri, kartu info abu (email, telepon, alamat) + peta di kanan.
import { Mail, MapPin, Phone, Play, Smartphone } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, mapsInfo, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import type { FinovaModel } from './model';
import { BTN, C, CARD, SECTION_F, TYPE_F } from './styles';
import { PillLink, SectionChip } from './ui';

const STORE_ICON = { app_store: Smartphone, play_store: Play } as const;

export function StoreButtons({ m, tone }: { m: FinovaModel; tone: 'dark' | 'light' }) {
  if (m.stores.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Unduh aplikasi">
      {m.stores.map((store) => {
        const Icon = STORE_ICON[store.key];
        return (
          <li key={store.key}>
            <ActionLink
              action={store.action}
              className={`inline-flex h-12 items-center gap-2.5 rounded-full px-5 text-[14px] font-medium transition-colors ${
                tone === 'dark' ? 'bg-white/[0.06] text-white ring-1 ring-inset ring-white/20 hover:bg-white/[0.12]' : `${BTN.ink}`
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {store.label}
            </ActionLink>
          </li>
        );
      })}
    </ul>
  );
}

export function Cta({ m }: { m: FinovaModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const action = resolveAction(text(cta, 'button_url'), m.startAction);
  const label = text(cta, 'button_label');
  if (!title && !subtitle && !(action && label) && m.stores.length === 0) return null;
  return (
    <TemplateSection sectionKey="cta" className="py-6 @3xl:py-10">
      <div className={CONTAINER}>
        <Reveal
          variant="fade"
          data-tpl-tone="inverse"
          className="fin-panel relative isolate overflow-hidden rounded-[24px] px-6 py-16 text-center text-white @3xl:rounded-[32px] @3xl:px-12 @3xl:py-24"
        >
          <div aria-hidden className="fin-grid absolute inset-0 -z-10" />
          <div aria-hidden className="fin-glow absolute -top-24 left-1/2 -z-10 h-48 w-[70%] -translate-x-1/2 opacity-70" />
          {title && <h2 className={`mx-auto max-w-[20ch] text-balance text-white ${TYPE_F.h2}`}>{title}</h2>}
          {subtitle && <p className={`mx-auto mt-5 max-w-[52ch] ${TYPE_F.lead} ${C.onDark}`}>{subtitle}</p>}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 @xl:flex-row @xl:flex-wrap">
            <PillLink action={action} label={label} className={`${BTN.lime} ${BTN.lg}`} />
            <StoreButtons m={m} tone="dark" />
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function InfoCard({ icon: Icon, label, value, action, className = '' }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null; className?: string }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-(--tpl-accent-ink) ring-1 ring-inset ring-black/[0.06]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] ${C.muted}`}>{label}</span>
        <span className="mt-1 block text-[16px] font-medium leading-snug text-[#0B0F0E] [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  const box = `${CARD.bento} flex items-start gap-4 p-5 @3xl:p-6 ${className}`;
  return action ? (
    <ActionLink action={action} className={`${box} transition-colors hover:bg-[#E8ECEA]`}>
      {body}
    </ActionLink>
  ) : (
    <div className={box}>{body}</div>
  );
}

export function Contact({ m }: { m: FinovaModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const title = text(contact, 'title');
  const subtitle = text(contact, 'subtitle');
  const email = text(contact, 'email');
  const phone = text(contact, 'phone');
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const mail = mailHref(email);
  const tel = telHref(phone);
  const map = mapsInfo(text(contact, 'maps_url'), address);
  const cards = [
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    address && { key: 'address', icon: MapPin, label: 'Alamat', value: address, action: map.link ? ({ kind: 'external', href: map.link } as LinkAction) : null },
  ].filter((card): card is Exclude<typeof card, '' | false> => !!card);

  return (
    <TemplateSection sectionKey="contact" className={SECTION_F}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionChip>{eyebrow}</SectionChip>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-[#0B0F0E] ${TYPE_F.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] ${TYPE_F.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {(m.waAction || hours) && (
            <Reveal delay={240} className="mt-9 flex flex-col items-start gap-4">
              {m.waAction && m.whatsapp && (
                <ActionLink action={m.waAction} className={`${BTN.ink} ${BTN.plainLg}`}>
                  <WhatsAppIcon className="h-5 w-5 shrink-0 text-(--fin-hl)" />
                  Chat WhatsApp {m.whatsapp}
                </ActionLink>
              )}
              {hours && <p className={`text-[14px] ${C.muted}`}>Jam layanan: {hours}</p>}
            </Reveal>
          )}
        </div>
        {(cards.length > 0 || map.embed) && (
          <div className="grid gap-4 @3xl:grid-cols-2 @5xl:col-span-7">
            {cards.map((card, i) => (
              <Reveal key={card.key} delay={stagger(i)} className={card.key === 'address' ? '@3xl:col-span-2' : ''}>
                <InfoCard icon={card.icon} label={card.label} value={card.value} action={card.action} className="h-full" />
              </Reveal>
            ))}
            {map.embed && (
              <Reveal delay={240} className="@3xl:col-span-2">
                <MapEmbed embed={map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[16/9] rounded-[24px] @3xl:aspect-[16/6]" />
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
