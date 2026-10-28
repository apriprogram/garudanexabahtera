// Tanya jawab (kunci `faq`) di latar putih: layar lebar kepala section + tautan "Tanya admin" (WhatsApp) di kolom
// 1-5 (menempel saat digulir), akordeon kartu pasir radius 16 di kolom 7-12: pertanyaan Sora + tombol bulat "+" yang
// berputar 45° saat terbuka (tombol aria-expanded/aria-controls di dalam H3, panel role="region", tertutup `inert`),
// pertanyaan pertama terbuka. HP: judul → akordeon → tautan.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { SmashModel } from './model';
import { C, DISPLAY, GRID_GAP, SECTION_PAD, TYPE_S } from './styles';
import { SectionLabel, TextLink } from './ui';

export function Faq({ m }: { m: SmashModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const eyebrow = text(faq, 'eyebrow');
  const title = text(faq, 'title');
  const subtitle = text(faq, 'subtitle');
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="faq" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="contents @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+104px)] @5xl:col-span-5 @5xl:block @5xl:self-start">
          <div className="min-w-0">
            {eyebrow && (
              <Reveal variant="fade">
                <SectionLabel label={eyebrow} />
              </Reveal>
            )}
            {title ? (
              <Reveal as="h2" delay={80} className={`max-w-[20ch] ${eyebrow ? 'mt-5' : ''} ${TYPE_S.h2} ${C.ink}`}>
                {title}
              </Reveal>
            ) : (
              <h2 className="sr-only">{eyebrow || 'Tanya jawab'}</h2>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-4 max-w-[40ch] ${TYPE_S.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="order-last mt-6 justify-self-start @5xl:mt-8" />
        </div>

        <ul className="mt-9 grid gap-2.5 @5xl:col-span-7 @5xl:col-start-6 @5xl:mt-0 @6xl:col-span-6 @6xl:col-start-7">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                <div className={`rounded-2xl transition-colors duration-200 ${isOpen ? 'bg-white ring-1 ring-inset ring-[#171512]/12' : C.sand}`}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className={`group flex min-h-14 w-full items-center justify-between gap-5 px-5 py-4 text-left @3xl:px-6 ${C.ink}`}
                    >
                      <span className={`${DISPLAY} text-balance text-[16px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-(--tpl-accent-ink) @3xl:text-[17px]`}>
                        {field(item, 'question')}
                      </span>
                      <span
                        aria-hidden
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                          isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white ring-1 ring-inset ring-[#171512]/15'
                        }`}
                      >
                        <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2} />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="sh-collapse">
                    <div className="overflow-hidden">
                      <p className={`max-w-[60ch] px-5 pb-5 pr-14 @3xl:px-6 @3xl:pr-16 ${TYPE_S.body} ${C.muted}`}>{field(item, 'answer')}</p>
                    </div>
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
