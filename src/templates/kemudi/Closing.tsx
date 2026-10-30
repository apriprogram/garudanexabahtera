// Penutup halaman Kemudi: ulasan (kunci `testimonials`, putih), tanya jawab (`faq`, abu), garasi & kontak (`contact`,
// putih). Ulasan: kepala (label · H2 · satu kalimat), kiri foto suasana 4:5 radius 24 (tanpa wajah, tanpa nama orang),
// kanan kartu abu radius 24 bertumpuk (≥ 1920px: 3 kolom): bintang opsional (tanpa rata-rata/jumlah ulasan), kutipan,
// monogram inisial (tanpa foto wajah), nama depan + keterangan. Tanya jawab: kiri
// kepala + tautan WhatsApp + foto 4:3 dengan keterangan kaca; kanan akordeon di kartu putih (tombol aria-expanded/
// aria-controls di dalam H3, panel role=region, tertutup `inert`, pertanyaan pertama terbuka). Kontak: kiri baris
// kontak (label mono kiri, nilai kanan bertautan tel:/WhatsApp/mailto:, target ≥ 44px), kanan peta Google Maps radius 24.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, initials, mailHref, telHref, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { displayPhone, ratingOf, type KemudiModel } from './model';
import { KEMUDI_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, MONO_LABEL, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, Stars, TextLink } from './ui';

export function Testimonials({ m }: { m: KemudiModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  const image = text(testimonials, 'image');
  const photo = !!image;
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead
          eyebrow={text(testimonials, 'eyebrow')}
          index={m.index('testimonials')}
          title={text(testimonials, 'title')}
          subtitle={text(testimonials, 'subtitle')}
          srTitle="Ulasan pelanggan"
          tone="white"
        />
        <div className={`mt-10 grid gap-6 @3xl:mt-12 ${photo ? '@5xl:grid-cols-12 @5xl:gap-8' : ''}`}>
          {photo && (
            <Reveal className="min-w-0 @5xl:col-span-5 @min-[120rem]:col-span-4">
              <KitPhoto
                src={image}
                alt={KEMUDI_PHOTOS.alt(image, 'Suasana perjalanan dengan mobil sewaan')}
                sizes="(min-width: 1920px) 30vw, (min-width: 1024px) 40vw, 100vw"
                fallback="none"
                className="aspect-[16/10] rounded-[24px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[420px] @min-[120rem]:min-h-[300px]"
                imgClassName="object-[50%_40%]"
              />
            </Reveal>
          )}
          {/* Dengan foto: kartu bertumpuk di 7 kolom (kutipan ≤ 52ch agar baris tidak terlalu panjang); ≥ 1920px kartu
              berjajar 3 kolom (± 384px) setinggi foto, bukan kartu 1000px+ yang separuhnya kosong */}
          <Reveal delay={120} className={`min-w-0 ${photo ? '@5xl:col-span-7 @min-[120rem]:col-span-8' : ''}`}>
            <ul className={`grid gap-4 ${photo ? '@min-[120rem]:h-full @min-[120rem]:grid-cols-3' : '@3xl:grid-cols-2 @6xl:grid-cols-3'}`}>
              {items.map((item, i) => (
                <li key={`${field(item, 'name')}-${i}`} className="min-w-0 rounded-[24px] bg-[#F2F4F7] p-5 @3xl:p-6">
                  <figure className="flex h-full flex-col">
                    <Stars value={ratingOf(field(item, 'rating'))} />
                    <blockquote className={`mt-3 max-w-[52ch] text-pretty ${DISPLAY} text-[18px] font-medium leading-[1.4] tracking-[-0.01em] @3xl:text-[19.5px] ${C.ink}`}>
                      “{field(item, 'quote')}”
                    </blockquote>
                    {(field(item, 'name') || field(item, 'place')) && (
                      <figcaption className="mt-auto flex items-center gap-3 pt-4">
                        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-(--km-ink) ring-1 ring-inset ring-[#0D1117]/[0.08]">
                          {initials(field(item, 'name') || field(item, 'place'), '?')}
                        </span>
                        <span className="min-w-0 text-[14px] leading-snug">
                          {field(item, 'name') && <span className={`block font-semibold ${C.ink}`}>{field(item, 'name')}</span>}
                          {field(item, 'place') && <span className={`block ${C.muted}`}>{field(item, 'place')}</span>}
                        </span>
                      </figcaption>
                    )}
                  </figure>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Faq({ m }: { m: KemudiModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const image = text(faq, 'image');
  const caption = text(faq, 'image_caption');
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya tentang sewa mobil.`));

  return (
    <TemplateSection sectionKey="faq" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={`${WRAP} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="flex min-w-0 flex-col @5xl:col-span-4">
          <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} index={m.index('faq')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle="Tanya jawab" tone="grey" />
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="mt-4 self-start" />
          {image && (
            <Reveal delay={160} className="mt-8 hidden @5xl:block">
              <KitPhoto
                src={image}
                alt={KEMUDI_PHOTOS.alt(image, 'Mobil dicuci sebelum diserahkan')}
                sizes="(min-width: 1024px) 30vw, 100vw"
                fallback="none"
                className="aspect-[4/3] rounded-[24px] @min-[96rem]:aspect-[16/10]"
              >
                {caption && <span className="absolute bottom-3 left-3 rounded-xl bg-white/85 px-3 py-2 text-[12.5px] font-semibold text-[#0D1117] ring-1 ring-black/[0.06] backdrop-blur-md">{caption}</span>}
              </KitPhoto>
            </Reveal>
          )}
        </div>
        <Reveal delay={120} className="min-w-0 @5xl:col-span-7 @5xl:col-start-6">
          <ul className="divide-y divide-[#0D1117]/[0.08] rounded-[24px] bg-white px-5 ring-1 ring-inset ring-[#0D1117]/[0.06] @3xl:px-7">
            {items.map((item, i) => {
              const isOpen = open === i;
              const buttonId = `${baseId}-q${i}`;
              const panelId = `${baseId}-a${i}`;
              return (
                <li key={`${field(item, 'question')}-${i}`}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className={`group flex min-h-14 w-full items-center justify-between gap-5 py-5 text-left ${C.ink}`}
                    >
                      <span className={`${DISPLAY} text-balance text-[17.5px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-(--km-ink) @3xl:text-[19px]`}>
                        {field(item, 'question')}
                      </span>
                      <span
                        aria-hidden
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                          isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-[#F2F4F7] text-[#0D1117] group-hover:bg-[#E8EBF0]'
                        }`}
                      >
                        <Plus className={`km-acc h-4 w-4 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2} />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="km-collapse">
                    <div className="overflow-hidden">
                      <p className={`max-w-[64ch] pb-5 pr-12 ${TYPE.body} ${C.muted}`}>{field(item, 'answer')}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

interface Row {
  key: string;
  label: string;
  value: string;
  action: LinkAction | null;
}

export function Contact({ m }: { m: KemudiModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const hours = text(contact, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const mapLink: LinkAction | null = m.map.link ? { kind: 'external', href: m.map.link } : null;
  const rows: Row[] = [
    address && { key: 'address', label: 'Garasi', value: address, action: null },
    hours && { key: 'hours', label: 'Jam', value: hours, action: null },
    phone && { key: 'phone', label: 'Telepon', value: displayPhone(phone), action: tel ? ({ kind: 'external', href: tel } as LinkAction) : null },
    m.waAction && m.whatsapp && { key: 'whatsapp', label: 'WhatsApp', value: displayPhone(m.whatsapp), action: m.waAction },
    email && { key: 'email', label: 'Email', value: email, action: mail ? ({ kind: 'external', href: mail } as LinkAction) : null },
  ].filter((row): row is Row => !!row);

  return (
    <TemplateSection sectionKey="contact" className={`${SECTION_PAD} ${C.white}`}>
      <div className={`${WRAP} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} index={m.index('contact')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} srTitle="Garasi & kontak" tone="white" />
          {rows.length > 0 && (
            <dl className="mt-8 divide-y divide-[#0D1117]/[0.08] border-y border-[#0D1117]/[0.08]">
              {rows.map((row, i) => (
                <Reveal key={row.key} delay={stagger(i, 60)} className="grid gap-1 py-4 @xl:grid-cols-[110px_1fr] @xl:gap-6">
                  <dt className={`pt-0.5 ${MONO_LABEL} ${C.muted}`}>{row.label}</dt>
                  <dd className={`text-pretty text-[15.5px] leading-snug ${C.ink} [overflow-wrap:anywhere]`}>
                    {row.action ? (
                      <ActionLink action={row.action} className="-my-3.5 inline-block py-3.5 font-medium underline decoration-[#0D1117]/25 underline-offset-4 transition-colors hover:text-(--km-ink) hover:decoration-current">
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
        </div>
        {m.map.embed && (
          <Reveal delay={120} className="min-w-0 @5xl:col-span-6 @5xl:col-start-7">
            <MapEmbed embed={m.map.embed} title={`Peta lokasi ${m.companyName}`} className="aspect-[4/3] rounded-[24px] ring-1 ring-inset ring-[#0D1117]/[0.08] @min-[96rem]:aspect-[16/10]" />
            <TextLink action={mapLink} label="Buka di Google Maps" className="mt-3" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
