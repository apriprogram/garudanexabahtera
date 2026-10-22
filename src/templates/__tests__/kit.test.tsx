// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/kit.test.tsx
// Kit template baru (src/templates/kit): registry foto lokal + srcset, <KitPhoto>/<KitAvatar>, huruf judul lokal.
import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PhotoSetContext } from '../kit/context';
import { KIT_FONTS, useKitFont } from '../kit/fonts';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { definePhotos } from '../kit/photos';
import { templatePhoto } from '../shared/assets';

afterEach(cleanup);

const PHOTOS = definePhotos({
  scenes: [['uji-kit-hero', 1600, 1067, 'Lapangan padel biru di sore hari']],
  portraits: [['uji-kit-coach', 480, 480, 'Potret pelatih']],
});

describe('definePhotos', () => {
  it('path, srcset, ukuran, dan alt dari kunci', () => {
    expect(PHOTOS.src('uji-kit-hero')).toBe('/assets/templates/photos/uji-kit-hero-1600.webp');
    expect(PHOTOS.src('tidak-ada')).toBe('');
    expect(PHOTOS.keys).toEqual(['uji-kit-hero', 'uji-kit-coach']);
    const hero = PHOTOS.asset('/assets/templates/photos/uji-kit-hero-1600.webp');
    expect(hero).toMatchObject({ width: 1600, height: 1067, alt: 'Lapangan padel biru di sore hari' });
    expect(hero?.srcSet).toBe('/assets/templates/photos/uji-kit-hero-800.webp 800w, /assets/templates/photos/uji-kit-hero-1600.webp 1600w');
    expect(PHOTOS.asset(PHOTOS.src('uji-kit-coach'))?.srcSet).toContain('uji-kit-coach-240.webp 240w');
  });

  it('nilai konten tanpa "/" depan atau dengan ?query tetap dikenali; lainnya null', () => {
    expect(PHOTOS.asset('assets/templates/photos/uji-kit-hero-1600.webp?v=2')?.width).toBe(1600);
    expect(PHOTOS.asset('/assets/sites/1/unggahan.png')).toBeNull();
    expect(PHOTOS.asset('')).toBeNull();
    expect(PHOTOS.asset(null)).toBeNull();
    expect(PHOTOS.alt('/assets/sites/1/unggahan.png', 'Keterangan')).toBe('Keterangan');
  });

  it('registry bersama tetap dikenali lebih dulu', () => {
    const shared = templatePhoto('corporate-nexa-hero');
    expect(PHOTOS.asset(shared)?.srcSet).toContain('corporate-nexa-hero-800.webp 800w');
  });
});

describe('<KitPhoto> / <KitAvatar>', () => {
  it('foto demo dari konteks: srcset, sizes, width/height, lazy', () => {
    const { container } = render(
      <PhotoSetContext.Provider value={PHOTOS}>
        <KitPhoto src={PHOTOS.src('uji-kit-hero')} alt="Lapangan" sizes="50vw" className="aspect-[4/3]" />
      </PhotoSetContext.Provider>,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('srcset')).toContain('800w');
    expect(img.getAttribute('sizes')).toBe('50vw');
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('height')).toBe('1067');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('Lapangan');
  });

  it('priority = eager + fetchpriority high; prop photos mengalahkan konteks', () => {
    const { container } = render(<KitPhoto src={PHOTOS.src('uji-kit-hero')} alt="" priority photos={PHOTOS} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.getAttribute('srcset')).toContain('1600w');
  });

  it('gambar unggahan tanpa srcset; kosong → pengganti tint atau tidak dirender', () => {
    const upload = render(<KitPhoto src="/assets/sites/1/foto.jpg" alt="Foto" width={1200} height={800} />);
    const img = upload.container.querySelector('img')!;
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.getAttribute('width')).toBe('1200');
    upload.unmount();

    const tint = render(<KitPhoto src="" alt="Foto hero" />);
    expect(tint.container.querySelector('[role="img"][aria-label="Foto hero"]')).not.toBeNull();
    tint.unmount();

    const none = render(<KitPhoto src="javascript:alert(1)" alt="x" fallback="none" />);
    expect(none.container.innerHTML).toBe('');
  });

  it('avatar: srcset potret, inisial bila kosong', () => {
    const { container, rerender } = render(<KitAvatar name="Raka Putra" photo={PHOTOS.src('uji-kit-coach')} photos={PHOTOS} sizes="56px" />);
    expect(container.querySelector('img')?.getAttribute('srcset')).toContain('uji-kit-coach-240.webp 240w');
    rerender(<KitAvatar name="Raka Putra" photo="" />);
    expect(container.textContent).toBe('RP');
  });
});

describe('useKitFont', () => {
  it('memuat stylesheet sekali dan menimpa --tpl-font-display', () => {
    const first = renderHook(() => useKitFont(KIT_FONTS.urbanist));
    renderHook(() => useKitFont(KIT_FONTS.urbanist));
    expect(first.result.current).toEqual({ '--tpl-font-display': KIT_FONTS.urbanist.family });
    expect(document.querySelectorAll(`link#${KIT_FONTS.urbanist.id}`)).toHaveLength(1);
    expect(renderHook(() => useKitFont(undefined)).result.current).toEqual({});
  });
});
