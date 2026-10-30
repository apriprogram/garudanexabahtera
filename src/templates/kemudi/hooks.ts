// Hook kecil Kemudi: section yang sedang dibaca (penanda menu), "sudah digulir" (header 72 → 60px), angka yang
// bergerak ke nilai baru (harga perkiraan), "sudah terlihat" sekali (rute peta & garis langkah), dan PROGRES FILM:
// posisi gulir trek film → variabel CSS --p (0–1, 4 desimal) di panggung + --film-vh di trek, bab aktif sebagai state
// (berubah ≤ 6 kali), dan penghitung HUD yang ditulis langsung ke DOM hanya saat angkanya berubah. Tidak ada setState
// per frame. Tanpa IntersectionObserver / requestAnimationFrame (perayap, jsdom) → tidak memasang apa pun.
// Ditulis di folder ini (pola sama dengan homenest/hooks.ts, tidak diimpor dari sana).
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';
import { FILM_H, FILM_W } from './geometry';
import { FILM_MIN_STAGE, chapterAt, checkCount, filmProgress, pad2 } from './model';

const canObserve = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function' && typeof window.requestAnimationFrame === 'function';

/** Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  const page = useSiteData().route.kind;
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (page !== 'home' || !root || typeof IntersectionObserver !== 'function' || !signature) return;
    const targets = signature
      .split(',')
      .map((key) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.getAttribute('data-tpl-section') ?? '', entry.isIntersecting);
        setActive(targets.map((el) => el.getAttribute('data-tpl-section') ?? '').find((key) => visible.get(key)) ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [anchor, signature, page]);
  return page === 'home' ? active : null;
}

/**
 * true setelah penanda `sentinel` tidak terlihat lagi dan tepi bawahnya di separuh atas layar (halaman sudah digulir
 * melewatinya). Juga di bingkai HP demo / panel pratinjau CMS yang punya gulir sendiri.
 */
export function useScrolledPast(sentinel: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom < viewport / 2);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinel]);
  return past;
}

/**
 * true sekali setelah elemen masuk layar (lalu tetap true). Gerak mati (`enabled` false) → langsung true, jadi keadaan
 * akhir tampil tanpa animasi.
 */
export function useSeenOnce(ref: RefObject<Element | null>, enabled: boolean): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !canObserve()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setSeen(true);
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return !enabled || seen;
}

/**
 * Angka yang bergerak dari nilai lama ke nilai baru (± 450 ms) setiap `value` berubah. Nilai akhir selalu ada di DOM
 * (`finalRef`, dibaca pembaca layar & uji); angka berjalan ditulis ke `runRef` (aria-hidden) yang tidak berisi anak
 * React. `format` harus fungsi tetap (tingkat modul). Gerak mati → diam.
 */
export function useTween(
  finalRef: RefObject<HTMLElement | null>,
  runRef: RefObject<HTMLElement | null>,
  value: number,
  format: (n: number) => string,
  enabled: boolean,
  duration = 450,
): void {
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const final = finalRef.current;
    const run = runRef.current;
    if (!enabled || !final || !run || from === value || typeof window.requestAnimationFrame !== 'function') return;
    let frame = 0;
    const start = performance.now();
    const reset = () => {
      run.textContent = '';
      final.style.opacity = '';
    };
    final.style.opacity = '0';
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      run.textContent = format(from + (value - from) * eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else reset();
    };
    frame = window.requestAnimationFrame(tick);
    // Pengaman bila frame ditahan browser (tab latar): nilai akhir tetap muncul
    const safety = window.setTimeout(reset, duration + 400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(safety);
      reset();
    };
  }, [value, enabled, duration, format, finalRef, runRef]);
}

/**
 * Tinggi pojok kanan bawah yang dipakai tombol melayang Shell (WhatsApp 48px di bawah 16px + kembali ke atas 44px di
 * bawah 76px; ≥ 640px: 56px di bawah 32px + 44px di bawah 104px) + jarak 12px. Teks film di tengah tidak turun ke sini.
 */
const floatZone = () => (window.innerWidth >= 640 ? 148 : 120) + 12;

/** Wadah gulir terdekat (bingkai HP demo, panel CMS) atau null = jendela. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** Area terlihat di bawah bilah lengket: tepi atas (viewport) & tinggi, untuk jendela atau wadah gulir `scroller`. */
function viewOf(el: HTMLElement, scroller: HTMLElement | null): { top: number; height: number } {
  const sticky = Number.parseFloat(getComputedStyle(el).getPropertyValue('--tpl-sticky-top')) || 0;
  const top = (scroller ? scroller.getBoundingClientRect().top : 0) + sticky;
  const height = (scroller ? scroller.clientHeight : window.innerHeight) - sticky;
  return { top, height: Math.max(1, height) };
}

/**
 * Progres film yang digulir. `track` = section tinggi (N × tinggi panggung), `stage` = panggung sticky, `frame` = ruang
 * gambar (HP & tablet: sisa tinggi panggung). Menulis `--film-vh` (tinggi area terlihat di bawah bilah lengket) di trek,
 * `--p` (0–1) di panggung lewat style.setProperty, dan `--km-box-w` (lebar gambar 12:7 terbesar yang muat di `frame`,
 * diukur ResizeObserver: tinggi judul, keterangan & bab tidak lagi ditebak dengan konstanta) beserta `--km-co-h` /
 * `--km-tail` (ruang di bawah gambar yang kosong di awal / akhir film, untuk menengahkan gambar); menulis angka HUD ke
 * `counter` hanya saat berubah. Mengembalikan indeks bab aktif (state, berubah ≤ 6 kali) dan `short`: area terlihat
 * lebih pendek dari FILM_MIN_STAGE (HP mendatar) → film tampil sebagai storyboard diam (dipantau terus saat resize).
 * Mendengarkan gulir (capture: juga bingkai HP demo) dan resize hanya selama trek dekat layar (IntersectionObserver);
 * semua dilepas saat unmount. Gerak mati → tidak memasang apa pun, bab 0.
 */
export function useFilmProgress(
  track: RefObject<HTMLElement | null>,
  stage: RefObject<HTMLElement | null>,
  frame: RefObject<HTMLElement | null>,
  counter: RefObject<HTMLElement | null>,
  chapters: number,
  enabled: boolean,
): { chapter: number; short: boolean } {
  const [chapter, setChapter] = useState(0);
  const [short, setShort] = useState(false);

  // Panggung terlalu pendek untuk video? (sekali saat dipasang + tiap resize, juga selama tampil diam)
  useEffect(() => {
    const trackEl = track.current;
    if (!enabled || !trackEl || !canObserve()) return;
    const check = () => setShort(viewOf(trackEl, scrollerOf(trackEl)).height < FILM_MIN_STAGE);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, [track, enabled]);

  const running = enabled && !short;
  useEffect(() => {
    const trackEl = track.current;
    const stageEl = stage.current;
    if (!running || !trackEl || !stageEl || !canObserve()) return;
    const scroller = scrollerOf(trackEl);
    let raf = 0;
    let listening = false;
    let lastP = -1;
    let lastChapter = -1;
    let lastCount = -1;

    const view = () => viewOf(stageEl, scroller);
    const update = () => {
      raf = 0;
      const { top, height } = view();
      const rect = trackEl.getBoundingClientRect();
      const p = filmProgress(top, height, rect.top, rect.height);
      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;
      stageEl.style.setProperty('--p', p.toFixed(4));
      const count = checkCount(p);
      if (count !== lastCount && counter.current) {
        lastCount = count;
        counter.current.textContent = pad2(count);
      }
      const next = chapterAt(p, chapters);
      if (next !== lastChapter) {
        lastChapter = next;
        setChapter(Math.max(0, next));
      }
    };
    const measure = () => {
      trackEl.style.setProperty('--film-vh', `${Math.round(view().height)}px`);
      lastP = -1;
      update();
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onResize, { passive: true });
        onResize();
      } else {
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      }
    };
    const observer = new IntersectionObserver((entries) => listen(entries.some((entry) => entry.isIntersecting)), { rootMargin: '240px 0px 240px 0px' });
    observer.observe(trackEl);
    // Lebar gambar 12:7 terbesar yang muat di ruangnya (HP & tablet: ruang = sisa tinggi panggung; dipakai CSS < 1024px)
    // + dua jarak untuk menengahkan gambar di ruang bebas (CSS < 1024px): --km-co-h = tinggi daftar keterangan di bawah
    // gambar (HP; masih kosong di awal film), --km-tail = dari bawah ruang gambar sampai bawah bab (kosong di bingkai
    // akhir, saat keterangan & bab sudah memudar; dibatasi agar kalimat penutup tetap di atas tombol melayang). Diukur
    // dari kotak tata letak (tanpa transform), bukan konstanta.
    const frameEl = frame.current;
    const sceneEl = frameEl?.parentElement ?? null;
    const chaptersEl = stageEl.querySelector<HTMLElement>('.km-film-chapters');
    const finalEl = stageEl.querySelector<HTMLElement>('.km-final');
    const fit = () => {
      if (!frameEl) return;
      const width = Math.min(frameEl.clientWidth, (frameEl.clientHeight * FILM_W) / FILM_H);
      stageEl.style.setProperty('--km-box-w', `${Math.max(0, Math.floor(width))}px`);
      const rect = frameEl.getBoundingClientRect();
      const below = (el: HTMLElement | null) => (el ? Math.max(0, Math.round(el.getBoundingClientRect().bottom - rect.bottom)) : 0);
      let tail = below(chaptersEl);
      // Kalimat penutup (di tengah gambar) tidak turun ke pojok tombol melayang Shell (WhatsApp + kembali ke atas)
      const last = finalEl?.lastElementChild;
      if (finalEl && last instanceof HTMLElement) {
        const textBottom = rect.top + (rect.height - finalEl.offsetHeight) / 2 + last.offsetTop + last.offsetHeight;
        const room = stageEl.getBoundingClientRect().bottom - floatZone() - textBottom;
        tail = Math.min(tail, Math.max(0, Math.floor(room * 2)));
      }
      stageEl.style.setProperty('--km-co-h', `${below(sceneEl)}px`);
      stageEl.style.setProperty('--km-tail', `${tail}px`);
    };
    const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (resizer) for (const el of [frameEl, sceneEl, chaptersEl]) if (el) resizer.observe(el);
    // Tinggi trek & posisi awal sebelum trek terlihat (jarak gulir halaman sudah benar sejak awal)
    raf = window.requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      resizer?.disconnect();
      listen(false);
      if (raf) window.cancelAnimationFrame(raf);
      trackEl.style.removeProperty('--film-vh');
      stageEl.style.removeProperty('--p');
      stageEl.style.removeProperty('--km-box-w');
      stageEl.style.removeProperty('--km-co-h');
      stageEl.style.removeProperty('--km-tail');
    };
  }, [track, stage, frame, counter, chapters, running]);
  return { chapter: running ? chapter : 0, short: enabled && short };
}
