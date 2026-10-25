// Ajakan + kontak. Ajakan: pita warna aksen (terakota) membulat di dalam gutter halaman — kiri label, judul serif
// dengan kata miring, deskripsi, tombol krem; kanan foto membulat. Tanpa foto → teks melebar. Kontak: judul kiri,
// kartu info berikon (WhatsApp, telepon, email, jam layanan, alamat + "Buka di Google Maps") di kanan, tanpa peta
// tersemat (halaman tetap ringan; toko online jarang butuh peta).
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, mapsInfo, resolveAction, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { GlowModel } from './model';
import { BTN, C, MONO, TYPE_G } from './styles';
import { Eyebrow, Highlighted, PillLink } from './ui';

export function Cta({ m }: { m: GlowModel }) {
  const { cta } = m;
  const eyebrow = text(cta, 'eyebrow');
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const image = text(cta, 'image');
  const label = text(cta, 'button_label');
  const action = resolveAction(text(cta, 'button_url'), m.askAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  if (!title && !subtitle && !(action && label)) return null;
  const withImage = hasImage(image);

  return (
    <TemplateSection sectionKey="cta" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <Reveal
          variant="fade"
          data-tpl-tone="inverse"
          className={`grid items-center gap-6 overflow-hidden rounded-[28px] bg-(--tpl-accent) p-3 text-(--tpl-on-accent) @3xl:rounded-[36px] @3xl:p-4 ${withImage ? '@4xl:grid-cols-2' : ''}`}
        >
          <div className={`px-4 py-8 @3xl:px-10 @3xl:py-12 ${withImage ? '' : 'mx-auto max-w-[720px] text-center'}`}>
            {eyebrow && <Eyebrow tone="dark" className={withImage ? '' : 'justify-center'}>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className={`${eyebrow ? 'mt-4' : ''} max-w-[16ch] text-balance ${withImage ? '' : 'mx-auto'} ${TYPE_G.h2}`}>
                <Highlighted title={title} highlight={text(cta, 'highlight')} tone="plain" />
              </h2>
            )}
            {subtitle && <p className={`mt-4 max-w-[46ch] text-[16px] leading-relaxed opacity-90 ${withImage ? '' : 'mx-auto'}`}>{subtitle}</p>}
            {action && label && (
              <ActionLink action={action} className={`${BTN.cream} ${BTN.lg} group mt-7`}>
                {isWa && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
                <span className="truncate">{label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </ActionLink>
            )}
          </div>
          {withImage && <KitPhoto src={image} alt="" fallback="none" zoom sizes="(min-width: 896px) 45vw, 100vw" className="aspect-[4/3] rounded-[22px] @3xl:rounded-[26px]" />}
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function InfoCard({ icon: Icon, label, value, action, extra }: { icon: typeof Mail; label: string; value: string; action: LinkAction | null; extra?: ReactNode }) {
  const body = (
    <>
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--gs-accent-soft) text-(--gs-accent-text)">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block ${MONO} text-[10.5px] ${C.muted}`}>{label}</span>
        <span className="mt-1 block text-[16px] font-medium leading-snug text-[#2B211C] [overflow-wrap:anywhere]">{value}</span>
      </span>
    </>
  );
  return (
    <div className="flex h-full flex-col gap-3 rounded-[22px] bg-[#FCFAF6] p-5">
      {action ? (
        <ActionLink action={action} className="flex items-start gap-4 rounded-2xl transition-colors hover:text-(--gs-accent-text)">
          {body}
        </ActionLink>
      ) : (
        <div className="flex items-start gap-4">{body}</div>
      )}
      {extra}
    </div>
  );
}

export function Contact({ m }: { m: GlowModel }) {
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
  const cards = [
    phone && { key: 'phone', icon: Phone, label: 'Telepon', value: phone, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    email && { key: 'email', icon: Mail, label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', icon: Clock, label: 'Jam layanan', value: hours, action: null },
    address && {
      key: 'address',
      icon: MapPin,
      label: 'Ambil di gudang',
      value: address,
      action: null,
      extra: map.link ? (
        <ActionLink action={{ kind: 'external', href: map.link }} className="mt-auto inline-flex min-h-10 items-center gap-1.5 self-start pl-[60px] text-[14px] font-medium text-(--gs-accent-text)">
          Buka di Google Maps
          <ArrowRight className="h-4 w-4" aria-hidden />
        </ActionLink>
      ) : undefined,
    },
  ].filter((row): row is Exclude<typeof row, '' | false> => !!row);
  if (!title && cards.length === 0 && !m.waAction) return null;

  return (
    <TemplateSection sectionKey="contact" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[14ch] text-balance ${C.ink} ${TYPE_G.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-4 max-w-[44ch] ${TYPE_G.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {m.waAction && m.whatsapp && (
            <Reveal delay={240} className="mt-8">
              <PillLink action={m.waAction} label={`WhatsApp ${m.whatsapp}`} className={`${BTN.dark} ${BTN.lg}`} />
            </Reveal>
          )}
        </div>
        {cards.length > 0 && (
          <ul className="grid gap-3 @2xl:grid-cols-2 @5xl:col-span-7 @5xl:gap-4">
            {cards.map((card, i) => (
              <Reveal as="li" key={card.key} delay={stagger(i, 70)} className={card.key === 'address' && cards.length % 2 === 1 ? '@2xl:col-span-2' : ''}>
                <InfoCard icon={card.icon} label={card.label} value={card.value} action={card.action} extra={'extra' in card ? card.extra : undefined} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

