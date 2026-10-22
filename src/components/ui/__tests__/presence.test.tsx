// <Presence>: pengganti ringan AnimatePresence untuk panel melayang publik (WP7, tanpa framer-motion di bundel awal).
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Presence } from '../Presence';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const panel = (show: boolean) => (
  <Presence show={show} hiddenClassName="opacity-0" exitMs={180} className="panel" role="menu">
    <button type="button">Pilihan</button>
  </Presence>
);

describe('Presence', () => {
  it('tertutup = tidak dirender', () => {
    const { container } = render(panel(false));
    expect(container.innerHTML).toBe('');
  });

  it('dibuka: langsung dipasang dalam keadaan tersembunyi, dua frame kemudian tampil', () => {
    const { container, rerender } = render(panel(false));
    rerender(panel(true));
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    expect(menu.className).toBe('panel opacity-0');
    expect(menu.querySelector('button')).not.toBeNull(); // bisa langsung difokus
    act(() => {
      vi.advanceTimersToNextFrame();
      vi.advanceTimersToNextFrame();
    });
    expect(menu.className).toBe('panel');
  });

  it('ditutup: tersembunyi seketika, dilepas setelah exitMs; dibuka lagi sebelum itu = tetap terpasang', () => {
    const { container, rerender } = render(panel(true));
    expect(container.querySelector('[role="menu"]')?.className).toBe('panel');
    rerender(panel(false));
    expect(container.querySelector('[role="menu"]')?.className).toBe('panel opacity-0');
    act(() => vi.advanceTimersByTime(100));
    rerender(panel(true));
    act(() => vi.advanceTimersByTime(500));
    expect(container.querySelector('[role="menu"]')?.className).toBe('panel');
    rerender(panel(false));
    act(() => vi.advanceTimersByTime(180));
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});
