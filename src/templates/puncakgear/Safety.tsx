// Tips keselamatan (kunci `safety`): kiri (lengket di layar lebar) label, H2, deskripsi, foto 16:10, dan kartu darurat
// warna aksen lembut berikon sirene; kanan daftar tips bernomor 01–0n bergaris tipis dengan ikon otomatis dari judul
// (cuaca, pendaftaran, rombongan, hipotermia, air, sampah). Konten tips umum dan tidak menggantikan arahan resmi.
import { Siren } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { C, DISPLAY, TYPE_P } from './styles';
import { SectionLabel, TitleIcon, Topo } from './ui';

export function Safety({ m }: { m: PuncakModel }) {
  const { safety } = m;
  const items = list(safety, 'items', 8).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;
  const eyebrow = text(safety, 'eyebrow');
  const title = text(safety, 'title');
  const subtitle = text(safety, 'subtitle');
  const image = text(safety, 'image');
  const emergencyTitle = text(safety, 'emergency_title');
  const emergencyText = text(safety, 'emergency_text');

  return (
    <TemplateSection sectionKey="safety" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          <div className="@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)]">
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
            {hasImage(image) && (
              <Reveal variant="fade" delay={200} className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[24px]">
                <KitPhoto src={image} alt={PUNCAK_PHOTOS.alt(image, 'Pendaki beristirahat di puncak')} fallback="none" zoom sizes="(min-width: 1024px) 40vw, 100vw" className="absolute inset-0" />
              </Reveal>
            )}
            {(emergencyTitle || emergencyText) && (
              <Reveal delay={240} className="relative isolate mt-4 flex gap-4 overflow-hidden rounded-[24px] bg-(--pg-tint) p-5 @3xl:p-6">
                <Topo className="absolute -right-24 -top-16 -z-10 h-[260px] w-[380px] text-[#0E1512] opacity-[0.12]" />
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0E1512] text-(--pg-glow)">
                  <Siren className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  {emergencyTitle && <p className={`text-[#0E1512] ${TYPE_P.h3}`}>{emergencyTitle}</p>}
                  {emergencyText && <p className="mt-1 text-[15px] leading-relaxed text-[#0E1512]/85">{emergencyText}</p>}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        <ol className="border-t border-black/[0.08] @5xl:col-span-7">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-black/[0.08] py-6 @3xl:grid-cols-[72px_auto_1fr] @3xl:gap-x-6 @3xl:py-8">
              <span aria-hidden className={`hidden text-[28px] leading-none tabular-nums tracking-[-0.03em] text-[#0E1512]/25 @3xl:block ${DISPLAY}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F2EE] text-[#0E1512]">
                <TitleIcon title={field(item, 'title')} index={i} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className={`text-[#0E1512] ${TYPE_P.h3}`}>{field(item, 'title')}</h3>
                {field(item, 'text') && <p className={`mt-1.5 max-w-[56ch] ${TYPE_P.body} ${C.muted}`}>{field(item, 'text')}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </TemplateSection>
  );
}
