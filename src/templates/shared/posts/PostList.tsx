// Halaman daftar /berita atau /pengumuman: remah roti, H1, kalimat pembuka (sama dengan meta description, siteSeo.ts),
// jumlah tulisan, lalu pencarian judul + filter kategori (berita) / label (pengumuman) dan kartu (berita: grid foto
// 1 → 2 → 3 kolom; pengumuman: baris 1 → 2 kolom), 12 per langkah dengan "Muat lebih banyak" (dari ≤100 tulisan yang
// dimuat; docs/platform/SITE-ADDONS-SPEC.md §6). Memuat → kerangka; gagal → pesan + Coba lagi; kosong → ajakan kembali ke
// beranda; tidak ada yang cocok → hapus pencarian.
import { Home, Megaphone, Newspaper, Search, SearchX } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { SiteLink } from '../SiteLink';
import { useSiteData } from '../siteData';
import type { SitePostKind, SitePostSummary } from '../../../types/sitePosts';
import { POST_KIND_LABEL } from './model';
import { AnnouncementCard, NewsCard } from './PostCard';
import { Breadcrumb, LoadError, PAGE_H1, Skeleton, StatusBlock } from './parts';
import { matchesTag, tagKey, uniqueTags } from './pro/model';
import { TagFilter } from './pro/parts';
import type { PostTheme } from './theme';

/** Kartu per langkah "Muat lebih banyak". */
export const POST_LIST_STEP = 12;

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

/** Kategori (berita) atau label (pengumuman) untuk filter. */
const tagOf = (post: SitePostSummary) => (post.kind === 'pengumuman' ? post.badge : post.category);

/**
 * Pencarian judul, filter, dan "Muat lebih banyak" di atas tulisan yang sudah dimuat. Setelah memuat lagi, fokus pindah
 * ke kartu pertama yang baru tampil (tombolnya bisa hilang saat semua sudah tampil).
 */
function PostBrowser({ posts, kind, theme }: { posts: SitePostSummary[]; kind: SitePostKind; theme: PostTheme }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [limit, setLimit] = useState(POST_LIST_STEP);
  const focusFrom = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchId = useId();
  const tags = uniqueTags(posts.map(tagOf));
  const active = tag !== null && tags.some((t) => tagKey(t) === tagKey(tag)) ? tag : null;
  const words = tagKey(query);
  const matches = posts.filter((post) => matchesTag(tagOf(post), active) && (!words || tagKey(post.title).includes(words)));
  const shown = matches.slice(0, limit);
  const filtered = words !== '' || active !== null;

  useEffect(() => {
    const from = focusFrom.current;
    if (from === null) return;
    focusFrom.current = null;
    listRef.current?.querySelectorAll<HTMLElement>(':scope > li')[from]?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [limit]);

  const search = (value: string) => {
    setQuery(value);
    setLimit(POST_LIST_STEP);
  };
  const choose = (value: string | null) => {
    setTag(value);
    setLimit(POST_LIST_STEP);
  };
  const reset = () => {
    search('');
    setTag(null);
  };
  const more = () => {
    focusFrom.current = shown.length;
    setLimit((n) => n + POST_LIST_STEP);
  };

  return (
    <>
      {posts.length > 1 && (
        <div className="mb-8 flex flex-col gap-4 @3xl:mb-10 @4xl:flex-row @4xl:items-center @4xl:justify-between">
          <div role="search" className="relative w-full @4xl:max-w-[380px] @4xl:shrink-0">
            <label htmlFor={searchId} className="sr-only">
              Cari judul {kind}
            </label>
            <Search aria-hidden className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${theme.muted}`} />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder={`Cari judul ${kind}`}
              autoComplete="off"
              enterKeyHint="search"
              className={`h-12 w-full rounded-full bg-white pl-11 pr-4 text-[16px] ring-1 ring-inset ring-black/[0.14] placeholder:text-[#6B7180] ${theme.heading}`}
            />
          </div>
          <TagFilter
            tags={tags}
            value={active}
            onChange={choose}
            label={kind === 'berita' ? 'Saring berita menurut kategori' : 'Saring pengumuman menurut label'}
            theme={theme}
          />
        </div>
      )}
      <p role="status" className={`mb-6 text-[14px] ${theme.muted} ${filtered || matches.length > shown.length ? '' : 'sr-only'}`}>
        {matches.length === 0 ? '' : `Menampilkan ${shown.length} dari ${matches.length} ${kind}${filtered ? ' yang cocok' : ''}`}
      </p>
      {matches.length === 0 ? (
        <StatusBlock
          theme={theme}
          icon={<SearchX className="h-6 w-6" />}
          title={`Tidak ada ${kind} yang cocok`}
          actions={
            <button type="button" onClick={reset} className={theme.buttonGhost}>
              Hapus pencarian
            </button>
          }
        >
          Coba kata lain, atau tampilkan semua {kind}.
        </StatusBlock>
      ) : (
        <ul ref={listRef} className={GRID[kind]}>
          {shown.map((post) => (
            <li key={post.id} className="min-w-0">
              {kind === 'berita' ? <NewsCard post={post} theme={theme} /> : <AnnouncementCard post={post} theme={theme} />}
            </li>
          ))}
        </ul>
      )}
      {matches.length > shown.length && (
        <div className="mt-10 flex justify-center @3xl:mt-12">
          <button type="button" onClick={more} className={theme.buttonGhost}>
            Muat lebih banyak
          </button>
        </div>
      )}
    </>
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
    // key: pencarian & filter mulai dari awal saat berganti jenis (/berita → /pengumuman)
    body = <PostBrowser key={kind} posts={posts} kind={kind} theme={theme} />;
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
