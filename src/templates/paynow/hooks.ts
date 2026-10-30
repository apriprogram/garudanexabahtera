// Hook kecil PayNow: section yang sedang dibaca (garis aktif di menu), "sudah digulir" (header transparan → malam
// indigo), angka hasil simulasi yang bergulir pelan (≤ 400 ms, hanya bila gerak menyala), dan kotak kartu notifikasi
// HP hero yang diukur dari mockup. Tanpa IntersectionObserver / requestAnimationFrame / ResizeObserver / tata letak
// (perayap, jsdom lama) → nilai akhir atau cadangan langsung, tanpa error. Ditulis di folder ini (pola sama dengan
// jumantara/hooks.ts, tidak diimpor dari sana).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';
import { noteSlot, type NoteSlot } from './model';

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
 * Angka yang bergulir dari nilai sebelumnya ke `target` dalam `duration` ms (ease-out). `enabled` false → langsung
 * `target`. Nilai yang dikembalikan selalu bulat.
 */
export function useTween(target: number, enabled: boolean, duration = 360): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    from.current = target;
    // Gerak mati: nilai dikembalikan langsung (lihat return di bawah), state tidak perlu diikuti
    if (!enabled || typeof window.requestAnimationFrame !== 'function') return;
    let frame = 0;
    if (start === target) {
      frame = window.requestAnimationFrame(() => setShown(target));
      return () => window.cancelAnimationFrame(frame);
    }
    // Waktu mulai = stempel waktu frame PERTAMA (jam rAF bisa berbeda dari performance.now(), mis. sedikit lebih awal
    // saat input diproses di awal frame); t dibatasi 0…1 agar angka tidak pernah melampaui awal/akhir
    let began = -1;
    const tick = (now: number) => {
      if (began < 0) began = now;
      const t = Math.min(1, Math.max(0, (now - began) / Math.max(1, duration)));
      const value = Math.round(start + (target - start) * (1 - (1 - t) ** 3));
      from.current = value;
      setShown(value);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, enabled, duration]);
  return enabled ? shown : target;
}

/**
 * Kotak kartu notifikasi pertama di HP hero (< @5xl; ./model noteSlot), diukur dari mockup yang benar-benar tergambar
 * di `box` (kotak HP): tepi atas panel transaksi [data-pn-list] dan bawah tiap barisnya, bawah blok di atas panel, dan
 * tinggi isi kartu. Jadi ikut isi CMS (sapaan, saldo, tombol, atau judul daftar dikosongkan), huruf
 * yang baru termuat, dan ukuran huruf peramban. Diukur tiap render dan saat ukuran mockup/teks kartu berubah
 * (ResizeObserver; yang diamati tidak ikut berubah oleh hasilnya). Tanpa tata letak (jsdom, pra-render) → null: kelas
 * kartu memakai nilai em cadangan untuk isi contoh.
 */
export function useNoteSlot(box: RefObject<HTMLElement | null>): NoteSlot | null {
  const [slot, setSlot] = useState<NoteSlot | null>(null);

  // Tiap render (isi CMS berubah) dan saat ukuran mockup atau teks kartu berubah (huruf termuat, wadah melewati
  // breakpoint); nilai yang sama tidak menggambar ulang
  useLayoutEffect(() => {
    const el = box.current;
    const app = el?.querySelector<HTMLElement>('[data-pn-app]');
    const card = el?.querySelector<HTMLElement>('[data-pn-notif] > div');
    if (!el || !app || !card) return;
    const measure = () => {
      if (!el.offsetHeight) return;
      // Posisi tata letak relatif kotak HP: animasi naik masuk menggeser kotak & isinya bersama; pratinjau yang
      // diperkecil (zoom CSS atau transform) dibagi skalanya
      const base = el.getBoundingClientRect();
      const scale = Math.abs(base.height - el.offsetHeight) > 1 ? base.height / el.offsetHeight : 1;
      const y = (v: number) => (v - base.top) / scale;
      const shown = (n: Element) => n.getClientRects().length > 0;
      const blocks = Array.from(app.children).filter((n) => shown(n) && getComputedStyle(n).position !== 'absolute');
      const list = blocks.find((n) => n.hasAttribute('data-pn-list'));
      // Blok di atas panel (atau blok terakhir bila daftar kosong); tidak ada → bilah status
      const above = (list ? blocks[blocks.indexOf(list) - 1] : blocks.at(-1)) ?? app.previousElementSibling ?? app;
      const aboveBottom = y(above.getBoundingClientRect().bottom);
      const rowBottoms = list ? Array.from(list.querySelectorAll('li')).filter(shown).map((li) => y(li.getBoundingClientRect().bottom)) : [];
      // Baris terakhir sampai tepi bawah panel: padding bawah panel tidak boleh menyembul di bawah kartu
      if (list && rowBottoms.length) rowBottoms[rowBottoms.length - 1] = y(list.getBoundingClientRect().bottom);
      const pad = getComputedStyle(card);
      const next = noteSlot({
        // Tanpa daftar transaksi: kartu di bawah blok terakhir, berjarak seperti panel (mt 1,1em)
        listTop: list ? y(list.getBoundingClientRect().top) : aboveBottom + 1.1 * parseFloat(getComputedStyle(app).fontSize),
        aboveBottom,
        rowBottoms,
        // Isi kartu (ikon / teks) + padding; offsetHeight dibulatkan → +1px
        need: Math.max(...Array.from(card.children, (n) => (n as HTMLElement).offsetHeight)) + parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom) + 1,
      });
      setSlot((prev) => (prev && Math.abs(prev.top - next.top) < 0.05 && Math.abs(prev.height - next.height) < 0.05 ? prev : next));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(app);
    if (card.lastElementChild) observer.observe(card.lastElementChild);
    return () => observer.disconnect();
  });
  return slot;
}
