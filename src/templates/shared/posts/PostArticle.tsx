// Halaman satu tulisan /berita/{slug} atau /pengumuman/{slug}: remah roti, chip kategori/label + tanggal (<time>), H1,
// ringkasan, foto utama (dimuat segera), isi (teks biasa, paragraf dipisah baris kosong, TIDAK pernah HTML), tautan
// tambahan, tombol kembali, lalu maks. 3 tulisan lain jenis yang sama (bila daftarnya sudah dimuat).
import { ArrowLeft, ArrowUpRight, Home } from 'lucide-react';
import { useId } from 'react';
import { SiteLink } from '../SiteLink';
import { useSiteData } from '../siteData';
import type { SitePostPublic } from '../../../types/sitePosts';
import { POST_KIND_LABEL, postImageAlt, postLinkTarget, postParagraphs, relatedPosts, type PostLinkTarget } from './model';
import { PostCard } from './PostCard';
import { Breadcrumb, PAGE_H1, PostChip, PostDateText, PostImage, Skeleton } from './parts';
import type { PostTheme } from './theme';

function ExtraLink({ target, theme }: { target: PostLinkTarget; theme: PostTheme }) {
  if (target.kind === 'external') {
    const web = /^https?:/i.test(target.href);
    return (
      <a href={target.href} target={web ? '_blank' : undefined} rel={web ? 'noopener noreferrer' : undefined} className={`${theme.button} max-w-full`}>
        <span className="truncate">Buka tautan · {target.label}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
      </a>
    );
  }
  return (
    <SiteLink path={target.kind === 'site' ? target.path : `/#${target.anchor}`} className={theme.button}>
      Buka tautan terkait
      <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
    </SiteLink>
  );
}

/** Kerangka saat tulisan dimuat (pindah halaman tanpa data preload). */
export function PostArticleSkeleton({ theme }: { theme: PostTheme }) {
  return (
    <div role="status" aria-live="polite" className="max-w-[760px]">
      <span className="sr-only">Memuat tulisan…</span>
      <Skeleton theme={theme} className="h-4 w-48 rounded-full" />
      <Skeleton theme={theme} className="mt-8 h-9 w-11/12 rounded-2xl" />
      <Skeleton theme={theme} className="mt-3 h-9 w-2/3 rounded-2xl" />
      <Skeleton theme={theme} className={`mt-8 aspect-[16/10] w-full ${theme.photoRadius}`} />
      <Skeleton theme={theme} className="mt-8 h-4 w-full rounded-full" />
      <Skeleton theme={theme} className="mt-3 h-4 w-5/6 rounded-full" />
    </div>
  );
}

export function PostArticle({ post, theme }: { post: SitePostPublic; theme: PostTheme }) {
  const { posts } = useSiteData();
  const relatedId = useId();
  const kind = post.kind;
  const label = POST_KIND_LABEL[kind];
  const listPath = `/${kind}`;
  const paragraphs = postParagraphs(post.body);
  const extra = postLinkTarget(post.link_url);
  const tag = kind === 'pengumuman' ? post.badge : post.category;
  const related = relatedPosts(posts[kind], post.slug);

  return (
    <div data-site-page="post">
      <article>
        <Breadcrumb
          theme={theme}
          items={[
            { label: 'Beranda', path: '/' },
            { label, path: listPath },
            { label: post.title },
          ]}
        />
        <header className="mt-6 max-w-[860px] @3xl:mt-8">
          {(tag || post.published_at) && (
            <p className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-medium ${theme.muted}`}>
              <PostChip label={tag} badge={kind === 'pengumuman'} theme={theme} />
              <PostDateText value={post.published_at} long />
            </p>
          )}
          <h1 className={`mt-4 ${PAGE_H1} ${theme.display} ${theme.heading}`}>{post.title}</h1>
          {post.excerpt && <p className={`mt-4 max-w-[64ch] text-pretty text-[16.5px] leading-relaxed @3xl:text-[18.5px] ${theme.muted}`}>{post.excerpt}</p>}
        </header>

        <div className="max-w-[1040px]">
          <PostImage src={post.image} alt={postImageAlt(post)} theme={theme} />
        </div>

        {paragraphs.length > 0 && (
          <div className={`mt-8 max-w-[70ch] space-y-5 text-[16px] leading-[1.8] @3xl:mt-10 @3xl:text-[17px] ${theme.body}`}>
            {paragraphs.map((p, i) => (
              // Baris baru tunggal di dalam paragraf (mis. daftar syarat) tetap terlihat
              <p key={i} className="whitespace-pre-line [overflow-wrap:anywhere]">
                {p}
              </p>
            ))}
          </div>
        )}

        {extra && (
          <div className="mt-8">
            <ExtraLink target={extra} theme={theme} />
          </div>
        )}

        <footer className={`mt-10 flex flex-col gap-2.5 border-t pt-6 @xl:flex-row @xl:flex-wrap @3xl:mt-12 ${theme.line}`}>
          <SiteLink path={listPath} className={theme.buttonGhost}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Semua {kind}
          </SiteLink>
          <SiteLink path="/" className={theme.buttonGhost}>
            <Home aria-hidden className="h-4 w-4" />
            Ke beranda
          </SiteLink>
        </footer>
      </article>

      {related.length > 0 && (
        <section aria-labelledby={relatedId} className={`mt-14 border-t pt-10 @3xl:mt-20 @3xl:pt-14 ${theme.line}`}>
          <h2 id={relatedId} className={`text-[22px] leading-tight tracking-[-0.02em] @3xl:text-[28px] ${theme.display} ${theme.heading}`}>
            {label} lainnya
          </h2>
          <ul className={`mt-6 grid gap-x-5 gap-y-8 @3xl:mt-8 ${kind === 'berita' ? '@2xl:grid-cols-2 @5xl:grid-cols-3' : 'gap-y-3 @5xl:grid-cols-3'}`}>
            {related.map((item) => (
              <li key={item.id} className="min-w-0">
                <PostCard post={item} theme={theme} as="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
