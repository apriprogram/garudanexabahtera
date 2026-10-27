// Berita & pengumuman (tabel site_posts) untuk template sekolah: komponen & helper bersama
// (docs/platform/SITE-POSTS-SEO-SPEC.md §7). Data datang lewat SiteDataContext (../siteData.ts), disediakan SiteRenderer:
// CustomerSite (domain pembeli) dan SitePreview (/situs/:id). Demo & pratinjau CMS tidak punya tulisan → beranda dengan
// daftar dari konten CMS, persis seperti sebelumnya.
//
// CARA MEMAKAI DI TEMPLATE SEKOLAH BARU (contoh lengkap: ../../madani/Madani.tsx, ../../cakrawala/Cakrawala.tsx, dan
// ../../bestari/Bestari.tsx)
// 1. Daftarkan fiturnya: `features: { posts: true }` di index.ts template, POST_TEMPLATE_CODES (src/templates/
//    postTemplates.ts), SP_POST_TEMPLATE_CODES (backend/modules/site_posts.php), POST_TEMPLATE_CODES (site_posts.js), lalu
//    perbarui backend/modules/site_defaults.json (UPDATE_SITE_DEFAULTS=1, spec §6).
// 2. Komponen utama template:
//      const sub = useSubPage();                          // /berita, /berita/{slug}, path tak dikenal
//      const m = readXxx(useContentWithPosts(content));   // items `news`/`announcements` = tulisan terbit bila ada
//      <TemplateShell …>
//        <Header m={m} overlay={!sub && heroOn} />
//        <main>{sub ? <PostPage siteName={m.companyName} theme={XXX_POST_THEME} /> : <>…section beranda…</>}</main>
//        {isEnabled(m.footer) && <Footer m={m} />}
//      </TemplateShell>
//    Tautan section di header/footer otomatis menuju "basePath/#anchor" di halaman selain beranda (ActionLink).
//    Halaman selain beranda tidak punya section: footer yang ber-data-tpl-section (tujuan "#footer", mis. Bestari)
//    melepas atribut itu dan id-nya saat useSubPage() (../../bestari/Footer.tsx).
// 3. Tema halaman tulisan dari token template: `export const XXX_POST_THEME = postTheme({ heading, accent, chip, … })`
//    (./theme.ts; yang tidak diisi memakai bawaan --tpl-accent*).
// 4. Kartu beranda: item ber-`POST_PATH_KEY` = tulisan → judul & "Baca selengkapnya" berupa <SiteLink path={…}> (bukan
//    buka di tempat atau tautan keluar). Tanpa kunci itu = item CMS, perilaku lama. Tombol "Lihat semua berita":
//    `useSitePosts('berita') ? { kind: 'site', path: '/berita' } : null` ke tombol template (LinkAction 'site').
// 5. Kunci section `news` / `announcements` / `agenda` sudah ber-anchor "#berita" / "#pengumuman" / "#agenda".
// 6. Fitur berbayar (docs/platform/SITE-ADDONS-SPEC.md §6): `usePostsEnabled()` false = berita biasa (hook di atas
//    mengabaikan tulisan, section template dari item CMS); true = section profesional dari ./pro (ProNewsSection,
//    ProAnnouncementsSection) menggantikan section berita & bagian pengumuman template.
// Template TIDAK boleh memakai useLocation/useParams (tes merender tanpa Router): rute & navigasi hanya dari konteks.
export {
  POST_KIND_LABEL,
  POST_PATH_KEY,
  POST_SECTIONS,
  isUrgentBadge,
  postCanonicalUrl,
  postDate,
  postImageAlt,
  postItem,
  postLinkTarget,
  postParagraphs,
  postReadingMinutes,
  postShareLinks,
  relatedPosts,
  usablePosts,
  withPostItems,
} from './model';
export type { PostDate, PostLinkTarget } from './model';
export { DEFAULT_POST_THEME, postTheme } from './theme';
export type { PostTheme } from './theme';
export { AnnouncementCard, NewsCard, PostCard } from './PostCard';
export { POST_LIST_STEP, PostList } from './PostList';
export { PostArticle, PostArticleSkeleton } from './PostArticle';
export { PostShare } from './PostShare';
export { PostNotFound } from './PostNotFound';
export { PostPage } from './PostPage';
export { useContentWithPosts, usePostsEnabled, useSitePosts, useSubPage } from './hooks';
export { Breadcrumb, PostChip, PostDateText, PostImage } from './parts';
export { SiteLink } from '../SiteLink';
export { SITE_DATA_DEFAULT, SiteDataContext, siteHref, useSiteData } from '../siteData';
export type { SiteData, SitePostsByKind } from '../siteData';
