// Film proses (kunci `film`) — "Mobil siap, Anda tinggal jalan": pita GRAFIT selebar layar dengan grid cetak biru tipis.
// GERAK MENYALA: section = trek tinggi (3 × tinggi panggung; HP 2,25 ×), panggung menempel (sticky) setinggi layar yang
// terlihat (--film-vh), dan gulir = video: p 0 → 0,3 garis MPV tergambar (kamera mundur pelan), 0,3 → 0,5 batang pindai
// lewat, bodi terisi warna tema, kaca menggelap, roda muncul (HUD "CEK 00 → 12"), 0,5 → 0,8 empat keterangan muncul satu
// per satu (garis + titik + label; BBM penuh), 0,8 → 0,95 mobil melaju keluar ke kanan (roda berputar, garis kecepatan,
// bayangan gerak), 0,9 → 0,98 "Diantar ke lokasi Anda" muncul dan teks bab memudar (bingkai akhir bersih). Sebelum garis
// tergambar, sketsa titik-titik menunggu ditelusuri pena; panggung pendek (< 780px) tanpa HUD. Desktop: kiri label, H2,
// kalimat, HUD (cek + BBM), dan bab aktif (daftar <ol> asli, berganti pudar); kanan gambar. HP & tablet: judul, lalu
// GAMBAR yang mengisi sisa tinggi panggung (lebarnya diukur ./hooks.ts dari ruang yang tersisa, bukan konstanta), daftar
// keterangan (muncul satu per satu bersama lencananya), dan bab; panggung pendek menyembunyikan teks tambahan lebih dulu
// (kalimat pengantar, isi bab, label) sebelum mengecilkan mobil, dan di bawah 480px (HP mendatar) film tampil sebagai
// storyboard diam. Bawah: rel progres dengan 4 tanda bab. Tautan "Lewati animasi" (tersembunyi sampai difokus) ke section
// berikutnya. GERAK MATI (pratinjau CMS, kurangi gerak, jsdom, cetak): section biasa = bingkai poster (mobil utuh + semua
// keterangan) + semua bab sebagai daftar bernomor + kalimat penutup. Teks di panggung ≥ 4,5:1 (putih / putih 70%).
import { MapPin } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text, type LinkAction } from '../shared/utils';
import { FILM_CALLOUTS, FILM_H, FILM_W } from './geometry';
import { useFilmProgress } from './hooks';
import { CHECK_TOTAL, calloutWindows, chapterWindows, pad2, type KemudiModel } from './model';
import { C, DISPLAY, MONO, MONO_LABEL, TYPE, WRAP } from './styles';
import { SectionTag } from './ui';
import { FilmScene } from './scenes';

const pct = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`;

/** H2 film: seperti TYPE.h2, tetapi 40px sampai 1279px (kepala film lebih sempit dari kepala section biasa). */
const FILM_H2 = `${DISPLAY} font-bold text-balance text-[32px] leading-[1.05] tracking-[-0.03em] @3xl:text-[40px] @7xl:text-[48px] @min-[96rem]:text-[54px]`;

export function Film({ m, next }: { m: KemudiModel; next: LinkAction | null }) {
  const { film } = m;
  const motion = useMotionEnabled();
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const chapters = m.items('film');
  const callouts = list(film, 'callouts', FILM_CALLOUTS.length)
    .map((i) => field(i, 'text'))
    .filter(Boolean);
  const { chapter, short } = useFilmProgress(track, stage, frame, counter, chapters.length, motion);
  // Video hanya bila gerak boleh DAN panggung cukup tinggi; selain itu storyboard diam
  const on = motion && !short;
  const chapterWins = chapterWindows(chapters.length);
  const calloutWins = calloutWindows(callouts.length);
  const eyebrow = text(film, 'eyebrow');
  const title = text(film, 'title');
  const subtitle = text(film, 'subtitle');
  const carLabel = text(film, 'car_label');
  const finalTitle = text(film, 'final_title');
  const finalText = text(film, 'final_text');
  const win = (i: number) => ({ '--a': calloutWins[i][0], '--d': calloutWins[i][1] - calloutWins[i][0] }) as CSSProperties;
  const closing = (finalTitle || finalText) && (
    <p className="mt-6 flex max-w-[520px] items-start gap-3 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
        <MapPin className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        {finalTitle && <span className={`block ${DISPLAY} text-[18px] font-semibold text-white`}>{finalTitle}</span>}
        {finalText && <span className={`mt-0.5 block text-[14px] ${C.onDarkMuted}`}>{finalText}</span>}
      </span>
    </p>
  );

  return (
    <TemplateSection sectionKey="film" data-tpl-tone="inverse" data-film={on ? 'on' : 'off'} className="km-film relative bg-[#161B22] text-white">
      <div ref={track} className="km-track">
        <div ref={stage} data-film-progress="" className="km-stage overflow-hidden">
          {next && (
            <ActionLink
              action={next}
              className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-[84px] focus:z-20 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:bg-white focus:px-4 focus:text-[14px] focus:font-semibold focus:text-[#0D1117]"
            >
              Lewati animasi
            </ActionLink>
          )}
          <div aria-hidden className="km-grid pointer-events-none absolute -inset-[12%]" />
          <div aria-hidden className="km-vignette pointer-events-none absolute inset-0" />

          <div
            className={`${WRAP} km-film-body relative grid grid-cols-1 @5xl:grid-cols-12 @5xl:gap-x-8 ${
              on
                ? 'h-full grid-rows-[auto_minmax(0,1fr)_auto] content-start gap-y-4 pb-[64px] pt-[84px] @3xl:gap-y-6 @5xl:grid-rows-[auto_auto_minmax(0,1fr)] @5xl:pb-[84px] @5xl:pt-[100px]'
                : 'gap-y-10 py-16 @3xl:py-24 @5xl:grid-rows-[auto_auto] @5xl:gap-y-14 @5xl:py-28'
            }`}
          >
            {/* Kepala: label, H2, kalimat (judul 40px sampai 1279px: di kolom 4/12 selebar 288px judul 48px pecah
                3 baris dengan "Mobil" sendirian) */}
            <div className="km-film-head min-w-0 @5xl:col-span-4 @5xl:row-start-1">
              {eyebrow && <SectionTag label={eyebrow} index={m.index('film')} tone="dark" className="km-film-tag" />}
              {title ? <h2 className={`${eyebrow ? 'mt-4' : ''} max-w-[16ch] text-white ${FILM_H2} km-film-title`}>{title}</h2> : <h2 className="sr-only">Proses sewa</h2>}
              {subtitle && <p className={`km-film-intro mt-3 max-w-[40ch] text-pretty ${TYPE.body} ${C.onDarkMuted}`}>{subtitle}</p>}
            </div>

            {/* HUD dasbor (gerak menyala saja, desktop): hanya dua meter yang bergerak — cek & BBM (dekoratif) */}
            {on && (
              <div aria-hidden className={`km-hud mt-6 hidden max-w-[320px] rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10 @5xl:col-span-4 @5xl:row-start-2 @5xl:block ${MONO} text-[12px]`}>
                <dl className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                  <dt className="text-white/55">CEK</dt>
                  <dd className="flex items-center gap-3 text-white">
                    <span className="tabular-nums">
                      <span ref={counter}>00</span>/{CHECK_TOTAL}
                    </span>
                    <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="km-hud-check absolute inset-0 rounded-full bg-(--km-bright)" />
                    </span>
                  </dd>
                  <dt className="text-white/55">BBM</dt>
                  <dd className="flex items-center gap-3 text-white">
                    <span>E</span>
                    <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="km-hud-fuel absolute inset-0 rounded-full bg-(--km-bright)" />
                    </span>
                    <span>F</span>
                  </dd>
                </dl>
              </div>
            )}

            {/* Panggung gambar. km-frame: HP & tablet = sisa tinggi panggung (gambar diukur agar muat), desktop = pembungkus biasa */}
            <div className={`km-film-scene min-w-0 @5xl:col-span-8 @5xl:col-start-5 @5xl:row-start-1 @5xl:self-center ${on ? '@5xl:row-span-3' : ''}`}>
              <div ref={frame} className="km-frame">
                <div className={`km-box relative mx-auto aspect-[12/7] ${on ? '' : 'w-full'}`}>
                  <FilmScene callouts={callouts.length} />
                  {carLabel && (
                    <p aria-hidden className={`absolute right-0 top-0 hidden whitespace-nowrap text-[11px] uppercase tracking-[0.08em] text-white/55 @5xl:block ${MONO}`}>
                      {`Lembar 01 · ${carLabel} · tampak samping`}
                    </p>
                  )}
                  {callouts.map((label, i) => {
                    const c = FILM_CALLOUTS[i];
                    return (
                      <p
                        key={`label-${i}`}
                        aria-hidden
                        className={`km-co-label km-w absolute hidden items-center gap-2 whitespace-nowrap rounded-xl bg-[#1E252F] px-3 py-2 text-[13.5px] font-semibold text-white ring-1 ring-inset ring-white/10 @3xl:inline-flex ${
                          c.side === 'above' ? '-translate-x-1/2 -translate-y-[calc(100%+6px)]' : '-translate-x-1/2 translate-y-[6px]'
                        }`}
                        style={{ left: pct(c.end[0], FILM_W), top: pct(c.end[1], FILM_H), ...win(i) }}
                      >
                        <span className={`${MONO} text-[11.5px] text-white/70`}>{pad2(i + 1)}</span>
                        {label}
                      </p>
                    );
                  })}
                  {callouts.map((_, i) => {
                    const c = FILM_CALLOUTS[i];
                    return (
                      <span
                        key={`badge-${i}`}
                        aria-hidden
                        className={`km-co-badge km-w absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-(--km-bright) text-[11px] font-bold text-[#0D1117] ring-2 ring-[#161B22] @3xl:hidden ${MONO}`}
                        style={{ left: pct(c.anchor[0], FILM_W), top: pct(c.anchor[1], FILM_H), ...win(i) }}
                      >
                        {i + 1}
                      </span>
                    );
                  })}
                  {on && (finalTitle || finalText) && (
                    <div aria-hidden className="km-final pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                        <MapPin className="h-5 w-5" strokeWidth={2} />
                      </span>
                      {finalTitle && <p className={`mt-4 ${DISPLAY} text-[26px] font-bold leading-tight tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[44px]`}>{finalTitle}</p>}
                      {finalText && <p className={`mt-2 max-w-[48ch] text-balance text-[14px] @3xl:text-[16px] ${C.onDarkMuted}`}>{finalText}</p>}
                    </div>
                  )}
                </div>
              </div>
              {callouts.length > 0 && (
                <ol aria-label="Keterangan mobil" className="km-co-list mt-4 grid grid-cols-2 gap-2 @3xl:sr-only">
                  {callouts.map((label, i) => (
                    <li key={`${label}-${i}`} className="km-co-item km-w flex min-w-0 items-start gap-2 rounded-xl bg-white/[0.06] px-2.5 py-2 text-[12.5px] font-medium leading-snug text-white" style={win(i)}>
                      <span aria-hidden className={`relative mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-1 ring-inset ring-white/40 ${MONO}`}>
                        <span className="km-co-fill absolute inset-0 rounded-full bg-(--tpl-accent)" />
                        <span className="relative">{i + 1}</span>
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Bab: daftar bernomor asli (gerak menyala: satu tampil bergantian; mati: semua) */}
            {chapters.length > 0 && (
              <div className={`km-film-chapters min-w-0 ${on ? '@5xl:col-span-4 @5xl:row-start-3 @5xl:self-end' : '@5xl:col-span-12 @5xl:row-start-2'}`}>
                <ol aria-label="Tahap sewa" className={`km-chapters ${on ? '' : 'grid gap-x-8 gap-y-5 @3xl:grid-cols-2 @6xl:grid-cols-4'}`}>
                  {chapters.map((item, i) => {
                    const [a, b] = chapterWins[i];
                    return (
                      <li
                        key={`${field(item, 'title')}-${i}`}
                        aria-current={on && i === chapter ? 'step' : undefined}
                        className={`km-chap min-w-0 ${on ? '' : 'border-t border-white/10 pt-4'}`}
                        style={{ '--a': i === 0 ? -1 : a, '--b': i === chapters.length - 1 ? 2 : b } as CSSProperties}
                      >
                        <p className={`km-chap-num ${MONO_LABEL} text-(--km-bright)`}>
                          {pad2(i + 1)} / {pad2(chapters.length)}
                        </p>
                        <h3 className={`mt-1.5 ${DISPLAY} text-[22px] font-semibold tracking-[-0.02em] text-white @5xl:text-[28px]`}>{field(item, 'title')}</h3>
                        {field(item, 'text') && (
                          <p className={`km-chap-text mt-1.5 max-w-[36ch] text-pretty text-[14.5px] leading-relaxed @5xl:text-[15.5px] ${on ? 'pr-16 @3xl:pr-0' : ''} ${C.onDarkMuted}`}>{field(item, 'text')}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {/* Kalimat penutup: diam = kartu terlihat; video = untuk pembaca layar & cetak (di layar tampil sebagai
                    bingkai akhir di atas gambar, yang aria-hidden) */}
                {closing && (on ? <div className="sr-only print:not-sr-only">{closing}</div> : closing)}
              </div>
            )}
          </div>

          {/* Rel progres + tanda bab (gerak menyala) */}
          {on && chapters.length > 0 && (
            <div aria-hidden className={`km-rail absolute inset-x-0 bottom-0 ${WRAP} pb-5 pr-[84px]! @3xl:pb-6 @5xl:pr-[112px]!`}>
              <div className="relative h-[2px] rounded-full bg-white/[0.12]">
                <span className="km-rail-fill absolute inset-0 rounded-full bg-(--km-bright)" />
                {chapterWins.map(([a], i) => (
                  <span key={i} className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-full bg-white/40" style={{ left: `${a * 100}%` }} />
                ))}
              </div>
              <div className="relative mt-2 h-4">
                {chapterWins.map(([a], i) => (
                  <span
                    key={i}
                    className={`absolute top-0 whitespace-nowrap ${MONO_LABEL} text-[10.5px] transition-colors duration-300 @3xl:text-[11.5px] ${i === chapter ? 'text-white' : 'text-white/55'}`}
                    style={{ left: `${a * 100}%` }}
                  >
                    {pad2(i + 1)}
                    <span className="hidden @xl:inline"> {field(chapters[i], 'title')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
