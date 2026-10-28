// Tanya jawab (kunci `faq`), latar putih. Layar lebar: kiri (kolom 1-4) label, H2, deskripsi, tautan WhatsApp; kanan
// (kolom 6-12) akordeon kartu putih bergaris tipis: pertanyaan Atkinson tebal + tombol kotak 40px "+"/"−" (tombol
// aria-expanded/aria-controls di dalam H3, panel role="region", tertutup `inert`), pertanyaan pertama terbuka. HP:
// kepala → akordeon → tautan.
import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { MedicareModel } from './model';
import { C, GRID_GAP, SECTION_PAD, T } from './styles';
import { SectionHead, TextLink } from './ui';

export function Faq({ m }: { m: MedicareModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const linkAction = m.linkOr(
    text(faq, 'link_url'),
    m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`),
  );

  return (
    <TemplateSection sectionKey="faq" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="contents @5xl:block @5xl:min-w-0 @5xl:col-span-4">
          <SectionHead stack eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle="Tanya jawab" />
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="order-last mt-6 justify-self-start @5xl:mt-8" />
        </div>
        <ul className="mt-10 grid gap-3 @5xl:col-span-8 @5xl:col-start-5 @5xl:mt-0 @6xl:col-span-7 @6xl:col-start-6">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal
                as="li"
                key={`${field(item, 'question')}-${i}`}
                delay={stagger(i, 60)}
                className={`rounded-[12px] bg-white ring-1 ring-inset ${isOpen ? 'ring-(--tpl-accent)' : 'ring-[#0E1B2E]/[0.12]'}`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-16 w-full items-center justify-between gap-5 px-5 py-4 text-left @3xl:px-6 ${C.ink}`}
                  >
                    <span className={`${T.h3} transition-colors group-hover:text-(--tpl-accent-ink)`}>{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
                        isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)'
                      }`}
                    >
                      {isOpen ? <Minus className="h-5 w-5" strokeWidth={2.25} /> : <Plus className="h-5 w-5" strokeWidth={2.25} />}
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="mc-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[64ch] px-5 pb-6 @3xl:px-6 ${T.body} ${C.muted}`}>{field(item, 'answer')}</p>
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
