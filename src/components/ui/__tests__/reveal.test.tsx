// <Reveal> / <SplitText> aman untuk HTML prerender (docs/platform/SEO-PLAN.md §5.7, WP7): isi terlihat di HTML server
// dan render hidrasi, hanya bagian di bawah lipatan yang disembunyikan setelah dipasang, spasi antarkata asli.
import { act, render } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '../Reveal';
import { SplitText } from '../SplitText';

/** IntersectionObserver yang memanggil balik hanya saat tes memintanya. */
class ControlledObserver {
  static instances: ControlledObserver[] = [];
  readonly targets: Element[] = [];
  disconnected = false;
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    ControlledObserver.instances.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean, boundingClientRect = new DOMRect(0, 0, 0, 0)) {
    const target = this.targets[0];
    this.callback([{ isIntersecting, target, boundingClientRect } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const originalObserver = window.IntersectionObserver;
const fireAll = (isIntersecting: boolean) =>
  act(() => {
    for (const io of ControlledObserver.instances) if (!io.disconnected) io.fire(isIntersecting);
  });

// Ditimpa langsung (bukan vi.spyOn): matchMedia dari setup.ts sudah berupa vi.fn, dan restoreAllMocks akan
// mengosongkan implementasinya untuk tes berikutnya
const originalMatchMedia = window.matchMedia;
const reducedMotion = () => {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
};

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeEach(() => {
  ControlledObserver.instances = [];
  window.IntersectionObserver = ControlledObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  window.IntersectionObserver = originalObserver;
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

const TITLE = [{ text: 'Website profesional,' }, { text: 'siap online tanpa ribet.', className: 'text-primary' }];

/** HTML server lalu hydrateRoot; mengembalikan masalah hidrasi yang dilaporkan React. */
function hydrate(ui: React.ReactElement) {
  const html = renderToString(ui);
  container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const problems: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args.map(String).join(' ')));
  act(() => {
    root = hydrateRoot(container!, ui, { onRecoverableError: (error) => problems.push(String(error)) });
  });
  return { html, problems, el: container };
}

describe('SplitText', () => {
  it('HTML server: kata terlihat (tanpa is-hidden) dan dipisah spasi asli', () => {
    const html = renderToString(<SplitText as="h1" id="hero-title" parts={TITLE} />);
    expect(html).toMatch(/^<h1 id="hero-title" class="split"/);
    expect(html).not.toContain('is-hidden');
    const el = document.createElement('div');
    el.innerHTML = html;
    expect(el.textContent?.trim()).toBe('Website profesional, siap online tanpa ribet.');
    // node teks spasi di antara span kata, bukan hanya jarak CSS
    expect(html).toMatch(/<\/span><\/span> <span class="split-word">/);
  });

  it('panel tidak aktif tetap tersembunyi di HTML server, teksnya tetap ada', () => {
    const html = renderToString(<SplitText as="p" parts="Website & aplikasi custom" active={false} />);
    expect(html).toContain('class="split is-hidden"');
    expect(html).toContain('aplikasi');
  });

  it('hidrasi: sama dengan server; judul yang sudah di layar tetap diam', () => {
    const { problems, el } = hydrate(<SplitText as="h1" parts={TITLE} />);
    expect(problems).toEqual([]);
    expect(ControlledObserver.instances).toHaveLength(1);
    fireAll(true);
    expect(el.querySelector('h1')?.className).toBe('split');
    expect(ControlledObserver.instances[0].disconnected).toBe(true);
  });

  it('hidrasi: judul di bawah lipatan disembunyikan setelah dipasang lalu muncul saat digulir', () => {
    const { problems, el } = hydrate(<SplitText as="h2" parts="Cara kerja kami" />);
    expect(problems).toEqual([]);
    expect(el.querySelector('h2')?.className).toBe('split');
    fireAll(false); // panggilan pertama: belum terlihat (jsdom: ukuran 0 = tidak di layar)
    expect(el.querySelector('h2')?.className).toBe('split is-hidden');
    fireAll(true);
    expect(el.querySelector('h2')?.className).toBe('split');
  });

  it('dipasang di klien (navigasi / tab yang diaktifkan): langsung tersembunyi lalu beranimasi masuk', () => {
    const { container: el } = render(<SplitText as="p" parts="Konsultasi gratis" />);
    expect(el.querySelector('p')?.className).toBe('split is-hidden');
    fireAll(true);
    expect(el.querySelector('p')?.className).toBe('split');
  });

  it('reduced motion: tidak pernah disembunyikan', () => {
    reducedMotion();
    const { container: el } = render(<SplitText as="p" parts="Konsultasi gratis" />);
    expect(el.querySelector('p')?.className).toBe('split');
    expect(ControlledObserver.instances).toHaveLength(0);
  });
});

describe('Reveal', () => {
  it('HTML server: terlihat (hanya kelas reveal), tanpa is-armed', () => {
    const html = renderToString(
      <Reveal variant="scale" delay={0.25}>
        <p>Isi</p>
      </Reveal>,
    );
    expect(html).toContain('class="reveal"');
    expect(html).not.toMatch(/is-armed|is-in/);
  });

  it('hidrasi di atas lipatan: tetap diam; pita bawah rootMargin juga dianggap sudah terlihat', () => {
    const { problems, el } = hydrate(
      <Reveal>
        <p>Isi</p>
      </Reveal>,
    );
    expect(problems).toEqual([]);
    const box = el.querySelector('.reveal') as HTMLElement;
    expect(ControlledObserver.instances).toHaveLength(1);
    // 20px teratasnya sudah di layar, tetapi belum melewati rootMargin -8%
    act(() => ControlledObserver.instances[0].fire(false, new DOMRect(0, window.innerHeight - 20, 300, 220)));
    expect(box.className).toBe('reveal');
    expect(ControlledObserver.instances[0].disconnected).toBe(true);
  });

  it('hidrasi di bawah lipatan: is-armed lalu is-in saat masuk viewport', () => {
    const { el } = hydrate(
      <Reveal>
        <p>Isi</p>
      </Reveal>,
    );
    const box = el.querySelector('.reveal') as HTMLElement;
    fireAll(false);
    expect(box.className).toBe('reveal is-armed');
    fireAll(true);
    expect(box.className).toBe('reveal is-in');
  });
});
