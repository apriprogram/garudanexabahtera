// Isi halaman selain beranda menurut rute di SiteDataContext: daftar, tulisan (memuat / tidak ditemukan / gagal), atau
// tidak ditemukan. Template merender header (tanpa overlay hero) + <main><PostPage/></main> + footer miliknya.
import { CONTAINER } from '../layout';
import { useSiteData } from '../siteData';
import { LoadError } from './parts';
import { PostArticle, PostArticleSkeleton } from './PostArticle';
import { PostList } from './PostList';
import { PostNotFound } from './PostNotFound';
import type { PostTheme } from './theme';

export function PostPage({ siteName, theme }: { siteName: string; theme: PostTheme }) {
  const { route, post, error } = useSiteData();
  let page;
  if (route.kind === 'list') page = <PostList kind={route.postKind} siteName={siteName} theme={theme} />;
  else if (route.kind === 'post') {
    // Tulisan lain (mis. tulisan sebelumnya saat pindah halaman) = belum dimuat
    const current = post && post.kind === route.postKind && post.slug === route.slug ? post : post === null ? null : undefined;
    if (current) page = <PostArticle post={current} theme={theme} />;
    else if (current === null) page = <PostNotFound kind={route.postKind} theme={theme} />;
    else if (error) page = <LoadError message={error.message} retry={error.retry} theme={theme} />;
    else page = <PostArticleSkeleton theme={theme} />;
  } else if (route.kind === 'notfound') page = <PostNotFound theme={theme} />;
  else return null;
  return <div className={`${CONTAINER} pb-16 pt-7 @3xl:pb-24 @3xl:pt-10`}>{page}</div>;
}
