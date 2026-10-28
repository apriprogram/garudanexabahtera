// Kontak & lokasi (kunci `contact`), halaman putih. Kiri (kolom 1-5): label, H2, pengantar, baris kontak label-nilai
// (label mono kiri: ALAMAT, TELEPON, WHATSAPP, EMAIL, JAM LAYANAN; nilai kanan bertautan tel:/WhatsApp/mailto:), tabel
// kecil "Jam layanan per unit" (th scope=row), dan catatan darurat (merah tua di latar merah muda, tombol telepon 119).
// Kanan (kolom 7-12): foto lobi 3:2 (opsional) + peta Google Maps 16:10 + "Buka di Google Maps". HP: bertumpuk.
import { PhoneCall, TriangleAlert } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { displayPhone, type SpxModel } from './model';
import { SPECIALISTPLUS_PHOTOS } from './photos';
import { C, MONO_LABEL, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

/** Rentang jam "06.30–21.00" tidak dipatahkan di tanda pisah (baris boleh patah di spasi). */
const keepRanges = (value: string) => value.replace(/\s*([–—-])\s*/g, '⁠$1⁠');

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
}

export function Contact({ m }: { m: SpxModel }) {
  const { contact } = m;
  const eyebrow = text(contact, 'eyebrow');
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const emergency = text(contact, 'emergency');
  const image = text(contact, 'image');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const units = list(contact, 'units', 6).filter((u) => field(u, 'label') && field(u, 'value'));
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Alamat', value: address, action: null },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction },
    email && { key: 'email', label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Row => !!row);
  const photo = hasImage(image);
  const media = photo || !!m.map.embed;

  return (
    <TemplateSection sectionKey="contact" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-10`}>
        <div className={`min-w-0 ${media ? '@5xl:col-span-5' : '@5xl:col-span-8'}`}>
          <SectionHead
            layout="stack"
            eyebrow={eyebrow}
            code={m.code('contact')}
            title={text(contact, 'title') || 'Kontak'}
            subtitle={text(contact, 'subtitle')}
          />

          {rows.length > 0 && (
            <dl className={`mt-9 divide-y border-y ${C.line} ${C.divide}`}>
              {rows.map((row, i) => (
                <Reveal key={row.key} delay={stagger(i, 60)} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                  <dt className={`${MONO_LABEL} ${C.muted}`}>{row.label}</dt>
                  <dd className={`ml-auto max-w-[34ch] text-balance text-right text-[15px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                    {row.action ? (
                      <ActionLink
                        action={row.action}
                        className="-my-3 inline-block py-3 underline decoration-[#0D1B2A]/25 underline-offset-4 transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)"
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

          {units.length > 0 && (
            <Reveal delay={120} className="mt-8">
              <table className="w-full border-collapse text-left">
                <caption className={`mb-3 text-left ${MONO_LABEL} ${C.muted}`}>Jam layanan per unit</caption>
                <tbody className={`divide-y ${C.divide}`}>
                  {units.map((unit, i) => (
                    <tr key={`${field(unit, 'label')}-${i}`} className={i % 2 === 0 ? C.surface : ''}>
                      <th scope="row" className={`px-3 py-2.5 text-[14px] font-medium leading-snug ${C.ink} @3xl:px-3.5`}>
                        {field(unit, 'label')}
                      </th>
                      <td className={`px-3 py-2.5 text-right font-mono text-[12.5px] tabular-nums ${C.ink} @3xl:px-3.5 @3xl:text-[13px]`}>{keepRanges(field(unit, 'value'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          )}

          {emergency && (
            <Reveal delay={160} className="mt-8 rounded-[8px] bg-[#FDEDED] p-4 ring-1 ring-inset ring-[#9F1D1D]/20 @3xl:p-5">
              <p className="flex items-start gap-3 text-[14.5px] leading-snug text-[#9F1D1D]">
                <TriangleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
                <span>{emergency}</span>
              </p>
              <ActionLink
                action={{ kind: 'external', href: 'tel:119' }}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#9F1D1D] px-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#7F1717] @3xl:ml-8"
              >
                <PhoneCall aria-hidden className="h-4 w-4" />
                Telepon 119
              </ActionLink>
            </Reveal>
          )}
        </div>

        {media && (
          // Tablet: foto & peta berdampingan (tidak dua bidang selebar layar); layar lebar: bertumpuk di kolom kanan
          <div className={`min-w-0 @5xl:col-span-6 @5xl:col-start-7 ${photo && m.map.embed ? '@3xl:grid @3xl:grid-cols-2 @3xl:gap-5 @5xl:block' : ''}`}>
            {photo && (
              <Reveal variant="fade">
                <KitPhoto
                  src={image}
                  alt={SPECIALISTPLUS_PHOTOS.alt(image, `Gedung ${m.companyName}`)}
                  fallback="none"
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="aspect-[3/2] rounded-[8px]"
                />
              </Reveal>
            )}
            {m.map.embed && (
              <Reveal delay={120} className={photo ? 'mt-5 @3xl:mt-0 @5xl:mt-5' : ''}>
                <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[16/10] rounded-[8px] ring-1 ring-[#0D1B2A]/[0.12]" />
                <TextLink action={mapLink} label="Buka di Google Maps" className="mt-2" />
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
