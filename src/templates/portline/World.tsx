// Jaringan global & keberlanjutan. Jaringan: kepala section + daftar KAWASAN yang bisa dibuka satu per satu (angka
// singkat di kanan, hub/kota sebagai chip + keterangan saat dibuka) di kiri; di kanan foto pelabuhan dengan lingkaran
// radar tipis dan kartu kaca kantor pusat (label, kota, koordinat). Keberlanjutan: PITA BIRU PEJAL selebar layar dengan
// pernyataan besar (kalimat biasa, bukan kapital), paragraf, tombol opsional, foto tegak, dan komitmen bernomor 01/02/03
// dipisah garis tipis.
import { ChevronDown, MapPin } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, safeUrl, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_P } from './styles';
import { Button, SectionHead, SectionLabel } from './ui';

export function Network({ m }: { m: PortlineModel }) {
  const { network } = m;
  const items = m.items('network');
  const [open, setOpen] = useState(0);
  const baseId = useId();
  const image = text(network, 'image');
  const cardLabel = text(network, 'image_label');
  const cardValue = text(network, 'image_value');
  const cardCaption = text(network, 'image_caption');
  return (
    <TemplateSection sectionKey="network" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-10 ${hasImage(image) ? '@5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16' : ''}`}>
          <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-5' : 'max-w-[860px]'}`}>
            <SectionHead layout="stack" eyebrow={text(network, 'eyebrow')} title={text(network, 'title')} subtitle={text(network, 'subtitle')} />
            {items.length > 0 && (
              <ul className="mt-8 border-t border-(--pl-deep)/[0.14] @3xl:mt-10">
                {items.map((item, i) => {
                  const isOpen = open === i;
                  const panelId = `${baseId}-region-${i}`;
                  const hubs = field(item, 'hubs')
                    .split(',')
                    .map((h) => h.trim())
                    .filter(Boolean);
                  return (
                    <Reveal as="li" key={`${field(item, 'region')}-${i}`} delay={stagger(i, 70)} className="border-b border-(--pl-deep)/[0.14]">
                      <h3>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setOpen(isOpen ? -1 : i)}
                          className="group flex min-h-16 w-full items-center gap-4 py-4 text-left"
                        >
                          <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300 ${isOpen ? 'bg-(--tpl-accent)' : 'bg-(--pl-deep)/20 group-hover:bg-(--pl-line)'}`} />
                          <span className={`min-w-0 flex-1 ${DISPLAY} text-[20px] font-semibold uppercase leading-tight tracking-[0.02em] @3xl:text-[22px] ${C.ink}`}>{field(item, 'region')}</span>
                          {field(item, 'value') && <span className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${isOpen ? 'text-(--pl-ink)' : C.muted}`}>{field(item, 'value')}</span>}
                          <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-(--pl-deep) transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </h3>
                      <div id={panelId} data-open={isOpen ? 'true' : 'false'} className="pl-collapse">
                        <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                          <div className="pb-6 pl-6.5">
                            {hubs.length > 0 && (
                              <>
                                <p className="sr-only">{m.ui.hubs}</p>
                                <ul className="flex flex-wrap gap-1.5">
                                  {hubs.map((hub) => (
                                    <li key={hub} className="inline-flex items-center gap-1.5 rounded-[3px] bg-(--pl-ice) px-2.5 py-1.5 text-[13px] font-medium text-(--pl-deep)">
                                      <MapPin aria-hidden className="h-3.5 w-3.5 text-(--pl-ink)" strokeWidth={2} />
                                      {hub}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {field(item, 'text') && <p className={`mt-3 max-w-[52ch] ${TYPE_P.small} ${C.body}`}>{field(item, 'text')}</p>}
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </div>
          {hasImage(image) && (
            <Reveal variant="fade" className="min-w-0 @5xl:col-span-7">
              <div data-tpl-tone="inverse" className="relative isolate h-full overflow-hidden rounded-[6px]">
                <KitPhoto
                  src={image}
                  alt={PORTLINE_PHOTOS.alt(image, cardValue || m.companyName)}
                  sizes="(min-width: 1024px) 56vw, 92vw"
                  className="aspect-[4/3] h-full @5xl:aspect-auto @5xl:min-h-[540px]"
                  parallax={5}
                />
                {/* Lingkaran radar dekoratif di sekitar kota kantor pusat */}
                <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
                  {[120, 230, 360].map((size, i) => (
                    <span
                      key={size}
                      className="pl-ring absolute"
                      style={{ left: '58%', top: '62%', width: size, height: size, transform: 'translate(-50%, -50%)', ['--pl-ring-delay' as string]: `${i * 1.4}s` }}
                    />
                  ))}
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-white ring-4 ring-white/30" style={{ left: '58%', top: '62%', transform: 'translate(-50%, -50%)' }} />
                </div>
                {(cardLabel || cardValue || cardCaption) && (
                  <div className="absolute bottom-4 left-4 z-[2] max-w-[calc(100%-32px)] rounded-[6px] bg-(--pl-deep)/[0.92] p-4 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md @3xl:bottom-6 @3xl:left-6 @3xl:p-5">
                    {cardLabel && <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/80">{cardLabel}</p>}
                    {cardValue && <p className={`mt-1 ${DISPLAY} text-[20px] font-semibold leading-tight @3xl:text-[22px]`}>{cardValue}</p>}
                    {cardCaption && <p className="mt-1 text-[12.5px] tabular-nums text-white/85">{cardCaption}</p>}
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Sustainability({ m }: { m: PortlineModel }) {
  const { sustainability } = m;
  const items = m.items('sustainability');
  const image = text(sustainability, 'image');
  const buttonUrl = safeUrl(text(sustainability, 'button_url')) ? text(sustainability, 'button_url') : '';
  const action = buttonUrl ? m.linkOr(buttonUrl, null) : null;
  return (
    <TemplateSection sectionKey="sustainability" data-tpl-tone="inverse" className={`relative isolate overflow-hidden bg-(--pl-band) text-white ${SECTION_PAD}`}>
      <div aria-hidden className="pl-dots pointer-events-none absolute left-[3%] top-10 -z-10 hidden h-28 w-44 text-white/20 @5xl:block" />
      <div className={CONTAINER}>
        <div className={`grid items-center gap-10 ${hasImage(image) ? '@5xl:grid-cols-12 @5xl:gap-14' : ''}`}>
          <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-7' : 'max-w-[900px]'}`}>
            {text(sustainability, 'eyebrow') && (
              <Reveal variant="fade">
                <SectionLabel tone="band">{text(sustainability, 'eyebrow')}</SectionLabel>
              </Reveal>
            )}
            {text(sustainability, 'title') && (
              <Reveal as="h2" delay={60} className={`mt-5 max-w-[26ch] text-balance ${TYPE_P.statement}`}>
                {text(sustainability, 'title')}
              </Reveal>
            )}
            {text(sustainability, 'text') && (
              <Reveal as="p" delay={120} className={`mt-5 max-w-[58ch] text-pretty text-white/85 ${TYPE_P.lead}`}>
                {text(sustainability, 'text')}
              </Reveal>
            )}
            {action && text(sustainability, 'button_label') && (
              <div className="mt-8">
                <Button action={action} label={text(sustainability, 'button_label')} variant="white" />
              </div>
            )}
          </div>
          {hasImage(image) && (
            <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={PORTLINE_PHOTOS.alt(image, text(sustainability, 'eyebrow') || m.companyName)}
                sizes="(min-width: 1024px) 40vw, 92vw"
                className="aspect-[4/3] rounded-[6px] @5xl:aspect-square"
                position="62% 50%"
                zoom
              />
            </Reveal>
          )}
        </div>
        {items.length > 0 && (
          <ol className={`mt-12 grid gap-8 border-t border-white/20 pt-8 @3xl:mt-16 @3xl:gap-10 @3xl:pt-10 ${items.length >= 3 ? '@3xl:grid-cols-3' : '@3xl:grid-cols-2'} ${items.length === 4 ? '@6xl:grid-cols-4' : ''}`}>
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i)} className="min-w-0">
                <span aria-hidden className={`${DISPLAY} text-[15px] font-bold tabular-nums text-white/90`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={`mt-2 ${DISPLAY} text-[21px] font-semibold leading-tight @3xl:text-[23px]`}>{field(item, 'title')}</h3>
                {field(item, 'text') && <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-white/85">{field(item, 'text')}</p>}
              </Reveal>
            ))}
          </ol>
        )}
      </div>
    </TemplateSection>
  );
}
