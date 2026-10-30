// Film itinerary (kunci `film`), pita KREM selebar layar — "tiga hari dalam satu gulir". Kepala section (label perangko,
// H2, kalimat pengantar) SAMA dengan section lain dan berada DI ATAS panggung, jadi panggung cukup berisi penghitung, pita
// rute, dan rel kartu pos — muat juga di layar laptop pendek (1366×768, 1536×864 zoom 125%). Gerak menyala (demo & situs
// live tanpa prefers-reduced-motion): di bawah kepala ada trek setinggi 4 × layar (HP 3 ×) dengan PANGGUNG lengket setinggi
// layar terlihat (--film-vh) yang "diputar" oleh kemajuan gulir --p (0 → 1, ditulis hooks useFilmProgress):
//   • atas: penghitung hari · jam · km (km berjalan, ditulis langsung ke DOM), menjauh dari header lengket;
//   • pita rute: panorama bukit jauh (paling lambat, −18%), jalan titik-titik, piktogram & titik tiap tempat (terisi saat
//     dilewati), garis yang sudah ditempuh (scaleX p) dan bus kecil yang melaju (roda berputar);
//   • rel KARTU POS (<ol>, satu bab per tempat): bergeser ke kiri −q × --reel-shift (q = kemajuan berjeda: rel diam di
//     sekitar setiap titik, jadi kartu aktif selalu berhenti utuh); kartu di tengah tegak & paling besar, kartu lain miring
//     ±3° dan turun sedikit; kartu yang sudah dilewati "dicap pos". Bab aktif = aria-current="step". Lebar kartu mengikuti
//     tinggi panggung (./lawatan.css); panggung pendek (data-size="compact") menyembunyikan kalimat kartu secara visual
//     (tetap terbaca pembaca layar). HP: rel tepat di bawah pita rute (bukan di tengah sisa tinggi).
// Tautan "Lewati animasi" (tersembunyi sampai difokus) berada SEBELUM trek, menggulir ke section berikutnya dan memindahkan
// fokus ke H2-nya.
// Gerak mati (pratinjau CMS, reduced motion, jsdom, cetak) ATAU layar terlalu pendek untuk panggung (HP mendatar, hooks
// useFilmFits): papan cerita statis — kepala section, pita rute utuh (semua titik terisi, bus di tujuan), lalu semua kartu
// pos dalam kisi (HP 2 kolom, 3 kolom, layar ≥ 1920px satu baris). Teks bab selalu ada di DOM.
import { useRef, type CSSProperties } from 'react';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useFilmFits, useFilmProgress, useReelShift } from './hooks';
import { stopIconKey } from './icons';
import { dayPart, filmHasKm, filmPlayable, stopPosition, stopStamp, type FilmStop, type LawatanModel } from './model';
import { LAWATAN_PHOTOS } from './photos';
import { BusIcon, Hills, Postmark, StopGlyph } from './scenes';
import { C, DISPLAY, LABEL, LABEL_SM, NUM, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';

/** Tepi dalam pita rute: selalu lebih lebar dari setengah bus (27 / 31,5px), jadi bus di titik awal & akhir tidak terpotong. */
const ROUTE_PAD = 'px-8 @3xl:px-10 @5xl:px-12 @min-[96rem]:px-16';

/** Kolom kisi papan cerita di layar ≥ 1920px: satu baris kartu tepat di bawah titik-titiknya (4–6 titik). */
const POSTER_WIDE: Record<number, string> = { 4: '@min-[120rem]:grid-cols-4', 5: '@min-[120rem]:grid-cols-5', 6: '@min-[120rem]:grid-cols-6' };

/** Pita rute: bukit jauh, jalan titik-titik, titik + piktogram + nama tiap tempat, garis tempuh, bus. */
function RouteBand({ stops, active, poster }: { stops: FilmStop[]; active: number; poster: boolean }) {
  const n = stops.length;
  return (
    <div aria-hidden className="relative h-[92px] overflow-hidden @3xl:h-[112px]">
      <div className="pointer-events-none absolute bottom-[40px] left-0 h-[52px] w-[130%] @3xl:bottom-[52px] @3xl:h-[60px]">
        <Hills className="lw-hills h-full w-full" />
      </div>
      {/* Jalan titik-titik selebar layar */}
      <div className="lw-road absolute inset-x-0 top-[50px] h-1 @3xl:top-[62px]" />
      <div className={`absolute inset-x-0 top-0 h-full ${ROUTE_PAD}`}>
        <div className="relative h-full">
          <div className="lw-route-done absolute inset-x-0 top-[50px] h-1 rounded-full bg-(--tpl-accent) @3xl:top-[62px]" />
          {stops.map((stop, i) => {
            const t = stopPosition(i, n);
            const edge = i === 0 ? 'left-[-8px] text-left' : i === n - 1 ? 'right-[-8px] text-right' : 'left-1/2 -translate-x-1/2 text-center';
            const on = poster || i === active;
            return (
              <div key={`${stop.name}-${i}`} className="absolute top-0 h-full w-0" style={{ left: `${(t * 100).toFixed(3)}%`, '--t': t.toFixed(4) } as CSSProperties}>
                <StopGlyph kind={stopIconKey(stop.name)} className={`absolute left-1/2 top-[2px] h-5 w-5 -translate-x-1/2 @3xl:top-[4px] @3xl:h-6 @3xl:w-6 ${C.accent}`} />
                <span className="absolute left-1/2 top-[45px] block h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#FBF6EE] ring-2 ring-inset ring-(--lw-ink) @3xl:top-[57px]">
                  <span className="lw-stop-fill absolute inset-[3px] rounded-full bg-(--lw-ink)" />
                </span>
                <span
                  data-active={on ? 'true' : 'false'}
                  data-edge={i === 0 || i === n - 1 ? 'true' : 'false'}
                  className={`lw-stop-label absolute top-[64px] whitespace-nowrap text-[12px] leading-none @3xl:top-[80px] @3xl:text-[13px] ${edge} ${
                    i === active ? `font-bold ${C.accent}` : `font-semibold ${C.ink}`
                  }`}
                >
                  {stop.name}
                </span>
              </div>
            );
          })}
          <div className="lw-bus-run pointer-events-none absolute inset-x-0 top-[25px] h-[26px] @3xl:top-[34px] @3xl:h-[30px]">
            <BusIcon className="absolute left-0 top-0 h-[26px] w-[54px] -translate-x-1/2 @3xl:h-[30px] @3xl:w-[63px]" wheelClassName="lw-wheel" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Kartu pos satu tempat (satu bab). */
function Postcard({ stop, i, active, reel }: { stop: FilmStop; i: number; active: boolean; reel: boolean }) {
  const stamp = stopStamp(stop);
  return (
    <li
      aria-current={active ? 'step' : undefined}
      data-active={active ? 'true' : 'false'}
      style={{ '--i': i } as CSSProperties}
      className={reel ? 'lw-reel-card' : 'min-w-0'}
    >
      <article className={`flex h-full flex-col rounded-[18px] bg-white p-2 ring-inset ${active && reel ? 'ring-2 ring-(--tpl-accent)' : 'ring-1 ring-[#1D2320]/10'}`}>
        <div className="relative">
          <KitPhoto
            src={stop.image}
            alt={LAWATAN_PHOTOS.alt(stop.image, `Foto perhentian ${stop.name}`)}
            sizes={reel ? '(min-width: 2240px) 680px, (min-width: 768px) 440px, 72vw' : '(min-width: 1920px) 17vw, (min-width: 1024px) 33vw, 50vw'}
            // Rel: rasio dari ./lawatan.css (--lw-photo-ar: 4:3, HP persegi agar kartu mengisi panggung tinggi)
            className={`${reel ? 'aspect-(--lw-photo-ar)' : 'aspect-[4/3]'} rounded-[12px]`}
          />
          {stamp && (
            <span className={`absolute left-2 top-2 rounded-full bg-[#FBF6EE] px-2.5 py-1 text-[11.5px] font-semibold ${NUM} ${C.ink} @3xl:left-2.5 @3xl:top-2.5 @3xl:text-[12px]`}>
              {stamp}
            </span>
          )}
          <Postmark className="lw-card-mark absolute bottom-1.5 right-1.5 w-[64px] text-white/85 @3xl:w-[84px]" />
        </div>
        <div className="flex flex-1 flex-col px-2 pb-2 pt-3 @3xl:px-2.5 @3xl:pb-2.5">
          <p className={`${LABEL_SM} ${C.accent}`}>
            <span className={NUM}>{String(i + 1).padStart(2, '0')}</span>
            {stop.km !== null && stop.km > 0 && <span className="text-[#5A615C]"> · {stop.km} km</span>}
          </p>
          <h3 className={`mt-1 ${TYPE.h3sm} ${C.ink}`}>{stop.name}</h3>
          {stop.text && <p className={`mt-1 text-[13.5px] leading-snug @3xl:text-[14px] ${C.muted} ${reel ? 'lw-card-text line-clamp-2' : ''}`}>{stop.text}</p>}
        </div>
      </article>
    </li>
  );
}

/**
 * "Lewati animasi": tautan ke section berikutnya, tersembunyi sampai difokus papan ketik, SEBELUM pita rute & kartu
 * (dirender di film bergerak maupun papan cerita, jadi urutan Tab sama). Menggulir (ActionLink) lalu memindahkan FOKUS
 * ke H2 section tujuan (tabIndex −1), jadi Tab/Shift+Tab dan pembaca layar melanjutkan dari sana, bukan dari atas film.
 * Tanpa section berikutnya → tidak dirender.
 */
function SkipFilm({ m }: { m: LawatanModel }) {
  const next = m.next('film');
  if (!next) return null;
  // ActionLink memanggil onNavigate SEBELUM menggulir: fokus dipindah sesudahnya (pola sama dengan "Lihat paket" di hero)
  const moveFocus = () => {
    const from = document.activeElement instanceof HTMLElement ? document.activeElement.closest('[data-tpl-root]') : null;
    window.setTimeout(() => {
      const section = (from ?? document).querySelector<HTMLElement>(`[data-tpl-section="${next}"]`);
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
      className="sr-only rounded-full bg-[#1D2320] px-5 text-[14px] font-semibold text-white focus:not-sr-only focus:mt-6 focus:inline-flex focus:min-h-11 focus:items-center focus:px-5"
    >
      Lewati animasi
    </ActionLink>
  );
}

/** Papan cerita statis (gerak mati / layar terlalu pendek): pita rute utuh + kisi kartu pos. */
function FilmPoster({ m, anchor }: { m: LawatanModel; anchor: (node: HTMLElement | null) => void }) {
  const { film } = m;
  const stops = m.stops;
  return (
    <TemplateSection sectionKey="film" className={`${SECTION_PAD} ${C.cream}`}>
      <div ref={anchor} className={WRAP}>
        <SectionHead eyebrow={text(film, 'eyebrow')} number={m.number('film')} title={text(film, 'title')} subtitle={text(film, 'subtitle')} srTitle="Itinerary" />
        <SkipFilm m={m} />
      </div>
      <div className="lw-poster mt-10 @3xl:mt-14">
        <RouteBand stops={stops} active={stops.length - 1} poster />
      </div>
      <div className={`${WRAP} mt-8 @3xl:mt-10`}>
        <ol aria-label="Itinerary per tempat" className={`grid grid-cols-2 gap-3 @3xl:gap-6 @5xl:grid-cols-3 @5xl:gap-8 ${POSTER_WIDE[stops.length] ?? ''}`}>
          {stops.map((stop, i) => (
            <Postcard key={`${stop.name}-${i}`} stop={stop} i={i} active={false} reel={false} />
          ))}
        </ol>
      </div>
    </TemplateSection>
  );
}

/** Film bergerak: kepala section, lalu trek tinggi + panggung lengket yang diputar oleh gulir. */
function FilmReel({ m, anchor }: { m: LawatanModel; anchor: (node: HTMLElement | null) => void }) {
  const { film } = m;
  const stops = m.stops;
  const n = stops.length;
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const kmRef = useRef<HTMLSpanElement>(null);
  const hasKm = filmHasKm(stops);
  const chapter = useFilmProgress({ track, stage, count: n, enabled: true, kmRef, kms: hasKm ? stops.map((s) => s.km).join(',') : '' });
  useReelShift(stage, strip, true);
  const current = stops[Math.min(chapter, n - 1)];

  return (
    // Warna latar (krem + suasana waktu bab aktif) dari ./lawatan.css `.lw-film`, jadi kepala & panggung satu warna
    <TemplateSection sectionKey="film" data-daypart={dayPart(current?.time ?? '')} className="lw-film pt-16 @3xl:pt-24 @5xl:pt-28">
      <div ref={anchor} className={WRAP}>
        <SectionHead eyebrow={text(film, 'eyebrow')} number={m.number('film')} title={text(film, 'title')} subtitle={text(film, 'subtitle')} srTitle="Itinerary" />
        <SkipFilm m={m} />
      </div>
      <div ref={track} className="lw-film-track relative mt-4 @3xl:mt-6">
        <div
          ref={stage}
          data-film-progress=""
          className="lw-film-stage flex flex-col"
          style={{ '--lw-n1': Math.max(1, n - 1) } as CSSProperties}
        >
          {/* Penghitung hari · jam · km, di bawah header lengket (± 72 / 80px) */}
          <div aria-hidden className={`${WRAP} flex items-end gap-4 pt-[84px] @3xl:gap-6 @3xl:pt-[96px] ${C.ink}`}>
            {current?.day && (
              <span key={`d-${chapter}`} className={`lw-tick ${DISPLAY} font-extrabold text-[22px] leading-none tracking-[-0.02em] @3xl:text-[32px] @5xl:text-[38px]`}>
                {current.day}
              </span>
            )}
            {current?.time && (
              <span key={`t-${chapter}`} className="lw-tick border-l border-[#1D2320]/20 pl-4 text-[20px] font-semibold leading-none tabular-nums @3xl:pl-6 @3xl:text-[28px] @5xl:text-[32px]">
                {current.time}
              </span>
            )}
            {hasKm && (
              <span className="flex items-end gap-1.5 border-l border-[#1D2320]/20 pl-4 leading-none @3xl:pl-6">
                <span ref={kmRef} className="text-[20px] font-semibold tabular-nums @3xl:text-[28px] @5xl:text-[32px]" />
                <span className={`pb-0.5 ${LABEL} ${C.muted}`}>km</span>
              </span>
            )}
          </div>

          <div className="mt-3 @3xl:mt-5">
            <RouteBand stops={stops} active={chapter} poster={false} />
          </div>

          {/* Rel kartu pos (bab). HP: tepat di bawah pita rute (sisa tinggi kosong di bawah, bukan di antara rute & kartu) */}
          <div className="relative flex min-h-0 flex-1 items-start pb-5 pt-6 @3xl:items-center @3xl:pb-7 @3xl:pt-0">
            <ol ref={strip} aria-label="Itinerary per tempat" className="lw-reel">
              {stops.map((stop, i) => (
                <Postcard key={`${stop.name}-${i}`} stop={stop} i={i} active={i === chapter} reel />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Film({ m }: { m: LawatanModel }) {
  const playable = useMotionEnabled() && filmPlayable(m.stops);
  // Layar terlalu pendek untuk panggung (HP mendatar, laptop sangat pendek) → papan cerita, diukur ulang saat diputar
  const { fits, attach } = useFilmFits(playable);
  return playable && fits ? <FilmReel m={m} anchor={attach} /> : <FilmPoster m={m} anchor={attach} />;
}
