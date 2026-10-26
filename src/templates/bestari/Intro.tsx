// Kartu sorotan + lencana kepercayaan + angka sekolah.
// Kartu sorotan (kunci `highlights`): tiga kartu yang menumpang di tepi bawah hero pada layar lebar (referensi Eduker);
// kartu tengah berwarna tema penuh (referensi Finovate). Tiap kartu: ikon bulat otomatis, label pil, judul, teks, dan
// tautan ke section yang cocok dengan judul. Judul section hanya untuk pembaca layar.
// Lencana (kunci `badges`): deret singkat bergaris tipis atas-bawah dengan ikon garis (referensi Lifestyle).
// Angka (kunci `stats`): label bernomor, judul + deskripsi, lalu kartu angka besar berikon (kartu kedua berwarna tema);
// angka berjalan saat pertama terlihat.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { titleTarget, type BestariModel } from './model';
import { C, CARD, EYEBROW, SECTION_PAD, TYPE_B } from './styles';
import { SectionHead, TextLink, TitleIcon } from './ui';

export function Highlights({ m, overlap }: { m: BestariModel; overlap: boolean }) {
  const items = m.items('highlights');
  if (items.length === 0) return null;
  const title = text(m.highlights, 'title');
  const cols = items.length === 1 ? '' : items.length === 2 ? '@3xl:grid-cols-2' : '@3xl:grid-cols-3';

  return (
    <TemplateSection sectionKey="highlights" className={`relative z-10 ${overlap ? 'mt-3 @5xl:-mt-[96px]' : 'mt-4 @3xl:mt-6'}`}>
      {title && <h2 className="sr-only">{title}</h2>}
      <div className={CONTAINER}>
        <ul className={`grid gap-3 @6xl:mx-8 ${cols}`}>
          {items.map((item, i) => {
            const itemTitle = field(item, 'title');
            const label = field(item, 'label');
            const target = titleTarget(itemTitle, m.shown);
            const action = m.linkOr(field(item, 'url'), target ? { kind: 'section', target } : null);
            const accent = items.length === 3 && i === 1;
            return (
              <Reveal
                as="li"
                key={`${itemTitle}-${i}`}
                delay={stagger(i, 90)}
                data-tpl-tone={accent ? m.accentTone : undefined}
                className={`flex flex-col rounded-[24px] p-6 @3xl:p-7 ${accent ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `${CARD.white} ${C.ink}`}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent ? 'bg-white/[0.16] text-current' : 'bg-(--bs-tint) text-(--bs-ink)'}`}
                  >
                    <TitleIcon title={`${itemTitle} ${label}`} index={i} className="h-5 w-5" />
                  </span>
                  {label && (
                    <span
                      className={`inline-flex h-7 min-w-0 items-center rounded-full px-3 ${EYEBROW} text-[11px] ring-1 ring-inset ${
                        accent ? 'ring-current/30' : 'text-(--bs-ink) ring-[#1C1917]/[0.1]'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                    </span>
                  )}
                </div>
                {itemTitle && <h3 className={`mt-7 ${TYPE_B.h3}`}>{itemTitle}</h3>}
                {field(item, 'text') && <p className={`mt-2 ${TYPE_B.small} ${accent ? '' : C.muted}`}>{field(item, 'text')}</p>}
                <div aria-hidden className="min-h-3 flex-1" />
                <TextLink action={action} label={field(item, 'link_label')} tone={accent ? 'inherit' : 'light'} className="mt-3 self-start" />
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Badges({ m }: { m: BestariModel }) {
  const items = m.items('badges');
  if (items.length === 0) return null;
  const title = text(m.badges, 'title');
  return (
    <TemplateSection sectionKey="badges" className="pt-10 @3xl:pt-14">
      {title && <h2 className="sr-only">{title}</h2>}
      <div className={CONTAINER}>
        <Reveal variant="fade">
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 border-y border-[#1C1917]/[0.1] py-5 @3xl:gap-x-10 @6xl:justify-between @6xl:px-4">
            {items.map((item, i) => (
              <li key={`${field(item, 'text')}-${i}`} className={`inline-flex items-center gap-2.5 text-[14px] font-medium ${C.ink}`}>
                <TitleIcon title={field(item, 'text')} index={i} className="h-5 w-5 shrink-0 text-(--bs-ink)" />
                {field(item, 'text')}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function Stats({ m }: { m: BestariModel }) {
  const items = m.items('stats');
  if (items.length === 0) return null;
  const cols = { 1: '', 2: '@3xl:grid-cols-2', 3: '@5xl:grid-cols-3', 4: '@5xl:grid-cols-4' }[items.length];

  return (
    <TemplateSection sectionKey="stats" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(m.stats, 'eyebrow')} number={m.number('stats')} title={text(m.stats, 'title')} subtitle={text(m.stats, 'subtitle')} />
        <dl className={`mt-10 grid grid-cols-2 gap-3 @3xl:mt-14 ${cols}`}>
          {items.map((item, i) => {
            const accent = items.length > 1 && i === 1;
            const label = field(item, 'label');
            return (
              <Reveal
                key={`${label}-${i}`}
                delay={stagger(i, 80)}
                data-tpl-tone={accent ? m.accentTone : undefined}
                className={`flex min-h-[210px] min-w-0 flex-col rounded-[24px] p-5 @3xl:min-h-[260px] @3xl:p-7 @6xl:min-h-[300px] ${
                  accent ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `${C.panel} ${C.ink}`
                } ${items.length === 3 && i === 2 ? 'col-span-2 @5xl:col-span-1' : ''} ${items.length === 1 ? 'col-span-2' : ''}`}
              >
                {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
                <dt className="order-2 mt-3 text-[15px] font-semibold leading-snug">{label}</dt>
                <dd className="order-1 flex flex-1 flex-col justify-between gap-8">
                  <span aria-hidden className={`flex h-11 w-11 items-center justify-center rounded-full ${accent ? 'bg-white/[0.16]' : 'bg-white text-(--bs-ink)'}`}>
                    <TitleIcon title={label} index={i} className="h-5 w-5" />
                  </span>
                  <span className={TYPE_B.stat}>
                    <CountUp value={field(item, 'value')} />
                  </span>
                </dd>
                {field(item, 'text') && <dd className={`order-3 mt-1.5 ${TYPE_B.small} ${accent ? '' : C.muted}`}>{field(item, 'text')}</dd>}
              </Reveal>
            );
          })}
        </dl>
      </div>
    </TemplateSection>
  );
}
