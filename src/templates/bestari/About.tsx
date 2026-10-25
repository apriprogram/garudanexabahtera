// Profil (kunci `about`), sambutan kepala sekolah (`welcome`), dan alasan memilih (`why`).
// Profil: label bernomor, judul paragraf besar DUA WARNA (bagian kedua abu-abu, referensi Bienes), lalu kolase dua foto
// dengan cincin tipis dan kartu "Berdiri sejak" (referensi Eduker) di samping profil singkat, poin centang, daftar
// buka-tutup bertombol "+" (Bienes), dan tombol.
// Sambutan: foto tegak membulat dengan kartu nama, label bernomor, H2, kutipan besar, isi, dan tombol.
// Alasan: daftar bernomor "(01)" yang dibuka satu per satu (referensi Lifestyle) + foto dengan kartu angka + kartu
// kutipan guru berfoto.
import { Check, Plus, Quote } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import type { BestariModel } from './model';
import { BESTARI_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_B } from './styles';
import { Highlighted, PillLink, SectionHead, SectionLabel } from './ui';

/** Baris isi butir (dipisah Enter) → daftar; satu baris → paragraf. */
const lines = (raw: string) =>
  (raw || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

function Pillar({ item, index }: { item: ListItem; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const id = useId();
  const title = field(item, 'title');
  const summary = field(item, 'text');
  const detail = lines(field(item, 'detail'));
  const plus = (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${open && detail.length ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-[#1C1917] text-white'}`}
    >
      <Plus className={`h-4 w-4 transition-transform duration-300 ${open && detail.length ? 'rotate-45' : ''}`} strokeWidth={2.2} />
    </span>
  );
  return (
    <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[#1C1917]/[0.1] @3xl:px-6">
      {detail.length > 0 ? (
        <h3>
          <button
            id={`${id}-b`}
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-p`}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-4 py-1 text-left"
          >
            <span className={`${DISPLAY} text-[17px] font-medium tracking-[-0.01em] ${C.ink}`}>{title}</span>
            {plus}
          </button>
        </h3>
      ) : (
        <h3 className={`py-1 ${DISPLAY} text-[17px] font-medium tracking-[-0.01em] ${C.ink}`}>{title}</h3>
      )}
      {summary && <p className={`mt-1 pr-12 ${TYPE_B.small} ${C.muted}`}>{summary}</p>}
      {detail.length > 0 && (
        <div id={`${id}-p`} role="region" aria-labelledby={`${id}-b`} data-open={open} inert={!open} className="bs-collapse">
          <div className="overflow-hidden">
            {detail.length > 1 ? (
              <ul className="space-y-2 pb-1 pt-3">
                {detail.map((line, i) => (
                  <li key={`${line}-${i}`} className={`flex gap-3 ${TYPE_B.small} ${C.ink}`}>
                    <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`pb-1 pt-3 ${TYPE_B.small} ${C.ink}`}>{detail[0]}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function About({ m }: { m: BestariModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const muted = text(about, 'title_muted');
  const body = paragraphs(text(about, 'body'));
  const image = text(about, 'image');
  const small = text(about, 'image_small');
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');
  const points = list(about, 'points', 6).filter((item) => field(item, 'text'));
  const pillars = list(about, 'pillars', 5).filter((item) => field(item, 'title'));
  const action = m.linkOr(text(about, 'button_url'), m.startAction);
  if (!title && !muted && body.length === 0 && pillars.length === 0) return null;

  return (
    <TemplateSection sectionKey="about" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <Reveal variant="fade">
          <SectionLabel label={text(about, 'eyebrow')} number={m.number('about')} />
        </Reveal>
        {(title || muted) && (
          <div className="mt-8 grid @5xl:mt-12 @5xl:grid-cols-12">
            <Reveal as="h2" delay={80} className={`text-pretty @5xl:col-span-10 @5xl:col-start-3 ${TYPE_B.statement} ${C.ink}`}>
              {title}
              {title && muted ? ' ' : ''}
              {muted && <span className={C.faint}>{muted}</span>}
            </Reveal>
          </div>
        )}

        <div className="mt-12 grid items-start gap-12 @3xl:mt-16 @5xl:grid-cols-12 @5xl:gap-14">
          {hasImage(image) && (
            <Reveal variant="fade" className="relative mx-auto w-full max-w-[560px] pb-14 pr-8 @3xl:pb-16 @3xl:pr-14 @5xl:col-span-6 @5xl:max-w-none">
              {/* Cincin tipis dekoratif (referensi Eduker) */}
              <svg aria-hidden viewBox="0 0 200 200" fill="none" className="absolute -left-5 top-16 -z-0 h-40 w-40 text-(--bs-line) @3xl:-left-10 @3xl:h-56 @3xl:w-56">
                <circle cx="100" cy="100" r="98" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 7" />
              </svg>
              <KitPhoto
                src={image}
                alt={BESTARI_PHOTOS.alt(image, `Murid ${m.companyName}`)}
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 44vw, 86vw"
                className="aspect-[4/5] rounded-[28px]"
              />
              {hasImage(small) && (
                <div className="absolute bottom-0 right-0 w-[52%] rounded-[24px] bg-white p-2 @3xl:p-2.5">
                  <KitPhoto
                    src={small}
                    alt={BESTARI_PHOTOS.alt(small, `Kegiatan belajar di ${m.companyName}`)}
                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 24vw, 46vw"
                    className="aspect-[4/3] rounded-[18px]"
                  />
                </div>
              )}
              {(badgeValue || badgeLabel) && (
                <div className="absolute right-0 top-8 rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[#1C1917]/[0.08]">
                  {badgeLabel && <p className={`text-[12.5px] font-medium ${C.muted}`}>{badgeLabel}</p>}
                  {badgeValue && <p className={`${DISPLAY} mt-0.5 text-[30px] font-medium leading-none tracking-[-0.03em] text-(--bs-ink)`}>{badgeValue}</p>}
                </div>
              )}
            </Reveal>
          )}
          <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-6' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
            {body.length > 0 && (
              <Reveal className={`space-y-4 ${TYPE_B.lead} ${C.muted}`}>
                {body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </Reveal>
            )}
            {points.length > 0 && (
              <ul className="mt-7 grid gap-3 @xl:grid-cols-2">
                {points.map((item, i) => (
                  <Reveal as="li" key={`${field(item, 'text')}-${i}`} delay={stagger(i, 60)} className={`flex items-start gap-3 text-[15px] font-medium leading-snug ${C.ink}`}>
                    <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--bs-tint) text-(--bs-ink)">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {field(item, 'text')}
                  </Reveal>
                ))}
              </ul>
            )}
            {pillars.length > 0 && (
              <div className="mt-9 grid gap-3">
                {pillars.map((item, i) => (
                  <Reveal key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)}>
                    <Pillar item={item} index={i} />
                  </Reveal>
                ))}
              </div>
            )}
            {action && text(about, 'button_label') && (
              <Reveal delay={120} className="mt-8">
                <PillLink action={action} label={text(about, 'button_label')} variant="ink" />
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Welcome({ m }: { m: BestariModel }) {
  const { welcome } = m;
  const title = text(welcome, 'title');
  const quote = text(welcome, 'quote');
  const body = paragraphs(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const photo = text(welcome, 'photo');
  if (!title && !quote && body.length === 0) return null;
  const action = m.linkOr(text(welcome, 'button_url'), m.sectionAction('teachers') ?? m.sectionAction('about'));

  return (
    <TemplateSection sectionKey="welcome" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid items-center gap-10 @4xl:grid-cols-12 @5xl:gap-16`}>
        {hasImage(photo) && (
          <Reveal variant="fade" className="relative mx-auto w-full max-w-[460px] @4xl:col-span-5 @4xl:max-w-none">
            <KitPhoto
              src={photo}
              alt={BESTARI_PHOTOS.alt(photo, name ? `Potret ${name}` : `Kepala ${m.companyName}`)}
              sizes="(min-width: 1280px) 520px, (min-width: 896px) 40vw, 92vw"
              className="aspect-[4/5] rounded-[28px]"
            />
            {(name || role) && (
              <div className="absolute inset-x-3 bottom-3 rounded-[20px] bg-white/[0.94] px-4 py-3 ring-1 ring-inset ring-[#1C1917]/[0.06] backdrop-blur-md @3xl:inset-x-4 @3xl:bottom-4 @3xl:px-5">
                {name && <p className={`${DISPLAY} text-[17px] font-medium leading-snug ${C.ink}`}>{name}</p>}
                {role && <p className={`text-[13px] ${C.muted}`}>{role}</p>}
              </div>
            )}
          </Reveal>
        )}
        <div className={`min-w-0 ${hasImage(photo) ? '@4xl:col-span-7' : '@4xl:col-span-12 @4xl:max-w-[860px]'}`}>
          <SectionHead layout="stack" eyebrow={text(welcome, 'eyebrow')} number={m.number('welcome')} title={title} />
          {quote && (
            <Reveal as="blockquote" delay={140} className="relative mt-8">
              <Quote aria-hidden className="mb-4 h-8 w-8 fill-(--bs-tint) text-(--bs-ink)" strokeWidth={1.3} />
              <p className={`${DISPLAY} text-pretty text-[21px] font-normal leading-snug tracking-[-0.015em] ${C.ink} @3xl:text-[26px]`}>{quote}</p>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={200} className={`mt-6 max-w-[62ch] space-y-4 ${TYPE_B.body} ${C.muted}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {((name && !hasImage(photo)) || (action && text(welcome, 'button_label'))) && (
            <Reveal delay={260} className="mt-8 flex flex-col gap-5 @xl:flex-row @xl:items-center @xl:justify-between">
              {name && !hasImage(photo) && (
                <p className="min-w-0">
                  <span className={`block ${DISPLAY} text-[18px] font-medium ${C.ink}`}>{name}</span>
                  {role && <span className={`block text-[14px] ${C.muted}`}>{role}</span>}
                </p>
              )}
              <PillLink action={action} label={text(welcome, 'button_label')} variant="outline" className="self-start @xl:self-auto" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

/** `padTop` = jarak atas sendiri; tanpa itu (Sambutan tepat di atas, yang sudah punya jarak bawah) jarak atas 0. */
export function Why({ m, padTop }: { m: BestariModel; padTop: boolean }) {
  const { why } = m;
  const items = list(why, 'items', 5).filter((item) => field(item, 'title'));
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (items.length === 0) return null;
  const image = text(why, 'image');
  const imageValue = text(why, 'image_value');
  const imageLabel = text(why, 'image_label');
  const quote = text(why, 'quote');
  const quoteName = text(why, 'quote_name');
  const quoteRole = text(why, 'quote_role');
  const quotePhoto = text(why, 'quote_photo');
  const subtitle = text(why, 'subtitle');

  return (
    <TemplateSection sectionKey="why" className={`${SECTION_PAD} ${padTop ? '' : 'pt-0 @3xl:pt-0 @5xl:pt-0'}`}>
      <div className={CONTAINER}>
        <Reveal variant="fade">
          <SectionLabel label={text(why, 'eyebrow')} number={m.number('why')} />
        </Reveal>
        <div className="mt-8 grid gap-10 @3xl:mt-10 @5xl:grid-cols-12 @5xl:gap-14">
          <div className="min-w-0 @5xl:col-span-5">
            {subtitle && (
              <Reveal as="p" className={`max-w-[42ch] ${TYPE_B.body} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            {hasImage(image) && (
              <Reveal variant="fade" delay={80} className={`relative ${subtitle ? 'mt-8' : ''}`}>
                <KitPhoto
                  src={image}
                  alt={BESTARI_PHOTOS.alt(image, `Murid ${m.companyName}`)}
                  sizes="(min-width: 1280px) 520px, (min-width: 1024px) 40vw, 92vw"
                  className="aspect-[4/5] rounded-[28px] @3xl:aspect-[5/4] @5xl:aspect-[4/5]"
                />
                {(imageValue || imageLabel) && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-4 rounded-[20px] bg-white/[0.94] px-5 py-4 ring-1 ring-inset ring-[#1C1917]/[0.06] backdrop-blur-md @3xl:bottom-4 @3xl:left-4 @3xl:right-auto @3xl:min-w-[280px]">
                    {imageLabel && <p className={`text-[13px] font-medium leading-snug ${C.muted}`}>{imageLabel}</p>}
                    {imageValue && <p className={`${DISPLAY} shrink-0 text-[28px] font-medium leading-none tracking-[-0.03em] text-(--bs-ink)`}>{imageValue}</p>}
                  </div>
                )}
              </Reveal>
            )}
          </div>
          <div className="min-w-0 @5xl:col-span-7">
            {text(why, 'title') && (
              <Reveal as="h2" delay={80} className={`max-w-[20ch] text-balance ${TYPE_B.h2} ${C.ink}`}>
                <Highlighted title={text(why, 'title')} highlight={text(why, 'highlight')} />
              </Reveal>
            )}
            <ol className="mt-10 border-b border-[#1C1917]/[0.12]">
              {items.map((item, i) => {
                const isOpen = open === i;
                const body = field(item, 'text');
                return (
                  <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="border-t border-[#1C1917]/[0.12]">
                    <h3>
                      <button
                        id={`${baseId}-b${i}`}
                        type="button"
                        aria-expanded={body ? isOpen : undefined}
                        aria-controls={body ? `${baseId}-p${i}` : undefined}
                        disabled={!body}
                        onClick={() => setOpen(isOpen ? null : i)}
                        className="group flex w-full items-baseline gap-5 py-5 text-left disabled:cursor-default @3xl:gap-8"
                      >
                        <span aria-hidden className={`w-9 shrink-0 text-[13px] font-medium tabular-nums ${isOpen ? 'text-(--bs-ink)' : C.faint}`}>
                          ({String(i + 1).padStart(2, '0')})
                        </span>
                        <span
                          className={`${DISPLAY} text-[19px] font-medium leading-snug tracking-[-0.015em] transition-colors duration-300 @3xl:text-[22px] ${
                            isOpen ? C.ink : 'text-[#57534E] group-hover:text-[#1C1917]'
                          }`}
                        >
                          {field(item, 'title')}
                        </span>
                      </button>
                    </h3>
                    {body && (
                      <div id={`${baseId}-p${i}`} role="region" aria-labelledby={`${baseId}-b${i}`} data-open={isOpen} inert={!isOpen} className="bs-collapse">
                        <div className="overflow-hidden">
                          <p className={`max-w-[56ch] pb-6 pl-14 @3xl:pl-[68px] ${TYPE_B.body} ${C.muted}`}>{body}</p>
                        </div>
                      </div>
                    )}
                  </Reveal>
                );
              })}
            </ol>
            {quote && (
              <Reveal as="figure" delay={120} className="mt-8 flex flex-col gap-5 rounded-[24px] bg-[#F5F2ED] p-5 @xl:flex-row @xl:items-start @3xl:p-6">
                {hasImage(quotePhoto) && (
                  <KitPhoto
                    src={quotePhoto}
                    alt=""
                    sizes="96px"
                    position="50% 25%"
                    className="aspect-square w-20 shrink-0 rounded-[18px] @3xl:w-24"
                  />
                )}
                <div className="min-w-0">
                  {(quoteName || quoteRole) && (
                    <figcaption>
                      {quoteName && <span className={`block ${DISPLAY} text-[17px] font-medium ${C.ink}`}>{quoteName}</span>}
                      {quoteRole && <span className={`block text-[13px] ${C.muted}`}>{quoteRole}</span>}
                    </figcaption>
                  )}
                  <blockquote className={`mt-3 text-pretty ${TYPE_B.body} ${C.ink}`}>
                    <p>“{quote}”</p>
                  </blockquote>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
