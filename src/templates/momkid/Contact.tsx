// Kontak (kunci `contact`): kiri (kolom 1-5) kepala section, baris kontak (doodle di lingkaran pastel, label kecil,
// nilai bertautan tel:/mailto:/WhatsApp), dan peta Google Maps radius 28 + "Buka di Google Maps"; kanan (kolom 7-12)
// formulir pendaftaran kunjungan (./VisitForm) lalu KOTAK DARURAT kuning mentega (judul, kalimat "segera ke IGD /
// telepon 119", tombol telepon IGD bila diisi + telepon 119). HP: kepala → formulir → kotak darurat → kontak → peta.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { Doodle } from './art';
import type { DoodleName } from './icons';
import { displayPhone, type MomkidModel } from './model';
import { BG, BTN, C, DISPLAY, GRID_GAP, PASTELS, TONE_BG } from './styles';
import { SectionHead, TextLink } from './ui';
import { VisitForm } from './VisitForm';

interface Row {
  key: string;
  label: string;
  value: string;
  doodle: DoodleName;
  action: LinkAction | null;
}

/** Kalimat darurat bawaan bila isian CMS kosong. */
const EMERGENCY_TEXT = 'Jangan menunggu balasan chat. Datang langsung ke IGD terdekat atau telepon 119.';

export function Contact({ m }: { m: MomkidModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const igd = text(contact, 'emergency_phone');
  const igdTel = telHref(igd);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Alamat', value: address, doodle: 'pin' as DoodleName, action: null },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), doodle: 'phone' as DoodleName, action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), doodle: 'chat' as DoodleName, action: m.waAction },
    email && { key: 'email', label: 'Email', value: email, doodle: 'mail' as DoodleName, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
    hours && { key: 'hours', label: 'Jam layanan', value: hours, doodle: 'clock' as DoodleName, action: null },
  ].filter((row): row is Row => !!row);

  return (
    // Ruang bawah ekstra: gelombang mint footer menempel di tepi bawah section ini
    <TemplateSection sectionKey="contact" className={`${TONE_BG[m.tone('contact')]} pb-20 pt-14 @3xl:pb-28 @3xl:pt-20 @5xl:pb-32 @5xl:pt-24`}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead align="left" eyebrow={text(contact, 'eyebrow')} doodle="pin" title={text(contact, 'title') || 'Kontak'} subtitle={text(contact, 'subtitle')} />
        </div>
        <div className="mt-8 min-w-0 @5xl:col-span-6 @5xl:col-start-7 @5xl:row-span-2 @5xl:row-start-1 @5xl:mt-0">
          <Reveal delay={120}>
            <VisitForm m={m} />
          </Reveal>
          <Reveal delay={160} className={`mt-5 rounded-[28px] p-6 ${BG.butter}`}>
            <p className={`flex items-center gap-2 ${DISPLAY} text-[18px] font-extrabold ${C.ink}`}>
              <Doodle name="heart" blob="fill-white" className={`h-9 w-9 shrink-0 ${C.accent}`} />
              {text(contact, 'emergency_title') || 'Kondisi darurat?'}
            </p>
            <p className={`mt-2 text-[15px] leading-relaxed ${C.ink}`}>{text(contact, 'emergency_text') || EMERGENCY_TEXT}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {igdTel && (
                <ActionLink action={{ kind: 'external', href: igdTel }} className={`${BTN.white} ${BTN.md}`}>
                  {`Telepon IGD ${displayPhone(igd)}`}
                </ActionLink>
              )}
              <ActionLink action={{ kind: 'external', href: 'tel:119' }} className={`${BTN.white} ${BTN.md}`}>
                Telepon 119
              </ActionLink>
            </div>
          </Reveal>
        </div>
        <div className="mt-8 min-w-0 @5xl:col-span-5 @5xl:row-start-2">
          {rows.length > 0 && (
            <ul className="grid gap-3">
              {rows.map((row, i) => (
                <Reveal as="li" key={row.key} delay={stagger(i, 60)} className="flex items-start gap-3.5">
                  <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${PASTELS[i % 2]}`}>
                    <Doodle name={row.doodle} blob="" className={`h-8 w-8 ${C.ink}`} />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={`block text-[13px] font-medium ${C.muted}`}>{row.label}</span>
                    <span className={`block text-[15.5px] font-semibold leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                      {row.action ? (
                        <ActionLink
                          action={row.action}
                          className="-my-3 inline-block py-3 underline decoration-(--mk-peach) decoration-2 underline-offset-4 transition-colors hover:text-(--mk-accent-text) hover:decoration-(--mk-accent-text)"
                        >
                          {row.value}
                        </ActionLink>
                      ) : (
                        row.value
                      )}
                    </span>
                  </span>
                </Reveal>
              ))}
            </ul>
          )}

          {m.map.embed && (
            <Reveal delay={160} className="mt-8">
              <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[28px]" />
              <TextLink action={mapLink} label="Buka di Google Maps" className="mt-2" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
