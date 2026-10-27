// Hook kecil Pradipta: section yang sedang dibaca (penunjuk menu yang bergeser), "sudah digulir" (garis tipis di bawah
// header), posisi penunjuk putih di lintasan pil (menu atas & tab SPMB), rel yang lebih lebar dari wadahnya (tombol
// geser linimasa prestasi), hero di layar & tab browser tersembunyi (slider berhenti). Tanpa IntersectionObserver /
// ResizeObserver (perayap, jsdom) → nilai awal, tanpa error.
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * Item menu yang sedang dibaca, atau null. SEMUA section di `owners` diamati (urut halaman), dan section tanpa item menu
 * sendiri dipetakan ke item menu sebelumnya (./model navOwners: sambutan → Profil, prestasi → Ekskul, pengumuman/agenda/
 * guru → Berita, testimoni/galeri/FAQ → SPMB), jadi penunjuk tetap menyala dan MELUNCUR dari item ke item; null hanya
 * di atas section menu pertama (hero, akses cepat, statistik). Di sela dua section (tidak ada yang di pita tengah) nilai
 * terakhir dipertahankan. Header tetap terpasang saat pindah halaman di dalam situs (beranda ↔ /berita/{slug}), jadi
 * section dicari & diamati ulang setiap halaman berganti.
 */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, owners: Record<string, string | null>): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = Object.entries(owners)
    .map(([key, owner]) => `${key}:${owner ?? ''}`)
    .join(',');
  const page = useSiteData().route.kind;
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (page !== 'home' || !root || typeof IntersectionObserver !== 'function' || !signature) return;
    const ownerOf = new Map(
      signature.split(',').map((pair) => {
        const [key, owner] = pair.split(':');
        return [key, owner || null] as const;
      }),
    );
    // Urut dokumen = urut halaman
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-tpl-section]')).filter((el) => ownerOf.has(el.getAttribute('data-tpl-section') ?? ''));
    const visible = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
        const current = targets.find((el) => visible.get(el));
        if (current) setActive(ownerOf.get(current.getAttribute('data-tpl-section') ?? '') ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [anchor, signature, page]);
  // Halaman selain beranda tidak punya section: tanpa penunjuk
  return page === 'home' ? active : null;
}

/** true selama minimal `ratio` bagian elemen terlihat (awal true: tanpa IntersectionObserver perilaku tidak berubah). */
export function useInView(target: RefObject<HTMLElement | null>, ratio: number): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= ratio - 0.01), {
      threshold: [0, ratio],
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, ratio]);
  return inView;
}

/** true setelah penanda `sentinel` (beberapa px dari atas halaman) lewat ke atas layar. */
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
 * Penunjuk putih di lintasan pil (anak `track` berkelas .pd-ind): diletakkan di bawah elemen `[data-pd-key="<active>"]`
 * di dalam `track` lewat variabel CSS --pd-ind-x / --pd-ind-w (bukan state React). Tanpa yang aktif → disembunyikan;
 * muncul pertama kali langsung di tempatnya (tanpa meluncur dari kiri). Diukur ulang saat ukuran lintasan berubah.
 */
export function useIndicator(track: RefObject<HTMLElement | null>, activeKey: string | null): void {
  useLayoutEffect(() => {
    const el = track.current;
    const ind = el?.querySelector<HTMLElement>(':scope > .pd-ind');
    if (!el || !ind) return;
    const place = () => {
      const target = activeKey ? el.querySelector<HTMLElement>(`[data-pd-key="${activeKey}"]`) : null;
      if (!target || !target.offsetWidth) {
        ind.dataset.on = 'false';
        return;
      }
      const first = ind.dataset.on !== 'true';
      if (first) ind.dataset.instant = 'true';
      ind.style.setProperty('--pd-ind-x', `${target.offsetLeft}px`);
      ind.style.setProperty('--pd-ind-w', `${target.offsetWidth}px`);
      ind.dataset.on = 'true';
      if (first) {
        // Paksa tata letak dengan posisi baru sebelum transisi dinyalakan lagi
        void ind.offsetWidth;
        delete ind.dataset.instant;
      }
    };
    place();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [track, activeKey]);
}

/** true bila isi rel lebih lebar dari relnya (tombol geser ditampilkan). */
export function useOverflow(rail: RefObject<HTMLElement | null>, signature: string): boolean {
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = rail.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 2);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [rail, signature]);
  return overflow;
}

/** true saat tab browser tidak terlihat (slider otomatis berhenti). */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}
