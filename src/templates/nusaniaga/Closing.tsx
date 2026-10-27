// Tanya jawab (kunci `faq`) + pita ajakan (kunci `cta`).
// FAQ: pita abu. Kepala section dengan tautan "Tanya lewat WhatsApp" di kanan, lalu DUA kolom kartu buka-tutup yang
// berdiri sendiri (paruh pertama di kiri, paruh kedua di kanan, jadi urutan baca tetap 1…n dan membuka satu kartu tidak
// meregangkan kartu di sebelahnya). Tombol aria-expanded/aria-controls di dalam <h3>, panel role="region", tertutup
// `inert`, satu terbuka.
// Ajakan: pita crimson selebar layar (data-tpl-tone="inverse" bila teksnya putih), label berbingkai, H2, deskripsi,
// dua tombol pil di kanan, dan bilah-bilah statis tipis di tepi kanan yang menggemakan hero.
import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { ListItem } from '../types';
import type { NusaNiagaModel } from './model';
import { C, CARD, GRID, SECTION_PAD, TYPE_N } from './styles';
import { PillLink, SectionHead, Tag, TextLink } from './ui';

function FaqCard({ item, index, open, onToggle, baseId }: { item: ListItem; index: number; open: boolean; onToggle: () => void; baseId: string }) {
  const buttonId = `${baseId}-q${index}`;
  const panelId = `${baseId}-a${index}`;
  // Cincin fokus digambar di KARTU, bukan di tombol: kartu ber-overflow-hidden memotong outline tombol yang menempel
  // di tepinya (tidak ada penanda fokus sama sekali saat pertanyaan tertutup)
  return (
    <div className={`${CARD} has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-(--tpl-accent-ink)`}>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex min-h-16 w-full items-center justify-between gap-5 px-6 py-5 text-left focus-visible:outline-none"
        >
          <span className={`min-w-0 ${C.ink} ${TYPE_N.h3}`}>{field(item, 'question')}</span>
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
              open ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'text-[#141821] ring-1 ring-inset ring-[#141821]/20 group-hover:ring-(--tpl-accent)'
            }`}
          >
            {open ? <Minus className="h-4 w-4" strokeWidth={2.2} /> : <Plus className="h-4 w-4" strokeWidth={2.2} />}
          </span>
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} data-open={open} inert={!open} className="nn-collapse">
        <div className="overflow-hidden">
          <p className={`max-w-[62ch] px-6 pb-6 ${TYPE_N.body} ${C.muted}`}>{field(item, 'answer')}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq({ m }: { m: NusaNiagaModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(`Halo ${m.companyName}, saya ingin bertanya.`) ?? m.contactAction);
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)].filter((col) => col.length > 0);

  return (
    <TemplateSection sectionKey="faq" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(faq, 'eyebrow')}
          title={text(faq, 'title')}
          srTitle="Tanya jawab"
          subtitle={text(faq, 'subtitle')}
          aside={<TextLink action={linkAction} label={text(faq, 'link_label')} />}
        />
        <Reveal delay={120} className="mt-10 grid items-start gap-3 @3xl:mt-14 @5xl:grid-cols-2 @5xl:gap-4 @5xl:mt-16">
          {columns.map((col, c) => (
            <div key={c} className="grid gap-3 @5xl:gap-4">
              {col.map((item, j) => {
                const index = c * half + j;
                return (
                  <FaqCard
                    key={`${field(item, 'question')}-${index}`}
                    item={item}
                    index={index}
                    open={open === index}
                    onToggle={() => setOpen(open === index ? null : index)}
                    baseId={baseId}
                  />
                );
              })}
            </div>
          ))}
        </Reveal>
      </div>
    </TemplateSection>
  );
}

/** Tinggi bilah dekoratif di pita ajakan (naik ke kanan seperti bilah foto hero). */
const BAND_SLATS = ['h-[64%]', 'h-[76%]', 'h-[88%]', 'h-full'];

export function Cta({ m }: { m: NusaNiagaModel }) {
  const { cta } = m;
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const primary = m.linkOr(text(cta, 'button_url'), m.quoteAction);
  const secondary = m.linkOr(text(cta, 'secondary_url'), m.waAction);

  return (
    <TemplateSection sectionKey="cta" data-tpl-tone={m.accentTone} className="relative isolate overflow-hidden bg-(--tpl-accent) py-16 text-(--tpl-on-accent) @5xl:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[30%] max-w-[500px] items-end gap-3 @3xl:flex">
        {BAND_SLATS.map((height) => (
          <span key={height} className={`${height} flex-1 bg-current opacity-[0.07]`} />
        ))}
      </div>
      <div className={`${CONTAINER} ${GRID} gap-y-9 @5xl:items-end`}>
        <div className="min-w-0 @5xl:col-span-7">
          {text(cta, 'eyebrow') && (
            <Reveal variant="fade">
              <Tag tone="band">{text(cta, 'eyebrow')}</Tag>
            </Reveal>
          )}
          {title ? (
            <Reveal as="h2" delay={80} className={`max-w-[20ch] ${text(cta, 'eyebrow') ? 'mt-5' : ''} ${TYPE_N.h2}`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">Ajakan</h2>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className="mt-5 max-w-[56ch] text-pretty text-[17px] leading-relaxed">
              {subtitle}
            </Reveal>
          )}
        </div>
        <Reveal delay={240} className="flex min-w-0 flex-col gap-3 @xl:flex-row @5xl:col-[9/13] @5xl:flex-col">
          <PillLink action={primary} label={text(cta, 'button_label')} variant="band" size="lg" className="w-full @xl:w-auto @5xl:w-full" />
          <PillLink action={secondary} label={text(cta, 'secondary_label')} variant="bandOutline" size="lg" className="w-full @xl:w-auto @5xl:w-full" />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
