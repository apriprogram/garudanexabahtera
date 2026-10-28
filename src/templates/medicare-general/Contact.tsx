// Kontak (kunci `contact`), latar kertas. Layar lebar: kiri (kolom 1-5) kepala section, kartu "Kontak darurat" (garis
// kiri merah 4px: IGD 24 jam, ambulans, nomor darurat nasional 119 — semuanya tautan tel:), lalu kartu "Informasi &
// pendaftaran" (baris label kiri, nilai kanan: telepon, WhatsApp, email, alamat, jam layanan); kanan (kolom 7-12) foto
// gedung 3:2 opsional + peta Google Maps 16:9 + "Buka di Google Maps". HP: bertumpuk, foto gedung disembunyikan.
import { Phone } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { displayPhone, type MedicareModel } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { C, CARD, GRID_GAP, SECTION_PAD, T } from './styles';
import { SectionHead, TextLink } from './ui';

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
}

const ext = (href: string): LinkAction | null => (href ? { kind: 'external', href } : null);

function Rows({ rows, tone = 'light' }: { rows: Row[]; tone?: 'light' | 'red' }) {
  return (
    <dl className="divide-y divide-[#0E1B2E]/[0.1]">
      {rows.map((row) => (
        // Nilai panjang (alamat, jam, email) di HP: label di atas, nilai rata kiri (tidak menggantung di kanan)
        <div
          key={row.key}
          className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 ${row.value.length > 18 ? '@max-xl:flex-col @max-xl:items-start' : ''}`}
        >
          <dt className={`${T.small} ${C.muted}`}>{row.label}</dt>
          <dd
            className={`max-w-[30ch] font-semibold ${row.value.length > 18 ? '@xl:ml-auto @xl:text-right' : 'ml-auto text-right'} ${T.body} ${tone === 'red' ? C.red : C.ink} [overflow-wrap:anywhere]`}
          >
            {row.action ? (
              <ActionLink
                action={row.action}
                className="-my-3 inline-flex min-h-12 items-center gap-2 py-3 underline decoration-current/30 decoration-2 underline-offset-4 transition-colors hover:decoration-current"
              >
                {row.value}
              </ActionLink>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Contact({ m }: { m: MedicareModel }) {
  const { contact } = m;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const image = text(contact, 'image');
  const emergencyTitle = text(contact, 'emergency_title');
  const infoTitle = text(contact, 'info_title');
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;

  const emergencyRows: Row[] = [
    m.igdAction && { key: 'igd', label: m.igdLabel, value: displayPhone(m.igdPhone), action: m.igdAction },
    m.ambulanceAction && { key: 'ambulance', label: 'Ambulans', value: displayPhone(m.ambulancePhone), action: m.ambulanceAction },
    // 119 = nomor darurat nasional (asli; telHref menolak nomor < 5 digit, jadi ditulis langsung)
    { key: '119', label: 'Darurat nasional', value: '119', action: ext('tel:119') },
  ].filter((row): row is Row => !!row);
  const infoRows: Row[] = [
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), action: ext(telHref(phone)) },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction },
    email && { key: 'email', label: 'Email', value: email, action: ext(mailHref(email)) },
    address && { key: 'address', label: 'Alamat', value: address, action: null },
    hours && { key: 'hours', label: 'Jam layanan', value: hours, action: null },
  ].filter((row): row is Row => !!row);
  const hasRight = hasImage(image) || !!m.map.embed;

  return (
    <TemplateSection sectionKey="contact" className={`${SECTION_PAD} ${C.paper}`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className={`min-w-0 ${hasRight ? '@5xl:col-span-5' : '@5xl:col-span-8'}`}>
          <SectionHead stack eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title') || 'Kontak'} subtitle={text(contact, 'subtitle')} />

          <Reveal delay={120} className={`mt-8 overflow-hidden border-l-4 border-[#B71C1C] p-5 @3xl:p-6 ${CARD} rounded-l-[4px]`}>
            <h3 className={`flex items-center gap-2.5 ${T.h3} ${C.red}`}>
              <Phone aria-hidden className="h-5 w-5 shrink-0" />
              {emergencyTitle || 'Kontak darurat'}
            </h3>
            <div className="mt-2">
              <Rows rows={emergencyRows} tone="red" />
            </div>
          </Reveal>

          {infoRows.length > 0 && (
            <Reveal delay={180} className={`mt-5 p-5 @3xl:p-6 ${CARD}`}>
              <h3 className={`${T.h3} ${C.ink}`}>{infoTitle || 'Informasi'}</h3>
              <div className="mt-2">
                <Rows rows={infoRows} />
              </div>
            </Reveal>
          )}
        </div>

        {hasRight && (
          <div className="min-w-0 @5xl:col-span-6 @5xl:col-start-7 @6xl:col-span-7 @6xl:col-start-6">
            {hasImage(image) && (
              <Reveal variant="fade" className="hidden @3xl:block">
                <KitPhoto
                  src={image}
                  alt={MEDICARE_PHOTOS.alt(image, `Gedung ${m.companyName}`)}
                  fallback="none"
                  zoom
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="aspect-[3/2] rounded-[12px]"
                />
              </Reveal>
            )}
            {m.map.embed && (
              <Reveal delay={120} className={hasImage(image) ? '@3xl:mt-5' : ''}>
                <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[16/9] rounded-[12px] ring-1 ring-[#0E1B2E]/[0.1]" />
                <TextLink action={mapLink} label="Buka di Google Maps" className="mt-3" />
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
