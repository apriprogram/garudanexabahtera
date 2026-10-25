// Alamat halaman per situs di panel akun dan kemampuan template (berita & pengumuman). Dipakai SiteNav, SiteEditor,
// halaman Berita & Pengumuman, dan halaman SEO (docs/platform/SITE-POSTS-SEO-SPEC.md §8).
import { getTemplate } from '../../../templates';
import type { SitePostKind } from '../../../types/sitePosts';

/** Template situs ini punya fitur berita & pengumuman (TemplateDefinition.features.posts, tabel site_posts). */
export const hasPostsFeature = (templateCode: string | null | undefined): boolean => getTemplate(templateCode)?.features?.posts === true;

/** Alamat halaman per situs di panel akun. */
export const siteLinks = (siteId: number) => ({
  content: `/akun/situs/${siteId}`,
  posts: `/akun/situs/${siteId}/berita`,
  seo: `/akun/situs/${siteId}/seo`,
});

/** Daftar tulisan satu jenis: /akun/situs/1/berita (berita) atau /akun/situs/1/berita?jenis=pengumuman. */
export const postsListPath = (siteId: number, kind: SitePostKind) =>
  kind === 'pengumuman' ? `${siteLinks(siteId).posts}?jenis=pengumuman` : siteLinks(siteId).posts;

/** Editor tulisan baru jenis itu. */
export const newPostPath = (siteId: number, kind: SitePostKind) =>
  `${siteLinks(siteId).posts}/baru${kind === 'pengumuman' ? '?jenis=pengumuman' : ''}`;

/** Editor tulisan yang sudah ada. */
export const editPostPath = (siteId: number, postId: number) => `${siteLinks(siteId).posts}/${postId}`;
