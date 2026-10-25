// Garansi servis lokal (kunci `warranty`): kanvas abu berkisi garis tipis seperti hero, kepala terbelah, lalu foto
// bengkel 4:5 di kiri (kartu kaca "Bengkel <nama toko>") dan kartu angka di kanan bergaya lembar spesifikasi: angka
// besar tipis, label mono, keterangan, dan tanda sudut. Di bawahnya catatan pengecualian garansi (jujur) dan tombol
// klaim garansi (WhatsApp berisi "klaim garansi servis" bila tautan kosong). HP: foto 4:3 lalu kartu 1 kolom (2 ≥ @xl).
import { Wrench } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { BTN, C, GLASS, MONO, TYPE_S } from './styles';
import { ButtonLink, SectionHead, TitleIcon } from './ui';

/** Tanda sudut kartu angka (gaya bingkai gambar teknik). Dekoratif. */
function Corners() {
  return (
    <svg aria-hidden focusable="false" className="pointer-events-none absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] text-[#0E1A1C]/25" preserveAspectRatio="none" viewBox="0 0 100 100">
      <g fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke">
        <path d="M0 8V0H8M92 0H100V8M100 92V100H92M8 100H0V92" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

export function Warranty({ m }: { m: SkyNusaModel }) {
  const { warranty } = m;
  const title = text(warranty, 'title');
  const stats = list(warranty, 'stats', 4).filter((item) => field(item, 'value') || field(item, 'label'));
  const image = text(warranty, 'image');
  const withImage = hasImage(image);
  const note = text(warranty, 'note');
  const action = resolveAction(text(warranty, 'button_url'), m.askAbout('klaim garansi servis'));
  if (!title && stats.length === 0) return null;

  return (
    <TemplateSection sectionKey="warranty" className={`relative isolate overflow-hidden ${C.canvas} ${SECTION_Y}`}>
      <div aria-hidden className="sn-grid absolute inset-0 -z-10" />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(warranty, 'eyebrow')} title={title} highlight={text(warranty, 'highlight')} subtitle={text(warranty, 'subtitle')} />

        <div className="mt-10 grid gap-5 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-6">
          {withImage && (
            <Reveal variant="scale" className="relative min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={SKYNUSA_PHOTOS.alt(image, `Bengkel servis ${m.companyName}`)}
                fallback="none"
                zoom
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/3] rounded-[20px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[480px]"
              />
              <p className={`absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-[12px] p-3 pr-4 text-[#0E1A1C] @xl:right-auto ${GLASS}`}>
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0E1A1C] text-white">
                  <Wrench className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className={`block ${MONO} ${C.muted}`}>Servis lokal</span>
                  <span className="block truncate text-[15px] font-medium">Bengkel {m.companyName}</span>
                </span>
              </p>
            </Reveal>
          )}

          {stats.length > 0 && (
            <dl className={`grid min-w-0 gap-3 @xl:grid-cols-2 @5xl:gap-4 ${withImage ? '@5xl:col-span-7' : '@5xl:col-span-12 @5xl:grid-cols-4'}`}>
              {stats.map((item, i) => (
                <Reveal key={`${field(item, 'value')}-${i}`} delay={stagger(i, 80)} className="relative flex min-h-[200px] flex-col rounded-[16px] bg-white p-6 ring-1 ring-inset ring-black/[0.06] @3xl:p-7">
                  <Corners />
                  <dt className="flex items-start justify-between gap-4">
                    <span className={`${MONO} ${C.muted}`}>{field(item, 'label')}</span>
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-(--sn-tint) text-(--tpl-accent-ink)">
                      <TitleIcon title={`${field(item, 'label')} ${field(item, 'text')}`} index={i + 4} className="h-[18px] w-[18px]" />
                    </span>
                  </dt>
                  <dd className="mt-auto pt-8">
                    <span className={`block text-[#0E1A1C] ${TYPE_S.stat}`}>{field(item, 'value')}</span>
                    {field(item, 'text') && <span className={`mt-3 block text-[14px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</span>}
                  </dd>
                </Reveal>
              ))}
            </dl>
          )}
        </div>

        {(note || text(warranty, 'button_label')) && (
          <Reveal className="mt-8 flex flex-col gap-5 rounded-[16px] bg-white/70 p-5 ring-1 ring-inset ring-black/[0.05] @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:p-6">
            {note && <p className={`max-w-[80ch] text-[14px] leading-relaxed ${C.muted}`}>{note}</p>}
            <ButtonLink action={action} label={text(warranty, 'button_label')} variant="ink" className={`${BTN.ink} ${BTN.md} shrink-0 justify-between self-start @3xl:self-auto`} />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
