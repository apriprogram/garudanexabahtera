// Tanya jawab (kunci `faq`): kiri label + H2 + deskripsi + kartu konsultasi gelap bergaris kontur (judul, teks, tombol
// WhatsApp aksen); kanan accordion bergaris, satu terbuka. Tombol <button aria-expanded aria-controls>, panel
// role="region"; panel tertutup `inert`. Buka-tutup grid-rows 0fr → 1fr (CSS .pg-collapse) bila gerak menyala.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import type { PuncakModel } from './model';
import { BTN, C, TYPE_P } from './styles';
import { SectionLabel, Topo } from './ui';

export function Faq({ m }: { m: PuncakModel }) {
  const { faq } = m;
  const items = list(faq, 'items', 8).filter((item) => field(item, 'question'));
  const [open, setOpen] = useState<number | null>(0);
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
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-[#0E1512] ${TYPE_P.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[44ch] ${TYPE_P.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {showHelp && (
            <Reveal delay={240} data-tpl-tone="inverse" className={`relative isolate mt-9 overflow-hidden rounded-[24px] p-6 text-white @3xl:max-w-[460px] @3xl:p-7 ${C.night}`}>
              <Topo className="absolute -right-32 -top-20 -z-10 h-[300px] w-[460px] text-(--pg-glow) opacity-[0.14]" />
              {helpTitle && <p className={`text-white ${TYPE_P.h3}`}>{helpTitle}</p>}
              {helpText && <p className="mt-2 text-[15px] leading-relaxed text-white/80">{helpText}</p>}
              {action && buttonLabel && (
                <ActionLink action={action} className={`${BTN.accentFlat} ${BTN.md} mt-5 max-w-full`}>
                  {isWa && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{buttonLabel}</span>
                </ActionLink>
              )}
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
                    className="flex w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6"
                  >
                    <span className="text-[16px] font-medium leading-snug tracking-[-0.01em] text-[#0E1512] @3xl:text-[18px]">{field(item, 'question')}</span>
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen ? 'bg-[#0E1512] text-(--tpl-accent)' : 'bg-[#F1F2EE] text-[#0E1512]'
                      }`}
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="pg-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE_P.body} ${C.muted}`}>{field(item, 'answer')}</p>
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
