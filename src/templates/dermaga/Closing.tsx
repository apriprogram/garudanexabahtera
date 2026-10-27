// Tanya jawab (kunci `faq`) + Ajakan (kunci `cta`).
// FAQ: label bernomor selebar wadah; kiri (kolom 1-4) H2, deskripsi, tautan "Tanya lewat WhatsApp"; kanan (kolom
// 6-12) akordeon bergaris tipis: pertanyaan Space Grotesk + tombol persegi "+" yang berputar 45° saat terbuka (tombol
// aria-expanded/aria-controls di dalam H3, panel role="region", tertutup `inert`), pertanyaan pertama terbuka.
// HP: H2 → akordeon → tautan.
// Ajakan: kotak bergaris tipis radius 4px di halaman putih, garis rute kecil STATIS di tepi atasnya (pin asal kiri,
// pin tujuan kanan), label mono + H2 di kolom 1-8, deskripsi + tombol di kolom 9-12.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { DermagaModel } from './model';
import { C, DISPLAY, GRID_GAP, MONO_LABEL, SECTION_PAD, TYPE_D } from './styles';
import { ButtonLink, SectionHead, SectionLabel, TextLink } from './ui';

export function Faq({ m }: { m: DermagaModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const eyebrow = text(faq, 'eyebrow');
  // Kosong → WhatsApp dengan pesan awal dari CMS; tanpa nomor WhatsApp tautan disembunyikan (labelnya "Tanya lewat
  // WhatsApp"), sama seperti tautan kedua di Ajakan
  const linkAction = m.linkOr(
    text(faq, 'link_url'),
    m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya tentang pengiriman barang.`),
  );

  return (
    <TemplateSection sectionKey="faq" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        {eyebrow && (
          <Reveal variant="fade" className="@5xl:col-span-12 @5xl:row-start-1">
            <SectionLabel label={eyebrow} number={m.number('faq')} />
          </Reveal>
        )}
        {/* HP: judul → akordeon → tautan (wadah `contents`, tautan order-last); layar lebar: judul + tautan menempel di
            bawah header selama akordeon (lebih tinggi) digulir */}
        <div
          className={`contents @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+104px)] @5xl:col-span-4 @5xl:row-start-2 @5xl:block @5xl:min-w-0 @5xl:self-start ${
            eyebrow ? '@5xl:mt-10' : ''
          }`}
        >
          <div className={`min-w-0 ${eyebrow ? 'mt-7 @3xl:mt-10 @5xl:mt-0' : ''}`}>
            <SectionHead layout="stack" eyebrow="" title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle={eyebrow || 'Tanya jawab'} />
          </div>
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="order-last mt-6 justify-self-start @5xl:order-none @5xl:mt-8" />
        </div>
        <ul className={`mt-8 border-t ${C.line} @5xl:col-span-7 @5xl:col-start-6 @5xl:row-start-2 ${eyebrow ? '@5xl:mt-10' : '@5xl:mt-0'}`}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className={`border-b ${C.line}`}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-14 w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6 ${C.ink}`}
                  >
                    <span className={`${DISPLAY} text-balance text-[18px] font-medium leading-snug tracking-[-0.015em] transition-colors group-hover:text-(--tpl-accent-ink) @3xl:text-[20px]`}>
                      {field(item, 'question')}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] ring-1 ring-inset transition-colors duration-200 ${
                        isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-(--tpl-accent)' : 'ring-[#0F1D20]/25 group-hover:ring-(--tpl-accent)'
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={1.8} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="dm-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE_D.body} ${C.muted}`}>{field(item, 'answer')}</p>
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

/** Garis rute kecil statis di tepi atas kotak ajakan: pin asal, garis, pin tujuan (dekoratif). */
function RouteRule({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 ${MONO_LABEL} text-(--tpl-accent-ink)`}>
      {from && <span>{from}</span>}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--tpl-accent)" />
      <span className="min-w-0 flex-1 border-t-[1.5px] border-dashed border-(--tpl-accent)" />
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-(--tpl-accent) bg-white" />
      {to && <span>{to}</span>}
    </div>
  );
}

export function Cta({ m }: { m: DermagaModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const eyebrow = text(cta, 'eyebrow');
  const primary = m.linkOr(text(cta, 'button_url'), m.quoteAction);
  const secondary = m.linkOr(text(cta, 'secondary_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`) ?? null);
  const codes = m.ports.map((port) => field(port, 'code')).filter(Boolean);
  const from = codes[0] ?? '';
  const to = codes.length > 1 ? codes[codes.length - 1] : '';

  return (
    <TemplateSection sectionKey="cta" className="pb-16 @3xl:pb-24 @5xl:pb-28">
      <div className={CONTAINER}>
        <Reveal variant="fade" className="relative rounded-[4px] border border-[#0F1D20]/[0.14] px-5 pb-10 pt-6 @3xl:px-8 @3xl:pb-14 @3xl:pt-8 @5xl:px-14 @5xl:pb-16 @5xl:pt-10">
          <RouteRule from={from} to={to} />
          <div className={`mt-10 grid gap-y-8 @5xl:mt-14 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
            <div className="min-w-0 @5xl:col-span-8">
              {eyebrow && <p className={`${MONO_LABEL} text-(--tpl-accent-ink)`}>{eyebrow}</p>}
              {title ? (
                <h2 className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] ${TYPE_D.h2} ${C.ink}`}>{title}</h2>
              ) : (
                <h2 className="sr-only">Ajakan</h2>
              )}
            </div>
            <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9">
              {subtitle && <p className={`max-w-[44ch] text-pretty ${TYPE_D.body} ${C.muted} @3xl:text-[16px]`}>{subtitle}</p>}
              <div className={`flex flex-col items-stretch gap-1 @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-7 ${subtitle ? 'mt-7' : ''}`}>
                <ButtonLink action={primary} label={text(cta, 'button_label')} className="w-full @xl:w-auto" />
                <TextLink action={secondary} label={text(cta, 'secondary_label')} className="self-center" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
