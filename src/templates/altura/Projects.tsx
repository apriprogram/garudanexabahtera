// Proyek Altura: `developments` (pita zaitun gelap membulat: kartu proyek tinggi bertumpuk seperti akordion — kartu
// aktif melebar berfoto dengan jenis, nama, lokasi, deskripsi, dan tombol; kartu lain sempit dengan label tegak; aktif
// lewat klik, sorot, fokus keyboard, atau panah kiri/kanan; HP: rel geser horizontal snap dengan semua kartu terbuka)
// dan `portfolio` (grid kartu properti ala Horizon Estate: tombol filter kategori yang benar-benar menyaring, foto 4:3
// dengan chip kategori, nama, harga, lokasi, dan hingga 3 spesifikasi berikon otomatis).
import { MapPin } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { SPEC_ICONS } from './icons';
import { filterPortfolio, portfolioCategories, specIcon, type AlturaModel } from './model';
import { ALTURA_PHOTOS } from './photos';
import { C, OUTER, SECTION_PAD, TYPE_A } from './styles';
import { PillCta, SectionHead } from './ui';

export function Developments({ m }: { m: AlturaModel }) {
  const { developments } = m;
  const items = m.items('developments');
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const current = Math.min(active, items.length - 1);
  const buttonAction = m.linkOr(text(developments, 'button_url'), m.sectionAction('portfolio') ?? m.startAction);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const next: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in next) || !(e.target instanceof HTMLButtonElement)) return;
    e.preventDefault();
    const i = (next[e.key] + items.length) % items.length;
    setActive(i);
    buttons.current[i]?.focus();
  };

  return (
    <TemplateSection sectionKey="developments" className="py-1.5 @5xl:py-2">
      <div className={OUTER}>
        <div data-tpl-tone="inverse" className="rounded-[24px] bg-(--al-deep) py-16 text-white @3xl:rounded-[28px] @5xl:py-24">
          <div className={CONTAINER}>
            <SectionHead
              tone="dark"
              layout="row"
              eyebrow={text(developments, 'eyebrow')}
              title={text(developments, 'title')}
              aside={<PillCta action={buttonAction} label={text(developments, 'button_label')} variant="solid" size="md" />}
            />
            <Reveal className="mt-10 @5xl:mt-14">
              <ul
                onKeyDown={onKeyDown}
                className="al-rail -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:px-8 @4xl:mx-0 @4xl:h-[540px] @4xl:overflow-visible @4xl:px-0 @4xl:pb-0 @7xl:h-[580px]"
              >
                {items.map((item, i) => {
                  const on = i === current;
                  const name = field(item, 'name');
                  const image = field(item, 'image');
                  const bodyId = `${baseId}-dev-${i}`;
                  const linkLabel = field(item, 'link_label');
                  const action = m.linkOr(field(item, 'url'), m.startAction);
                  return (
                    <li
                      key={`${name}-${i}`}
                      data-active={on ? 'true' : 'false'}
                      onMouseEnter={() => setActive(i)}
                      className={`al-dev relative isolate aspect-[4/5] w-[80%] shrink-0 snap-start overflow-hidden rounded-[22px] bg-(--al-deep-2) @xl:w-[46%] @4xl:aspect-auto @4xl:h-full @4xl:w-auto @4xl:min-w-[76px] @4xl:basis-0 ${
                        on ? '@4xl:grow-[6]' : '@4xl:grow'
                      }`}
                    >
                      <KitPhoto
                        src={image}
                        alt={ALTURA_PHOTOS.alt(image, name)}
                        fallback="none"
                        sizes="(min-width: 896px) 60vw, 80vw"
                        className="absolute inset-0 -z-20"
                        imgClassName="transition-[scale] duration-1000 group-hover:scale-[1.03]"
                      />
                      <span aria-hidden className="al-dev-scrim absolute inset-0 -z-10" />
                      {/* Layar lebar: tombol selebar kartu untuk membuka kartu ini (di bawah isi; tautan di isi tetap bisa diklik) */}
                      <button
                        ref={(el) => {
                          buttons.current[i] = el;
                        }}
                        type="button"
                        onClick={() => setActive(i)}
                        onFocus={() => setActive(i)}
                        aria-expanded={on}
                        aria-controls={bodyId}
                        aria-label={name}
                        className="absolute inset-0 hidden rounded-[22px] text-left @4xl:block"
                      >
                        <span
                          aria-hidden
                          className={`al-dev-label absolute inset-x-0 bottom-7 top-7 flex items-end justify-center ${on ? 'opacity-0' : 'opacity-100'}`}
                        >
                          <span className="rotate-180 whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em] text-white [writing-mode:vertical-rl]">{name}</span>
                        </span>
                      </button>
                      <div
                        id={bodyId}
                        className={`al-dev-body pointer-events-none absolute inset-x-0 bottom-0 p-5 @3xl:p-7 @4xl:min-w-[440px] @5xl:p-9 ${
                          on ? '' : '@4xl:invisible @4xl:opacity-0'
                        }`}
                      >
                        {field(item, 'category') && (
                          <p className="inline-flex h-7 items-center rounded-full bg-white/[0.14] px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                            {field(item, 'category')}
                          </p>
                        )}
                        <h3 className={`mt-4 max-w-[16ch] text-white ${TYPE_A.h3lg} @5xl:text-[36px]`}>{name}</h3>
                        {field(item, 'location') && (
                          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-white/85">
                            <MapPin aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                            {field(item, 'location')}
                          </p>
                        )}
                        {field(item, 'text') && <p className="mt-3 max-w-[44ch] text-[14.5px] leading-relaxed text-white/80">{field(item, 'text')}</p>}
                        {linkLabel && action && (
                          <div className="pointer-events-auto mt-6">
                            <PillCta action={action} label={linkLabel} variant="solid" size="md" />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Portfolio({ m }: { m: AlturaModel }) {
  const { portfolio } = m;
  const items = m.items('portfolio');
  const categories = portfolioCategories(items);
  const [category, setCategory] = useState<string | null>(null);
  const shown = filterPortfolio(items, category && categories.includes(category) ? category : null);
  const allLabel = text(portfolio, 'all_label') || 'All';
  const filters: [string | null, string][] = [[null, allLabel], ...categories.map((c) => [c, c] as [string, string])];

  return (
    <TemplateSection sectionKey="portfolio" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead layout="row" eyebrow={text(portfolio, 'eyebrow')} title={text(portfolio, 'title')} subtitle={text(portfolio, 'subtitle')} />
        {categories.length > 1 && (
          <Reveal variant="fade" className="mt-10 @5xl:mt-12">
            <div role="group" aria-label="Filter properties" className="al-rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:flex-wrap @3xl:overflow-visible @3xl:px-0">
              {filters.map(([value, label]) => {
                const pressed = value === category || (value === null && !categories.includes(category ?? ''));
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setCategory(value)}
                    className={`h-11 shrink-0 rounded-full px-5 text-[14px] font-semibold transition-colors duration-300 ${
                      pressed ? 'bg-[#141612] text-white' : `bg-[#F2EFE7] ${C.ink} hover:bg-[#E8E4D9]`
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="sr-only" aria-live="polite">
              {`${shown.length} ${shown.length === 1 ? 'property' : 'properties'} shown`}
            </p>
          </Reveal>
        )}
        <ul className={`grid gap-x-5 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4 ${categories.length > 1 ? 'mt-8' : 'mt-12'}`}>
          {shown.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const action = m.linkOr(field(item, 'url'), null);
            const specs = ['spec_1', 'spec_2', 'spec_3'].map((key) => field(item, key)).filter(Boolean);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i % 4, 70)} className="min-w-0">
                <article className="group relative">
                  <KitPhoto
                    src={image}
                    alt={ALTURA_PHOTOS.alt(image, name)}
                    zoom
                    sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 31vw, (min-width: 672px) 46vw, 92vw"
                    className="aspect-[4/3] rounded-[20px]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  >
                    {field(item, 'category') && (
                      <span className="absolute left-3 top-3 inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-[12px] font-semibold text-[#141612] backdrop-blur-md">
                        {field(item, 'category')}
                      </span>
                    )}
                  </KitPhoto>
                  <h3 className={`mt-4 ${C.ink} ${TYPE_A.h3}`}>
                    {action ? (
                      <ActionLink action={action} className="after:absolute after:inset-0 after:rounded-[20px] after:content-['']">
                        {name}
                      </ActionLink>
                    ) : (
                      name
                    )}
                  </h3>
                  {(field(item, 'location') || field(item, 'price')) && (
                    <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      {field(item, 'location') && (
                        <p className={`flex min-w-0 items-center gap-1.5 text-[14px] ${C.muted}`}>
                          <MapPin aria-hidden className="h-4 w-4 shrink-0 self-center" strokeWidth={1.8} />
                          {field(item, 'location')}
                        </p>
                      )}
                      {field(item, 'price') && <p className={`text-[15px] font-bold tabular-nums ${C.ink}`}>{field(item, 'price')}</p>}
                    </div>
                  )}
                  {specs.length > 0 && (
                    <ul className={`mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#141612]/[0.1] pt-3 text-[13.5px] ${C.muted}`}>
                      {specs.map((spec, j) => {
                        const Icon = SPEC_ICONS[specIcon(spec)];
                        return (
                          <li key={`${spec}-${j}`} className="flex items-center gap-1.5">
                            <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                            {spec}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
