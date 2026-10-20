// Gulir halus ke section beranda dengan easing sendiri (port scroll.js BELAJAR CPNS): lebih "berbobot" daripada
// scroll-behavior bawaan, dibatalkan begitu pengguna menggulir sendiri, langsung lompat bila reduced motion.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// easeInOutQuint: mulai & berhenti halus, cepat di tengah
const ease = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

/** Interaksi yang menandakan pengguna mengambil alih gulir (membatalkan animasi / penjagaan posisi). */
const USER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

let cancelCurrent: (() => void) | null = null;

/**
 * Posisi elemen di dokumen menurut TATA LETAK (rantai offsetTop), bukan posisi visualnya. Jadi transform yang sedang
 * berjalan (animasi Reveal: translateY + scale, parallax hero) tidak menggeser target gulir.
 */
const layoutTop = (el: Element): number => {
  if (!(el instanceof HTMLElement)) return el.getBoundingClientRect().top + window.scrollY;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (parent) y += parent.clientTop;
    node = parent;
  }
  return y;
};

/** Posisi gulir agar elemen tepat di bawah navbar (menghormati `scroll-margin-top` elemen). */
const targetTop = (el: Element) => {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return Math.max(0, Math.round(layoutTop(el) - margin));
};

const findTarget = (id: string): Element | null => (id && id !== 'top' ? document.getElementById(id) : null);

/**
 * Gulir ke elemen ber-id `id` (`top` = puncak halaman). Mengembalikan false bila elemennya tidak ada di halaman ini.
 * Target dihitung ulang tiap frame, jadi tetap tepat walau tinggi konten di atasnya berubah selama animasi.
 */
export const scrollToSection = (id: string): boolean => {
  if (typeof window === 'undefined') return false;
  const el = findTarget(id);
  if (id !== 'top' && !el) return false;
  const goal = () => (el ? targetTop(el) : 0);

  cancelCurrent?.();
  const start = window.scrollY;
  const dist = goal() - start;
  if (prefersReducedMotion() || Math.abs(dist) < 2) {
    window.scrollTo({ top: goal(), behavior: 'instant' });
    return true;
  }

  const duration = Math.min(1100, Math.max(550, Math.abs(dist) * 0.45));
  let raf = 0;
  let t0 = 0;
  const stop = () => {
    cancelAnimationFrame(raf);
    USER_EVENTS.forEach((type) => window.removeEventListener(type, stop));
    cancelCurrent = null;
  };
  const step = (now: number) => {
    if (!t0) t0 = now;
    const p = Math.min(1, (now - t0) / duration);
    // 'instant' agar tidak bertumpuk dengan `scroll-behavior: smooth` di <html>
    window.scrollTo({ top: start + (goal() - start) * ease(p), behavior: 'instant' });
    if (p < 1) raf = requestAnimationFrame(step);
    else stop();
  };
  // Dipasang setelah klik yang memicu gulir ini selesai diproses, jadi pointerdown klik itu sendiri tidak membatalkan
  USER_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  cancelCurrent = stop;
  raf = requestAnimationFrame(step);
  return true;
};

/**
 * Datang ke beranda lewat `/#id` (dari halaman lain): lompat langsung ke section itu, lalu JAGA posisinya selama
 * konten di atasnya masih berubah tinggi (skeleton katalog → data, gambar dimuat). Berhenti begitu pengguna
 * menggulir / menyentuh / menekan tombol, atau setelah `maxMs`. Mengembalikan fungsi pembersih (untuk useEffect).
 */
export const holdSectionInView = (id: string, maxMs = 4000): (() => void) => {
  if (typeof window === 'undefined' || !findTarget(id)) return () => undefined;

  cancelCurrent?.();
  let done = false;
  const align = () => {
    const el = findTarget(id);
    if (!el || done) return;
    const top = targetTop(el);
    if (Math.abs(window.scrollY - top) >= 1) window.scrollTo({ top, behavior: 'instant' });
  };

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(align) : null;
  const timer = window.setTimeout(() => stop(), maxMs);
  function stop() {
    if (done) return;
    done = true;
    observer?.disconnect();
    window.clearTimeout(timer);
    USER_EVENTS.forEach((type) => window.removeEventListener(type, stop));
  }

  align();
  // Tinggi <body> berubah setiap kali konten mana pun memuai / menyusut
  observer?.observe(document.body);
  USER_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  return stop;
};
