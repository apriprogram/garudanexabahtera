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

/** Query jenis tulisan: berita = bawaan (tanpa query), pengumuman = ?jenis=pengumuman. Breadcrumb ikut membacanya. */
const kindQuery = (kind: SitePostKind) => (kind === 'pengumuman' ? '?jenis=pengumuman' : '');

/** Daftar tulisan satu jenis: /akun/situs/1/berita (berita) atau /akun/situs/1/berita?jenis=pengumuman. */
export const postsListPath = (siteId: number, kind: SitePostKind) => `${siteLinks(siteId).posts}${kindQuery(kind)}`;

/** Editor tulisan baru jenis itu. */
export const newPostPath = (siteId: number, kind: SitePostKind) => `${siteLinks(siteId).posts}/baru${kindQuery(kind)}`;

/** Editor tulisan yang sudah ada; jenisnya ikut di query agar breadcrumb kembali ke tab daftar yang sama. */
export const editPostPath = (siteId: number, postId: number, kind: SitePostKind) => `${siteLinks(siteId).posts}/${postId}${kindQuery(kind)}`;
