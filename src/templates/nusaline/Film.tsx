// Film perjalanan (kunci `film`), MIDNIGHT selebar layar: "Satu malam di dalam Nusaline" — animasi seperti video yang
// digerakkan gulir. Gerak menyala (demo & situs live, tanpa prefers-reduced-motion): section = trek tinggi (2,55× layar
// di HP, 3,4× di layar lebar), di dalamnya panggung sticky setinggi area terlihat; ./hooks useFilmProgress menulis --p,
// CSS (./nusaline.css) menggerakkan langit, bintang, bulan, matahari, kota, bukit, jalan & lampu, serta bus potongan
// samping; jam (19.00 → 07.00, melewati tengah malam) dan km ditulis langsung ke DOM saat angkanya berubah; React hanya
// menyimpan bab aktif (aria-current). Keterangan bab (daftar <ol> asli dalam satu kartu kaca, teks selalu di DOM)
// bergantian menurut jendela progres yang mengikuti adegan (model filmTimeline `show`: bab istirahat tampil saat bus
// mendekati & berhenti di rest area, bab tiba mengambil alih begitu bus berangkat lagi menuju kota tujuan), rel progres
// dengan titik bab di bawah (titik = awal keterangan, menyala bersamanya). Layar pendek: ./hooks fitFilmStage menggeser/
// memperkecil bus dan (bila perlu) menyembunyikan teks pendukung secara visual agar bus tidak tertutup teks
// (data-film-text, nl-fit-1/2/3). Jam & km di kartu kaca (kontras tetap ≥ 4,5:1 saat langit memerah menjelang pagi);
// rel progres hanya titik bab (nama bab sudah di kartu bab). Tautan "Lewati animasi" (tersembunyi sampai difokus) ke
// section berikutnya, di kedua versi; fokus ikut pindah ke judul section itu. Gerak mati (pratinjau CMS, reduced motion,
// tanpa IntersectionObserver, layar ≤ 480px tinggi seperti HP dimiringkan, jsdom): tanpa trek/sticky/pendengar — judul,
// satu bingkai poster (p 0,45: tengah malam, kabin biru redup) dan semua bab sebagai daftar bernomor. Cetak: film
// bergerak dicetak sebagai satu bingkai + semua bab (./nusaline.css @media print).
import { ArrowDown } from 'lucide-react';
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { useFilmProgress, useShortViewport } from './hooks';
import { FILM, chapterAt, chapterWindow, clockAt, distanceAt, formatClock, groupThousands, kmAt, type FilmTimeline, type NusalineModel } from './model';
import { NEAR_TRAVEL } from './paths';
import { FilmScene } from './scenes';
import { C, LABEL, LABEL_SM, MONO, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, SectionLabel } from './ui';

/**
 * Variabel CSS garis waktu: jendela istirahat, pembagi jarak, dan saat lampu kabin mulai redup (sesaat sebelum bab ke-2,
 * mis. "Lampu kabin diredupkan · 22.30"; paling lambat p 0,3) + posisi rest area di lapisan dekat.
 */
function timelineStyle(tl: FilmTimeline): CSSProperties {
  const second = tl.chapters[1]?.at;
  const dim = second === undefined ? 0.24 : Math.min(0.3, Math.max(0.08, second - 0.03));
  return { '--nl-rest': tl.rest === null ? 2 : tl.rest, '--nl-dn': tl.dn, '--nl-dim': Math.round(dim * 1e4) / 1e4 } as CSSProperties;
}
const restX = (tl: FilmTimeline): number | null => (tl.rest === null ? null : Math.round(distanceAt(tl.rest + FILM.restLen / 2, tl) * NEAR_TRAVEL));

/** Section berikutnya yang tampil (tujuan "Lewati animasi"). */
const AFTER = ['routes', 'onboard', 'steps', 'testimonials', 'faq', 'contact'];

/**
 * "Lewati animasi": tersembunyi sampai difokus (papan ketik), melompat ke section berikutnya yang tampil. ActionLink
 * memanggil onNavigate SEBELUM menggulir; fokus pindah ke H2 section tujuan (tabIndex −1, tanpa menggulir ulang), jadi
 * Tab dan pembaca layar melanjutkan dari sana, bukan dari dalam film.
 */
function SkipLink({ m }: { m: NusalineModel }) {
  const next = AFTER.find((key) => m.shown(key));
  if (!next) return null;
  const moveFocus = () => {
    const root = document.activeElement instanceof HTMLElement ? document.activeElement.closest('[data-tpl-root]') : null;
    window.setTimeout(() => {
      const section = (root ?? document).querySelector<HTMLElement>(`[data-tpl-section="${next}"]`);
      const target = section?.querySelector<HTMLElement>('h2') ?? section;
      if (!target) return;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }, 60);
  };
  return (
    <ActionLink
      action={{ kind: 'section', target: next }}
      onNavigate={moveFocus}
      className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-24 focus:z-20 focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-[15px] focus:font-semibold focus:text-[#0E1230]"
    >
      Lewati animasi
    </ActionLink>
  );
}

export function Film({ m }: { m: NusalineModel }) {
  const motion = useMotionEnabled();
  const short = useShortViewport();
  return motion && !short ? <MotionFilm m={m} /> : <StaticFilm m={m} />;
}

function MotionFilm({ m }: { m: NusalineModel }) {
  const { film } = m;
  const tl = m.timeline;
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const km = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  const onProgress = useCallback(
    (p: number) => {
      const time = formatClock(clockAt(p, tl));
      if (clock.current && clock.current.textContent !== time) clock.current.textContent = time;
      const distance = groupThousands(kmAt(p, tl));
      if (km.current && km.current.textContent !== distance) km.current.textContent = distance;
      const index = chapterAt(p, tl.chapters);
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    },
    [tl],
  );
  useFilmProgress(track, stage, true, onProgress);

  const first = tl.chapters[0];
  const last = tl.chapters[tl.chapters.length - 1];
  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" className="relative bg-[#0B1026] text-white">
      <SkipLink m={m} />
      <div ref={track} className="nl-film-track relative">
        <div ref={stage} data-film-progress="" className="nl-stage" style={timelineStyle(tl)}>
          <FilmScene restX={restX(tl)} />
          {/* data-film-text = kotak teks yang tidak boleh menutupi bus; nl-fit-1/2/3 = teks pendukung yang disembunyikan
              secara visual bertahap di HP berlayar pendek (./hooks fitFilmStage, ./nusaline.css) */}
          <div className={`${WRAP} nl-film-overlay relative z-10 flex h-full flex-col pb-5 pt-[92px] @3xl:pb-7 @3xl:pt-[104px]`}>
            <div className="grid gap-y-5 @3xl:grid-cols-12 @3xl:gap-x-8">
              <div className="min-w-0 @3xl:col-span-7 @5xl:col-span-6">
                {text(film, 'eyebrow') && (
                  <div data-film-text="" className="nl-fit-2 w-fit max-w-full">
                    <SectionLabel label={text(film, 'eyebrow')} tone="dark" />
                  </div>
                )}
                {text(film, 'title') ? (
                  <h2 data-film-text="" className={`mt-3 max-w-[16ch] text-white ${TYPE.h2}`}>
                    {text(film, 'title')}
                  </h2>
                ) : (
                  <h2 className="sr-only">Perjalanan semalam</h2>
                )}
                {text(film, 'subtitle') && (
                  <p data-film-text="" className={`nl-fit-1 mt-3 max-w-[44ch] text-pretty text-[15px] leading-relaxed @3xl:text-[17px] ${C.onNightMuted}`}>
                    {text(film, 'subtitle')}
                  </p>
                )}
              </div>
              {/* Dasbor: jam + km di kartu gelap seperti kartu bab (langit di belakangnya memerah menjelang pagi; kartu
                  menjaga kontras ≥ 4,5:1). Tanpa backdrop-blur: lapisan buram kedua yang dihitung ulang tiap frame
                  film terlalu berat untuk HP. Angka berjalan ditulis hook; ringkasan tetap untuk pembaca layar. */}
              <div className="flex min-w-0 items-start @3xl:col-span-5 @3xl:justify-end @5xl:col-span-4 @5xl:col-start-9">
                <div
                  data-film-text=""
                  className="relative inline-flex max-w-full items-end gap-4 rounded-[18px] bg-[#0B1026]/75 px-4 py-3 ring-1 ring-inset ring-white/12 @3xl:flex-col @3xl:items-end @3xl:gap-2.5 @3xl:px-5 @3xl:py-4"
                >
                  <p className="sr-only">
                    Perjalanan {first?.time ?? ''}–{last?.time ?? ''}
                    {tl.distance > 0 ? `, sekitar ${groupThousands(tl.distance)} km` : ''}.
                  </p>
                  <p aria-hidden className={`flex items-baseline gap-2 ${MONO} font-semibold leading-none`}>
                    <span ref={clock} className="text-[44px] tracking-[-0.04em] @3xl:text-[72px] @6xl:text-[88px]">
                      {formatClock(tl.start)}
                    </span>
                    <span className={`${LABEL_SM} text-white/80`}>WIB</span>
                  </p>
                  {tl.distance > 0 && (
                    <p aria-hidden className={`whitespace-nowrap pb-1 ${MONO} text-[13px] text-white/80 @3xl:pb-0 @3xl:text-[15px]`}>
                      <span ref={km} className="font-semibold text-white">
                        0
                      </span>{' '}
                      km
                      {/* Total disembunyikan di HP sempit (< 384px) agar jam & km tetap satu baris di kartunya */}
                      <span className="hidden @min-[24rem]:inline"> / {groupThousands(tl.distance)} km</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Satu kartu kaca; bab bertumpuk di sel grid yang sama (tinggi kartu = bab terpanjang) dan berganti dengan
                jeda singkat (yang lama pudar dulu, baru yang baru muncul) — teks dua bab tidak pernah bertumpuk */}
            <ol
              aria-label="Bab perjalanan"
              data-film-text=""
              className="nl-chapters relative mt-5 grid rounded-[18px] bg-[#0B1026]/[0.78] p-4 ring-1 ring-inset ring-white/12 backdrop-blur-md @3xl:mt-8 @3xl:max-w-[440px] @3xl:p-5"
            >
              {tl.chapters.map((c, i) => {
                const [start, end] = chapterWindow(tl.chapters, i);
                const a = i === 0 ? -1 : start;
                const b = i === tl.chapters.length - 1 ? 2 : end;
                // Kemiringan pudar: 32 per satuan p, lebih curam untuk bab yang jendelanya sempit (bab berdekatan
                // jamnya) agar setiap bab sempat terbaca penuh
                const k = Math.max(32, Math.round(3 / Math.max(0.001, b - a)));
                return (
                  <li
                    key={`${c.title}-${i}`}
                    aria-current={i === active ? 'step' : undefined}
                    className="nl-chapter min-w-0"
                    style={{ '--a': a, '--b': b, '--k': k } as CSSProperties}
                  >
                    <p className={`${LABEL} ${C.neon}`}>
                      {c.time} · Bab {i + 1}
                    </p>
                    <h3 className={`mt-1.5 text-white ${TYPE.h3}`}>{c.title}</h3>
                    {c.text && <p className={`nl-fit-3 mt-1 text-pretty text-[14px] leading-snug @3xl:text-[15px] ${C.onNightMuted}`}>{c.text}</p>}
                  </li>
                );
              })}
            </ol>

            {/* Rel progres + titik bab saja (dekoratif; nama & jam bab ada di kartu bab, versi yang dibacakan). Titik bab di
                awal tampil keterangannya (`show`), menyala bersama keterangan itu — seperti tanda bab di linimasa video */}
            {/* Ruang kanan 72px: tombol WhatsApp & kembali-ke-atas melayang tidak menutupi ujung rel */}
            <div aria-hidden className="nl-rail mt-auto pr-[72px]">
              <p className={`nl-scroll-hint nl-fit-3 mb-3 flex items-center gap-2 ${LABEL_SM} text-white/75`}>
                Gulir untuk memutar
                <ArrowDown className="h-3.5 w-3.5" />
              </p>
              <div className="relative h-[3px] rounded-full bg-white/20">
                <div className="nl-rail-fill absolute inset-0 origin-left rounded-full bg-(--nl-neon)" />
                {tl.chapters.map((c, i) => (
                  <span
                    key={`${c.time}-${i}`}
                    data-on={i <= active ? 'true' : 'false'}
                    className="nl-tick absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#0B1026]"
                    style={{ left: `${Math.max(0.6, Math.min(99.4, Math.round(c.show * 1e4) / 100))}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function StaticFilm({ m }: { m: NusalineModel }) {
  const { film } = m;
  const tl = m.timeline;
  const posterTime = formatClock(clockAt(FILM.poster, tl));
  const posterKm = kmAt(FILM.poster, tl);
  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" className={`relative bg-[#0B1026] text-white ${SECTION_PAD}`}>
      <SkipLink m={m} />
      <div className={WRAP}>
        <SectionHead tone="dark" eyebrow={text(film, 'eyebrow')} title={text(film, 'title')} subtitle={text(film, 'subtitle')} srTitle="Perjalanan semalam" />
      </div>
      {/* Bingkai poster selebar layar (tanpa jarak tepi) */}
      <div className="relative mt-10 aspect-square w-full @2xl:aspect-[16/9] @3xl:mt-14 @5xl:aspect-[2/1]" style={{ ...timelineStyle(tl), '--p': FILM.poster } as CSSProperties}>
        <FilmScene restX={restX(tl)} />
        <p className={`absolute left-5 top-5 rounded-full bg-[#0B1026]/70 px-4 py-2 ring-1 ring-inset ring-white/15 backdrop-blur-md @2xl:left-8 @5xl:left-12 ${MONO} text-[14px] font-semibold`}>
          {posterTime} WIB{tl.distance > 0 ? ` · ${groupThousands(posterKm)} km` : ''}
        </p>
      </div>
      <div className={WRAP}>
        <ol aria-label="Bab perjalanan" className="mt-10 grid gap-x-8 gap-y-8 @2xl:grid-cols-2 @5xl:grid-cols-4 @3xl:mt-12">
          {tl.chapters.map((c, i) => (
            <Reveal as="li" key={`${c.title}-${i}`} delay={i * 80} className="min-w-0 border-t border-white/15 pt-5">
              <p className={`${LABEL} ${C.neon}`}>
                {c.time} · Bab {i + 1}
              </p>
              <h3 className={`mt-2 text-white ${TYPE.h3}`}>{c.title}</h3>
              {c.text && <p className={`mt-2 max-w-[40ch] text-pretty ${TYPE.small} text-[14px] ${C.onNightMuted}`}>{c.text}</p>}
            </Reveal>
          ))}
        </ol>
      </div>
    </TemplateSection>
  );
}
