// Pita ajakan (kunci `cta`) + kontak & formulir penawaran (kunci `contact`).
// Ajakan: SATU-SATUNYA pita gelap — espresso selebar layar (data-tpl-tone="inverse"), lengkung hantu bergaris tipis di
// belakang kanan, label & frasa miring versi terang tema (--sg-bright ≥ 5:1), pil kertas + tautan berpanah, foto
// lengkung opsional di kanan (HP: paling bawah, 80% lebar). Tanpa foto → teks terpusat.
// Kontak (latar putih): kiri label → H2 → deskripsi → daftar kontak bergaris rambut (alamat, telepon, email, WhatsApp,
// jam kerja) → peta Google Maps; kanan formulir permintaan penawaran di kartu kraft (./InquiryForm). HP: kepala →
// formulir → kontak → peta.
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { InquiryForm } from './InquiryForm';
import { keepRanges, type QuotePreset, type SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, SECTION_PAD, TYPE_S } from './styles';
import { ArrowLink, Highlighted, InkPill, Label, SectionHead } from './ui';

/**
 * Lengkung hantu dekoratif di pita espresso (garis 1px putih 8%). Hanya mulai @6xl (1152px): di bawahnya, termasuk
 * laptop 1024px, garis lengkung luar memotong paragraf ajakan.
 */
function GhostArch() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 480 640"
      fill="none"
      className="pointer-events-none absolute -right-10 top-1/2 hidden h-[135%] w-auto -translate-y-1/2 text-white/[0.08] @6xl:block"
    >
      <path d="M40 640V240a200 200 0 0 1 400 0v400" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M96 640V248a144 144 0 0 1 288 0v392" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Cta({ m }: { m: SaudagarModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const image = text(cta, 'image');
  const withImage = hasImage(image);
  const action = m.linkOr(text(cta, 'button_url'), m.quoteAction);
  const secondary = m.linkOr(text(cta, 'secondary_url'), m.waAction);
  const buttonLabel = text(cta, 'button_label');
  const secondaryLabel = text(cta, 'secondary_label');
  if (!title && !subtitle && !(action && buttonLabel)) return null;

  return (
    <TemplateSection sectionKey="cta" data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-[#2A1D15] py-20 text-[#F7F2E8] @5xl:py-28">
      <GhostArch />
      <div className={`${CONTAINER} relative grid items-center gap-12 @5xl:grid-cols-12 @5xl:gap-8`}>
        <div className={`min-w-0 ${withImage ? '@5xl:col-span-7' : `mx-auto max-w-[760px] text-center @5xl:col-span-12`}`}>
          {text(cta, 'eyebrow') && (
            <Reveal variant="fade">
              <Label tone="dark">{text(cta, 'eyebrow')}</Label>
            </Reveal>
          )}
          {/* H2 tetap ada untuk pembaca layar walau judul kosong */}
          <Reveal as="h2" delay={80} className={`mt-4 text-balance ${withImage ? 'max-w-[20ch]' : 'mx-auto max-w-[20ch]'} ${title ? '' : 'sr-only'} text-[#F7F2E8] ${TYPE_S.h2}`}>
            {title ? <Highlighted title={title} highlight={text(cta, 'highlight')} tone="dark" /> : buttonLabel || m.companyName}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[56ch] text-pretty text-[#CBBBA6] ${withImage ? '' : 'mx-auto'} ${TYPE_S.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {((action && buttonLabel) || (secondary && secondaryLabel)) && (
            <Reveal delay={240} className={`mt-9 flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @xl:gap-7 ${withImage ? '' : '@xl:justify-center'}`}>
              <InkPill action={action} label={buttonLabel} variant="paper" className="w-full @xl:w-auto" />
              <ArrowLink action={secondary} label={secondaryLabel} tone="dark" className="self-center" />
            </Reveal>
          )}
        </div>
        {withImage && (
          <Reveal variant="fade" delay={160} className="mx-auto w-4/5 max-w-[360px] @5xl:col-span-4 @5xl:col-start-9 @5xl:w-full">
            <KitPhoto
              src={image}
              alt={SAUDAGAR_PHOTOS.alt(image, `Pengiriman hasil bumi ${m.companyName}`)}
              zoom
              sizes="(min-width: 1024px) 28vw, 80vw"
              className={`aspect-[4/5] ${ARCH}`}
            />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Label kiri bila kolom cukup lebar; laptop kecil (kolom kontak sempit) → label di atas agar email tidak terpotong
    <div className="grid min-h-16 gap-1 py-3 @xl:grid-cols-[8.5rem_minmax(0,1fr)] @xl:items-center @xl:gap-4 @5xl:grid-cols-1 @5xl:gap-1 @7xl:grid-cols-[8.5rem_minmax(0,1fr)] @7xl:gap-4">
      <dt className={`text-[13px] leading-snug ${C.muted}`}>{label}</dt>
      <dd className={`min-w-0 text-pretty text-[15.5px] leading-snug [overflow-wrap:anywhere] ${C.ink}`}>{children}</dd>
    </div>
  );
}

export function Contact({ m, preset }: { m: SaudagarModel; preset: QuotePreset }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;

  return (
    <TemplateSection sectionKey="contact" className={`bg-white ${SECTION_PAD}`}>
      {/* Baris layar lebar: kepala (auto) + kontak (1fr); formulir merentang dua baris tanpa mendorong kontak turun */}
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-8 @5xl:gap-y-10 @7xl:gap-x-12`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title') || 'Kontak'} subtitle={text(contact, 'subtitle')} />
        </div>

        <Reveal delay={120} className="min-w-0 @5xl:col-span-7 @5xl:col-start-6 @5xl:row-start-1 @5xl:row-end-3 @5xl:self-start">
          <InquiryForm m={m} preset={preset} />
        </Reveal>

        {(address || phone || email || m.waAction || hours || m.map.embed) && (
          <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-2">
            {(address || phone || email || m.waAction || hours) && (
              <dl className={`divide-y border-y ${C.line} ${C.divide}`}>
                {address && (
                  <InfoRow label="Alamat">
                    <address className="not-italic">{address}</address>
                  </InfoRow>
                )}
                {phone && <InfoRow label="Telepon">{tel ? <ArrowLink action={{ kind: 'external', href: tel }} label={phone} /> : phone}</InfoRow>}
                {email && (
                  <InfoRow label="Email">
                    {mail ? (
                      <ArrowLink action={{ kind: 'external', href: mail }} label={email} className="[overflow-wrap:anywhere]" />
                    ) : (
                      email
                    )}
                  </InfoRow>
                )}
                {m.waAction && (
                  <InfoRow label="WhatsApp">
                    <ArrowLink action={m.waAction} label="Chat di WhatsApp" />
                  </InfoRow>
                )}
                {hours && <InfoRow label="Jam kerja">{keepRanges(hours)}</InfoRow>}
              </dl>
            )}
            {m.map.embed && (
              <Reveal delay={160} className="mt-8">
                <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[4px] ring-1 ring-inset ring-[#221A13]/[0.08]" />
                {mapLink && <ArrowLink action={mapLink} label="Buka di Google Maps" className="mt-3" />}
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
