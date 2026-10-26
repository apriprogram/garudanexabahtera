// Hook tulisan untuk komponen template (baca SiteDataContext; tanpa Router).
import { useMemo } from 'react';
import type { SiteContent } from '../../types';
import type { SitePostKind, SitePostSummary } from '../../../types/sitePosts';
import { useSiteData } from '../siteData';
import { usablePosts, withPostItems } from './model';

/** true di halaman selain beranda (/berita, /berita/{slug}, path tidak dikenal). */
export const useSubPage = (): boolean => useSiteData().route.kind !== 'home';

/** Tulisan terbit jenis ini dari konteks bila ada (array tidak kosong); null = pakai daftar dari konten CMS. */
export const useSitePosts = (kind: SitePostKind): SitePostSummary[] | null => usablePosts(useSiteData().posts[kind]);

/** Konten dengan items section berita/pengumuman diganti tulisan dari konteks (lihat withPostItems). */
export function useContentWithPosts(content: SiteContent): SiteContent {
  const { posts } = useSiteData();
  return useMemo(() => withPostItems(content, posts), [content, posts]);
}
