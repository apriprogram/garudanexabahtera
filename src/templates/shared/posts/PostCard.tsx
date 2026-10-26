// Kartu tulisan untuk halaman daftar dan "tulisan lainnya": seluruh kartu bisa diklik lewat SATU tautan (judul, dengan
// lapisan ::after selebar kartu), jadi pembaca layar hanya mendengar judulnya dan Google melihat <a href> biasa.
// Berita: foto 4:3 (lazy, width/height) + chip kategori + tanggal + judul + ringkasan. Tanpa foto → kartu bidang lembut.
// Pengumuman: baris dengan ubin tanggal, label (merah lembut bila mendesak), judul, ringkasan.
import { ArrowRight } from 'lucide-react';
import { KitPhoto } from '../../kit/Photo';
import { postPath } from '../../siteRoutes';
import { hasImage } from '../utils';
import { SiteLink } from '../SiteLink';
import type { SitePostSummary } from '../../../types/sitePosts';
import { postDate, postImageAlt } from './model';
import { PostChip, PostDateText } from './parts';
import type { PostTheme } from './theme';

type Heading = 'h2' | 'h3';

/** Tautan judul selebar kartu; cincin fokus mengelilingi seluruh kartu. */
const STRETCH =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-current";

function MoreHint({ theme }: { theme: PostTheme }) {
  return (
    <span aria-hidden className={`mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold ${theme.accent}`}>
      Baca selengkapnya
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  );
}

export function NewsCard({ post, theme, as: H = 'h2' }: { post: SitePostSummary; theme: PostTheme; as?: Heading }) {
  const photo = hasImage(post.image);
  return (
    <article className={`group relative flex h-full min-w-0 flex-col ${photo ? '' : `p-5 @3xl:p-6 ${theme.radius} ${theme.soft}`}`}>
      {photo && (
        <KitPhoto
          src={post.image ?? ''}
          alt={postImageAlt(post)}
          width={1200}
          height={900}
          sizes="(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw"
          className={`aspect-[4/3] ${theme.photoRadius}`}
          imgClassName="transition-[scale] duration-500 group-hover:scale-[1.03]"
        />
      )}
      {(post.category || post.published_at) && (
        <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-medium ${theme.muted} ${photo ? 'mt-4' : ''}`}>
          <PostChip label={post.category} theme={theme} />
          <PostDateText value={post.published_at} />
        </p>
      )}
      <H className={`mt-3 text-[18px] leading-snug tracking-[-0.01em] @3xl:text-[19px] ${theme.display} ${theme.heading}`}>
        <SiteLink path={postPath(post.kind, post.slug)} className={`${STRETCH} decoration-current/40 underline-offset-4 group-hover:underline`}>
          {post.title}
        </SiteLink>
      </H>
      {post.excerpt && <p className={`mt-2 line-clamp-3 text-[14.5px] leading-relaxed ${theme.muted}`}>{post.excerpt}</p>}
      <MoreHint theme={theme} />
    </article>
  );
}

export function AnnouncementCard({ post, theme, as: H = 'h2' }: { post: SitePostSummary; theme: PostTheme; as?: Heading }) {
  const date = postDate(post.published_at);
  return (
    <article className={`group relative flex h-full gap-4 p-4 transition-colors @3xl:gap-5 @3xl:p-5 ${theme.radius} ${theme.card}`}>
      {date && (
        <time
          dateTime={date.iso}
          className={`flex h-[68px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[16px] ${theme.soft} ${theme.heading}`}
        >
          <span className={`${theme.display} text-[24px] leading-none tabular-nums`}>{date.day}</span>
          <span className={`mt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${theme.muted}`}>
            {date.monthShort} {date.year.slice(2)}
          </span>
        </time>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {post.badge && (
          <div className="mb-1.5">
            <PostChip label={post.badge} badge theme={theme} />
          </div>
        )}
        <H className={`text-[16.5px] font-semibold leading-snug ${theme.heading}`}>
          <SiteLink path={postPath(post.kind, post.slug)} className={`${STRETCH} decoration-current/40 underline-offset-4 group-hover:underline`}>
            {post.title}
          </SiteLink>
        </H>
        {post.excerpt && <p className={`mt-1 line-clamp-3 text-[14.5px] leading-relaxed ${theme.muted}`}>{post.excerpt}</p>}
        <MoreHint theme={theme} />
      </div>
    </article>
  );
}

/** Kartu sesuai jenis tulisan. */
export function PostCard({ post, theme, as = 'h2' }: { post: SitePostSummary; theme: PostTheme; as?: Heading }) {
  return post.kind === 'pengumuman' ? <AnnouncementCard post={post} theme={theme} as={as} /> : <NewsCard post={post} theme={theme} as={as} />;
}
