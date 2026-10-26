// Form tulis/edit satu berita atau pengumuman (customer_save_site_post), isi halaman /akun/situs/:siteId/berita/:postId.
// Validasi sama dengan server (postModel.ts); error per kolom dari server tampil di bawah kolomnya dan kolom error pertama
// difokuskan. Status dipilih lewat tombol: "Simpan draf" / "Terbitkan" (draf), "Simpan perubahan" / "Jadikan draf"
// (sudah terbit). Bagian "SEO (opsional)" bisa dilipat. Selama ada perubahan belum disimpan, useLeaveGuard menahan
// perpindahan halaman. Selama foto masih diproses, simpan (tombol & Ctrl+S) ditahan agar foto tidak tertinggal; isian
// yang berubah selama permintaan simpan berjalan tidak ditimpa salinan server (mergeSavedDraft).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, LoaderCircle, Search, Trash2 } from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { buildSiteHead } from '../../../templates/siteSeo';
import type { SiteContent } from '../../../templates/types';
import type { Site } from '../../../types/platform';
import { SITE_POST_LIMITS, type SitePostAdmin, type SitePostKind, type SitePostPublic, type SitePostStatus, type SiteSeoResponse } from '../../../types/sitePosts';
import { describedBy } from '../cms/a11y';
import { fieldDomId } from '../cms/content';
import { ImageField } from '../cms/ImageField';
import { Toast } from '../cms/Toast';
import { CharCount, Notice, Switch } from '../cms/ui';
import { useLeaveGuard } from '../cms/useLeaveGuard';
import { useToast } from '../cms/useToast';
import { Field } from '../components/Field';
import { GoogleSnippet } from '../seo/GoogleSnippet';
import { DeletePostDialog } from './DeletePostDialog';
import {
  KIND_COPY,
  POST_FIELDS,
  SEO_FIELDS,
  SVG_PHOTO_ERROR,
  charCount,
  cleanBody,
  cleanLine,
  cleanSlugInput,
  currentTime,
  draftFromPost,
  effectiveSlug,
  formatCount,
  inputFromDraft,
  isPostField,
  isSvgDataUri,
  mergeSavedDraft,
  relativeTime,
  trimSlug,
  validatePostDraft,
  type PostDraft,
  type PostErrors,
  type PostField,
} from './postModel';
import { siteLinks } from './siteLinks';
import { PostStatusPill, SuspendedNotice } from './SitePage';

const L = SITE_POST_LIMITS;
const LEAVE_MESSAGE = 'Perubahan yang belum disimpan akan hilang. Tetap tinggalkan halaman ini?';
const IMAGE_PATH = 'post.image';
const PHOTO_HELP =
  'Foto mendatar 4:3, mis. 1200×900 px. Gunakan JPG, PNG, atau WEBP (SVG tidak untuk foto); foto besar dikompres menjadi WebP/JPEG.';
const PHOTO_BUSY = 'Tunggu foto selesai diproses…';

/** id elemen setiap kolom (label, pesan error, fokus ke error pertama). */
const FIELD_ID: Record<PostField, string> = {
  kind: 'post-title',
  title: 'post-title',
  excerpt: 'post-excerpt',
  body: 'post-body',
  image: fieldDomId(IMAGE_PATH),
  image_alt: 'post-image-alt',
  category: 'post-category',
  badge: 'post-badge',
  link_url: 'post-link',
  seo_title: 'post-seo-title',
  seo_description: 'post-seo-description',
  slug: 'post-slug',
  noindex: 'post-noindex',
  published_at: 'post-date',
  status: 'post-date',
};

/** Atribut aksesibilitas input di dalam <Field>: id, aria-invalid, aria-describedby (pesan + penghitung). */
const a11y = (id: string, opts: { error?: string; help?: boolean; counter?: boolean; required?: boolean }) => ({
  id,
  name: id,
  'aria-invalid': opts.error ? (true as const) : undefined,
  'aria-describedby': describedBy(id, { error: opts.error, help: opts.help ? 'ada' : undefined, counter: opts.counter }),
  'aria-required': opts.required ? (true as const) : undefined,
});

interface PostFormProps {
  site: Site;
  kind: SitePostKind;
  /** null = tulisan baru */
  initialPost: SitePostAdmin | null;
  /** Semua tulisan situs (slug yang sudah dipakai, saran kategori, batas jumlah) */
  posts: readonly SitePostAdmin[];
  maxPosts: number;
  /** Status SEO situs (peringatan bila situs belum tampil di Google); null = tidak dimuat */
  siteSeo: SiteSeoResponse | null;
  onSaved: (post: SitePostAdmin, created: boolean) => void;
  onDeleted: (post: SitePostAdmin) => void;
  onSuspended: () => void;
}

export function PostForm({ site, kind, initialPost, posts, maxPosts, siteSeo, onSaved, onDeleted, onSuspended }: PostFormProps) {
  const copy = KIND_COPY[kind];
  const [saved, setSaved] = useState<SitePostAdmin | null>(initialPost);
  const [initial, setInitial] = useState<PostDraft>(() => draftFromPost(initialPost));
  const [draft, setDraft] = useState<PostDraft>(() => draftFromPost(initialPost));
  const [errors, setErrors] = useState<PostErrors>({});
  const [formError, setFormError] = useState('');
  const [savingAs, setSavingAs] = useState<SitePostStatus | null>(null);
  // Foto sedang diperkecil di klien (ImageField): simpan ditahan sampai selesai
  const [photoBusy, setPhotoBusy] = useState(false);
  // Bagian SEO terbuka sejak awal bila tulisan sudah punya isian SEO
  const [seoOpen, setSeoOpen] = useState(() => !!(initialPost && (initialPost.seo_title || initialPost.seo_description || initialPost.noindex)));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [now] = useState(currentTime);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const formErrorRef = useRef<HTMLDivElement>(null);

  const readOnly = site.status !== 'active';
  const saving = savingAs !== null;
  const locked = readOnly || saving;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const published = saved?.status === 'published';
  const atLimit = !saved && posts.length >= maxPosts;
  const others = useMemo(() => posts.filter((post) => post.id !== saved?.id), [posts, saved]);
  const taken = useMemo(() => others.map((post) => post.slug), [others]);
  const categories = useMemo(
    () => [...new Set(posts.filter((post) => post.kind === 'berita').map((post) => post.category.trim()).filter(Boolean))].slice(0, 30),
    [posts],
  );
  /** Kolom yang tampil di form ini (kategori untuk berita, label untuk pengumuman) */
  const shown = (field: PostField) => field !== 'kind' && field !== 'status' && (kind === 'berita' ? field !== 'badge' : field !== 'category');

  useLeaveGuard(dirty && !readOnly, LEAVE_MESSAGE);

  const update = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key as PostField]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const changeImage = (value: string) => {
    // Foto tulisan selalu raster (server menolak SVG): tahan di sini dengan pesan yang jelas
    if (isSvgDataUri(value)) {
      setErrors((prev) => ({ ...prev, image: SVG_PHOTO_ERROR }));
      return;
    }
    update('image', value);
  };

  /** Fokus ke kolom yang error (kolom SEO: buka bagiannya dulu). */
  const focusField = (field: PostField) => {
    if (SEO_FIELDS.has(field)) setSeoOpen(true);
    window.setTimeout(() => {
      const el = document.getElementById(FIELD_ID[field]);
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    }, 0);
  };

  const showFormError = (message: string) => {
    setFormError(message);
    window.setTimeout(() => formErrorRef.current?.focus(), 0);
  };

  const save = async (status: SitePostStatus) => {
    if (saving || readOnly) return;
    if (photoBusy) {
      showToast('info', PHOTO_BUSY);
      return;
    }
    if (saved && !dirty && status === saved.status) {
      showToast('info', 'Belum ada perubahan untuk disimpan.');
      return;
    }
    setFormError('');
    const found = validatePostDraft(draft, taken);
    const invalid = POST_FIELDS.filter((field) => found[field]);
    setErrors(found);
    if (invalid.length) {
      focusField(invalid[0]);
      showToast('danger', invalid.length === 1 ? 'Ada 1 isian yang perlu diperbaiki.' : `Ada ${invalid.length} isian yang perlu diperbaiki.`);
      return;
    }

    setSavingAs(status);
    // Isian yang dikirim: pembanding bila isian berubah lagi selama permintaan berjalan
    const sent = draft;
    try {
      const res = await apiPost<{ post: SitePostAdmin }>('customer_save_site_post', {
        site_id: site.id,
        post: inputFromDraft(sent, kind, status, saved?.id),
      });
      const post = res.post;
      const created = !saved;
      const wasPublished = saved?.status === 'published';
      const next = draftFromPost(post);
      setSaved(post);
      setInitial(next);
      setDraft((current) => mergeSavedDraft(sent, current, next));
      setErrors({});
      onSaved(post, created);
      const view = { label: 'Lihat', onClick: () => window.open(post.url, '_blank', 'noopener,noreferrer') };
      if (post.status === 'published') {
        showToast('success', wasPublished ? 'Perubahan disimpan dan sudah tampil di situs.' : `${copy.label} diterbitkan dan sudah tampil di situs.`, view);
      } else if (wasPublished) {
        showToast('success', `${copy.label} dijadikan draf dan tidak tampil lagi di situs.`);
      } else {
        showToast('success', created ? `Draf ${copy.noun} disimpan. Draf belum tampil di situs.` : 'Draf disimpan.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SITE_SUSPENDED') {
        onSuspended();
        showToast('danger', err.message);
        return;
      }
      // Error per kolom dari server di bawah kolomnya; kunci yang tidak tampil di form ikut pesan di atas form
      const fieldErrors: PostErrors = {};
      const extra: string[] = [];
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [key, message] of Object.entries(err.fieldErrors)) {
          if (typeof message !== 'string' || !message.trim()) continue;
          if (isPostField(key) && shown(key)) fieldErrors[key] = message;
          else extra.push(message);
        }
      }
      setErrors(fieldErrors);
      const first = POST_FIELDS.find((field) => fieldErrors[field]);
      if (first) {
        if (extra.length) setFormError(extra.join(' '));
        focusField(first);
        showToast('danger', 'Periksa lagi isian yang ditandai.');
      } else {
        showFormError(extra.length ? extra.join(' ') : errorMessage(err, 'Silakan coba lagi.'));
      }
    } finally {
      setSavingAs(null);
    }
  };

  // Ctrl/Cmd + S = simpan dengan status sekarang (tulisan baru = draf)
  const quickSaveRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    quickSaveRef.current = () => void save(saved?.status ?? 'draft');
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        quickSaveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Pratinjau Google (aturan kepala halaman yang sama dengan server) ─────────
  const slug = effectiveSlug(draft, kind, taken);
  const slugAuto = trimSlug(draft.slug.trim()) === '';
  const postUrl = `https://${site.domain}/${kind}/${slug}`;
  const preview = useMemo(() => {
    const base: SitePostPublic = {
      id: saved?.id ?? 0,
      kind,
      slug,
      title: cleanLine(draft.title),
      excerpt: cleanLine(draft.excerpt),
      body: cleanBody(draft.body),
      category: '',
      badge: '',
      image: null,
      image_alt: '',
      link_url: '',
      published_at: draft.published_at || null,
      updated_at: saved?.updated_at ?? '',
      seo_title: '',
      seo_description: '',
      noindex: draft.noindex,
    };
    const head = (post: SitePostPublic) =>
      buildSiteHead({
        domain: site.domain,
        templateCode: site.template_code,
        content: (site.content ?? null) as SiteContent | null,
        seo: null,
        route: { kind: 'post', postKind: kind, slug },
        post,
      });
    const fallback = head(base);
    const actual = head({ ...base, seo_title: cleanLine(draft.seo_title), seo_description: cleanLine(draft.seo_description) });
    return {
      siteName: actual.siteName,
      icon: actual.icon,
      // Tanpa judul tulisan maupun judul SEO: tampilkan teks pengganti, bukan " · Nama situs"
      title: base.title || cleanLine(draft.seo_title) ? actual.title : '',
      description: actual.description,
      fallbackTitle: base.title ? fallback.title : '',
      fallbackDescription: fallback.description,
    };
  }, [draft, kind, slug, saved, site]);

  const seoErrorCount = [...SEO_FIELDS].filter((field) => errors[field]).length;
  const views = saved?.view_count ?? 0;
  const lastViewed = views > 0 ? relativeTime(saved?.last_viewed_at, now) : null;
  const siteHidden = siteSeo && !siteSeo.status.indexable;

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} aria-busy={saving || undefined} aria-label={saved ? copy.edit : copy.write}>
      <div className="mt-6 space-y-3 empty:hidden">
        {readOnly && <SuspendedNotice site={site} />}
        {atLimit && !readOnly && (
          <Notice tone="warning" title="Batas tulisan tercapai">
            Situs ini sudah punya {formatCount(maxPosts)} tulisan, jumlah maksimal. Hapus tulisan lama sebelum menulis yang baru.
          </Notice>
        )}
        {formError && (
          <div ref={formErrorRef} tabIndex={-1} className="rounded-2xl outline-none">
            <Notice tone="danger" title={`${copy.label} belum tersimpan`}>
              {formError}
            </Notice>
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <FormCard id="post-content-title" title="Judul & isi">
            <Field
              id={FIELD_ID.title}
              label="Judul"
              error={errors.title}
              aside={<CharCount id={`${FIELD_ID.title}-count`} length={charCount(cleanLine(draft.title))} max={L.title} />}
            >
              <input
                {...a11y(FIELD_ID.title, { error: errors.title, counter: true, required: true })}
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                disabled={locked}
                placeholder={copy.titlePlaceholder}
                autoComplete="off"
                className="input-site"
              />
            </Field>

            <Field
              id={FIELD_ID.excerpt}
              label="Ringkasan"
              optional
              error={errors.excerpt}
              help={`1–2 kalimat untuk kartu di daftar ${copy.noun} dan cuplikan di Google.`}
              aside={<CharCount id={`${FIELD_ID.excerpt}-count`} length={charCount(cleanLine(draft.excerpt))} max={L.excerpt} />}
            >
              <textarea
                {...a11y(FIELD_ID.excerpt, { error: errors.excerpt, help: true, counter: true })}
                value={draft.excerpt}
                onChange={(event) => update('excerpt', event.target.value)}
                disabled={locked}
                rows={3}
                className="input-site min-h-[96px] resize-y"
              />
            </Field>

            <Field
              id={FIELD_ID.body}
              label={`Isi ${copy.noun}`}
              optional
              error={errors.body}
              help="Pisahkan paragraf dengan satu baris kosong."
              aside={<CharCount id={`${FIELD_ID.body}-count`} length={charCount(cleanBody(draft.body))} max={L.body} />}
            >
              <textarea
                {...a11y(FIELD_ID.body, { error: errors.body, help: true, counter: true })}
                value={draft.body}
                onChange={(event) => update('body', event.target.value)}
                disabled={locked}
                rows={12}
                placeholder={'Paragraf pertama...\n\nParagraf kedua...'}
                className="input-site min-h-[280px] resize-y leading-relaxed sm:min-h-[360px]"
              />
            </Field>
          </FormCard>

          <FormCard id="post-photo-title" title="Foto">
            <ImageField
              field={{ type: 'image', key: 'image', label: 'Foto utama', help: PHOTO_HELP }}
              path={IMAGE_PATH}
              value={draft.image}
              onChange={changeImage}
              error={errors.image}
              disabled={locked}
              onProcessingChange={setPhotoBusy}
            />
            <Field
              id={FIELD_ID.image_alt}
              label="Teks foto"
              optional
              error={errors.image_alt}
              help="Jelaskan isi foto dalam satu kalimat untuk pembaca layar dan Google, mis. “Siswa menerima medali di panggung”."
              aside={<CharCount id={`${FIELD_ID.image_alt}-count`} length={charCount(cleanLine(draft.image_alt))} max={L.imageAlt} />}
            >
              <input
                {...a11y(FIELD_ID.image_alt, { error: errors.image_alt, help: true, counter: true })}
                value={draft.image_alt}
                onChange={(event) => update('image_alt', event.target.value)}
                disabled={locked}
                autoComplete="off"
                className="input-site"
              />
            </Field>
          </FormCard>

          <FormCard id="post-detail-title" title="Detail">
            <div className="grid gap-5 sm:grid-cols-2">
              {kind === 'berita' ? (
                <Field
                  id={FIELD_ID.category}
                  label="Kategori"
                  optional
                  error={errors.category}
                  help="Label kecil di atas judul berita."
                  aside={<CharCount id={`${FIELD_ID.category}-count`} length={charCount(cleanLine(draft.category))} max={L.category} />}
                >
                  <input
                    {...a11y(FIELD_ID.category, { error: errors.category, help: true, counter: true })}
                    value={draft.category}
                    onChange={(event) => update('category', event.target.value)}
                    disabled={locked}
                    list={categories.length ? 'post-category-options' : undefined}
                    placeholder="mis. Prestasi"
                    autoComplete="off"
                    className="input-site"
                  />
                  {categories.length > 0 && (
                    <datalist id="post-category-options">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  )}
                </Field>
              ) : (
                <Field
                  id={FIELD_ID.badge}
                  label="Label"
                  optional
                  error={errors.badge}
                  help="Isi mis. Penting atau Wajib agar pengumuman ditandai. Kosongkan untuk pengumuman biasa."
                  aside={<CharCount id={`${FIELD_ID.badge}-count`} length={charCount(cleanLine(draft.badge))} max={L.badge} />}
                >
                  <input
                    {...a11y(FIELD_ID.badge, { error: errors.badge, help: true, counter: true })}
                    value={draft.badge}
                    onChange={(event) => update('badge', event.target.value)}
                    disabled={locked}
                    placeholder="mis. Penting"
                    autoComplete="off"
                    className="input-site"
                  />
                </Field>
              )}
              <Field
                id={FIELD_ID.link_url}
                label="Tautan tambahan"
                optional
                error={errors.link_url}
                help="Mis. lampiran PDF di Google Drive, formulir pendaftaran, atau unggahan Instagram."
              >
                <input
                  {...a11y(FIELD_ID.link_url, { error: errors.link_url, help: true })}
                  value={draft.link_url}
                  onChange={(event) => update('link_url', event.target.value)}
                  disabled={locked}
                  inputMode="url"
                  placeholder="https://"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="input-site"
                />
              </Field>
            </div>
          </FormCard>

          <section aria-labelledby="post-seo-heading" className="card-site">
            <h2 id="post-seo-heading">
              <button
                type="button"
                onClick={() => setSeoOpen((open) => !open)}
                aria-expanded={seoOpen}
                aria-controls="post-seo-panel"
                className="flex w-full items-center gap-3 rounded-[24px] p-4 text-left transition-colors hover:bg-alt/60 sm:p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary" aria-hidden>
                  <Search className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
                    SEO (opsional)
                    {seoErrorCount > 0 && (
                      <span className="inline-flex h-5 items-center rounded-full bg-danger-50 px-2 text-[11px] font-medium text-danger-700">
                        {seoErrorCount} perlu diperbaiki
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted">
                    Atur judul, deskripsi, dan alamat {copy.noun} di hasil Google. Boleh dikosongkan.
                  </span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-subtle transition-transform ${seoOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            </h2>

            {seoOpen && (
              <div id="post-seo-panel" className="space-y-5 border-t border-line px-4 py-5 sm:px-5">
                {siteHidden && (
                  <Notice
                    tone="warning"
                    title="Situs Anda belum tampil di Google"
                    action={
                      <Link to={siteLinks(site.id).seo} className="btn btn-outline btn-sm">
                        Lihat pengaturan SEO situs
                      </Link>
                    }
                  >
                    Selama itu, {copy.noun} ini juga belum muncul di Google walaupun bagian SEO-nya sudah diisi.
                  </Notice>
                )}

                <Field
                  id={FIELD_ID.seo_title}
                  label="Judul SEO"
                  optional
                  error={errors.seo_title}
                  help={`Judul di hasil Google. Kosongkan untuk memakai judul ${copy.noun}.`}
                  aside={<CharCount id={`${FIELD_ID.seo_title}-count`} length={charCount(cleanLine(draft.seo_title))} max={L.seoTitle} />}
                >
                  <input
                    {...a11y(FIELD_ID.seo_title, { error: errors.seo_title, help: true, counter: true })}
                    value={draft.seo_title}
                    onChange={(event) => update('seo_title', event.target.value)}
                    disabled={locked}
                    placeholder={preview.fallbackTitle || undefined}
                    autoComplete="off"
                    className="input-site"
                  />
                </Field>

                <Field
                  id={FIELD_ID.seo_description}
                  label="Deskripsi SEO"
                  optional
                  error={errors.seo_description}
                  help="Cuplikan di bawah judul di hasil Google. Kosongkan untuk memakai ringkasan atau awal isi."
                  aside={
                    <CharCount id={`${FIELD_ID.seo_description}-count`} length={charCount(cleanLine(draft.seo_description))} max={L.seoDescription} />
                  }
                >
                  <textarea
                    {...a11y(FIELD_ID.seo_description, { error: errors.seo_description, help: true, counter: true })}
                    value={draft.seo_description}
                    onChange={(event) => update('seo_description', event.target.value)}
                    disabled={locked}
                    rows={3}
                    placeholder={preview.fallbackDescription || undefined}
                    className="input-site min-h-[96px] resize-y"
                  />
                </Field>

                <Field
                  id={FIELD_ID.slug}
                  label="Alamat (slug)"
                  optional
                  error={errors.slug}
                  help={
                    <>
                      <span className="break-all font-mono text-fg">{postUrl}</span>
                      {slugAuto && ' (dibuat otomatis dari judul)'}
                      {published && saved && trimSlug(draft.slug.trim()) !== saved.slug && (
                        <span className="mt-1 block text-warning-700">
                          {copy.label} ini sudah terbit: mengganti alamat membuat tautan lama tidak bisa dibuka lagi.
                        </span>
                      )}
                    </>
                  }
                >
                  <input
                    {...a11y(FIELD_ID.slug, { error: errors.slug, help: true })}
                    value={draft.slug}
                    onChange={(event) => update('slug', cleanSlugInput(event.target.value))}
                    onBlur={() => {
                      const trimmed = trimSlug(draft.slug);
                      if (trimmed !== draft.slug) update('slug', trimmed);
                    }}
                    disabled={locked}
                    placeholder={slugAuto ? slug : undefined}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="input-site font-mono text-[14px] max-sm:text-[16px]"
                  />
                </Field>

                <div className="flex items-start justify-between gap-4 rounded-2xl bg-alt p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">Sembunyikan dari Google</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {copy.label} tetap tampil di situs, tetapi Google diminta tidak menampilkannya di hasil pencarian.
                    </p>
                    {errors.noindex && <p className="error-site">{errors.noindex}</p>}
                  </div>
                  <Switch
                    id={FIELD_ID.noindex}
                    checked={draft.noindex}
                    onChange={(next) => update('noindex', next)}
                    label={`Sembunyikan ${copy.noun} ini dari Google`}
                    disabled={locked}
                  />
                </div>

                <GoogleSnippet
                  url={postUrl}
                  siteName={preview.siteName}
                  icon={preview.icon}
                  title={preview.title}
                  description={preview.description}
                  titlePlaceholder={`Judul ${copy.noun}`}
                  descriptionPlaceholder="Isi ringkasan atau deskripsi SEO agar cuplikan di Google lebih menarik."
                />
                {(draft.noindex || !published) && (
                  <p className="-mt-2 text-xs leading-relaxed text-subtle">
                    {draft.noindex
                      ? `${copy.label} ini disembunyikan dari Google, jadi cuplikan di atas tidak akan muncul di hasil pencarian.`
                      : `Cuplikan muncul di Google setelah ${copy.noun} diterbitkan dan dibaca Google (biasanya beberapa hari).`}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Publikasi">
          <section aria-labelledby="post-publish-title" className="card-site p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="post-publish-title" className="text-[15px] font-semibold text-fg sm:text-base">
                Publikasi
              </h2>
              <PostStatusPill status={saved?.status ?? 'draft'} />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {published ? `${copy.label} ini tampil di situs Anda.` : 'Draf belum tampil di situs. Klik Terbitkan bila sudah siap.'}
            </p>

            <Field
              id={FIELD_ID.published_at}
              label="Tanggal"
              optional
              error={errors.published_at}
              help="Tanggal yang tampil di tulisan. Kosongkan agar diisi tanggal hari ini saat diterbitkan."
              className="mt-4"
            >
              <input
                {...a11y(FIELD_ID.published_at, { error: errors.published_at, help: true })}
                type="date"
                value={draft.published_at}
                onChange={(event) => update('published_at', event.target.value)}
                disabled={locked}
                className="input-site"
              />
            </Field>

            {saved && (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-alt p-3.5">
                <div>
                  <dt className="text-[11px] font-medium text-subtle">Dilihat</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{formatCount(views)} kali</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-subtle">Terakhir dilihat</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-fg">{lastViewed ?? 'Belum ada'}</dd>
                </div>
              </dl>
            )}

            {!readOnly && (
              <div className="mt-5 flex flex-col gap-2">
                <button type="button" className="btn btn-primary w-full" onClick={() => void save('published')} disabled={saving || atLimit || photoBusy}>
                  {savingAs === 'published' && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                  {savingAs === 'published' ? 'Menyimpan...' : published ? 'Simpan perubahan' : 'Terbitkan'}
                </button>
                <button type="button" className="btn btn-outline w-full" onClick={() => void save('draft')} disabled={saving || atLimit || photoBusy}>
                  {savingAs === 'draft' && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                  {savingAs === 'draft' ? 'Menyimpan...' : published ? 'Jadikan draf' : 'Simpan draf'}
                </button>
                <p className="text-center text-xs text-subtle" aria-live="polite">
                  {photoBusy ? PHOTO_BUSY : dirty ? 'Ada perubahan yang belum disimpan.' : saved ? 'Semua perubahan tersimpan.' : ''}
                </p>
              </div>
            )}

            {/* Situs nonaktif tidak bisa dibuka siapa pun: tanpa "Lihat di situs" (dan tanpa Hapus, hanya-baca) */}
            {saved && !readOnly && (
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                {published && (
                  <a href={saved.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm w-full">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Lihat di situs
                    <span className="sr-only">(tab baru)</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  disabled={saving}
                  className="btn btn-ghost btn-sm w-full text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hapus {copy.noun}
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      <DeletePostDialog
        siteId={site.id}
        post={deleteOpen ? saved : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(post) => {
          setDeleteOpen(false);
          onDeleted(post);
        }}
        onSuspended={(message) => {
          setDeleteOpen(false);
          onSuspended();
          showToast('danger', message);
        }}
      />
      <Toast toast={toast} onClose={dismissToast} />
    </form>
  );
}

function FormCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card-site p-5 sm:p-6">
      <h2 id={id} className="text-[15px] font-semibold text-fg sm:text-base">
        {title}
      </h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}
