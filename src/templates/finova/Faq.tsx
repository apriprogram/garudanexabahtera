// FAQ (brief §3.4 #7): kiri chip + H2 + deskripsi + kartu bantuan (foto opsional, jam layanan, tombol WhatsApp);
// kanan accordion bergaris, satu terbuka. Tombol <button aria-expanded aria-controls>, panel role="region"; panel
// tertutup `inert` (tidak terbaca/terfokus). Buka-tutup grid-rows 0fr → 1fr 300ms bila gerak menyala.
import { Clock, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, isEnabled, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { FinovaModel } from './model';
import { FINOVA_PHOTOS } from './photos';
import { C, SECTION_F, TYPE_F } from './styles';
import { SectionChip } from './ui';

export function Faq({ m }: { m: FinovaModel }) {
  const { faq, contact } = m;
  const items = list(faq, 'items', 8).filter((item) => field(item, 'question'));
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const eyebrow = text(faq, 'eyebrow');
  const title = text(faq, 'title');
  const subtitle = text(faq, 'subtitle');
  const helpTitle = text(faq, 'help_title');
  const image = text(faq, 'image');
  const hours = isEnabled(contact) ? text(contact, 'hours') : '';
  const buttonLabel = text(faq, 'button_label');
  const action = resolveAction(text(faq, 'button_url'), m.waAction ?? m.contactAction);
  const showHelp = !!(helpTitle || hasImage(image) || (action && buttonLabel));

  return (
    <TemplateSection sectionKey="faq" className={SECTION_F}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionChip>{eyebrow}</SectionChip>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-[#0B0F0E] ${TYPE_F.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] ${TYPE_F.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {showHelp && (
            <Reveal delay={240} className={`mt-9 flex items-stretch gap-4 rounded-[24px] p-3 ${C.surface} @3xl:max-w-[520px]`}>
              {hasImage(image) && (
                <KitPhoto
                  src={image}
                  alt={FINOVA_PHOTOS.alt(image, helpTitle || `Tim ${m.companyName}`)}
                  fallback="none"
                  sizes="140px"
                  position="50% 20%"
                  className="aspect-[4/5] w-[104px] shrink-0 rounded-[18px] @3xl:w-[128px]"
                />
              )}
              <div className="flex min-w-0 flex-col justify-center gap-3 py-2 pr-2">
                {helpTitle && <p className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[#0B0F0E] @3xl:text-[17px]">{helpTitle}</p>}
                {hours && (
                  <p className={`flex items-center gap-1.5 text-[13px] ${C.muted}`}>
                    <Clock className="h-3.5 w-3.5 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
                    {hours}
                  </p>
                )}
                {action && buttonLabel && (
                  <ActionLink action={action} className="inline-flex min-h-10 max-w-full items-center gap-2 self-start rounded-full bg-[#0B0F0E] px-4 py-2 text-left text-[14px] font-medium leading-tight text-white transition-colors hover:bg-[#1C2422]">
                    {action.kind === 'external' && /wa\.me/.test(action.href) && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
                    {buttonLabel}
                  </ActionLink>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {items.length > 0 && (
          <ul className="border-t border-black/10 @5xl:col-span-7">
            {items.map((item, i) => {
              const isOpen = open === i;
              const buttonId = `${baseId}-q${i}`;
              const panelId = `${baseId}-a${i}`;
              return (
                <Reveal as="li" key={`${field(item, 'question')}-${i}`} delay={stagger(i, 60)} className="border-b border-black/10">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left @3xl:py-6"
                    >
                      <span className="text-[16px] font-medium leading-snug tracking-[-0.015em] text-[#0B0F0E] @3xl:text-[19px]">{field(item, 'question')}</span>
                      <span
                        aria-hidden
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                          isOpen ? 'bg-(--fin-hl) text-(--fin-on-hl) ring-1 ring-inset ring-black/10' : 'bg-[#F1F3F2] text-[#0B0F0E]'
                        }`}
                      >
                        <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="fin-collapse">
                    <div className="overflow-hidden">
                      <p className={`max-w-[62ch] pb-6 pr-12 ${TYPE_F.body} ${C.muted} @3xl:text-[16px]`}>{field(item, 'answer')}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
