// Testimoni (`testimonials`) & newsroom (`newsroom`).
// Testimoni, gaya "dinding potret" (referensi 10.jpg): latar putih, deret potret bertingkat di atas judul terpusat dengan
// ubin abu samar di atasnya dan garis putus-putus tipis ke bawah; klik potret (tombol ber-aria-pressed) menampilkan
// kutipannya di bawah judul, tombol ← → berpindah antar-testimoni. Ubin naik bertahap saat muncul (gerak menyala). HP:
// dinding jadi dua baris yang bisa digeser (rel diberi ruang atas/bawah agar cincin pilihan & fokus tidak terpotong).
// Newsroom: bidang hampir hitam, kartu berita (foto 3:2, kategori + tanggal dengan nama bulan CMS, judul, ringkasan, "Read story").
import { ArrowLeft, ArrowRight, ArrowUpRight, Quote } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { parseIsoDate, type VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_V } from './styles';
import { ArrowPill, SectionHead, SectionLabel } from './ui';

/** Jarak turun tiap kolom dinding (px, layar lebar): pola bertingkat seperti referensi. */
const OFFSETS = [44, 0, 68, 18, 52, 6, 74, 24, 58, 12];

export function Testimonials({ m }: { m: VeloraModel }) {
  const s = m.testimonials;
  const items = m.items('testimonials');
  const [picked, setPicked] = useState(0);
  const count = items.length;
  const index = Math.min(picked, count - 1);
  const current = items[index];
  const wall = items.map((item, i) => ({ item, i })).filter(({ item }) => hasImage(field(item, 'photo')));
  const title = text(s, 'title');
  const muted = text(s, 'title_muted');
  const eyebrow = text(s, 'eyebrow');
  const subtitle = text(s, 'subtitle');
  const buttonAction = m.linkOr(text(s, 'button_url'), null);
  const go = (i: number) => setPicked(((i % count) + count) % count);
  const name = field(current, 'name');
  const role = field(current, 'role');
  const photo = field(current, 'photo');

  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} overflow-hidden bg-white`}>
      <div className={CONTAINER}>
        {wall.length > 0 && (
          <Reveal className="relative">
            <ul
              aria-label="Portraits"
              className="vl-rail -mx-5 -my-1.5 grid auto-cols-[34%] grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-5 py-1.5 @xl:auto-cols-[24%] @2xl:-mx-8 @2xl:px-8 @5xl:mx-0 @5xl:my-0 @5xl:py-0 @5xl:grid-flow-row @5xl:grid-rows-1 @5xl:justify-center @5xl:gap-3 @5xl:overflow-visible @5xl:px-0 @5xl:[grid-template-columns:repeat(var(--vl-cols),minmax(0,148px))] @5xl:[mask-image:linear-gradient(180deg,transparent_0,#000_96px)]"
              style={{ '--vl-cols': wall.length } as CSSProperties}
            >
              {wall.map(({ item, i }, k) => {
                const selected = i === index;
                const offset = OFFSETS[k % OFFSETS.length];
                return (
                  <li
                    key={`${field(item, 'name')}-${i}`}
                    className="vl-wall-tile flex min-w-0 flex-col @5xl:pt-[var(--vl-offset)]"
                    style={{ '--vl-offset': `${offset}px`, '--vl-delay': `${Math.min(k, 9) * 70}ms` } as CSSProperties}
                  >
                    {/* Ubin abu samar di atas potret (dekoratif, layar lebar) */}
                    <span aria-hidden className="mb-3 hidden h-[72px] rounded-[16px] bg-[#ECECEA] @5xl:block" />
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-pressed={selected}
                      aria-label={`Show the quote from ${field(item, 'name') || 'this customer'}`}
                      className={`group relative block aspect-[4/5] w-full overflow-hidden rounded-[16px] transition-[outline-color] duration-300 ${
                        selected ? 'outline-2 outline-offset-2 outline-(--vl-red) outline' : ''
                      }`}
                    >
                      <KitPhoto
                        src={field(item, 'photo')}
                        alt=""
                        sizes="(min-width: 1024px) 148px, 34vw"
                        className="absolute inset-0"
                        imgClassName={`transition-[scale,filter] duration-700 group-hover:scale-[1.05] ${selected ? '' : '@5xl:grayscale-[35%]'}`}
                      />
                    </button>
                    {/* Garis putus-putus tipis ke arah judul */}
                    <span
                      aria-hidden
                      className={`mx-auto mt-3 hidden h-16 w-px border-l border-dashed @5xl:block ${k % 3 === 1 ? 'border-(--vl-red)/60' : 'border-[#0D0E10]/15'}`}
                    />
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}

        <div className={`mx-auto max-w-[820px] text-center ${wall.length > 0 ? 'mt-10 @5xl:-mt-4' : ''}`}>
          {eyebrow && (
            <Reveal variant="fade" className="flex justify-center">
              <SectionLabel label={eyebrow} />
            </Reveal>
          )}
          {(title || muted) && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} text-balance ${C.ink} ${TYPE_V.h2}`}>
              {title}
              {title && muted && <br className="hidden @3xl:block" />}
              {title && muted && ' '}
              {muted && <span className="text-[#77797E]">{muted}</span>}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mx-auto mt-5 max-w-[56ch] text-pretty ${TYPE_V.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}

          {current && (
            <Reveal delay={200} className="mt-10 @3xl:mt-12">
              <figure key={index} className="vl-quote rounded-[24px] bg-[#F4F4F2] px-5 py-7 @3xl:px-10 @3xl:py-9">
                <Quote aria-hidden className="mx-auto h-7 w-7 text-(--vl-red)" strokeWidth={1.6} />
                <blockquote className={`mt-4 text-pretty ${DISPLAY} text-[19px] font-normal leading-[1.45] tracking-[-0.01em] ${C.ink} @3xl:text-[23px]`}>
                  “{field(current, 'quote')}”
                </blockquote>
                <figcaption className="mt-6 flex items-center justify-center gap-3 text-left">
                  {hasImage(photo) ? (
                    <KitPhoto src={photo} alt="" sizes="44px" fallback="none" className="h-11 w-11 shrink-0 rounded-full" />
                  ) : (
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D0E10] text-[13px] font-semibold text-white">
                      {initials(name, '?')}
                    </span>
                  )}
                  <span className="min-w-0">
                    {name && <span className={`block text-[15px] font-semibold ${C.ink}`}>{name}</span>}
                    {role && <span className={`block text-[13.5px] ${C.muted}`}>{role}</span>}
                  </span>
                </figcaption>
              </figure>
              {count > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    aria-label="Previous testimonial"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F4F2] text-[#0D0E10] transition-colors duration-300 hover:bg-[#0D0E10] hover:text-white"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                  <p className={`min-w-16 text-[13.5px] font-medium tabular-nums ${C.muted}`} aria-live="polite">
                    {`${index + 1} / ${count}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    aria-label="Next testimonial"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F4F2] text-[#0D0E10] transition-colors duration-300 hover:bg-[#0D0E10] hover:text-white"
                  >
                    <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                </div>
              )}
            </Reveal>
          )}
          {text(s, 'button_label') && buttonAction && (
            <Reveal delay={240} className="mt-8 flex justify-center">
              <ArrowPill action={buttonAction} label={text(s, 'button_label')} variant="ink" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Newsroom({ m }: { m: VeloraModel }) {
  const s = m.newsroom;
  const items = m.items('newsroom');
  const buttonAction = m.linkOr(text(s, 'button_url'), null);
  const readLabel = text(s, 'read_label') || 'Read story';
  const button = text(s, 'button_label') && buttonAction ? <ArrowPill action={buttonAction} label={text(s, 'button_label')} variant="white" /> : null;
  return (
    <TemplateSection sectionKey="newsroom" data-tpl-tone="inverse" className={`${SECTION_PAD} bg-[#0D0E10] text-white`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} tone="dark" aside={button} />
        <ul className="mt-10 grid gap-x-4 gap-y-10 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const date = parseIsoDate(field(item, 'date'), m.months);
            const rawDate = field(item, 'date');
            const action = m.linkOr(field(item, 'url'), null);
            const body = (
              <>
                {hasImage(image) && (
                  <KitPhoto
                    src={image}
                    alt={VELORA_PHOTOS.alt(image, field(item, 'title'))}
                    sizes="(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw"
                    zoom
                    className="aspect-[3/2] rounded-[20px]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                )}
                <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${hasImage(image) ? 'mt-5' : ''}`}>
                  {field(item, 'category') && (
                    <span className="inline-flex items-center gap-2 font-semibold text-(--vl-bright)">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--vl-red)" />
                      {field(item, 'category')}
                    </span>
                  )}
                  {rawDate &&
                    (date ? (
                      <time dateTime={date.iso} className="text-white/65">
                        {date.label}
                      </time>
                    ) : (
                      <span className="text-white/65">{rawDate}</span>
                    ))}
                </span>
                <h3 className={`mt-3 text-balance ${DISPLAY} text-[20px] font-medium leading-snug tracking-[-0.02em] text-white @3xl:text-[22px]`}>{field(item, 'title')}</h3>
                {field(item, 'excerpt') && <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">{field(item, 'excerpt')}</p>}
                {action && (
                  <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-white">
                    <span className="underline decoration-white/30 underline-offset-4 group-hover:decoration-white">{readLabel}</span>
                    <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );
            return (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 90)} className="min-w-0">
                {action ? (
                  <ActionLink action={action} className="group block rounded-[20px]">
                    {body}
                  </ActionLink>
                ) : (
                  <article className="group">{body}</article>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
