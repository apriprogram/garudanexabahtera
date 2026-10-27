// Editor satu berita / pengumuman (/akun/situs/:siteId/berita/:postId; "baru" = tulisan baru, jenisnya dari
// ?jenis=pengumuman, bawaan berita), docs/platform/SITE-POSTS-SEO-SPEC.md §8. Halaman ini memuat situs + semua
// tulisannya (tidak ada aksi ambil-satu-tulisan untuk pembeli), lalu merender PostForm. Setelah tulisan baru pertama kali
// tersimpan, URL diganti ke id barunya tanpa memasang ulang form (isian & toast tetap).
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import type { SitePostAdmin } from '../../../types/sitePosts';
import { EditorLoadError, EditorNotFound } from '../cms/EditorStates';
import { postsLocked } from '../components/addons';
import { useDocumentTitle } from '../components/payment';
import { EmptyState, Skeleton } from '../components/States';
import { KIND_COPY, kindFromQuery, upsertPost } from './postModel';
import { PostForm } from './PostForm';
import { POSTS_LOCKED, fetchEditorData } from './postsApi';
import { editPostPath, hasPostsFeature, postsListPath } from './siteLinks';
import { PageContainer, PostsLocked, PostsUnavailable, SitePageHeader } from './SitePage';
import { parseSiteId, useSiteLoader } from './useSiteLoader';

const LOAD_ERROR = 'Tulisan gagal dimuat. Silakan coba lagi.';

export default function SitePostEditor() {
  const { siteId: rawSite, postId: rawPost } = useParams();
  const siteId = parseSiteId(rawSite);
  const isNew = rawPost === 'baru';
  const postId = !isNew && /^\d+$/.test(rawPost ?? '') ? Number(rawPost) : 0;
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { load, reload, updateData, markSuspended } = useSiteLoader(siteId, fetchEditorData, LOAD_ERROR);
  // Tulisan baru yang baru tersimpan: id barunya memakai kunci form yang sama, jadi form tidak dipasang ulang
  const [created, setCreated] = useState<{ id: number; formKey: string } | null>(null);

  const posts = load.status === 'ready' && load.data.posts !== POSTS_LOCKED ? load.data.posts : null;
  const post = posts && postId ? (posts.posts.find((item) => item.id === postId) ?? null) : null;
  const kind = post?.kind ?? kindFromQuery(searchParams.get('jenis'));
  const copy = KIND_COPY[kind];
  useDocumentTitle(isNew ? copy.write : post ? copy.edit : 'Berita & Pengumuman');

  if (load.status === 'loading') return <EditorPageSkeleton />;
  if (load.status === 'not_found') return <EditorNotFound />;
  if (load.status === 'error') return <EditorLoadError message={load.message} onRetry={reload} />;

  const { site, data } = load;
  const listPath = postsListPath(site.id, kind);
  const back = { to: listPath, label: copy.all };

  // Fitur Berita & Pengumuman belum aktif (SITE-ADDONS-SPEC §5): panel terkunci, tanpa form
  if (data.posts === POSTS_LOCKED || postsLocked(site)) {
    return (
      <PageContainer>
        <SitePageHeader site={site} back={{ to: `/akun/situs/${site.id}`, label: 'Kelola konten' }} title="Berita & Pengumuman" postsLocked />
        <div className="mt-6">
          <PostsLocked site={site} />
        </div>
      </PageContainer>
    );
  }

  if (!data.posts || !hasPostsFeature(site.template_code)) {
    return (
      <PageContainer>
        <SitePageHeader site={site} back={{ to: `/akun/situs/${site.id}`, label: 'Kelola konten' }} title="Berita & Pengumuman" />
        <div className="mt-6">
          <PostsUnavailable site={site} />
        </div>
      </PageContainer>
    );
  }

  if (!isNew && !post) {
    return (
      <PageContainer>
        <SitePageHeader site={site} back={back} title="Berita & Pengumuman" />
        <div className="mt-6">
          <EmptyState
            icon={<FileQuestion className="h-7 w-7" aria-hidden />}
            title="Tulisan tidak ditemukan"
            description="Tulisan ini mungkin sudah dihapus, atau alamatnya salah."
            action={
              <Link to={listPath} className="btn btn-primary">
                Kembali ke daftar
              </Link>
            }
          />
        </div>
      </PageContainer>
    );
  }

  const formKey = created && post?.id === created.id ? created.formKey : isNew ? `baru:${location.key}` : `post:${postId}`;

  const onSaved = (saved: SitePostAdmin, isCreated: boolean) => {
    updateData((current) =>
      current.posts && current.posts !== POSTS_LOCKED
        ? { ...current, posts: { ...current.posts, posts: upsertPost(current.posts.posts, saved) } }
        : current,
    );
    if (isCreated) {
      setCreated({ id: saved.id, formKey });
      navigate(editPostPath(site.id, saved.id, saved.kind), { replace: true });
    }
  };

  const onDeleted = (deleted: SitePostAdmin) => {
    navigate(postsListPath(site.id, deleted.kind), {
      replace: true,
      state: { flash: `${KIND_COPY[deleted.kind].label} “${deleted.title}” dihapus.` },
    });
  };

  return (
    <PageContainer>
      <SitePageHeader site={site} back={back} title={post ? copy.edit : copy.write} />
      <PostForm
        key={formKey}
        site={site}
        kind={kind}
        initialPost={post}
        posts={data.posts.posts}
        maxPosts={data.posts.maxPosts}
        siteSeo={data.seo}
        onSaved={onSaved}
        onDeleted={onDeleted}
        onSuspended={markSuspended}
      />
    </PageContainer>
  );
}

function EditorPageSkeleton() {
  return (
    <PageContainer busy>
      <div role="status" aria-label="Memuat editor tulisan">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="mt-4 h-4 w-48" />
        <Skeleton className="mt-2 h-8 w-56 max-w-full" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="card-site space-y-4 p-5 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="card-site space-y-3 p-5 sm:p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
        <span className="sr-only">Memuat...</span>
      </div>
    </PageContainer>
  );
}
