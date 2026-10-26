// Halaman daftar /berita atau /pengumuman: remah roti, H1, kalimat pembuka (sama dengan meta description, siteSeo.ts),
// jumlah tulisan, lalu kartu (berita: grid foto 1 → 2 → 3 kolom; pengumuman: baris 1 → 2 kolom). Memuat → kerangka;
// gagal → pesan + Coba lagi; kosong → ajakan kembali ke beranda.
import { Home, Megaphone, Newspaper } from 'lucide-react';
import { SiteLink } from '../SiteLink';
import { useSiteData } from '../siteData';
import type { SitePostKind } from '../../../types/sitePosts';
import { POST_KIND_LABEL } from './model';
import { AnnouncementCard, NewsCard } from './PostCard';
import { Breadcrumb, LoadError, PAGE_H1, Skeleton, StatusBlock } from './parts';
import type { PostTheme } from './theme';

const LEAD: Record<SitePostKind, (siteName: string) => string> = {
  berita: (siteName) => `Berita terbaru dari ${siteName}.`,
  pengumuman: (siteName) => `Pengumuman resmi dari ${siteName}.`,
};

const GRID: Record<SitePostKind, string> = {
  berita: 'grid gap-x-5 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-x-6',
  pengumuman: 'grid gap-3 @5xl:grid-cols-2 @5xl:gap-4',
};

function ListSkeleton({ kind, theme }: { kind: SitePostKind; theme: PostTheme }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Memuat {kind}…</span>
      <div className={GRID[kind]}>
        {[0, 1, 2].map((i) =>
          kind === 'berita' ? (
            <div key={i}>
              <Skeleton theme={theme} className={`aspect-[4/3] ${theme.photoRadius}`} />
              <Skeleton theme={theme} className="mt-4 h-4 w-1/3 rounded-full" />
              <Skeleton theme={theme} className="mt-3 h-5 w-4/5 rounded-full" />
            </div>
          ) : (
            <Skeleton key={i} theme={theme} className={`h-[108px] ${theme.radius}`} />
          ),
        )}
      </div>
    </div>
  );
}

export function PostList({ kind, siteName, theme }: { kind: SitePostKind; siteName: string; theme: PostTheme }) {
  const { posts: byKind, total, error } = useSiteData();
  const posts = byKind[kind];
  const label = POST_KIND_LABEL[kind];
  const count = posts ? Math.max(total ?? posts.length, posts.length) : 0;
  const Icon = kind === 'berita' ? Newspaper : Megaphone;

  let body;
  if (!posts && error) body = <LoadError message={error.message} retry={error.retry} theme={theme} />;
  else if (!posts) body = <ListSkeleton kind={kind} theme={theme} />;
  else if (posts.length === 0) {
    body = (
      <StatusBlock
        theme={theme}
        icon={<Icon className="h-6 w-6" />}
        title={`Belum ada ${kind} yang diterbitkan`}
        actions={
          <SiteLink path="/" className={theme.button}>
            <Home aria-hidden className="h-4 w-4" />
            Ke beranda
          </SiteLink>
        }
      >
        {kind === 'berita' ? 'Kabar terbaru dari sekolah akan tampil di sini.' : 'Pengumuman resmi dari sekolah akan tampil di sini.'}
      </StatusBlock>
    );
  } else {
    body = (
      <ul className={GRID[kind]}>
        {posts.map((post) => (
          <li key={post.id} className="min-w-0">
            {kind === 'berita' ? <NewsCard post={post} theme={theme} /> : <AnnouncementCard post={post} theme={theme} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div data-site-page="list">
      <Breadcrumb theme={theme} items={[{ label: 'Beranda', path: '/' }, { label }]} />
      <header className={`mt-5 flex flex-col gap-3 border-b pb-8 @3xl:mt-7 @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:gap-10 @3xl:pb-10 ${theme.line}`}>
        <div className="min-w-0">
          <h1 className={`${PAGE_H1} ${theme.display} ${theme.heading}`}>{label}</h1>
          <p className={`mt-3 max-w-[56ch] text-[15.5px] leading-relaxed @3xl:text-[17px] ${theme.muted}`}>{LEAD[kind](siteName)}</p>
        </div>
        {count > 0 && (
          <p className={`shrink-0 text-[14px] font-medium ${theme.muted}`}>
            {count} {kind}
          </p>
        )}
      </header>
      <div className="mt-8 @3xl:mt-10">{body}</div>
    </div>
  );
}
