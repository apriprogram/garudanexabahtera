// Film "Sehari bersama sopir Anda" (kunci `film`, HIJAU TUA selebar layar): animasi bergaya video yang digerakkan
// GULIR. Gerak menyala: <section> = jalur tinggi (3,4 × tinggi panggung di layar lebar, 2,55 × di HP); di dalamnya
// panggung lengket setinggi area terlihat (--film-vh) berisi peta Bali bergaya (./scenes) di satu lapisan "kamera".
// Saat digulir (progres p 0 → 1, ./hooks useFilmProgress): kamera mendekat dari seluruh rute ke mobil (× 1,8 desktop,
// × 1,3 HP; di HP geser mendatar dibatasi agar rute + nama tempat tetap utuh), mobil menyusuri rute Seminyak → Celuk → Tegallalang → Kintamani → Tirta Empul → Seminyak
// (getPointAtLength, dijaga; cadangan polyline), kamera sedikit "melihat ke depan" ke perhentian berikutnya, garis aksen
// tergambar di belakang mobil, jam berjalan 08.00 → 18.00, awan (lapisan dekat) melintas lebih cepat, kabut pagi hilang
// dan cahaya senja muncul di akhir, lalu kamera menjauh lagi. Di tiap perhentian kartu foto muncul di samping pin (satu
// <img> yang berganti, + satu dimuat lebih dulu) berisi jam, nama, dan satu kalimat; rel progres bawah dengan titik per
// perhentian. Posisi, kamera, jam, dan garis ditulis LANGSUNG ke DOM (ref) hanya saat berubah; state React hanya untuk
// perhentian aktif (≤ 6 kali). Tautan "Lewati animasi" (tersembunyi sampai difokus) melompat ke section berikutnya.
// Tata letak: layar lebar = kolom teks kiri DI panggung (label, judul, pengantar, jam, catatan); HP & tablet = kepala
// section (label, judul, pengantar, catatan) DI ATAS jalur film, panggung hanya berisi jam, peta, kartu, dan rel. Peta
// disamarkan (mask, ./pesiar.css .ps-cam-mask) di belakang teks dan rel, jadi nama tempat tidak pernah menembus teks.
// Perhentian dari CMS (1–6) mengisi pin peta berurutan; rute & rel mengikuti jumlahnya.
// Gerak mati (pratinjau CMS, prefers-reduced-motion, tanpa IntersectionObserver, jsdom, CETAK): TANPA jalur tinggi,
// sticky, atau pendengar — poster lengkap: peta dipotong ke sekitar rute (rute utuh, semua pin) + daftar perhentian
// bergambar kecil. Teks panggung ≥ 4,5:1 (lapisan gelap di belakang kolom teks / pita atas & bawah di HP).
import { useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useFilmProgress, useLayoutAvailable, usePrinting, type FilmViewport } from './hooks';
import { MAP_H, MAP_W, ROUTE_LEGS, STOP_POINTS } from './map';
import {
  ROUTE_LENGTHS,
  cameraAt,
  filmFrame,
  filmGeometry,
  filmLegCount,
  filmMinutes,
  filmPlan,
  formatClock,
  lookAhead,
  pointOnPolyline,
  type FilmGeometry,
  type FilmStop,
  type PesiarModel,
} from './model';
import { PESIAR_PHOTOS } from './photos';
import { BaliBase, PosterMap, RouteLayer, type PinState } from './scenes';
import { C, FOCUS_SCROLL, GRID_GAP, SECTION_PAD, SERIF, TYPE, WRAP } from './styles';
import { SectionHead, SectionLabel } from './ui';

/** Nama perhentian untuk pin peta (pin 0 juga = perhentian ke-6, kembali ke hotel). */
const pinNames = (stops: readonly FilmStop[]) => [0, 1, 2, 3, 4].map((i) => stops[i]?.name ?? '');

/**
 * "Lewati animasi": tersembunyi sampai difokus, lalu tampil di PITA KOSONG paling atas section (8px dari tepinya, rata
 * kiri dengan WRAP) — di atas label & judul (judul HP mulai 64px, kolom judul layar lebar 104px; poster: padding 64px),
 * jadi tidak pernah menutupi H2. scroll-margin menjaganya di bawah bilah demo + header lengket saat browser menggulir ke
 * tautan yang difokus.
 */
function SkipLink({ m }: { m: PesiarModel }) {
  const next = m.nextShown('film');
  if (!next) return null;
  return (
    <ActionLink
      action={{ kind: 'section', target: next }}
      // focus:not-sr-only menolkan padding → padding & tinggi sentuh ditulis ulang SETELAHNYA (urutan utilitas Tailwind)
      className={`sr-only left-5 top-2 z-40 rounded-full bg-[#F5EFE6] px-5 py-3 text-[14px] font-semibold text-[#1E2622] @2xl:left-8 @5xl:left-12 @min-[96rem]:left-16 focus:not-sr-only focus:absolute focus:inline-flex focus:min-h-11 focus:items-center focus:px-5 focus:py-3 ${FOCUS_SCROLL}`}
    >
      Lewati animasi
    </ActionLink>
  );
}

function FilmMotion({ m }: { m: PesiarModel }) {
  const { film } = m;
  const stops = m.stops;
  const legs = filmLegCount(stops.length);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const legEls = useRef<(SVGPathElement | null)[]>([]);
  const geoRef = useRef<FilmGeometry | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const cache = useRef<{ clock: string; status: string; dwell: boolean | null; moving: boolean | null; legs: string[]; lengths: number[] }>({
    clock: '',
    status: '',
    dwell: null,
    moving: null,
    legs: [],
    lengths: [],
  });
  const chapterRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const plan = useMemo(() => filmPlan(ROUTE_LENGTHS.slice(0, legs), filmMinutes(stops).slice(0, legs + 1)), [stops, legs]);
  const legRefs = useMemo(
    () =>
      ROUTE_LEGS.slice(0, legs).map(
        (_, i): Ref<SVGPathElement> =>
          (el) => {
            legEls.current[i] = el;
          },
      ),
    [legs],
  );

  /** Titik pada ruas `leg` di fraksi `t`: getPointAtLength bila tersedia, selain itu polyline (model). */
  const pointAt = (leg: number, t: number): [number, number] => {
    const el = legEls.current[leg];
    if (el && typeof el.getPointAtLength === 'function' && typeof el.getTotalLength === 'function') {
      let length = cache.current.lengths[leg];
      if (length === undefined) {
        try {
          length = el.getTotalLength();
        } catch {
          length = 0;
        }
        cache.current.lengths[leg] = length;
      }
      if (length > 0) {
        try {
          const pt = el.getPointAtLength(Math.min(1, Math.max(0, t)) * length);
          return [pt.x, pt.y];
        } catch {
          // cadangan di bawah
        }
      }
    }
    return pointOnPolyline(ROUTE_LEGS[leg].points, t);
  };

  const onMeasure = ({ width, height }: FilmViewport) => {
    const geo = filmGeometry(width, height);
    geoRef.current = geo;
    const scale = geo.fit * geo.zoom;
    const cam = cameraRef.current;
    if (cam) {
      cam.style.width = `${Math.round(MAP_W * scale)}px`;
      cam.style.height = `${Math.round(MAP_H * scale)}px`;
    }
    const stage = stageRef.current;
    stage?.style.setProperty('--ps-fx', `${Math.round(geo.fx)}px`);
    stage?.style.setProperty('--ps-fy', `${Math.round(geo.fy)}px`);
  };

  const onFrame = (p: number) => {
    const geo = geoRef.current;
    if (!geo) return;
    const f = filmFrame(p, plan);
    const point = pointAt(f.leg, f.t);
    const ahead = pointAt(f.leg, Math.min(1, f.t + 0.015));
    const behind = pointAt(f.leg, Math.max(0, f.t - 0.015));
    const angle = (Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]) * 180) / Math.PI;
    // Saat berjalan kamera condong ke perhentian berikutnya (tujuan sudah terlihat sebelum mobil tiba)
    const focus = f.moving ? lookAhead(point, STOP_POINTS[f.leg + 1], f.t) : point;
    const cam = cameraAt(geo, focus, f.k);
    const base = geo.fit * geo.zoom;
    if (cameraRef.current) cameraRef.current.style.transform = `translate3d(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px, 0) scale(${(cam.scale / base).toFixed(4)})`;
    markerRef.current?.setAttribute('transform', `translate(${point[0].toFixed(1)} ${point[1].toFixed(1)}) rotate(${angle.toFixed(1)})`);
    legEls.current.forEach((el, i) => {
      if (!el) return;
      const state = i < f.leg || (i === f.leg && f.t >= 1) ? 'done' : i === f.leg && f.t > 0 ? (1 - f.t).toFixed(4) : 'hidden';
      if (cache.current.legs[i] === state) return;
      cache.current.legs[i] = state;
      el.style.visibility = state === 'hidden' ? 'hidden' : 'visible';
      el.style.strokeDashoffset = state === 'done' ? '0' : state === 'hidden' ? '1' : state;
    });
    const clock = formatClock(f.minutes);
    if (clock !== cache.current.clock && clockRef.current) {
      clockRef.current.textContent = clock;
      cache.current.clock = clock;
    }
    // "Menuju Celuk" saat berjalan, "Di Celuk" saat singgah (ruas + posisi menentukan tempat, bukan bab)
    const place = f.moving ? stops[f.leg + 1] : stops[f.t >= 1 ? f.leg + 1 : f.leg];
    const status = place ? `${f.moving ? 'Menuju' : 'Di'} ${place.name}` : '';
    if (status !== cache.current.status && statusRef.current) {
      statusRef.current.textContent = status;
      cache.current.status = status;
    }
    if (f.dwell !== cache.current.dwell && stageRef.current) {
      stageRef.current.dataset.dwell = f.dwell ? 'true' : 'false';
      cache.current.dwell = f.dwell;
    }
    if (f.moving !== cache.current.moving && stageRef.current) {
      stageRef.current.dataset.moving = f.moving ? 'true' : 'false';
      cache.current.moving = f.moving;
    }
    if (f.chapter !== chapterRef.current) {
      chapterRef.current = f.chapter;
      setChapter(f.chapter);
    }
  };

  useFilmProgress(trackRef, stageRef, true, onFrame, onMeasure);

  const active = Math.min(chapter, stops.length - 1);
  const pinState = (i: number): PinState => (i < active ? 'visited' : i === active ? 'active' : 'next');
  // Foto kartu: perhentian aktif + berikutnya dimuat lebih dulu (maks. 2 <img> di film)
  const photos = [active, active + 1].filter((i, n, all) => stops[i]?.image && all.findIndex((j) => stops[j]?.image === stops[i].image) === n);
  const title = text(film, 'title');
  const subtitle = text(film, 'subtitle');
  const note = text(film, 'note');

  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" className="relative bg-[#17332B] text-[#F5EFE6]">
      <SkipLink m={m} />
      {/* HP & tablet: kepala section di atas jalur film (selalu terbaca, tanpa peta di belakangnya) */}
      <div className={`${WRAP} pb-10 pt-16 @3xl:pb-12 @3xl:pt-24 @5xl:hidden`}>
        <SectionHead tone="dark" layout="stack" number={m.number('film')} eyebrow={text(film, 'eyebrow')} title={title} subtitle={subtitle} srTitle="Sehari bersama sopir" />
        {note && <p className={`mt-4 max-w-[46ch] ${TYPE.small} ${C.onDeepMuted}`}>{note}</p>}
      </div>
      <div ref={trackRef} className="ps-track relative h-[calc(var(--film-vh,100svh)*2.55)] @3xl:h-[calc(var(--film-vh,100svh)*3.4)]">
        <div
          ref={stageRef}
          data-film-progress=""
          data-dwell="false"
          data-moving="false"
          className="ps-stage sticky top-[var(--tpl-sticky-top,0px)] h-[var(--film-vh,100svh)] overflow-hidden bg-[#17332B]"
        >
          {/* Lapisan kamera: peta dasar + rute/pin/mobil, digeser & diskalakan oleh JS (skala ≤ 1 → tetap tajam). Wadah
              diam di luarnya menyamarkan peta di belakang kolom teks / pita jam dan rel bawah (mask, bukan sekadar gelap). */}
          <div aria-hidden className="ps-cam-mask pointer-events-none absolute inset-0">
            <div ref={cameraRef} aria-hidden className="ps-cam absolute left-0 top-0 origin-top-left">
              <BaliBase className="absolute inset-0 h-full w-full" />
              <RouteLayer
                names={pinNames(stops)}
                legs={legs}
                state={pinState}
                legRef={(i) => legRefs[i]}
                markerRef={markerRef}
                className="ps-route absolute inset-0 h-full w-full"
              />
            </div>
          </div>
          <div aria-hidden className="ps-clouds pointer-events-none absolute inset-y-0 left-0 w-[200%]">
            <span className="ps-cloud left-[22%] top-[16%] h-[34%] w-[16%]" />
            <span className="ps-cloud left-[46%] top-[58%] h-[40%] w-[20%]" />
            <span className="ps-cloud left-[70%] top-[8%] h-[30%] w-[14%]" />
            <span className="ps-cloud left-[88%] top-[46%] h-[36%] w-[18%]" />
          </div>
          <div aria-hidden className="ps-haze pointer-events-none absolute inset-0" />
          <div aria-hidden className="ps-dusk pointer-events-none absolute inset-0" />
          <div aria-hidden className="ps-film-scrim pointer-events-none absolute inset-0" />

          {/* Layar lebar: kolom kiri = label, judul, pengantar, jam, catatan (di bawah header lengket ± 72px). HP &
              tablet: hanya jam + keadaan di kiri atas (kepala section ada di atas jalur film). */}
          <div className={`${WRAP} pointer-events-none relative z-10 pt-[80px] @5xl:pt-[104px]`}>
            <div className="pointer-events-auto @5xl:max-w-[34%]">
              <div className="hidden @5xl:block">
                <SectionLabel label={text(film, 'eyebrow')} number={m.number('film')} tone="dark" />
                {title ? (
                  <h2 className={`mt-4 max-w-[16ch] text-balance text-[#F5EFE6] ${SERIF} text-[40px] font-medium leading-[1.08] tracking-[-0.01em] @7xl:text-[48px]`}>{title}</h2>
                ) : (
                  <h2 className="sr-only">Sehari bersama sopir</h2>
                )}
                {subtitle && <p className={`mt-3 max-w-[40ch] text-[15px] leading-relaxed @7xl:text-[16px] ${C.onDeepMuted}`}>{subtitle}</p>}
              </div>
              <div aria-hidden className="@5xl:mt-10">
                <p className="flex items-baseline gap-2">
                  <span
                    ref={clockRef}
                    className={`${SERIF} text-[34px] font-medium leading-none text-[#F5EFE6] tabular-nums @sm:text-[40px] @3xl:text-[64px] @7xl:text-[88px]`}
                  >
                    {formatClock(plan.minutes[0])}
                  </span>
                  <span className={`text-[11px] font-semibold tracking-[0.14em] @3xl:text-[12px] ${C.onDeepMuted}`}>WITA</span>
                </p>
                <p ref={statusRef} className={`mt-1 text-[13px] @sm:mt-1.5 @3xl:mt-3 @3xl:text-[15px] ${C.onDeepMuted}`}>
                  Di {stops[0].name}
                </p>
              </div>
              {note && <p className={`mt-8 hidden max-w-[36ch] text-[12.5px] leading-snug @5xl:block ${C.onDeepMuted}`}>{note}</p>}
            </div>
          </div>

          {/* Kartu perhentian: foto (dekoratif) + daftar perhentian (teks selalu ada di DOM, yang aktif terlihat) */}
          <div className="ps-card absolute z-10 flex items-stretch gap-4 rounded-[24px] bg-[#F5EFE6] p-3 text-[#1E2622] ring-1 ring-black/10 @5xl:flex-col @5xl:gap-0 @5xl:p-0">
            <div aria-hidden className="relative aspect-square w-[92px] shrink-0 overflow-hidden rounded-[16px] bg-[#1E2622]/10 @5xl:aspect-[4/3] @5xl:w-full @5xl:rounded-b-none @5xl:rounded-t-[24px]">
              {photos.map((i) => (
                <div key={stops[i].image} data-on={i === active ? 'true' : 'false'} className="ps-card-photo absolute inset-0">
                  <KitPhoto src={stops[i].image} alt="" sizes="(min-width: 1024px) 320px, 92px" fallback="none" className="absolute inset-0" />
                </div>
              ))}
            </div>
            <ol aria-label="Perhentian tur contoh" className="relative grid min-w-0 flex-1 self-center @5xl:px-5 @5xl:pb-5 @5xl:pt-4">
              {stops.map((s, i) => (
                <li key={`${s.name}-${i}`} data-active={i === active ? 'true' : 'false'} aria-current={i === active ? 'step' : undefined} className="ps-chapter col-start-1 row-start-1 min-w-0">
                  <p className={`text-[12px] font-semibold tabular-nums tracking-[0.06em] ${C.accent}`}>{s.time}</p>
                  <p className={`mt-1 ${SERIF} text-[20px] font-semibold leading-tight @5xl:text-[23px]`}>{s.name}</p>
                  {s.text && <p className={`mt-1 text-[13.5px] leading-snug @5xl:text-[14px] ${C.muted}`}>{s.text}</p>}
                </li>
              ))}
            </ol>
          </div>

          {/* Rel progres + titik per perhentian (dekoratif; daftar perhentian di atas adalah isi yang terbaca) */}
          <div aria-hidden className={`${WRAP} absolute inset-x-0 bottom-8 z-10 @3xl:bottom-10`}>
            {/* Ujung kanan menyisakan ruang untuk tombol WhatsApp & "kembali ke atas" yang melayang */}
            <div className="relative mr-[62px] h-px bg-[#F5EFE6]/25 @3xl:mr-[84px]">
              <div className="ps-rail-fill absolute inset-0 origin-left bg-(--ps-bright)" />
              {plan.arrive.map((at, i) => (
                <span key={at} className="absolute top-0 -translate-x-1/2" style={{ left: `${(at * 100).toFixed(2)}%` } as CSSProperties}>
                  <span data-on={i <= active ? 'true' : 'false'} className="ps-tick block h-2.5 w-2.5 -translate-y-1/2 rounded-full" />
                  {/* HP: hanya jam perhentian aktif (titik berdekatan); ≥ @3xl semua jam; ≥ @5xl jam + nama */}
                  <span
                    className={`absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[11.5px] tabular-nums @3xl:top-3.5 @3xl:inline @3xl:text-[12px] ${
                      i === active ? 'text-[#F5EFE6]' : `hidden ${C.onDeepMuted}`
                    }`}
                  >
                    {stops[i]?.time}
                    <span className="hidden @5xl:inline"> {stops[i]?.name}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

function FilmPoster({ m }: { m: PesiarModel }) {
  const { film } = m;
  const stops = m.stops;
  const note = text(film, 'note');
  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" className={`relative ${SECTION_PAD} bg-[#17332B] text-[#F5EFE6]`}>
      <SkipLink m={m} />
      <div className={WRAP}>
        <SectionHead
          tone="dark"
          number={m.number('film')}
          eyebrow={text(film, 'eyebrow')}
          title={text(film, 'title')}
          subtitle={text(film, 'subtitle')}
          srTitle="Sehari bersama sopir"
        />
        <div className={`mt-12 grid grid-cols-1 gap-y-10 @3xl:mt-14 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <Reveal className="min-w-0 @5xl:col-span-7">
            <div className="overflow-hidden rounded-[28px] ring-1 ring-inset ring-white/10">
              <PosterMap names={pinNames(stops)} legs={filmLegCount(stops.length)} />
            </div>
          </Reveal>
          <ol aria-label="Perhentian tur contoh" className="min-w-0 divide-y divide-[#F5EFE6]/15 border-y border-[#F5EFE6]/15 @5xl:col-span-5 @5xl:self-center">
            {stops.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex items-center gap-4 py-4 @3xl:gap-5">
                {s.image && (
                  <KitPhoto
                    src={s.image}
                    alt={PESIAR_PHOTOS.alt(s.image, `Foto ${s.name}`)}
                    sizes="112px"
                    fallback="none"
                    className="aspect-[4/3] w-24 shrink-0 rounded-[14px] @3xl:w-28"
                  />
                )}
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold tabular-nums tracking-[0.06em] ${C.bright}`}>{s.time}</p>
                  <p className={`mt-0.5 ${SERIF} text-[20px] font-semibold leading-tight text-[#F5EFE6] @3xl:text-[22px]`}>{s.name}</p>
                  {s.text && <p className={`mt-1 text-[14px] leading-snug ${C.onDeepMuted}`}>{s.text}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        {note && <p className={`mt-8 ${TYPE.small} ${C.onDeepMuted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}

export function Film({ m }: { m: PesiarModel }) {
  const layout = useLayoutAvailable();
  // Saat dicetak (atau media cetak diemulasikan): poster diam, bukan jalur film setinggi beberapa layar
  const printing = usePrinting();
  // Gerak menyala DAN tata letak nyata (jsdom tanpa ukuran → poster, sesuai kontrak film)
  const motion = useMotionEnabled() && layout && !printing;
  if (m.stops.length === 0) return null;
  return motion ? <FilmMotion m={m} /> : <FilmPoster m={m} />;
}
