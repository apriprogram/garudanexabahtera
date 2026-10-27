// Profil, visi & misi (kunci `about`, anchor #tentang), pita abu kertas #F5F7FB. Baris atas: label "/02 — Profil" +
// H2 serif (5 kolom) | profil singkat sebagai paragraf pembuka (7 kolom). Baris bawah: kiri foto 3:2 + sejarah singkat
// (tahun berdiri hanya bila diisi); kanan daftar buka-tutup bergaris tipis (visi, misi bernomor, budaya sekolah) dengan
// tombol "+"/"−" persegi (aria-expanded/aria-controls, panel role="region", tertutup `inert`) lalu chip dimensi profil
// lulusan.
import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { linesOf, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, SECTION_PAD, TYPE_N } from './styles';
import { SectionLabel } from './ui';

function Pillars({ m }: { m: NawasenaModel }) {
  const items = list(m.about, 'pillars', 5).filter((item) => field(item, 'title'));
  const firstWithDetail = items.findIndex((item) => linesOf(field(item, 'detail')).length > 0);
  const [open, setOpen] = useState<number | null>(firstWithDetail >= 0 ? firstWithDetail : null);
  const baseId = useId();
  if (items.length === 0) return null;
  return (
    <ul className="border-b border-black/[0.08]">
      {items.map((item, i) => {
        const lines = linesOf(field(item, 'detail'));
        const isOpen = open === i;
        const buttonId = `${baseId}-b${i}`;
        const panelId = `${baseId}-p${i}`;
        const summary = field(item, 'text');
        return (
          <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="border-t border-black/[0.08] py-6">
            <h3 className={`${C.navy} ${TYPE_N.h3}`}>
              {lines.length > 0 ? (
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-11 w-full items-center justify-between gap-5 text-left"
                >
                  <span>{field(item, 'title')}</span>
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-(--nw-navy) ring-1 ring-inset ring-black/[0.14]">
                    {isOpen ? <Minus className="h-4 w-4" strokeWidth={2} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
                  </span>
                </button>
              ) : (
                field(item, 'title')
              )}
            </h3>
            {summary && <p className={`mt-2 max-w-[56ch] text-[15.5px] leading-relaxed ${C.body}`}>{summary}</p>}
            {lines.length > 0 && (
              <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="nw-collapse">
                <div className="overflow-hidden">
                  <ol className="space-y-2.5 pt-4">
                    {lines.map((line, n) => (
                      <li key={n} className={`flex gap-3 text-[15px] leading-relaxed ${C.body}`}>
                        <span aria-hidden className={`mt-[3px] shrink-0 text-(--nw-ink) ${TYPE_N.mono}`}>
                          {String(n + 1).padStart(2, '0')}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </Reveal>
        );
      })}
    </ul>
  );
}

export function About({ m }: { m: NawasenaModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const body = text(about, 'body');
  const image = text(about, 'image');
  const historyTitle = text(about, 'history_title');
  const history = text(about, 'history_text');
  const founded = text(about, 'founded');
  const dimensionsTitle = text(about, 'dimensions_title');
  const dimensions = list(about, 'dimensions', 10)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const label = (
    <Reveal variant="fade">
      <SectionLabel label={text(about, 'eyebrow')} number={m.number('about')} />
    </Reveal>
  );
  return (
    <TemplateSection sectionKey="about" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-5">
            {label}
            <Reveal as="h2" delay={80} className={`mt-4 max-w-[18ch] text-balance ${C.navy} ${TYPE_N.h2}`}>
              {title || 'Profil sekolah'}
            </Reveal>
          </div>
          {body && (
            <Reveal as="p" delay={160} className={`max-w-[60ch] text-pretty @5xl:col-span-7 ${C.body} ${TYPE_N.lead}`}>
              {body}
            </Reveal>
          )}
        </div>

        <div className="mt-12 grid gap-12 @3xl:mt-16 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-6">
            <Reveal>
              <KitPhoto
                src={image}
                alt={NAWASENA_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
                sizes="(min-width: 1024px) 46vw, 92vw"
                zoom
                className="aspect-[3/2] rounded-[8px]"
              />
            </Reveal>
            {(historyTitle || history) && (
              <Reveal delay={120} className="mt-8">
                {historyTitle && <h3 className={`${C.navy} ${TYPE_N.h3}`}>{historyTitle}</h3>}
                {history && <p className={`mt-3 max-w-[62ch] ${C.body} ${TYPE_N.body}`}>{history}</p>}
                {founded && (
                  <p className={`mt-4 ${TYPE_N.mono} ${C.muted}`}>
                    Berdiri: <span className="text-(--nw-navy)">{founded}</span>
                  </p>
                )}
              </Reveal>
            )}
          </div>
          <div className="min-w-0 @5xl:col-span-6">
            <Pillars m={m} />
            {dimensions.length > 0 && (
              <Reveal delay={120} className="mt-8">
                {dimensionsTitle && <p className={`${TYPE_N.mono} ${C.muted}`}>{dimensionsTitle}</p>}
                <ul className={`flex flex-wrap gap-2 ${dimensionsTitle ? 'mt-3' : ''}`}>
                  {dimensions.map((dimension, i) => (
                    <li
                      key={`${dimension}-${i}`}
                      className={`inline-flex min-h-8 items-center rounded-[4px] bg-white px-2.5 py-1 text-[13.5px] font-medium ring-1 ring-inset ring-black/[0.08] ${C.navy}`}
                    >
                      {dimension}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
