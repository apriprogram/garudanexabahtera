// Tentang (kolase foto), Layanan (kartu bernomor), dan Keunggulan (angka lengket + daftar bernomor) Corporate Nexa.
import { Check } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { photoAlt } from '../shared/assets';
import { CONTAINER, FONT_DISPLAY, SECTION_GAP, SECTION_Y, TYPE } from '../shared/layout';
import type { CompanyProfileModel } from '../shared/model';
import { stagger } from '../shared/motion';
import { Photo } from '../shared/Photo';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import type { ListItem } from '../types';
import { BODY, H2, H3, HOVER_ZOOM, LINE, SERVICE_ICONS, pad2 } from './styles';
import { Eyebrow, SectionHeader, Visual } from './ui';

export function About({ m }: { m: CompanyProfileModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  if (!title && body.length === 0) return null;
  const eyebrow = text(about, 'eyebrow');
  const points = list(about, 'points', 6)
    .map((p) => field(p, 'text'))
    .filter(Boolean);
  // Gambar kedua opsional; bila gambar utama kosong tetapi gambar kedua ada, gambar kedua menjadi utama
  const images = [text(about, 'image'), text(about, 'image_2')].filter(hasImage);
  const main = images[0] ?? '';
  const extra = images[1] ?? '';
  const badgeValue = text(about, 'badge_value');
  const badgeLabel = text(about, 'badge_label');

  return (
    <TemplateSection sectionKey="about" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-12 @3xl:gap-14 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-12 @7xl:gap-16`}>
        <div className="relative min-w-0 @5xl:col-span-6">
          <Reveal variant="scale" className={extra ? '@xl:mb-[14%] @xl:mr-[20%]' : ''}>
            <Visual
              src={main}
              alt={photoAlt(main, title || `Tentang ${m.companyName}`)}
              zoom
              // Foto mendatar dipotong 4:5 di desktop → lebar gambar ±1,9× lebar kotak
              sizes="(min-width: 1024px) 75vw, 115vw"
              className="aspect-[4/3] rounded-[24px] @3xl:rounded-[28px] @5xl:aspect-[4/5]"
            />
          </Reveal>
          {extra && (
            <Reveal delay={200} className="absolute bottom-0 right-0 hidden w-[48%] @xl:block">
              <Photo
                src={extra}
                alt={photoAlt(extra, `Foto pendukung ${m.companyName}`)}
                fallback="none"
                zoom
                sizes="(min-width: 1024px) 22vw, 45vw"
                className="aspect-[4/3] rounded-[22px] ring-8 ring-white"
              />
            </Reveal>
          )}
          {badgeValue && (
            <div
              data-tpl-tone="inverse"
              className="absolute left-4 top-4 rounded-2xl bg-(--tpl-accent) px-5 py-4 text-(--tpl-on-accent) @3xl:left-6 @3xl:top-6 @3xl:px-6 @3xl:py-5"
            >
              <p className={`${FONT_DISPLAY} text-[30px] font-semibold leading-none tracking-[-0.03em] @3xl:text-[40px]`}>
                <CountUp value={badgeValue} />
              </p>
              {badgeLabel && <p className="mt-2 text-[13px] font-medium">{badgeLabel}</p>}
            </div>
          )}
        </div>

        <div className="min-w-0 @5xl:col-span-6 @7xl:col-span-5 @7xl:col-start-8">
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
            {title && <h2 className={`${eyebrow ? 'mt-5' : ''} ${H2}`}>{title}</h2>}
          </Reveal>
          {body.length > 0 && (
            <Reveal delay={80} className={`${title || eyebrow ? 'mt-6' : ''} space-y-5`}>
              {body.map((p, i) => (
                <p key={i} className={`whitespace-pre-line ${BODY}`}>
                  {p}
                </p>
              ))}
            </Reveal>
          )}
          {points.length > 0 && (
            <ul className={`mt-10 grid border-t ${LINE} @xl:grid-cols-2 @xl:gap-x-8`}>
              {points.map((point, i) => (
                <Reveal as="li" key={i} delay={stagger(i)} className={`flex items-start gap-3 border-b py-4 text-[15px] font-medium leading-snug text-fg ${LINE}`}>
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-50) text-(--tpl-accent-ink)">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {point}
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Services({ m }: { m: CompanyProfileModel }) {
  const { services } = m;
  const items = list(services, 'items', 9);
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="services" className={`bg-alt ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <SectionHeader split eyebrow={text(services, 'eyebrow')} title={text(services, 'title')} lead={text(services, 'subtitle')} />
        <ul className={`${SECTION_GAP} grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-6`}>
          {items.map((item, i) => {
            const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
            const title = field(item, 'title') || `Layanan ${i + 1}`;
            const description = field(item, 'description');
            const image = field(item, 'image');
            const withImage = hasImage(image);
            // Grid 2 kolom: item terakhir yang sendirian dibuat selebar baris
            const lonely = i === items.length - 1 && items.length % 2 === 1 && items.length > 1;
            return (
              <Reveal as="li" key={i} delay={stagger(i % 3)} className={`min-w-0 ${lonely ? '@2xl:col-span-2 @5xl:col-span-1' : ''}`}>
                <div className="group flex h-full flex-col rounded-[24px] bg-white p-6 ring-1 ring-inset ring-black/[0.07] transition-colors duration-300 hover:ring-(--tpl-accent-200) @3xl:p-8">
                  {withImage && (
                    <Photo
                      src={image}
                      alt={title}
                      fallback="none"
                      zoom
                      imgClassName={HOVER_ZOOM}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="mb-7 aspect-[16/10] rounded-2xl"
                    />
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[13px] font-semibold tabular-nums tracking-[0.06em] text-subtle" aria-hidden>
                      {pad2(i + 1)}
                    </span>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-50) text-(--tpl-accent-ink) transition-colors duration-300 group-hover:bg-(--tpl-accent) group-hover:text-(--tpl-on-accent)">
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                    </span>
                  </div>
                  <div className={`mt-auto ${withImage ? 'pt-6' : 'pt-12 @3xl:pt-16'}`}>
                    <h3 className={H3}>{title}</h3>
                    {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
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

function StatGrid({ stats, wide }: { stats: ListItem[]; wide: boolean }) {
  return (
    <dl className={`mt-10 grid grid-cols-2 @3xl:mt-12 ${wide ? '@3xl:grid-cols-4' : ''}`}>
      {stats.map((stat, i) => (
        <Reveal
          key={i}
          delay={stagger(i)}
          className={`flex min-w-0 flex-col-reverse justify-end border-t py-6 @3xl:py-8 ${LINE} ${i % 2 === 1 ? 'border-l pl-5 @3xl:pl-8' : 'pr-5 @3xl:pr-8'} ${
            wide && i > 0 ? '@3xl:border-l @3xl:pl-8' : ''
          } ${wide ? '@3xl:pr-8' : ''}`}
        >
          <dt className="mt-3 text-[14px] leading-snug text-muted">{field(stat, 'label')}</dt>
          <dd className={`${FONT_DISPLAY} ${TYPE.stat} truncate font-semibold text-(--tpl-accent-ink)`}>
            <CountUp value={field(stat, 'value') || '–'} />
          </dd>
        </Reveal>
      ))}
    </dl>
  );
}

export function Advantages({ m }: { m: CompanyProfileModel }) {
  const { advantages } = m;
  const stats = list(advantages, 'stats', 4);
  const items = list(advantages, 'items', 6);
  if (stats.length === 0 && items.length === 0) return null;
  const split = items.length > 0;

  return (
    <TemplateSection sectionKey="advantages" className={SECTION_Y}>
      <div className={`${CONTAINER} grid gap-12 ${split ? '@5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16' : ''}`}>
        <div className={`min-w-0 ${split ? '@5xl:col-span-5' : ''}`}>
          <div className={split ? '@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+116px)]' : ''}>
            <SectionHeader eyebrow={text(advantages, 'eyebrow')} title={text(advantages, 'title')} lead={text(advantages, 'subtitle')} />
            {stats.length > 0 && <StatGrid stats={stats} wide={!split} />}
          </div>
        </div>
        {split && (
          <ol className="min-w-0 @5xl:col-span-7 @5xl:pt-2">
            {items.map((item, i) => (
              <Reveal
                as="li"
                key={i}
                delay={stagger(i)}
                className={`grid gap-x-8 gap-y-3 border-t py-7 last:border-b @3xl:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.25fr)] @3xl:py-9 ${LINE}`}
              >
                <span className={`${FONT_DISPLAY} text-[15px] font-semibold tabular-nums text-(--tpl-accent-ink) @3xl:pt-1`} aria-hidden>
                  {pad2(i + 1)}
                </span>
                <h3 className={H3}>{field(item, 'title') || `Keunggulan ${i + 1}`}</h3>
                {field(item, 'description') && <p className="text-[15px] leading-relaxed text-muted @3xl:text-[16px]">{field(item, 'description')}</p>}
              </Reveal>
            ))}
          </ol>
        )}
      </div>
    </TemplateSection>
  );
}
