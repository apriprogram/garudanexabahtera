// Galeri proyek (bento), testimoni (satu kutipan besar + kartu), dan blok ajakan berfoto Corporate Nexa.
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { photoAlt, templatePhoto } from '../shared/assets';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER, FONT_DISPLAY, SECTION_GAP, SECTION_Y, SECTION_Y_SM, TYPE } from '../shared/layout';
import { StructureMark } from '../shared/marks';
import { Avatar } from '../shared/media';
import type { CompanyProfileModel } from '../shared/model';
import { stagger } from '../shared/motion';
import { Photo } from '../shared/Photo';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, telHref, text } from '../shared/utils';
import type { ListItem } from '../types';
import { bentoCell } from './bento';
import { BTN_ON_DARK, HOVER_ZOOM, LINE } from './styles';
import { BlankVisual, SectionHeader } from './ui';

/** Titik fokus foto demo yang subjeknya tidak di tengah (dipotong mendatar di galeri). */
const FOCUS: Record<string, string> = {
  [templatePhoto('corporate-nexa-site-team')]: '50% 30%',
  [templatePhoto('corporate-nexa-steel')]: '50% 40%',
};

// Gradasi gelap bertingkat di bawah keterangan: ≥ 60% hitam sampai 45% tinggi foto → teks putih ≥ 4.5:1
const CAPTION_SCRIM =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(8,12,20,0.82)_0%,rgba(8,12,20,0.62)_45%,rgba(8,12,20,0)_85%)]';

export function Gallery({ m }: { m: CompanyProfileModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 12);
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="gallery" className={`bg-alt ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <SectionHeader split eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} lead={text(gallery, 'subtitle')} />
        <ul className={`${SECTION_GAP} grid grid-cols-2 gap-3 @3xl:grid-cols-12 @3xl:auto-rows-[210px] @3xl:gap-4 @5xl:auto-rows-[250px] @5xl:gap-5 @7xl:auto-rows-[290px]`}>
          {items.map((item, i) => {
            const caption = field(item, 'caption');
            const image = field(item, 'image');
            const cell = bentoCell(i, items.length);
            return (
              <Reveal as="li" key={i} delay={stagger(i % 3)} className={`relative min-w-0 ${cell.className}`}>
                <figure className="group relative h-full overflow-hidden rounded-[20px] @3xl:rounded-[24px]">
                  {hasImage(image) ? (
                    <>
                      <Photo
                        src={image}
                        alt={photoAlt(image, caption || `Foto proyek ${i + 1}`)}
                        zoom
                        position={FOCUS[image]}
                        imgClassName={HOVER_ZOOM}
                        sizes={cell.sizes}
                        className="absolute inset-0"
                      />
                      {caption && (
                        <>
                          <div aria-hidden className={CAPTION_SCRIM} />
                          <figcaption className="absolute inset-x-0 bottom-0 p-3 text-[13px] font-medium leading-snug text-white @3xl:p-6 @3xl:text-[15px]">
                            {caption}
                          </figcaption>
                        </>
                      )}
                    </>
                  ) : (
                    <BlankVisual className="absolute inset-0">
                      {caption && (
                        <figcaption className="absolute inset-x-0 bottom-0 p-3 text-[13px] font-medium leading-snug text-fg @3xl:p-6 @3xl:text-[15px]">
                          {caption}
                        </figcaption>
                      )}
                    </BlankVisual>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

const QuoteMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 32 24" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M0 24V14.4C0 6.6 4.2 1.8 12.6 0l1.5 3.3C9.6 4.6 7.4 7.3 7.2 11H13v13H0Zm18 0V14.4C18 6.6 22.2 1.8 30.6 0L32 3.3c-4.5 1.3-6.7 4-6.9 7.7H31v13H18Z" />
  </svg>
);

function Person({ item, size }: { item: ListItem; size: 'lg' | 'sm' }) {
  const role = field(item, 'role');
  return (
    <figcaption className={`flex items-center gap-4 border-t pt-6 ${LINE} ${size === 'lg' ? 'mt-10 @3xl:pt-7' : 'mt-6'}`}>
      <Avatar
        name={field(item, 'name')}
        photo={field(item, 'photo')}
        className={size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'}
        sizes={size === 'lg' ? '56px' : '44px'}
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-fg @3xl:text-[16px]">{field(item, 'name') || 'Klien kami'}</p>
        {role && <p className="mt-0.5 text-[13px] leading-snug text-muted @3xl:text-[14px]">{role}</p>}
      </div>
    </figcaption>
  );
}

function TestimonialCard({ item }: { item: ListItem }) {
  return (
    <figure className="flex h-full flex-col rounded-[24px] bg-white p-6 ring-1 ring-inset ring-black/[0.07] @3xl:p-8">
      <QuoteMark className="h-5 w-7 text-(--tpl-accent-300)" />
      <blockquote className="mt-5 flex-1 text-[16px] leading-relaxed text-fg">“{field(item, 'quote')}”</blockquote>
      <Person item={item} size="sm" />
    </figure>
  );
}

export function Testimonials({ m }: { m: CompanyProfileModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 9).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  const [featured, ...rest] = items;
  const side = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHeader eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} />
        <div className={`${SECTION_GAP} grid gap-4 @5xl:grid-cols-12 @5xl:gap-6`}>
          <Reveal
            as="figure"
            className={`flex min-w-0 flex-col justify-between rounded-[28px] bg-alt p-7 @3xl:p-12 @5xl:p-14 ${side.length > 0 ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}
          >
            <div>
              <QuoteMark className="h-8 w-11 text-(--tpl-accent) @3xl:h-10 @3xl:w-14" />
              <blockquote
                className={`${FONT_DISPLAY} mt-7 text-pretty text-[22px] font-medium leading-[1.35] tracking-[-0.015em] text-fg @3xl:text-[28px] @5xl:text-[32px] @7xl:text-[36px] ${
                  side.length > 0 ? '' : 'max-w-[40ch]'
                }`}
              >
                “{field(featured, 'quote')}”
              </blockquote>
            </div>
            <Person item={featured} size="lg" />
          </Reveal>
          {side.length > 0 && (
            <ul className="grid min-w-0 gap-4 @3xl:grid-cols-2 @5xl:col-span-5 @5xl:auto-rows-fr @5xl:grid-cols-1 @5xl:gap-6">
              {side.map((item, i) => (
                <Reveal as="li" key={i} delay={stagger(i + 1)} className="min-w-0">
                  <TestimonialCard item={item} />
                </Reveal>
              ))}
            </ul>
          )}
          {more.length > 0 && (
            <ul className="grid min-w-0 gap-4 @3xl:grid-cols-2 @5xl:col-span-12 @5xl:grid-cols-3 @5xl:gap-6">
              {more.map((item, i) => (
                <Reveal as="li" key={i} delay={stagger(i % 3)} className="min-w-0">
                  <TestimonialCard item={item} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Cta({ m }: { m: CompanyProfileModel }) {
  const { cta, contact } = m;
  const title = text(cta, 'title');
  if (!title) return null;
  const subtitle = text(cta, 'subtitle');
  const action = resolveAction(text(cta, 'button_url'), m.waAction ?? m.contactAction);
  const isWhatsApp = action?.kind === 'external' && /wa\.me/.test(action.href);
  const image = text(cta, 'image');
  const photo = hasImage(image);
  const phone = text(contact, 'phone');
  const tel = telHref(phone);

  return (
    <TemplateSection sectionKey="cta" className={SECTION_Y_SM}>
      <div className={CONTAINER}>
        <Reveal variant="scale">
          <div
            data-tpl-tone="inverse"
            className={`relative isolate overflow-hidden rounded-[24px] @3xl:rounded-[32px] ${photo ? 'bg-[#0B1220] text-white' : 'bg-(--tpl-accent) text-(--tpl-on-accent)'}`}
          >
            {photo ? (
              <>
                {/* HP: blok ajakan tegak, foto mendatar dipotong + parallax → butuh ±2× lebar layar */}
                <Photo src={image} alt="" parallax fallback="none" sizes="(min-width: 1024px) 100vw, 200vw" className="absolute inset-0 -z-10" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-[#0B1220]/65" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(11,18,32,0.55),rgba(11,18,32,0)_65%)]" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-bl from-(--tpl-accent)/30 via-transparent to-transparent" />
              </>
            ) : (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 opacity-[0.14] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
                />
                <StructureMark className="absolute -bottom-12 -right-10 -z-10 h-56 w-56 opacity-[0.12] @3xl:h-80 @3xl:w-80" />
              </>
            )}
            <div className="grid gap-10 px-6 py-12 @3xl:px-12 @3xl:py-16 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-12 @5xl:px-16 @5xl:py-24">
              <div className="min-w-0 @5xl:col-span-8">
                <h2 className={`${FONT_DISPLAY} ${TYPE.h2} max-w-[20ch] font-semibold text-balance`}>{title}</h2>
                {subtitle && <p className={`mt-5 max-w-[56ch] ${TYPE.lead} ${photo ? 'text-white/90' : ''}`}>{subtitle}</p>}
              </div>
              {(action || tel) && (
                <div className="flex min-w-0 flex-col gap-4 @md:flex-row @md:items-center @5xl:col-span-4 @5xl:flex-col @5xl:items-end">
                  {action && (
                    <ActionLink action={action} className={`${BTN_ON_DARK} w-full @md:w-auto`}>
                      {isWhatsApp && <WhatsAppIcon className="h-4 w-4" />}
                      {text(cta, 'button_label') || 'Hubungi Kami'}
                      {!isWhatsApp && <ArrowRight className="h-4 w-4" aria-hidden />}
                    </ActionLink>
                  )}
                  {tel && (
                    <ActionLink
                      action={{ kind: 'external', href: tel }}
                      className="inline-flex min-h-11 items-center justify-center text-[15px] font-medium underline decoration-current/40 underline-offset-4 hover:decoration-current"
                    >
                      atau telepon {phone}
                    </ActionLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
