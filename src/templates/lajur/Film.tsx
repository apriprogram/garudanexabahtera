// Film "Satu hari bersama rombongan Anda" (kunci `film`): pita TINTA selebar layar. GERAK MENYALA (demo & situs live):
// section = jalur tinggi (3,2 × tinggi panggung di layar lebar, 2,4 × di HP), panggung menempel (sticky) setinggi area
// terlihat dan diputar oleh gulir seperti pemutar video berbingkai: bilah atas (label, H2, kalimat pengantar; jam besar
// 05.00 → 21.00 + keterangan bab yang berganti), LAYAR adegan selebar layar (./scenes: bus berjalan dari fajar sampai
// malam, berhenti di rest area dan di gerbang tujuan), dan rel kemajuan dengan tanda bab = <ol> bab yang sebenarnya
// (aria-current pada bab aktif). Tautan "Lewati animasi" (terlihat saat difokus) menuju section berikutnya.
// GERAK MATI (pratinjau CMS, prefers-reduced-motion, tanpa IntersectionObserver, jsdom): tanpa jalur tinggi, tanpa
// sticky, tanpa pendengar — section biasa: "Lewati animasi", kepala, adegan diam pada poster (p = 0,55: siang, bus parkir
// di gerbang), lalu semua bab sebagai daftar bernomor. Teks di panggung selalu di atas tinta (≥ 9:1), tidak pernah di
// atas langit. Jam besar mengikuti titik kunci jam bab (model filmClock): tepat jam bab saat bab itu menjadi aktif.
import { useRef, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { useFilmProgress } from './hooks';
import { POSTER_P, chapterStarts, clockAt, filmClock, type Chapter, type LajurModel } from './model';
import { FilmScene } from './scenes';
import { C, DISPLAY, GRID_GAP, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, SectionLabel } from './ui';

/**
 * Jendela tampil keterangan bab i (awal = chapterStarts, akhir = awal bab berikutnya; bab pertama/terakhir terbuka ke
 * luar agar tampil penuh di p = 0 / 1). Keterangan lama habis tepat di batas, yang baru mulai di sana (lajur.css).
 */
const windowOf = (i: number, starts: number[]): CSSProperties =>
  ({ '--s': i === 0 ? -1 : starts[i], '--e': i === starts.length - 1 ? 2 : starts[i + 1] }) as CSSProperties;

/** Posisi "Lewati animasi" saat difokus. Film bergulir: di bawah @5xl bilah atas satu kolom (tidak ada ruang kosong di
 *  samping judul), jadi tautan ikut alur sebagai baris pertama bilah atas — label & judul turun selama tautan difokus,
 *  tidak ada yang tertutup; mulai @5xl kanan atas sejajar label (kolom kanan kosong di atas jam). Film statis: di
 *  padding atas section, di atas label. */
const SKIP_SCROLL = 'focus:static focus:w-max @5xl:focus:absolute @5xl:focus:right-12 @5xl:focus:top-[108px] @min-[96rem]:focus:right-16';
const SKIP_STATIC = 'focus:absolute focus:left-5 focus:top-3 @2xl:focus:left-8 @5xl:focus:left-12 @min-[96rem]:focus:left-16';

/** "Lewati animasi": tersembunyi sampai difokus (keyboard), menuju section sesudah film. */
function SkipLink({ m, place }: { m: LajurModel; place: string }) {
  if (!m.afterFilm) return null;
  return (
    <ActionLink
      action={{ kind: 'section', target: m.afterFilm }}
      // not-sr-only mengenolkan padding, jadi padding diulang dengan focus:
      className={`sr-only z-30 rounded-[6px] bg-white px-4 py-3 text-[14px] font-semibold text-[#14161A] focus:not-sr-only focus:px-4 focus:py-3 ${place}`}
    >
      Lewati animasi
    </ActionLink>
  );
}

function ScrollFilm({ m, chapters }: { m: LajurModel; chapters: Chapter[] }) {
  const { film } = m;
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLParagraphElement>(null);
  const range = filmClock(chapters);
  const n = chapters.length;
  const starts = chapterStarts(n);
  // Kolom rel selebar jendela bab: tanda bab tepat di progres awal bab (isian rel = scaleX(--p))
  const railColumns = starts.map((s, i) => `minmax(0, ${Math.round(((i < n - 1 ? starts[i + 1] : 1) - s) * 1000)}fr)`).join(' ');
  const active = useFilmProgress({ enabled: true, track, stage, clock, chapters: n, range });
  const title = text(film, 'title');
  const eyebrow = text(film, 'eyebrow');
  const subtitle = text(film, 'subtitle');

  return (
    <div ref={track} className="lj-film-track">
      <div ref={stage} data-film-progress="" className="lj-film-stage">
        <div className={`${WRAP} lj-film-top relative z-10 grid shrink-0 gap-y-4 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
          <SkipLink m={m} place={SKIP_SCROLL} />
          <div className="min-w-0 @5xl:col-span-7">
            <SectionLabel label={eyebrow} index={m.numbers.film} tone="dark" />
            {title ? (
              <h2 className={`lj-film-h2 max-w-[22ch] text-white ${eyebrow ? 'mt-3 @3xl:mt-4' : ''} ${DISPLAY} text-[22px] font-medium leading-[1.12] tracking-[-0.02em] text-balance @3xl:text-[30px] @6xl:text-[36px]`}>
                {title}
              </h2>
            ) : (
              <h2 className="sr-only">Film sehari perjalanan</h2>
            )}
            {subtitle && <p className={`lj-film-sub mt-2 max-w-[60ch] text-[14px] leading-snug @3xl:text-[15px] ${C.onInkMuted}`}>{subtitle}</p>}
          </div>
          <div aria-hidden className="flex min-w-0 items-end gap-4 @3xl:gap-6 @5xl:col-span-5 @5xl:justify-end">
            <p ref={clock} className={`lj-clock shrink-0 ${DISPLAY} text-[40px] font-bold leading-[0.9] tabular-nums tracking-[-0.03em] text-(--lj-bright) @3xl:text-[56px] @6xl:text-[68px]`}>
              {clockAt(0, range)}
            </p>
            <div className="lj-caps relative min-h-[58px] min-w-0 flex-1 self-stretch @5xl:max-w-[300px] @5xl:flex-none @5xl:basis-[300px]">
              {chapters.map((c, i) => (
                <div key={`${c.title}-${i}`} className="lj-cap absolute inset-x-0 bottom-0" style={windowOf(i, starts)}>
                  <p className={`${DISPLAY} text-[15px] font-medium leading-tight text-white @3xl:text-[18px]`}>{c.title}</p>
                  {c.text && <p className={`lj-cap-text mt-1 text-[13px] leading-snug @3xl:text-[14px] ${C.onInkMuted}`}>{c.text}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lj-screen relative min-h-0 flex-1">
          <FilmScene />
        </div>

        <div className={`${WRAP} relative shrink-0 pb-4 pt-4 @3xl:pb-5`}>
          <div aria-hidden className="lj-rail-track absolute inset-x-5 top-[21px] h-[2px] @2xl:inset-x-8 @5xl:inset-x-12 @min-[96rem]:inset-x-16 @3xl:top-[21px]">
            <span className="lj-rail-fill block h-full" />
          </div>
          <ol aria-label="Bab perjalanan" className="relative grid" style={{ gridTemplateColumns: railColumns }}>
            {chapters.map((c, i) => {
              const on = i === active;
              return (
                <li key={`${c.title}-${i}`} aria-current={on ? 'step' : undefined} className="relative min-w-0 pr-2 pt-5">
                  <span aria-hidden className={`absolute left-0 top-[1px] h-[10px] w-[10px] rounded-[2px] ring-2 ring-[#14161A] transition-colors duration-300 ${on ? 'bg-(--lj-bright)' : 'bg-white/40'}`} />
                  {/* Kolom selebar jendela bab (bisa sempit): judul bab ikut tampil mulai @7xl, di bawahnya jam saja */}
                  <span className={`block truncate ${DISPLAY} text-[12px] font-medium tabular-nums @3xl:text-[13px] ${on ? 'text-white' : 'text-white/60'}`}>
                    {c.time}
                    <span className={`hidden font-sans font-semibold @7xl:inline ${on ? 'text-white' : 'text-white/60'}`}> · {c.title}</span>
                  </span>
                  <span className="sr-only">
                    <span className="@7xl:hidden">{c.title}. </span>
                    {c.text}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

function StaticFilm({ m, chapters }: { m: LajurModel; chapters: Chapter[] }) {
  const { film } = m;
  const cols = chapters.length >= 4 ? '@5xl:grid-cols-4' : chapters.length === 3 ? '@5xl:grid-cols-3' : '@5xl:grid-cols-2';
  return (
    <div className={SECTION_PAD}>
      <SkipLink m={m} place={SKIP_STATIC} />
      <div className={WRAP}>
        <SectionHead tone="dark" eyebrow={text(film, 'eyebrow')} index={m.numbers.film} title={text(film, 'title')} subtitle={text(film, 'subtitle')} srTitle="Film sehari perjalanan" />
      </div>
      <Reveal className="mt-10 @3xl:mt-12">
        <div className="lj-screen lj-screen-poster relative aspect-[4/3] w-full @3xl:aspect-[21/9]" style={{ '--p': POSTER_P } as CSSProperties}>
          <FilmScene />
        </div>
      </Reveal>
      <div className={WRAP}>
        <ol aria-label="Bab perjalanan" className={`mt-10 grid gap-x-8 gap-y-8 @2xl:grid-cols-2 ${cols} @3xl:mt-12`}>
          {chapters.map((c, i) => (
            <li key={`${c.title}-${i}`} className="relative min-w-0 border-t border-white/15 pt-5">
              <span aria-hidden className="absolute left-0 top-[-1px] h-[3px] w-10 bg-(--lj-bright)" />
              <p className={`${DISPLAY} text-[26px] font-bold tabular-nums tracking-[-0.02em] text-(--lj-bright)`}>{c.time}</p>
              <h3 className={`mt-2 text-white ${TYPE.h3}`}>{c.title}</h3>
              {c.text && <p className={`mt-1.5 max-w-[38ch] text-pretty ${TYPE.body} ${C.onInkMuted}`}>{c.text}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function Film({ m }: { m: LajurModel }) {
  const motion = useMotionEnabled();
  const chapters = m.chapters;
  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" data-film={motion ? 'scroll' : 'static'} className="lj-film relative bg-[#14161A] text-white">
      {motion ? <ScrollFilm m={m} chapters={chapters} /> : <StaticFilm m={m} chapters={chapters} />}
    </TemplateSection>
  );
}
