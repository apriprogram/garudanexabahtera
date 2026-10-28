// Testimoni pasien (kunci `testimonials`) + Tanya jawab (kunci `faq`).
// Testimoni: halaman putih, kartu radius 8 bercincin: chip layanan mono, kutipan IBM Plex 500, lalu inisial dalam kotak
// + "Nama · Kota" dan label "Pasien". Tanpa foto (nama depan & kota saja). ≥ @5xl 3 kolom.
// FAQ: pita #F2F6F8; kepala section (tautan WhatsApp di kanan), lalu akordeon dalam kotak putih bergaris: baris "Q01"
// mono + pertanyaan + kotak panah radius 6 (tombol aria-expanded/aria-controls di dalam H3, panel role="region",
// tertutup `inert`), pertanyaan pertama terbuka.
import { ChevronDown, Quote } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { pad2, type SpxModel } from './model';
import { C, CARD, CHIP, MONO_LABEL, SECTION_PAD, TYPE_S } from './styles';
import { SectionHead, TextLink } from './ui';

export function Testimonials({ m }: { m: SpxModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  if (items.length === 0) return null;
  const eyebrow = text(testimonials, 'eyebrow');
  const cols = items.length >= 3 ? '@5xl:grid-cols-3' : items.length === 2 ? '@5xl:grid-cols-2' : '';

  return (
    <TemplateSection sectionKey="testimonials" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={eyebrow} code={m.code('testimonials')} title={text(testimonials, 'title')} srTitle={eyebrow || 'Testimoni pasien'} />
        <ul className={`mt-10 grid gap-4 @3xl:grid-cols-2 @5xl:mt-14 @5xl:gap-6 ${cols}`}>
          {items.map((item, i) => {
            const name = field(item, 'name');
            const city = field(item, 'city');
            const service = field(item, 'service');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 80)} className={`flex flex-col ${CARD} p-6 @3xl:p-7`}>
                <figure className="flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    {service ? <span className={`${CHIP} bg-[#F2F6F8] ${C.ink}`}>{service}</span> : <span />}
                    <Quote aria-hidden className="h-5 w-5 shrink-0 text-(--tpl-accent-ink)" strokeWidth={1.6} />
                  </div>
                  <blockquote className={`mt-5 flex-1 text-pretty ${TYPE_S.quote} ${C.ink}`}>
                    <p>{field(item, 'quote')}</p>
                  </blockquote>
                  {(name || city) && (
                    <figcaption className={`mt-6 flex items-center gap-3 border-t pt-5 ${C.line}`}>
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-(--spx-navy) font-mono text-[13px] font-semibold text-white"
                      >
                        {initials(name || city, '?')}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[15px] font-semibold leading-snug ${C.ink}`}>{[name, city].filter(Boolean).join(' · ')}</span>
                        <span className={`block ${MONO_LABEL} ${C.muted}`}>Pasien</span>
                      </span>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Faq({ m }: { m: SpxModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const eyebrow = text(faq, 'eyebrow');
  // Kosong → WhatsApp dengan pesan awal dari CMS; tanpa nomor WhatsApp tautan disembunyikan
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="faq" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={eyebrow}
          code={m.code('faq')}
          title={text(faq, 'title')}
          subtitle={text(faq, 'subtitle')}
          srTitle={eyebrow || 'Tanya jawab'}
          aside={<TextLink action={linkAction} label={text(faq, 'link_label')} />}
        />
        <ul className={`mt-10 divide-y rounded-[8px] bg-white ring-1 ring-inset ring-[#0D1B2A]/[0.1] ${C.divide} @5xl:mt-14`}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className="px-5 @3xl:px-7">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group grid min-h-14 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left @3xl:grid-cols-[4rem_minmax(0,1fr)_auto] @3xl:py-5 ${C.ink}`}
                  >
                    <span aria-hidden className={`${MONO_LABEL} text-(--tpl-accent-ink)`}>
                      Q{pad2(i + 1)}
                    </span>
                    <span className="text-balance text-[16px] font-semibold leading-snug transition-colors group-hover:text-(--tpl-accent-ink) @3xl:text-[17px]">
                      {field(item, 'question')}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] ring-1 ring-inset transition-colors duration-200 ${
                        isOpen ? 'bg-(--spx-navy) text-white ring-(--spx-navy)' : 'ring-[#0D1B2A]/20 group-hover:ring-(--tpl-accent)'
                      }`}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.9} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="spx-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[68ch] pb-5 pl-[3.5rem] pr-2 @3xl:pr-11 ${TYPE_S.body} ${C.muted} @3xl:pl-[4.75rem]`}>{field(item, 'answer')}</p>
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
