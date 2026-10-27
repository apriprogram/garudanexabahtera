// Section berita & pengumuman profesional untuk template sekolah dengan fitur Berita & Pengumuman aktif
// (SiteData.postsEnabled, docs/platform/SITE-ADDONS-SPEC.md §6). Fitur tidak aktif = section template sendiri dari item
// CMS (berita biasa).
//
// CARA MEMAKAI (contoh: ../../../madani/News.tsx & Board.tsx, ../../../cakrawala/News.tsx, ../../../bestari/News.tsx):
//   const pro = usePostsEnabled();
//   if (pro) return (
//     <ProNewsSection section={m.news} theme={XXX_POST_THEME} className={SECTION_PAD}
//       head={(filters) => <SectionHead title={text(news, 'title') || 'Berita terbaru'} aside={filters} />} />
//   );
//   <ProAnnouncementsSection section={m.announcements} theme={XXX_POST_THEME} head={<Head … />} className="…kolom…" />
// `section` = section yang sudah digabung useContentWithPosts (tulisan bila ada, kalau tidak item CMS). Judul section
// tetap milik template dan wajib berisi satu H2 (beri judul cadangan bila CMS kosong).
export { ProAnnouncementsSection } from './ProAnnouncementsSection';
export { ProNewsSection } from './ProNewsSection';
export { badgeTone, hasPostLinks, matchesTag, proDate, proItems, tagKey, uniqueTags } from './model';
export type { ProItem } from './model';
