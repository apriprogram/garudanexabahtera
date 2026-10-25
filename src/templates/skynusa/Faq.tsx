// Tanya jawab (kunci `faq`): kiri label + H2 + deskripsi + kartu bantuan abu (judul, teks, tombol WhatsApp); kanan
// accordion bergaris tipis bernomor mono, satu terbuka. Tombol <button aria-expanded aria-controls>, panel
// role="region"; panel tertutup `inert`. Buka-tutup grid-rows 0fr → 1fr (CSS .sn-collapse) bila gerak menyala.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import type { SkyNusaModel } from './model';
import { BTN, C, CARD, MONO, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

export function Faq({ m }: { m: SkyNusaModel }) {
  const { faq } = m;
  const items = list(faq, 'items', 8).filter((item) => field(item, 'question'));
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = resolveAction(text(faq, 'button_url'), m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const showHelp = !!(helpTitle || helpText || (action && buttonLabel));

  return (
    <TemplateSection sectionKey="faq" className={`${SECTION_Y} bg-white`}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(faq, 'eyebrow')} title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} />
          {showHelp && (
            <Reveal delay={240} className={`mt-9 p-6 @3xl:max-w-[460px] @3xl:p-7 ${CARD.soft}`}>
              {helpTitle && <p className={`text-[#0E1A1C] ${TYPE_S.h3}`}>{helpTitle}</p>}
              {helpText && <p className={`mt-2 text-[15px] leading-relaxed ${C.muted}`}>{helpText}</p>}
              <div className="mt-5">
                <ButtonLink
                  action={action}
                  label={buttonLabel}
                  variant="ink"
                  icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                  className={`${BTN.ink} ${BTN.md} max-w-full`}
                />
              </div>
            </Reveal>
          )}
        </div>

        <ul className="border-t border-black/[0.08] @5xl:col-span-7">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className="border-b border-black/[0.08]">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 py-5 text-left @3xl:gap-6 @3xl:py-6"
                  >
                    <span aria-hidden className={`w-6 shrink-0 ${MONO} ${C.muted}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug tracking-[-0.01em] text-[#0E1A1C] @3xl:text-[18px]">{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] transition-colors ${isOpen ? 'bg-[#0E1A1C] text-white' : 'bg-[#F2F5F5] text-[#0E1A1C]'}`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="sn-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pl-10 pr-12 @3xl:pl-12 ${TYPE_S.body} ${C.muted}`}>{field(item, 'answer')}</p>
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
