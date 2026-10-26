// Filosofi (`philosophy`) + bento (`bento`), gaya halaman sewa mobil premium: judul besar dengan cincin aksen di kiri,
// paragraf + prinsip bernomor di kanan; lalu bento: kartu foto tinggi, dua kartu foto gelap bertumpuk (chip ikon + label
// di sudut, keterangan & bulatan panah di bawah), dan baris abu berpanah. Tata letak bento menyesuaikan jumlah kartu
// berfoto & baris (kosong → kolomnya hilang). HP: semuanya satu kolom.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { bentoCards, bentoRows, philosophyPoints, type VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { C, DISPLAY, RADIUS_CARD, TYPE_V } from './styles';
import { ArrowChip, AutoIcon, SectionLabel } from './ui';

export function Philosophy({ m, tight }: { m: VeloraModel; tight: boolean }) {
  const s = m.philosophy;
  const eyebrow = text(s, 'eyebrow');
  const title = text(s, 'title');
  const body = text(s, 'subtitle');
  const points = philosophyPoints(s);
  return (
    <TemplateSection sectionKey="philosophy" className={`pt-16 @3xl:pt-24 @5xl:pt-28 ${tight ? 'pb-10 @3xl:pb-12' : 'pb-16 @3xl:pb-24 @5xl:pb-28'}`}>
      <div className={CONTAINER}>
        <div className="grid gap-6 @5xl:grid-cols-12 @5xl:gap-10">
          <div className="min-w-0 @5xl:col-span-7">
            {eyebrow && (
              <Reveal variant="fade">
                <SectionLabel label={eyebrow} />
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance ${C.ink} ${TYPE_V.h2}`}>
                <span aria-hidden className="mr-[0.32em] inline-block h-[0.5em] w-[0.5em] rounded-full align-[0.08em] ring-[0.09em] ring-inset ring-(--vl-red)" />
                {title}
              </Reveal>
            )}
          </div>
          {body && (
            <div className="min-w-0 @5xl:col-span-5 @5xl:pt-9">
              <Reveal as="p" delay={120} className={`text-pretty ${TYPE_V.lead} ${C.muted}`}>
                {body}
              </Reveal>
            </div>
          )}
        </div>
        {points.length > 0 && (
          <ol className={`mt-10 grid gap-x-8 @3xl:mt-14 ${points.length >= 3 ? '@3xl:grid-cols-3' : points.length === 2 ? '@3xl:grid-cols-2' : ''} ${points.length === 4 ? '@6xl:grid-cols-4' : ''}`}>
            {points.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 80)} className="flex gap-5 border-t border-[#0D0E10]/[0.14] py-5 @3xl:block @3xl:pt-6">
                <span aria-hidden className={`${DISPLAY} block w-7 shrink-0 pt-0.5 text-[14px] font-medium tabular-nums text-(--vl-ink)`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 @3xl:mt-6 @3xl:block">
                  <span className={`${DISPLAY} block text-[18px] font-medium tracking-[-0.015em] ${C.ink} @3xl:text-[20px]`}>{field(item, 'title')}</span>
                  {field(item, 'text') && <span className={`mt-1.5 block max-w-[40ch] ${TYPE_V.small} ${C.muted} @3xl:text-[14.5px] @3xl:leading-relaxed`}>{field(item, 'text')}</span>}
                </span>
              </Reveal>
            ))}
          </ol>
        )}
      </div>
    </TemplateSection>
  );
}

/** Kartu foto bento: chip ikon + label di kiri-atas, keterangan & bulatan panah di bawah. */
function PhotoCard({ m, item, index, tall }: { m: VeloraModel; item: ReturnType<typeof bentoCards>[number]; index: number; tall: boolean }) {
  const label = field(item, 'label');
  const caption = field(item, 'title');
  const image = field(item, 'image');
  const action = m.linkOr(field(item, 'url'), null);
  const inner = (
    <KitPhoto
      src={image}
      alt={VELORA_PHOTOS.alt(image, caption || label)}
      sizes={tall ? '(min-width: 1024px) 34vw, 92vw' : '(min-width: 1024px) 34vw, 92vw'}
      zoom
      className={`h-full ${tall ? 'min-h-[420px] @5xl:min-h-0' : 'min-h-[240px] @5xl:min-h-0'} ${RADIUS_CARD}`}
      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
    >
      <span aria-hidden className="vl-card-scrim absolute inset-0" />
      {label && (
        <span className="absolute left-3 top-3 inline-flex h-9 max-w-[calc(100%-24px)] items-center gap-2 rounded-full bg-[#0D0E10]/70 pl-1 pr-3.5 text-[13.5px] font-medium text-white ring-1 ring-inset ring-white/15 backdrop-blur-md">
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#0D0E10]">
            <AutoIcon title={label} index={index} className="h-4 w-4" />
          </span>
          <span className="truncate">{label}</span>
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 @3xl:p-5">
        {caption && <span className={`${DISPLAY} max-w-[26ch] text-[17px] font-medium leading-snug tracking-[-0.015em] text-white @3xl:text-[19px]`}>{caption}</span>}
        {action && <ArrowChip className="ml-auto h-11 w-11" />}
      </span>
    </KitPhoto>
  );
  const box = `group relative block h-full ${RADIUS_CARD}`;
  return action ? (
    <ActionLink action={action} className={box} data-tpl-tone="inverse">
      {inner}
    </ActionLink>
  ) : (
    <div className={box} data-tpl-tone="inverse">
      {inner}
    </div>
  );
}

function Row({ m, item }: { m: VeloraModel; item: ReturnType<typeof bentoRows>[number] }) {
  const action = m.linkOr(field(item, 'url'), null);
  const body = (
    <>
      <span className="min-w-0">
        <span className={`${DISPLAY} block text-[21px] font-medium leading-tight tracking-[-0.02em] ${C.ink} @5xl:text-[24px]`}>{field(item, 'title')}</span>
        {field(item, 'text') && <span className={`mt-1.5 block ${TYPE_V.small} ${C.muted}`}>{field(item, 'text')}</span>}
      </span>
      {action && <ArrowChip className="h-11 w-11" />}
    </>
  );
  const box = `group flex h-full min-h-[112px] items-end justify-between gap-4 p-5 transition-colors duration-300 @3xl:p-6 ${RADIUS_CARD} ${C.card}`;
  return action ? (
    <ActionLink action={action} className={`${box} hover:bg-[#DEDEDA]`}>
      {body}
    </ActionLink>
  ) : (
    <div className={box}>{body}</div>
  );
}

export function Bento({ m, tight }: { m: VeloraModel; tight: boolean }) {
  const s = m.bento;
  const cards = bentoCards(s);
  const rows = bentoRows(s);
  const [tall, ...stacked] = cards;
  const srTitle = text(s, 'title');
  const cols = (tall ? 1 : 0) + (stacked.length ? 1 : 0) + (rows.length ? 1 : 0);
  const grid = cols >= 3 ? '@5xl:grid-cols-3' : cols === 2 ? '@5xl:grid-cols-2' : '';
  return (
    <TemplateSection sectionKey="bento" aria-label={srTitle || undefined} className={`${tight ? 'pt-0' : 'pt-16 @3xl:pt-24'} pb-16 @3xl:pb-24 @5xl:pb-28`}>
      <div className={CONTAINER}>
        <Reveal className={`grid gap-3 @3xl:gap-4 ${grid} ${cards.length > 0 ? '@5xl:h-[clamp(560px,46cqw,640px)]' : ''}`}>
          {tall && <PhotoCard m={m} item={tall} index={0} tall />}
          {stacked.length > 0 && (
            <div className={`grid gap-3 @3xl:gap-4 ${stacked.length > 1 ? '@5xl:grid-rows-2' : ''}`}>
              {stacked.map((item, i) => (
                <PhotoCard key={`${field(item, 'title')}-${i}`} m={m} item={item} index={i + 1} tall={false} />
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <ul className={`grid gap-3 @3xl:gap-4 @5xl:auto-rows-fr ${cards.length === 0 ? '@3xl:grid-cols-2 @5xl:grid-cols-4' : ''}`}>
              {rows.map((item, i) => (
                <li key={`${field(item, 'title')}-${i}`} className="min-w-0">
                  <Row m={m} item={item} />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
