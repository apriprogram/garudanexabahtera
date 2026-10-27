// Tanya jawab (kunci `faq`, latar kertas). Layar lebar: kiri 5 kolom label → H2 → deskripsi → tautan berpanah "Tanya
// lewat WhatsApp"; kanan 7 kolom akordeon bergaris rambut: pertanyaan serif (tombol aria-expanded/aria-controls) dengan
// lingkaran bergaris "+" yang berputar 45° saat terbuka, jawaban di panel role="region" (tertutup → `inert`), butir
// pertama terbuka. HP: kepala → akordeon → tautan WhatsApp.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, paragraphs, text } from '../shared/utils';
import type { SaudagarModel } from './model';
import { C, SECTION_PAD, SERIF } from './styles';
import { ArrowLink, SectionHead } from './ui';

export function Faq({ m }: { m: SaudagarModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const buttonLabel = text(faq, 'button_label');
  const action = m.linkOr(text(faq, 'button_url'), m.waWith(`Halo ${m.companyName}, saya ingin bertanya.`) ?? m.sectionAction('contact'));

  return (
    <TemplateSection sectionKey="faq" className={`bg-[#F7F2E8] ${SECTION_PAD}`}>
      {/* Baris layar lebar: kepala (auto) + sisa (1fr) agar akordeon yang panjang tidak mendorong tautan WhatsApp turun */}
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-8 @5xl:gap-y-8 @7xl:gap-x-12`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title') || 'Tanya jawab'} subtitle={text(faq, 'subtitle')} />
        </div>

        <ul className={`min-w-0 border-b @5xl:col-span-7 @5xl:col-start-6 @5xl:row-start-1 @5xl:row-end-3 ${C.line}`}>
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className={`border-t ${C.line}`}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex min-h-16 w-full items-center justify-between gap-5 py-5 text-left"
                  >
                    <span className={`text-pretty ${SERIF} text-[20px] font-normal leading-snug tracking-[-0.01em] @3xl:text-[22px] ${C.ink}`}>{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors duration-300 ${
                        isOpen ? 'bg-[#221A13] text-[#F7F2E8] ring-[#221A13]' : `ring-[#221A13]/[0.2] group-hover:bg-[#EFE6D3] ${C.ink}`
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={1.8} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="sg-collapse">
                  <div className="overflow-hidden">
                    <div className={`max-w-[62ch] space-y-3 pb-6 pr-12 text-[15.5px] leading-relaxed ${C.muted}`}>
                      {paragraphs(field(item, 'answer')).map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>

        {buttonLabel && action && (
          <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-2 @5xl:self-start">
            <ArrowLink action={action} label={buttonLabel} />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
