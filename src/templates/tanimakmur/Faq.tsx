// Tanya jawab (kunci `faq`): kiri label + H2 + deskripsi + kartu bantuan putih (judul, teks, tombol WhatsApp); kanan
// accordion bergaris, satu terbuka. Tombol <button aria-expanded aria-controls>, panel role="region"; panel tertutup
// `inert`. Buka-tutup grid-rows 0fr → 1fr (CSS .tm-collapse) bila gerak menyala.
import { Plus } from 'lucide-react';
import { useId } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import { usePageSelection } from './hooks';
import type { TaniModel } from './model';
import { BTN, C, CARD, TYPE_T } from './styles';
import { SectionLabel } from './ui';

export function Faq({ m }: { m: TaniModel }) {
  const { faq } = m;
  const items = list(faq, 'items', 8).filter((item) => field(item, 'question'));
  // Pertanyaan terbuka dibagi dengan pencarian di menu (TaniMakmur.tsx), jadi hasil FAQ yang diklik langsung terbuka
  const { faq: open, setFaq: setOpen } = usePageSelection();
  const baseId = useId();
  if (items.length === 0) return null;
  const eyebrow = text(faq, 'eyebrow');
  const title = text(faq, 'title');
  const subtitle = text(faq, 'subtitle');
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = resolveAction(text(faq, 'button_url'), m.startAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const showHelp = !!(helpTitle || helpText || (action && buttonLabel));

  return (
    <TemplateSection sectionKey="faq" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionLabel>{eyebrow}</SectionLabel>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[44ch] ${TYPE_T.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {showHelp && (
            <Reveal delay={240} className={`mt-9 p-6 @3xl:max-w-[460px] @3xl:p-7 ${CARD.white}`}>
              {helpTitle && <p className={`${C.ink} ${TYPE_T.h3}`}>{helpTitle}</p>}
              {helpText && <p className={`mt-2 text-[15px] leading-relaxed ${C.muted}`}>{helpText}</p>}
              {action && buttonLabel && (
                <ActionLink action={action} className={`${BTN.ink} ${BTN.md} mt-5 max-w-full`}>
                  {isWa && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{buttonLabel}</span>
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>

        <ul className="border-t border-[#18230F]/10 @5xl:col-span-7">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className="border-b border-[#18230F]/10">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6"
                  >
                    <span className="text-[16px] font-medium leading-snug tracking-[-0.01em] text-[#18230F] @3xl:text-[18px]">{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-[#ECE6CF] text-[#18230F]'
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="tm-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE_T.body} @3xl:text-[16px] ${C.muted}`}>{field(item, 'answer')}</p>
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
