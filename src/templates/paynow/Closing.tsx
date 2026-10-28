// Tanya jawab (kunci `faq`) + Unduh aplikasi (kunci `download`).
// FAQ: section lavender. Kiri (kolom 1-4, menempel saat digulir): label, H2, deskripsi, tautan "Chat tim kami"
// (WhatsApp). Kanan (kolom 6-12): kartu putih radius 20 per pertanyaan dengan jarak 12px; tombol pertanyaan
// (aria-expanded/aria-controls, di dalam H3) + lingkaran +/− ; panel role="region" (tertutup → inert), pertanyaan
// pertama terbuka. Unduh: section putih. Kiri label, H2, deskripsi, tombol pil malam "Google Play" / "App Store" (teks,
// bukan lencana resmi), ubin QR (gambar QR dari CMS, atau ikon QR dekoratif) + keterangan. Kanan foto tegak 4:5 radius 28
// — SATU-SATUNYA parallax di halaman — dengan kartu notifikasi yang menimpa tepi kiri bawahnya.
import { CircleCheck, Download as DownloadIcon, Minus, Plus, QrCode } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, safeImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PaynowModel } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { BTN, C, DISPLAY, GRID_GAP, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

export function Faq({ m }: { m: PaynowModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="faq" className={`${SECTION_PAD} ${C.mist}`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="contents @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+108px)] @5xl:col-span-4 @5xl:block @5xl:min-w-0 @5xl:self-start">
          <SectionHead eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle={text(faq, 'eyebrow') || 'Tanya jawab'} />
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="order-last justify-self-start @5xl:order-none @5xl:mt-6" />
        </div>
        <ul className="grid min-w-0 gap-3 @5xl:col-span-7 @5xl:col-start-6">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal
                as="li"
                key={`${field(item, 'question')}-${i}`}
                delay={stagger(i, 60)}
                className={`rounded-[20px] bg-white ring-1 ring-inset ${isOpen ? 'ring-(--tpl-accent)/40' : 'ring-[#0E0F2C]/[0.08]'}`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-16 w-full items-center justify-between gap-5 rounded-[20px] px-5 py-4 text-left @3xl:px-6 ${C.ink}`}
                  >
                    <span className={`${DISPLAY} text-balance text-[17px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-(--pn-ink) @3xl:text-[18px]`}>
                      {field(item, 'question')}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                        isOpen ? 'pn-grad text-white' : 'bg-(--pn-mist) text-(--pn-ink) group-hover:bg-(--tpl-accent-100)'
                      }`}
                    >
                      {isOpen ? <Minus className="h-4 w-4" strokeWidth={2.2} /> : <Plus className="h-4 w-4" strokeWidth={2.2} />}
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="pn-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] px-5 pb-5 text-[15px] leading-relaxed @3xl:px-6 @3xl:pb-6 ${C.muted}`}>{field(item, 'answer')}</p>
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

export function Download({ m }: { m: PaynowModel }) {
  const { download } = m;
  const image = text(download, 'image');
  const qr = safeImage(text(download, 'qr_image'));
  const qrCaption = text(download, 'qr_caption');
  const cardTitle = text(download, 'card_title');
  const photo = hasImage(image);

  return (
    <TemplateSection sectionKey="download" className={`${SECTION_PAD} overflow-hidden bg-white`}>
      <div className={`${CONTAINER} grid gap-y-12 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
        <div className={`min-w-0 ${photo ? '@5xl:col-span-6' : '@5xl:col-span-8'}`}>
          <SectionHead eyebrow={text(download, 'eyebrow')} title={text(download, 'title')} subtitle={text(download, 'subtitle')} srTitle={text(download, 'eyebrow') || 'Unduh aplikasi'} />
          {m.stores.length > 0 && (
            <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
              {m.stores.map((store) => (
                <ActionLink key={store.key} action={{ kind: 'external', href: store.href }} className={`${BTN.night} h-14 px-6 text-[16px]`}>
                  <DownloadIcon aria-hidden className="h-5 w-5 shrink-0" />
                  <span className="truncate">{store.label}</span>
                </ActionLink>
              ))}
            </Reveal>
          )}
          {(qr || qrCaption) && (
            <Reveal delay={320} className="mt-8 flex items-center gap-4">
              <span className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[18px] bg-white ring-1 ring-inset ring-[#0E0F2C]/[0.1]">
                {qr ? (
                  <img src={qr} alt="Kode QR untuk mengunduh aplikasi" width={72} height={72} loading="lazy" decoding="async" className="h-[72px] w-[72px] object-contain" />
                ) : (
                  <QrCode aria-hidden className="h-12 w-12 text-(--pn-ink)" strokeWidth={1.5} />
                )}
              </span>
              {qrCaption && <p className={`max-w-[24ch] text-[15px] font-medium leading-snug ${C.ink}`}>{qrCaption}</p>}
            </Reveal>
          )}
        </div>
        {photo && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
            <div className="relative pb-10 pl-6 @3xl:pl-10">
              <KitPhoto
                src={image}
                alt={PAYNOW_PHOTOS.alt(image, `Pengguna ${m.companyName}`)}
                parallax
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="aspect-[4/5] max-h-[620px] w-full rounded-[28px] @3xl:aspect-[16/11] @5xl:aspect-[4/5]"
              />
              {cardTitle && (
                <div className="absolute bottom-0 left-0 flex max-w-[calc(100%-24px)] items-start gap-3 rounded-[18px] bg-white p-3.5 pr-5 ring-1 ring-inset ring-[#0E0F2C]/[0.1]">
                  <span aria-hidden className="pn-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
                    <CircleCheck className="h-[18px] w-[18px]" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[14px] font-semibold leading-snug ${C.ink}`}>{cardTitle}</span>
                    {text(download, 'card_text') && <span className={`block text-[13px] leading-snug ${C.muted}`}>{text(download, 'card_text')}</span>}
                  </span>
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
