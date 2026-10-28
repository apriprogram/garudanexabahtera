// Unduh aplikasi (kunci `download`) + Tanya jawab (kunci `faq`) + Bantuan (kunci `contact`).
// Unduh: panel radius 32 warna --hl-deep (satu-satunya bidang gelap, data-tpl-tone="inverse") berisi simbol aplikasi di
// kotak putih, label, H2 putih, dua tombol toko putih (teks biasa "Google Play"/"App Store", tanpa lencana resmi; tautan
// dari CMS; tanpa tautan → tombol WhatsApp), dan foto tegak 4:5 di kanan (HP: di bawah).
// Tanya jawab: kepala + tautan WhatsApp di kiri, kartu putih akordeon bergaris di kanan (tombol aria-expanded/
// aria-controls di dalam H3, panel role="region", tertutup `inert`); pertanyaan pertama terbuka.
// Bantuan: ubin kontak 2×2 (WhatsApp, telepon, email, jam), kartu alamat dengan tautan Google Maps, kartu darurat merah
// lembut dengan tombol telepon nomor darurat (119), dan foto petugas layanan di kiri (layar lebar).
import { Clock3, Mail, MapPin, MessageCircle, Phone, PhoneCall, Plus, Smartphone, TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { HealthLinkMark } from './marks';
import { displayPhone, type HealthLinkModel } from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, SECTION_PAD, TYPE_H } from './styles';
import { ButtonLink, SectionHead } from './ui';

export function Download({ m }: { m: HealthLinkModel }) {
  const { download: d } = m;
  const image = text(d, 'image');
  const withPhoto = hasImage(image);
  const note = text(d, 'note');
  return (
    <TemplateSection sectionKey="download" className={`${C.canvas} py-6 @3xl:py-10`}>
      <div className={CONTAINER}>
        <div data-tpl-tone="inverse" className="relative overflow-hidden rounded-[32px] bg-(--hl-deep) text-white">
          <div className={`grid gap-8 p-6 @2xl:p-10 @5xl:items-center @5xl:gap-10 @5xl:p-14 ${withPhoto ? '@5xl:grid-cols-12' : ''}`}>
            <div className={`min-w-0 ${withPhoto ? '@5xl:col-span-7' : 'mx-auto max-w-[640px] text-center'}`}>
              <span aria-hidden className={`flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-(--hl-solid) ${withPhoto ? '' : 'mx-auto'}`}>
                <HealthLinkMark className="h-10 w-10" />
              </span>
              <SectionHead
                tone="dark"
                className="mt-6"
                eyebrow={text(d, 'eyebrow')}
                title={text(d, 'title')}
                subtitle={text(d, 'subtitle')}
                srTitle={text(d, 'eyebrow') || 'Unduh aplikasi'}
              />
              <div className={`mt-7 flex flex-col gap-3 @xl:flex-row ${withPhoto ? '' : '@xl:justify-center'}`}>
                {m.stores.length > 0 ? (
                  m.stores.map((store) => (
                    <ActionLink
                      key={store.key}
                      action={{ kind: 'external', href: store.href }}
                      className="flex h-16 items-center gap-3 rounded-2xl bg-white px-5 text-[#0E1B2B] transition-colors duration-200 hover:bg-white/90"
                    >
                      <Smartphone aria-hidden className="h-6 w-6 shrink-0 text-(--hl-solid)" strokeWidth={1.75} />
                      <span className="text-left">
                        <span className="block text-[12px] font-medium leading-none text-[#4A5869]">Unduh di</span>
                        <span className={`${DISPLAY} mt-1 block text-[18px] font-bold leading-none`}>{store.label}</span>
                      </span>
                    </ActionLink>
                  ))
                ) : (
                  <ButtonLink action={m.downloadFallback} label="Minta tautan lewat WhatsApp" variant="white" size="lg" icon={<MessageCircle aria-hidden className="h-5 w-5" />} />
                )}
              </div>
              {note && <p className="mt-5 text-[13px] text-white/72">{note}</p>}
            </div>
            {/* Foto tegak hanya di layar lebar: di HP pita tetap ringkas (simbol, judul, dua tombol toko) */}
            {withPhoto && (
              <div className="hidden min-w-0 @5xl:col-span-5 @5xl:block">
                <KitPhoto
                  src={image}
                  alt={HEALTHLINK_PHOTOS.alt(image, 'Pengguna membuka aplikasi konsultasi dokter di ponsel')}
                  sizes="(min-width: 1024px) 34vw, 100vw"
                  fallback="none"
                  zoom
                  position="50% 50%"
                  className="mx-auto aspect-[4/5] max-w-[400px] rounded-[24px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Faq({ m }: { m: HealthLinkModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waAction ?? m.contactAction);

  return (
    <TemplateSection sectionKey="faq" className={`${C.canvas} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-8 @5xl:grid-cols-12 @5xl:gap-8`}>
        <div className="min-w-0 @5xl:col-span-4">
          <SectionHead eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle={text(faq, 'eyebrow') || 'Tanya jawab'}>
            <ButtonLink action={linkAction} label={text(faq, 'link_label')} variant="tint" size="md" className="mt-6" icon={<MessageCircle aria-hidden className="h-5 w-5" />} />
          </SectionHead>
        </div>
        <ul className={`min-w-0 divide-y divide-[#0E1B2B]/[0.07] px-4 @3xl:px-6 @5xl:col-span-8 ${CARD}`}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left ${C.ink}`}
                  >
                    <span className={`${DISPLAY} text-[16.5px] font-semibold leading-snug transition-colors group-hover:text-(--hl-solid) @3xl:text-[18px]`}>{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-colors duration-200 ${
                        isOpen ? 'bg-(--hl-solid) text-white' : 'bg-(--hl-tint) text-(--hl-tint-ink)'
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="hl-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-5 pr-10 ${TYPE_H.body} ${C.muted}`}>{field(item, 'answer')}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

function ContactTile({ icon, label, value, action }: { icon: ReactNode; label: string; value: string; action: LinkAction | null }) {
  const body = (
    <>
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-(--hl-tint) text-(--hl-tint-ink)">
        {icon}
      </span>
      <span className="block min-w-0">
        <span className={`block text-[13px] ${C.muted}`}>{label}</span>
        <span className={`mt-0.5 block text-[15px] font-semibold [overflow-wrap:anywhere] leading-snug ${C.ink}`}>{value}</span>
      </span>
    </>
  );
  const box = `flex h-full min-h-[76px] items-center gap-3.5 p-3.5 @3xl:p-4 ${CARD}`;
  return action ? (
    <ActionLink action={action} className={`${box} transition-colors duration-200 hover:ring-(--hl-solid)`}>
      {body}
    </ActionLink>
  ) : (
    <div className={box}>{body}</div>
  );
}

export function Contact({ m }: { m: HealthLinkModel }) {
  const { contact } = m;
  const image = text(contact, 'image');
  const withPhoto = hasImage(image);
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const address = text(contact, 'address');
  const emergencyTitle = text(contact, 'emergency_title');
  const emergencyText = text(contact, 'emergency_text');
  const tiles = [
    m.whatsapp && m.waAction && { key: 'wa', icon: <MessageCircle className="h-6 w-6" strokeWidth={1.75} />, label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction },
    phone && { key: 'tel', icon: <Phone className="h-6 w-6" strokeWidth={1.75} />, label: 'Telepon', value: displayPhone(phone), action: m.tel ? ({ kind: 'external', href: m.tel } as LinkAction) : null },
    email && { key: 'mail', icon: <Mail className="h-6 w-6" strokeWidth={1.75} />, label: 'Email', value: email, action: m.mail ? ({ kind: 'external', href: m.mail } as LinkAction) : null },
    hours && { key: 'hours', icon: <Clock3 className="h-6 w-6" strokeWidth={1.75} />, label: 'Jam layanan', value: hours, action: null },
  ].filter(Boolean) as { key: string; icon: ReactNode; label: string; value: string; action: LinkAction | null }[];

  return (
    <TemplateSection sectionKey="contact" className={`${C.canvas} ${SECTION_PAD} pt-0! @3xl:pt-4!`}>
      <div className={`${CONTAINER} grid gap-8 @5xl:grid-cols-12 @5xl:gap-8`}>
        {withPhoto && (
          <div className="hidden min-w-0 @5xl:col-span-5 @5xl:block">
            <KitPhoto
              src={image}
              alt={HEALTHLINK_PHOTOS.alt(image, 'Petugas layanan pelanggan siap membantu pasien')}
              sizes="(min-width: 1024px) 40vw, 100vw"
              fallback="none"
              zoom
              position="62% 45%"
              className="h-full min-h-[480px] rounded-[28px]"
            />
          </div>
        )}
        <div className={`min-w-0 ${withPhoto ? '@5xl:col-span-7' : '@5xl:col-span-10 @5xl:col-start-2'}`}>
          <SectionHead eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} srTitle={text(contact, 'eyebrow') || 'Bantuan'} />
          {tiles.length > 0 && (
            <ul className="mt-7 grid gap-3 @xl:grid-cols-2 @3xl:gap-4">
              {tiles.map((tile) => (
                <li key={tile.key} className="min-w-0">
                  <ContactTile icon={tile.icon} label={tile.label} value={tile.value} action={tile.action} />
                </li>
              ))}
            </ul>
          )}
          {address && (
            <div className={`mt-3 flex flex-col gap-3 p-4 @xl:flex-row @xl:items-center @3xl:mt-4 ${CARD}`}>
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-(--hl-tint) text-(--hl-tint-ink)">
                <MapPin className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <p className={`min-w-0 flex-1 text-[15px] leading-snug ${C.ink}`}>{address}</p>
              {m.map.link && (
                <ActionLink action={{ kind: 'external', href: m.map.link }} className={`${BTN.light} ${BTN.sm} shrink-0`}>
                  Buka di Google Maps
                </ActionLink>
              )}
            </div>
          )}
          {(emergencyTitle || emergencyText) && (
            <div className="mt-3 flex flex-col gap-4 rounded-[24px] bg-[#FEF3F2] p-4 ring-1 ring-inset ring-[#B42318]/15 @xl:flex-row @xl:items-center @3xl:mt-4 @3xl:p-5">
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#B42318]">
                <TriangleAlert className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                {emergencyTitle && <p className={`${DISPLAY} text-[17px] font-bold text-[#B42318]`}>{emergencyTitle}</p>}
                {emergencyText && <p className="mt-0.5 text-[14.5px] leading-snug text-[#7A1A12]">{emergencyText}</p>}
              </div>
              {m.emergencyHref && (
                <a
                  href={m.emergencyHref}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#B42318] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[#912018]"
                >
                  <PhoneCall aria-hidden className="h-5 w-5" />
                  Telepon {m.emergencyPhone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
