// Tanya jawab (kunci `faq`) + Ajakan (kunci `cta`).
// FAQ: kiri (kolom 1-4, menempel saat digulir di layar lebar) kepala section + tautan "Tanya lewat WhatsApp"; kanan
// (kolom 6-12) akordeon kartu bulat radius 24: tertutup peach lembut, terbuka mint; tombol "+" di lingkaran putih
// berputar 45°. Tombol aria-expanded/aria-controls di dalam H3, panel role="region", tertutup `inert`, pertanyaan
// pertama terbuka. HP: kepala → akordeon → tautan.
// Ajakan: PITA PEACH selebar layar dengan tepi bergelombang, judul & tombol di tengah, dikelilingi doodle hati, bintang,
// kilau, dan bulan yang BERKILAU SEKALI saat pita masuk layar (./momkid.css, usePlayOnce).
import { Plus } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { WhatsAppIcon } from '../shared/icons';
import { field, text } from '../shared/utils';
import { Doodle } from './art';
import { usePlayOnce } from './hooks';
import type { DoodleName } from './icons';
import { glue, type MomkidModel } from './model';
import { C, DISPLAY, GRID_GAP, SECTION_PAD, TONE_BG, TYPE } from './styles';
import { ButtonLink, SectionHead, TextLink, Wave } from './ui';

export function Faq({ m }: { m: MomkidModel }) {
  const { faq } = m;
  const items = m.items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  // Kosong → WhatsApp dengan pesan awal dari CMS; tanpa nomor WhatsApp tautan disembunyikan
  const linkAction = m.linkOr(text(faq, 'link_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="faq" className={`${TONE_BG[m.tone('faq')]} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="contents @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)] @5xl:col-span-4 @5xl:block @5xl:self-start">
          <SectionHead align="left" eyebrow={text(faq, 'eyebrow')} doodle="chat" title={text(faq, 'title')} subtitle={text(faq, 'subtitle')} srTitle="Tanya jawab" />
          <TextLink action={linkAction} label={text(faq, 'link_label')} className="order-last mt-6 justify-self-start @5xl:order-none @5xl:mt-7" />
        </div>
        <ul className="mt-8 grid gap-3 @5xl:col-span-7 @5xl:col-start-6 @5xl:mt-0">
          {items.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <Reveal
                as="li"
                key={`${field(item, 'question')}-${i}`}
                delay={stagger(i, 60)}
                className={`rounded-[24px] px-5 @3xl:px-7 ${isOpen ? 'bg-[#DDF3EA]' : 'bg-(--mk-peach-soft)'}`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className={`group flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left ${C.ink}`}
                  >
                    <span className={`${DISPLAY} text-balance text-[17px] font-extrabold leading-snug @3xl:text-[18px]`}>{field(item, 'question')}</span>
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                      <Plus className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.4} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="mk-collapse">
                  <div className="overflow-hidden">
                    <p className={`max-w-[62ch] pb-5 pr-2 ${TYPE.body} ${C.ink} @3xl:pr-12`}>{field(item, 'answer')}</p>
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

/** Doodle di sekeliling judul ajakan: [nama, posisi, ukuran, warna gumpalan, tampil di HP]. */
const SPARKS: [DoodleName, string, string, string, boolean][] = [
  ['heart', 'left-[calc(50%-76px)] top-0 @3xl:left-[4%] @3xl:top-[18%] @5xl:left-[10%] @5xl:top-[22%]', 'h-12 w-12 @5xl:h-16 @5xl:w-16', 'fill-white', true],
  ['star', 'right-[calc(50%-76px)] top-1 @3xl:right-[5%] @3xl:top-[12%] @5xl:right-[12%] @5xl:top-[18%]', 'h-11 w-11 @5xl:h-14 @5xl:w-14', 'fill-[#FFF1DA]', true],
  ['sparkle', 'left-[16%] bottom-[14%] @5xl:left-[18%] @5xl:bottom-[20%]', 'h-9 w-9 @5xl:h-11 @5xl:w-11', '', false],
  ['moon', 'right-[14%] bottom-[16%] @5xl:right-[9%] @5xl:bottom-[24%]', 'h-12 w-12 @5xl:h-16 @5xl:w-16', 'fill-[#DDF3EA]', false],
  ['sparkle', 'right-[26%] top-[8%] @5xl:right-[25%] @5xl:top-[12%]', 'h-7 w-7 @5xl:h-9 @5xl:w-9', '', false],
  ['footprints', 'left-[26%] top-[6%] @5xl:left-[24%] @5xl:top-[10%]', 'h-10 w-10 @5xl:h-12 @5xl:w-12', 'fill-white', false],
];

export function Cta({ m }: { m: MomkidModel }) {
  const { cta } = m;
  const band = useRef<HTMLDivElement>(null);
  usePlayOnce(band);
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const eyebrow = text(cta, 'eyebrow');
  const primary = m.linkOr(text(cta, 'button_url'), m.visitAction);
  const secondary = m.linkOr(text(cta, 'secondary_url'), m.waWith(text(m.contact, 'whatsapp_message') || `Halo ${m.companyName}, saya ingin bertanya.`));

  return (
    <TemplateSection sectionKey="cta" className="relative bg-(--mk-peach) py-14 @3xl:py-20">
      {!m.afterHero('cta') && <Wave tone="peach" position="top" />}
      <Wave tone="peach" position="bottom" />
      <div ref={band} className={`${CONTAINER} mk-sparks relative`}>
        {SPARKS.map(([name, place, size, blob, phone], i) => (
          <span
            key={`${name}-${i}`}
            aria-hidden
            className={`mk-spark pointer-events-none absolute ${place} ${phone ? 'block' : 'hidden @3xl:block'}`}
            style={{ '--mk-d': `${0.15 + i * 0.12}s` } as CSSProperties}
          >
            <Doodle name={name} blob={blob} className={`${size} ${C.accent}`} />
          </span>
        ))}
        <Reveal variant="scale" className="relative mx-auto max-w-[680px] pb-4 pt-16 text-center @3xl:py-10">
          {eyebrow && <p className={`${TYPE.label} text-[15px] ${C.accent}`}>{eyebrow}</p>}
          {title ? <h2 className={`${eyebrow ? 'mt-4' : ''} mx-auto max-w-[18ch] ${TYPE.h2} ${C.ink}`}>{glue(title)}</h2> : <h2 className="sr-only">Ajakan</h2>}
          {subtitle && <p className={`mx-auto mt-4 max-w-[46ch] text-pretty ${TYPE.lead} ${C.ink}`}>{subtitle}</p>}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 @xl:flex-row @xl:items-center">
            <ButtonLink action={primary} label={text(cta, 'button_label')} />
            <ButtonLink
              action={secondary}
              label={text(cta, 'secondary_label')}
              variant="white"
              arrow={false}
              icon={secondary?.kind === 'external' ? <WhatsAppIcon className="h-5 w-5 shrink-0" /> : undefined}
            />
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
