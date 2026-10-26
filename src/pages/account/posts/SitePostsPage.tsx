// Daftar berita & pengumuman situs pembeli (/akun/situs/:siteId/berita), docs/platform/SITE-POSTS-SEO-SPEC.md §8.
// Tab jenis (Berita / Pengumuman, disimpan di ?jenis=), kartu per tulisan: foto mini, judul, status, tanggal, jumlah
// dilihat & terakhir dilihat; aksi Edit, Lihat (tab baru, hanya yang terbit dan situsnya aktif) dan Hapus (konfirmasi).
// Template tanpa fitur tulisan mendapat penjelasan; situs nonaktif hanya-baca. Setelah hapus, fokus pindah ke Edit tulisan
// berikutnya (atau sebelumnya, atau panel daftar bila kosong); datang dari editor setelah hapus, fokus ke pesannya.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, ExternalLink, Eye, ImageIcon, Megaphone, Newspaper, PenLine, Plus, Trash2 } from 'lucide-react';
import { SITE_POST_KINDS, type SitePostAdmin, type SitePostKind } from '../../../types/sitePosts';
import { imageSrc } from '../cms/content';
import { EditorLoadError, EditorNotFound } from '../cms/EditorStates';
import { Toast } from '../cms/Toast';
import { useToast } from '../cms/useToast';
import { Notice } from '../components/Notice';
import { useDocumentTitle } from '../components/payment';
import { EmptyState } from '../components/States';
import { DeletePostDialog } from './DeletePostDialog';
import { KIND_COPY, currentTime, formatCount, kindFromQuery, postDate, relativeTime, viewsLabel } from './postModel';
import { fetchPosts } from './postsApi';
import { editPostPath, hasPostsFeature, newPostPath } from './siteLinks';
import { PageContainer, PostStatusPill, PostsUnavailable, SitePageHeader, SitePageSkeleton, SuspendedNotice } from './SitePage';
import { parseSiteId, useSiteLoader } from './useSiteLoader';

const LOAD_ERROR = 'Berita & pengumuman gagal dimuat. Silakan coba lagi.';

/** Pesan dari halaman sebelumnya lewat state navigasi, mis. tulisan dihapus di editor. */
const flashFrom = (state: unknown): string | null => {
  const flash = state && typeof state === 'object' ? (state as { flash?: unknown }).flash : null;
  return typeof flash === 'string' && flash ? flash : null;
};

export default function SitePostsPage() {
  const { siteId: rawId } = useParams();
  const siteId = parseSiteId(rawId);
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = kindFromQuery(searchParams.get('jenis'));
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(() => flashFrom(location.state));
  const { load, reload, updateData, markSuspended } = useSiteLoader(siteId, fetchPosts, LOAD_ERROR);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const [now] = useState(currentTime);
  const [deleting, setDeleting] = useState<SitePostAdmin | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const editLinks = useRef(new Map<number, HTMLAnchorElement>());
  // Tujuan fokus setelah hapus: id tulisan yang tautan Edit-nya difokuskan, 'panel' = panel daftar
  const focusAfterDelete = useRef<number | 'panel' | null>(null);
  const flashFocused = useRef(false);
  const ready = load.status === 'ready';

  useDocumentTitle('Berita & Pengumuman');

  // Baris yang dihapus hilang dari DOM: pindahkan fokus ke elemen yang tetap ada (tidak jatuh ke <body>)
  useEffect(() => {
    const target = focusAfterDelete.current;
    if (target === null) return;
    focusAfterDelete.current = null;
    const link = target === 'panel' ? undefined : editLinks.current.get(target);
    (link ?? panelRef.current)?.focus();
  });

  // Dari editor setelah hapus (tombolnya ikut hilang): fokus ke pesan "… dihapus." begitu daftar tampil
  useEffect(() => {
    if (!ready || !flash || flashFocused.current) return;
    flashFocused.current = true;
    flashRef.current?.focus();
  }, [ready, flash]);

  // Pesan dari state navigasi cukup tampil sekali: buang dari riwayat supaya tidak muncul lagi saat dimuat ulang
  useEffect(() => {
    if (flashFrom(location.state)) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location, navigate]);

  const selectKind = (next: SitePostKind) => setSearchParams(next === 'pengumuman' ? { jenis: 'pengumuman' } : {}, { replace: true });

  if (load.status === 'loading') return <SitePageSkeleton label="Memuat berita & pengumuman" />;
  if (load.status === 'not_found') return <EditorNotFound />;
  if (load.status === 'error') return <EditorLoadError message={load.message} onRetry={reload} />;

  const { site, data } = load;
  const readOnly = site.status !== 'active';
  const back = site.order_number
    ? { to: `/akun/pesanan/${encodeURIComponent(site.order_number)}`, label: 'Detail pesanan' }
    : { to: '/akun', label: 'Pesanan saya' };

  if (!data || !hasPostsFeature(site.template_code)) {
    return (
      <PageContainer>
        <SitePageHeader site={site} back={back} title="Berita & Pengumuman" />
        <div className="mt-6">
          <PostsUnavailable site={site} />
        </div>
      </PageContainer>
    );
  }

  const copy = KIND_COPY[kind];
  const posts = data.posts.filter((post) => post.kind === kind);
  const counts = Object.fromEntries(SITE_POST_KINDS.map((k) => [k, data.posts.filter((post) => post.kind === k).length])) as Record<SitePostKind, number>;
  const full = data.posts.length >= data.maxPosts;
  const publishedCount = posts.filter((post) => post.status === 'published').length;

  const writeButton = readOnly ? null : full ? (
    <button type="button" className="btn btn-primary" disabled>
      <Plus className="h-4 w-4" aria-hidden />
      {copy.write}
    </button>
  ) : (
    <Link to={newPostPath(site.id, kind)} className="btn btn-primary">
      <Plus className="h-4 w-4" aria-hidden />
      {copy.write}
    </Link>
  );

  return (
    <PageContainer>
      <SitePageHeader
        site={site}
        back={back}
        title="Berita & Pengumuman"
        description="Bagikan kabar dan informasi resmi. Setiap tulisan punya halaman sendiri di situs Anda, bisa diberi foto, dan bisa muncul di Google."
      />

      <div className="mt-6 space-y-3 empty:hidden">
        {flash && (
          <div ref={flashRef} tabIndex={-1} className="rounded-2xl outline-none">
            <Notice
              tone="success"
              onClose={() => {
                setFlash(null);
                panelRef.current?.focus();
              }}
            >
              {flash}
            </Notice>
          </div>
        )}
        {readOnly && <SuspendedNotice site={site} />}
        {full && !readOnly && (
          <Notice tone="warning" title="Batas tulisan tercapai">
            Situs ini sudah punya {formatCount(data.maxPosts)} tulisan, jumlah maksimal. Hapus tulisan lama sebelum menulis yang baru.
          </Notice>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <KindTabs value={kind} counts={counts} onChange={selectKind} />
        {writeButton && <div className="flex [&>*]:max-sm:w-full">{writeButton}</div>}
      </div>

      <div ref={panelRef} role="tabpanel" id="posts-panel" aria-labelledby={`posts-tab-${kind}`} tabIndex={-1} className="mt-4 outline-none">
        <h2 className="sr-only">Daftar {copy.noun}</h2>
        {posts.length === 0 ? (
          <EmptyState
            icon={kind === 'berita' ? <Newspaper className="h-7 w-7" aria-hidden /> : <Megaphone className="h-7 w-7" aria-hidden />}
            title={copy.empty}
            description={readOnly ? undefined : copy.emptyText}
            action={readOnly || full ? undefined : writeButton}
          />
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                siteId={site.id}
                now={now}
                readOnly={readOnly}
                onDelete={setDeleting}
                editRef={(el) => {
                  if (el) editLinks.current.set(post.id, el);
                  else editLinks.current.delete(post.id);
                }}
              />
            ))}
          </ul>
        )}
        {!readOnly && publishedCount > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            {copy.label} yang terbit tampil di beranda situs dan di{' '}
            <a href={`https://${site.domain}/${kind}`} target="_blank" rel="noopener noreferrer" className="link-site break-all">
              {site.domain}/{kind}
              <span className="sr-only"> (tab baru)</span>
            </a>
            .
          </p>
        )}
      </div>

      <DeletePostDialog
        siteId={site.id}
        post={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(post) => {
          // Fokus berikutnya: Edit tulisan sesudahnya, atau sebelumnya, atau panel daftar bila tab ini jadi kosong
          const index = posts.findIndex((item) => item.id === post.id);
          const neighbor = index < 0 ? undefined : (posts[index + 1] ?? posts[index - 1]);
          focusAfterDelete.current = neighbor ? neighbor.id : 'panel';
          setDeleting(null);
          updateData((current) => (current ? { ...current, posts: current.posts.filter((item) => item.id !== post.id) } : current));
          showToast('success', `${KIND_COPY[post.kind].label} “${post.title}” dihapus.`);
        }}
        onSuspended={(message) => {
          // Situs jadi hanya-baca: tombol Hapus hilang, fokus ke tautan Buka tulisan yang sama
          focusAfterDelete.current = deleting ? deleting.id : 'panel';
          setDeleting(null);
          markSuspended();
          showToast('danger', message);
        }}
      />
      <Toast toast={toast} onClose={dismissToast} />
    </PageContainer>
  );
}

/** Tab jenis tulisan (pola ARIA tabs: panah kiri/kanan, Home/End pindah tab). */
function KindTabs({ value, counts, onChange }: { value: SitePostKind; counts: Record<SitePostKind, number>; onChange: (kind: SitePostKind) => void }) {
  const tabs = useRef(new Map<SitePostKind, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SITE_POST_KINDS.indexOf(value);
    const last = SITE_POST_KINDS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index + 1) % SITE_POST_KINDS.length
      : event.key === 'ArrowLeft' ? (index + last) % SITE_POST_KINDS.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    const kind = SITE_POST_KINDS[next];
    onChange(kind);
    tabs.current.get(kind)?.focus();
  };

  return (
    <div role="tablist" aria-label="Jenis tulisan" onKeyDown={onKeyDown} className="flex gap-2">
      {SITE_POST_KINDS.map((kind) => {
        const selected = kind === value;
        return (
          <button
            key={kind}
            ref={(el) => {
              if (el) tabs.current.set(kind, el);
              else tabs.current.delete(kind);
            }}
            type="button"
            role="tab"
            id={`posts-tab-${kind}`}
            aria-selected={selected}
            aria-controls="posts-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            className="chip-site h-10 gap-2 px-4 text-sm max-sm:h-9 max-sm:px-3.5 max-sm:text-[13px]"
          >
            {kind === 'berita' ? <Newspaper className="h-4 w-4" aria-hidden /> : <Megaphone className="h-4 w-4" aria-hidden />}
            {KIND_COPY[kind].label}
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                selected ? 'bg-white/20 text-white' : 'bg-alt text-subtle'
              }`}
            >
              {formatCount(counts[kind])}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface PostRowProps {
  post: SitePostAdmin;
  siteId: number;
  now: number;
  readOnly: boolean;
  onDelete: (post: SitePostAdmin) => void;
  /** Tautan Edit baris ini (tujuan fokus setelah baris lain dihapus) */
  editRef: (el: HTMLAnchorElement | null) => void;
}

function PostRow({ post, siteId, now, readOnly, onDelete, editRef }: PostRowProps) {
  const copy = KIND_COPY[post.kind];
  const date = postDate(post);
  const lastViewed = post.view_count > 0 ? relativeTime(post.last_viewed_at, now) : null;
  const tag = post.kind === 'berita' ? post.category : post.badge;
  const published = post.status === 'published';
  // Nama aksesibel lengkap (tombol berulang di setiap kartu); diawali teks yang terlihat
  const named = (action: string) => `${action} ${copy.noun} “${post.title}”`;

  return (
    <li className="card-site flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
        <Thumb src={imageSrc(post.image ?? '')} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PostStatusPill status={post.status} />
            {tag && (
              <span className="badge-site max-w-[14rem]">
                <span className="truncate">{tag}</span>
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 break-words text-[15px] font-semibold leading-snug text-fg">{post.title}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {date ?? 'Belum bertanggal'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {viewsLabel(post.view_count)}
              {lastViewed && <span>· terakhir {lastViewed}</span>}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:border-t max-sm:border-line max-sm:pt-3">
        <Link ref={editRef} to={editPostPath(siteId, post.id, post.kind)} aria-label={named(readOnly ? 'Buka' : 'Edit')} className="btn btn-outline btn-sm">
          <PenLine className="h-4 w-4" aria-hidden />
          {readOnly ? 'Buka' : 'Edit'}
        </Link>
        {/* Situs nonaktif tidak bisa dibuka siapa pun: tautan Lihat hanya untuk tulisan terbit di situs aktif */}
        {published && !readOnly && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Lihat “${post.title}” di situs (tab baru)`}
            className="btn btn-ghost btn-sm"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Lihat
          </a>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => onDelete(post)}
            aria-label={named('Hapus')}
            className="btn btn-ghost btn-sm text-danger-700 hover:bg-danger-50 hover:text-danger-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Hapus
          </button>
        )}
      </div>
    </li>
  );
}

/** Foto mini 4:3; tanpa foto / gagal dimuat = ikon. */
function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className="h-16 w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-alt ring-1 ring-inset ring-line sm:h-[72px] sm:w-24">
      {src && broken !== src ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(src)} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-subtle">
          <ImageIcon className="h-5 w-5" aria-hidden />
        </span>
      )}
    </div>
  );
}
