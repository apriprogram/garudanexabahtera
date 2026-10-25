// Tanya jawab (kunci `faq`): kiri label + H2 + kartu bantuan (judul, teks, tombol WhatsApp panitia); kanan accordion
// bergaris tipis gaya editorial, satu terbuka. Tombol <button aria-expanded aria-controls>, panel role="region"; panel
// tertutup `inert`. Buka-tutup grid-rows 0fr → 1fr (CSS .md-collapse) bila gerak menyala.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import type { MadaniModel } from './model';
import { BTN, C, SECTION_PAD, TYPE_M } from './styles';
import { Eyebrow } from './ui';

export function Faq({ m }: { m: MadaniModel }) {
  const { faq } = m;
  const items = list(faq, 'items', 10).filter((item) => field(item, 'question'));
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const eyebrow = text(faq, 'eyebrow');
  const title = text(faq, 'title');
  const helpTitle = text(faq, 'help_title');
  const helpText = text(faq, 'help_text');
  const buttonLabel = text(faq, 'button_label');
  const action = resolveAction(text(faq, 'button_url'), m.ppdbAskAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const showHelp = !!(helpTitle || helpText || (action && buttonLabel));

  return (
    <TemplateSection sectionKey="faq" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance text-(--md-deep) ${TYPE_M.h2}`}>
              {title}
            </Reveal>
          )}
          {showHelp && (
            <Reveal delay={140} className="mt-8 rounded-[24px] bg-(--md-tint) p-6 @3xl:max-w-[440px] @3xl:p-7">
              {helpTitle && <p className={`text-(--md-deep) ${TYPE_M.h3}`}>{helpTitle}</p>}
              {helpText && <p className={`mt-2 text-[15px] leading-relaxed ${C.body}`}>{helpText}</p>}
              {action && buttonLabel && (
                <ActionLink action={action} className={`${BTN.primary} ${BTN.md} mt-5 max-w-full px-5`}>
                  {isWa && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{buttonLabel}</span>
                </ActionLink>
              )}
            </Reveal>
          )}
        </div>

        <ul className="min-w-0 border-t border-black/[0.1] @5xl:col-span-7">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 50)} className="border-b border-black/[0.1]">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6"
                  >
                    <span className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-(--md-deep) @3xl:text-[18px]">{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen ? 'bg-(--md-deep) text-(--md-hl-ink)' : 'bg-[#F6F4EC] text-(--md-deep)'
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="md-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE_M.body} ${C.muted}`}>{field(item, 'answer')}</p>
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
