// Pemuat data halaman Berita & Pengumuman (dipakai useSiteLoader, jadi fungsi tingkat modul yang stabil).
import { ApiError, apiGet } from '../../../lib/api';
import { SITE_POST_LIMITS, type SitePostAdmin, type SiteSeoResponse } from '../../../types/sitePosts';

export interface PostsData {
  posts: SitePostAdmin[];
  /** Batas tulisan per situs dari server (limits.max_posts) */
  maxPosts: number;
}

/** Semua tulisan situs (draf juga). null = template tanpa fitur tulisan (403 POSTS_UNAVAILABLE). */
export async function fetchPosts(siteId: number): Promise<PostsData | null> {
  try {
    const res = await apiGet<{ posts?: SitePostAdmin[]; limits?: { max_posts?: number } }>('customer_get_site_posts', { site_id: siteId });
    const max = Number(res.limits?.max_posts);
    return {
      posts: Array.isArray(res.posts) ? res.posts : [],
      maxPosts: Number.isFinite(max) && max > 0 ? max : SITE_POST_LIMITS.maxPostsPerSite,
    };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'POSTS_UNAVAILABLE') return null;
    throw err;
  }
}

export interface EditorData {
  posts: PostsData | null;
  /** Pengaturan & status SEO situs (peringatan "situs belum tampil di Google"); null = gagal dimuat, tidak wajib */
  seo: SiteSeoResponse | null;
}

/** Editor tulisan: daftar tulisan (cari tulisan & slug yang sudah dipakai) + status SEO situs, paralel. */
export async function fetchEditorData(siteId: number): Promise<EditorData> {
  const [posts, seo] = await Promise.all([
    fetchPosts(siteId),
    apiGet<SiteSeoResponse>('customer_get_site_seo', { site_id: siteId }).catch(() => null),
  ]);
  return { posts, seo };
}
