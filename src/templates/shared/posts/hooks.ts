// Hook tulisan untuk komponen template (baca SiteDataContext; tanpa Router).
// Fitur Berita & Pengumuman tidak aktif (postsEnabled false) = berita biasa: tulisan di konteks diabaikan, jadi section
// beranda selalu memakai item CMS tanpa tautan ke halaman tulisan (docs/platform/SITE-ADDONS-SPEC.md §6).
import { useMemo } from 'react';
import type { SiteContent } from '../../types';
import type { SitePostKind, SitePostSummary } from '../../../types/sitePosts';
import { useSiteData, type SitePostsByKind } from '../siteData';
import { usablePosts, withPostItems } from './model';

/** true di halaman selain beranda (/berita, /berita/{slug}, path tidak dikenal). */
export const useSubPage = (): boolean => useSiteData().route.kind !== 'home';

/** Fitur Berita & Pengumuman aktif: section profesional (shared/posts/pro) dan halaman tulisan. */
export const usePostsEnabled = (): boolean => useSiteData().postsEnabled === true;

const NO_POSTS: SitePostsByKind = { berita: null, pengumuman: null };

/** Tulisan per jenis yang boleh dipakai: fitur tidak aktif → tidak ada (item CMS). */
function useActivePosts(): SitePostsByKind {
  const { posts, postsEnabled } = useSiteData();
  return postsEnabled ? posts : NO_POSTS;
}

/** Tulisan terbit jenis ini dari konteks bila ada (array tidak kosong); null = pakai daftar dari konten CMS. */
export const useSitePosts = (kind: SitePostKind): SitePostSummary[] | null => usablePosts(useActivePosts()[kind]);

/** Konten dengan items section berita/pengumuman diganti tulisan dari konteks (lihat withPostItems). */
export function useContentWithPosts(content: SiteContent): SiteContent {
  const posts = useActivePosts();
  return useMemo(() => withPostItems(content, posts), [content, posts]);
}
