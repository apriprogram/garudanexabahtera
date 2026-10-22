// Angka raksasa + produk (brief §3.4 #2–#3, §4.3). Angka: 3–4 angka 60 → 88px dengan satuan superskrip berwarna
// utama, dipisah garis tegak (HP: satu kolom dengan garis datar). Produk: teks + poin centang + tombol limau di kiri,
// komposisi dua kartu UI datar (grafik saldo + daftar rekening) di atas bidang abu berkisi di kanan; tangkapan layar
// pembeli (about.image) menggantikan komposisi.
import { Check, TrendingUp } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { BarChart, LineChart } from './marks';
import { splitStat, type FinovaModel } from './model';
import { FINOVA_PHOTOS } from './photos';
import { BTN, C, CARD, SECTION_F, TYPE_F } from './styles';
import { PillLink, SectionChip } from './ui';

export function Numbers({ m }: { m: FinovaModel }) {
  const stats = list(m.advantages, 'stats', 4).filter((s) => field(s, 'value') || field(s, 'label'));
  const title = text(m.advantages, 'title');
  if (stats.length === 0) return null;
  // 4 angka: 2×2 di tablet, satu baris mulai @5xl; 2–3 angka: satu baris mulai @3xl. Pemisah tegak di antara kolom.
  const four = stats.length >= 4;
  const cols = four ? '@3xl:grid-cols-2 @3xl:gap-y-12 @5xl:grid-cols-4 @5xl:gap-y-0' : stats.length === 3 ? '@3xl:grid-cols-3' : stats.length === 2 ? '@3xl:grid-cols-2' : '';
  const divider = (i: number) => {
    if (!four) return i > 0 ? '@3xl:border-l @3xl:border-black/10 @3xl:pl-8 @5xl:pl-10' : '';
    if (i % 2 === 1) return '@3xl:border-l @3xl:border-black/10 @3xl:pl-8 @5xl:pl-10';
    return i === 2 ? '@5xl:border-l @5xl:border-black/10 @5xl:pl-10' : '';
  };
  return (
    <TemplateSection sectionKey="advantages" className="pb-4 pt-14 @3xl:pb-8 @3xl:pt-20 @5xl:pt-24">
      <div className={CONTAINER}>
        {title ? (
          <Reveal>
            <SectionChip as="h2">{title}</SectionChip>
          </Reveal>
        ) : (
          <h2 className="sr-only">{m.companyName} dalam angka</h2>
        )}
        <ul className={`mt-8 grid divide-y divide-black/10 @3xl:mt-12 @3xl:divide-y-0 ${cols}`}>
          {stats.map((stat, i) => {
            const { number, unit } = splitStat(field(stat, 'value'));
            return (
              <Reveal
                as="li"
                key={`${field(stat, 'label')}-${i}`}
                delay={stagger(i)}
                className={`min-w-0 py-6 first:pt-0 @3xl:py-0 ${divider(i)}`}
              >
                {number && (
                  <p className={`${TYPE_F.stat} text-[#0B0F0E]`}>
                    <CountUp value={number} />
                    {unit && <sup className="ml-1 align-super text-[0.36em] font-medium tracking-[-0.02em] text-(--tpl-accent-ink)">{unit}</sup>}
                  </p>
                )}
                {field(stat, 'label') && <p className={`mt-3 text-[15px] @3xl:mt-4 @3xl:text-[16px] ${C.muted}`}>{field(stat, 'label')}</p>}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

function Mockups({ m }: { m: FinovaModel }) {
  const { about } = m;
  const mockTitle = text(about, 'mock_title');
  const mockValue = text(about, 'mock_value');
  const mockCaption = text(about, 'mock_caption');
  const listTitle = text(about, 'mock_list_title');
  const rows = list(about, 'mock_items', 3).filter((row) => field(row, 'label') || field(row, 'value'));
  const showChart = !!(mockTitle || mockValue || mockCaption);
  const showList = rows.length > 0;
  if (!showChart && !showList) return null;

  return (
    <div className={`relative overflow-hidden rounded-[28px] ${C.surface} p-5 @3xl:p-8 @5xl:aspect-[7/5] @5xl:p-0`}>
      {/* Kisi titik lembut (dekoratif) */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(11,15,14,0.09)_1px,transparent_1px)] bg-[length:22px_22px]" />
      <div className="relative flex flex-col gap-4 @3xl:flex-row @3xl:items-start @5xl:absolute @5xl:inset-0 @5xl:block">
        {showChart && (
          <Reveal
            variant="up"
            className={`${CARD.ui} w-full p-5 @3xl:flex-1 @5xl:absolute @5xl:right-[6%] @5xl:top-[7%] @5xl:w-[54%] @5xl:p-6`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {mockTitle && <p className={`text-[13px] font-medium ${C.muted}`}>{mockTitle}</p>}
                {mockValue && <p className={`mt-1.5 text-[26px] font-semibold text-[#0B0F0E] @3xl:text-[30px] ${TYPE_F.mono}`}>{mockValue}</p>}
                {mockCaption && <p className="mt-2 text-[13px] font-medium text-(--tpl-accent-ink)">{mockCaption}</p>}
              </div>
              <span aria-hidden className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--fin-mint) text-(--tpl-accent-ink)">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
              <LineChart className="h-20 w-full" points="0,30 12,26 24,31 36,20 48,24 60,12 72,17 86,8 100,12" />
              <BarChart className="h-20 w-24" />
            </div>
          </Reveal>
        )}
        {showList && (
          <Reveal
            variant="up"
            delay={160}
            className={`${CARD.ui} w-full p-5 @3xl:flex-1 @5xl:absolute @5xl:bottom-[7%] @5xl:left-[6%] @5xl:w-[48%] @5xl:p-6`}
          >
            {listTitle && <p className="text-[15px] font-semibold text-[#0B0F0E]">{listTitle}</p>}
            <ul className={`${listTitle ? 'mt-3' : ''} divide-y divide-black/[0.07]`}>
              {rows.map((row, i) => (
                <li key={`${field(row, 'label')}-${i}`} className="flex items-center gap-3 py-3 last:pb-0">
                  <span
                    aria-hidden
                    className={`h-9 w-12 shrink-0 rounded-lg ${i === 0 ? 'bg-(--tpl-accent)' : i === 1 ? 'bg-(--fin-hl)' : 'bg-[#0B0F0E]'} ring-1 ring-inset ring-black/10`}
                  />
                  <span className="min-w-0 flex-1">
                    {field(row, 'label') && <span className={`block truncate text-[13px] ${C.muted}`}>{field(row, 'label')}</span>}
                    {field(row, 'value') && <span className={`block truncate text-[16px] font-semibold text-[#0B0F0E] ${TYPE_F.mono}`}>{field(row, 'value')}</span>}
                  </span>
                  {field(row, 'meta') && <span className={`shrink-0 text-[12px] ${C.muted} ${TYPE_F.mono}`}>{field(row, 'meta')}</span>}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </div>
  );
}

export function Product({ m }: { m: FinovaModel }) {
  const { about } = m;
  const eyebrow = text(about, 'eyebrow');
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  const points = list(about, 'points', 4).filter((p) => field(p, 'text'));
  const image = text(about, 'image');
  const action = resolveAction(text(about, 'button_url'), m.featuresAction ?? m.startAction);
  const visual = hasImage(image) ? (
    <Reveal variant="scale">
      <KitPhoto
        src={image}
        alt={FINOVA_PHOTOS.alt(image, title || `Aplikasi ${m.companyName}`)}
        fallback="none"
        zoom
        sizes="(min-width: 1024px) 56vw, 100vw"
        className="aspect-[4/3] rounded-[28px]"
      />
    </Reveal>
  ) : (
    <Mockups m={m} />
  );

  return (
    <TemplateSection sectionKey="about" className={SECTION_F}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionChip>{eyebrow}</SectionChip>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#0B0F0E] ${TYPE_F.h2}`}>
              {title}
            </Reveal>
          )}
          {body.map((p, i) => (
            <Reveal as="p" key={i} delay={160} className={`mt-5 max-w-[56ch] ${TYPE_F.lead} ${C.muted}`}>
              {p}
            </Reveal>
          ))}
          {points.length > 0 && (
            <ul className="mt-7 space-y-3.5">
              {points.map((point, i) => (
                <Reveal as="li" key={`${field(point, 'text')}-${i}`} delay={200 + stagger(i, 60)} className="flex items-start gap-3">
                  <span aria-hidden className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--fin-hl) text-(--fin-on-hl) ring-1 ring-inset ring-black/10">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-[15px] leading-relaxed text-[#0B0F0E] @3xl:text-[16px]">{field(point, 'text')}</span>
                </Reveal>
              ))}
            </ul>
          )}
          {action && text(about, 'button_label') && (
            <Reveal delay={280} className="mt-9">
              <PillLink action={action} label={text(about, 'button_label')} className={`${BTN.lime} ${BTN.limeOnLight} ${BTN.lg}`} />
            </Reveal>
          )}
        </div>
        <div className="min-w-0 @5xl:col-span-7">{visual}</div>
      </div>
    </TemplateSection>
  );
}
