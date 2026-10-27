// SEO situs pembeli (/akun/situs/:siteId/seo), untuk semua template. docs/platform/SITE-POSTS-SEO-SPEC.md §4.1 & §8.
// Kartu status (bisa tampil di Google, atau alasannya beserta cara memperbaikinya), lalu form: judul & deskripsi di
// Google (dengan pratinjau cuplikan), gambar saat dibagikan, tampil di Google (Otomatis/Ya/Tidak), jenis organisasi, dan
// kode verifikasi Google Search Console / Bing. Di samping: alamat sitemap & robots.txt, dan panduan singkat
// mendaftarkan situs ke Google. Selama ada perubahan belum disimpan, useLeaveGuard menahan perpindahan halaman. Selama
// gambar masih diproses, simpan (tombol & Ctrl+S) ditahan; isian yang berubah selama permintaan simpan berjalan tidak
// ditimpa salinan server (mergeSavedDraft).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleCheck, ExternalLink, FileCode, Globe, LoaderCircle, TriangleAlert } from 'lucide-react';
import { ApiError, apiGet, apiPost, errorMessage } from '../../../lib/api';
import { buildSiteHead } from '../../../templates/siteSeo';
import type { SiteContent } from '../../../templates/types';
import type { Site } from '../../../types/platform';
import { SITE_SCHEMA_TYPES, SITE_SEO_LIMITS, type SiteIndexReason, type SiteSchemaType, type SiteSeoPublic, type SiteSeoResponse } from '../../../types/sitePosts';
import { describedBy } from '../cms/a11y';
import { fieldDomId } from '../cms/content';
import { EditorLoadError, EditorNotFound } from '../cms/EditorStates';
import { ImageField } from '../cms/ImageField';
import { Toast } from '../cms/Toast';
import { CharCount, Notice } from '../cms/ui';
import { useLeaveGuard } from '../cms/useLeaveGuard';
import { useToast } from '../cms/useToast';
import { Field } from '../components/Field';
import { useDocumentTitle } from '../components/payment';
import { charCount, cleanLine, isSvgDataUri, mergeSavedDraft } from '../posts/postModel';
import { hasPostsFeature, siteLinks } from '../posts/siteLinks';
import { PageContainer, SitePageHeader, SitePageSkeleton, SuspendedNotice } from '../posts/SitePage';
import { parseSiteId, useSiteLoader } from '../posts/useSiteLoader';
import { GoogleSnippet } from './GoogleSnippet';
import {
  REASON_ORDER,
  SCHEMA_LABEL,
  SEO_FIELDS,
  draftFromSeo,
  indexModeOptions,
  inputFromSeoDraft,
  isSeoField,
  validateSeoDraft,
  verificationToken,
  type SeoDraft,
  type SeoErrors,
  type SeoField,
} from './seoModel';

const LOAD_ERROR = 'Pengaturan SEO gagal dimuat. Silakan coba lagi.';
const LEAVE_MESSAGE = 'Perubahan yang belum disimpan akan hilang. Tetap tinggalkan halaman ini?';
const IMAGE_PATH = 'seo.og_image';
const SEARCH_CONSOLE_URL = 'https://search.google.com/search-console';
const SVG_IMAGE_ERROR = 'SVG tidak bisa dipakai untuk gambar ini. Gunakan JPG, PNG, atau WEBP.';
const IMAGE_BUSY = 'Tunggu gambar selesai diproses…';

const fetchSeo = (siteId: number) => apiGet<SiteSeoResponse>('customer_get_site_seo', { site_id: siteId });

/** id elemen setiap kolom (label, pesan error, fokus ke error pertama). Tampil di Google: radio yang terpilih. */
const FIELD_ID: Record<Exclude<SeoField, 'index_mode'>, string> = {
  title: 'seo-title',
  description: 'seo-description',
  og_image: fieldDomId(IMAGE_PATH),
  schema_type: 'seo-schema',
  google_verification: 'seo-google',
  bing_verification: 'seo-bing',
};
const indexOptionId = (value: string) => `seo-index-${value}`;

const a11y = (id: string, opts: { error?: string; help?: boolean; counter?: boolean }) => ({
  id,
  name: id,
  'aria-invalid': opts.error ? (true as const) : undefined,
  'aria-describedby': describedBy(id, { error: opts.error, help: opts.help ? 'ada' : undefined, counter: opts.counter }),
});

export default function SiteSeoPage() {
  const { siteId: rawId } = useParams();
  const siteId = parseSiteId(rawId);
  const { load, reload, markSuspended } = useSiteLoader(siteId, fetchSeo, LOAD_ERROR);
  useDocumentTitle('SEO situs');

  if (load.status === 'loading') return <SitePageSkeleton label="Memuat pengaturan SEO" rows={3} />;
  if (load.status === 'not_found') return <EditorNotFound />;
  if (load.status === 'error') return <EditorLoadError message={load.message} onRetry={reload} />;

  const { site, data } = load;
  const back = site.order_number
    ? { to: `/akun/pesanan/${encodeURIComponent(site.order_number)}`, label: 'Detail pesanan' }
    : { to: '/akun', label: 'Pesanan saya' };

  return (
    <PageContainer>
      <SitePageHeader
        site={site}
        back={back}
        title="SEO situs"
        description="Atur cara situs Anda tampil di hasil pencarian Google dan saat tautannya dibagikan di media sosial."
      />
      <SeoForm key={site.id} site={site} initial={data} onSuspended={markSuspended} />
    </PageContainer>
  );
}

interface SeoFormProps {
  site: Site;
  initial: SiteSeoResponse;
  onSuspended: () => void;
}

function SeoForm({ site, initial, onSuspended }: SeoFormProps) {
  const [response, setResponse] = useState(initial);
  const [saved, setSaved] = useState<SeoDraft>(() => draftFromSeo(initial.seo));
  const [draft, setDraft] = useState<SeoDraft>(() => draftFromSeo(initial.seo));
  const [errors, setErrors] = useState<SeoErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Gambar saat dibagikan sedang diperkecil di klien (ImageField): simpan ditahan sampai selesai
  const [imageBusy, setImageBusy] = useState(false);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const formErrorRef = useRef<HTMLDivElement>(null);

  const readOnly = site.status !== 'active';
  const locked = readOnly || saving;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const isSchool = hasPostsFeature(site.template_code);

  useLeaveGuard(dirty && !readOnly, LEAVE_MESSAGE);

  const update = <K extends keyof SeoDraft>(key: K, value: SeoDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const focusField = (field: SeoField) => {
    window.setTimeout(() => {
      const id = field === 'index_mode' ? indexOptionId(draft.index_mode) : FIELD_ID[field];
      const el = document.getElementById(id);
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    }, 0);
  };

  const save = async () => {
    if (saving || readOnly) return;
    if (imageBusy) {
      showToast('info', IMAGE_BUSY);
      return;
    }
    if (!dirty) {
      showToast('info', 'Belum ada perubahan untuk disimpan.');
      return;
    }
    setFormError('');
    const found = validateSeoDraft(draft);
    const invalid = SEO_FIELDS.filter((field) => found[field]);
    setErrors(found);
    if (invalid.length) {
      focusField(invalid[0]);
      showToast('danger', invalid.length === 1 ? 'Ada 1 isian yang perlu diperbaiki.' : `Ada ${invalid.length} isian yang perlu diperbaiki.`);
      return;
    }

    setSaving(true);
    // Isian yang dikirim: pembanding bila isian berubah lagi selama permintaan berjalan
    const sent = draft;
    try {
      const res = await apiPost<SiteSeoResponse>('customer_save_site_seo', { site_id: site.id, seo: inputFromSeoDraft(sent) });
      const next = draftFromSeo(res.seo);
      setResponse(res);
      setSaved(next);
      setDraft((current) => mergeSavedDraft(sent, current, next));
      setErrors({});
      showToast('success', res.status.indexable ? 'Pengaturan SEO disimpan. Situs Anda bisa muncul di Google.' : 'Pengaturan SEO disimpan.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SITE_SUSPENDED') {
        onSuspended();
        showToast('danger', err.message);
        return;
      }
      const fieldErrors: SeoErrors = {};
      const extra: string[] = [];
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [key, message] of Object.entries(err.fieldErrors)) {
          if (typeof message !== 'string' || !message.trim()) continue;
          if (isSeoField(key)) fieldErrors[key] = message;
          else extra.push(message);
        }
      }
      setErrors(fieldErrors);
      const first = SEO_FIELDS.find((field) => fieldErrors[field]);
      if (first) {
        if (extra.length) setFormError(extra.join(' '));
        focusField(first);
        showToast('danger', 'Periksa lagi isian yang ditandai.');
      } else {
        setFormError(extra.length ? extra.join(' ') : errorMessage(err, 'Silakan coba lagi.'));
        window.setTimeout(() => formErrorRef.current?.focus(), 0);
      }
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S = Simpan
  const saveRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    saveRef.current = () => void save();
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pratinjau Google: aturan kepala halaman beranda yang sama dengan server (siteSeo.ts)
  const preview = useMemo(() => {
    const head = (seo: SiteSeoPublic) =>
      buildSiteHead({
        domain: site.domain,
        templateCode: site.template_code,
        content: (site.content ?? null) as SiteContent | null,
        seo,
        route: { kind: 'home' },
      });
    const base: SiteSeoPublic = { title: '', description: '', og_image: null, schema_type: draft.schema_type, indexable: true };
    const fallback = head(base);
    const actual = head({ ...base, title: cleanLine(draft.title), description: cleanLine(draft.description) });
    return { siteName: actual.siteName, icon: actual.icon, title: actual.title, description: actual.description, fallback };
  }, [draft.title, draft.description, draft.schema_type, site]);

  const reasons = REASON_ORDER.filter((reason) => response.status.reasons.includes(reason) || (reason === 'suspended' && readOnly));
  const googleToken = draft.google_verification.includes('<') ? verificationToken(draft.google_verification) : null;
  const bingToken = draft.bing_verification.includes('<') ? verificationToken(draft.bing_verification) : null;
  const homeUrl = response.urls.home || `https://${site.domain}/`;

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} aria-busy={saving || undefined} aria-label="Pengaturan SEO situs">
      <div className="mt-6 space-y-3 empty:hidden">
        {readOnly && <SuspendedNotice site={site} />}
        {formError && (
          <div ref={formErrorRef} tabIndex={-1} className="rounded-2xl outline-none">
            <Notice tone="danger" title="Pengaturan SEO belum tersimpan">
              {formError}
            </Notice>
          </div>
        )}
      </div>

      <IndexStatus
        site={site}
        reasons={reasons}
        isSchool={isSchool}
        dirty={dirty}
        onChangeMode={() => focusField('index_mode')}
      />

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <FormCard id="seo-look-title" title="Tampilan di Google" description="Judul dan deskripsi beranda situs di hasil pencarian. Boleh dikosongkan.">
            <Field
              id={FIELD_ID.title}
              label="Judul di Google"
              optional
              error={errors.title}
              help="Kosongkan untuk memakai nama dan slogan situs."
              aside={<CharCount id={`${FIELD_ID.title}-count`} length={charCount(cleanLine(draft.title))} max={SITE_SEO_LIMITS.title} />}
            >
              <input
                {...a11y(FIELD_ID.title, { error: errors.title, help: true, counter: true })}
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                disabled={locked}
                placeholder={preview.fallback.title || undefined}
                autoComplete="off"
                className="input-site"
              />
            </Field>
            <Field
              id={FIELD_ID.description}
              label="Deskripsi di Google"
              optional
              error={errors.description}
              help="1–2 kalimat yang membuat orang ingin membuka situs Anda. Kosongkan untuk memakai teks pembuka situs."
              aside={
                <CharCount id={`${FIELD_ID.description}-count`} length={charCount(cleanLine(draft.description))} max={SITE_SEO_LIMITS.description} />
              }
            >
              <textarea
                {...a11y(FIELD_ID.description, { error: errors.description, help: true, counter: true })}
                value={draft.description}
                onChange={(event) => update('description', event.target.value)}
                disabled={locked}
                rows={3}
                placeholder={preview.fallback.description || undefined}
                className="input-site min-h-[96px] resize-y"
              />
            </Field>
            <GoogleSnippet
              url={homeUrl}
              siteName={preview.siteName}
              icon={preview.icon}
              title={preview.title}
              description={preview.description}
              titlePlaceholder="Judul situs"
              descriptionPlaceholder="Isi deskripsi agar cuplikan di Google lebih menarik."
            />
          </FormCard>

          <FormCard id="seo-share-title" title="Gambar saat dibagikan" description="Tampil saat tautan situs dibagikan di WhatsApp, Facebook, atau X.">
            <ImageField
              field={{
                type: 'image',
                key: 'og_image',
                label: 'Gambar',
                help: 'Ukuran ideal 1200×630 px, JPG, PNG, atau WEBP (bukan SVG). Kosongkan untuk memakai logo situs.',
              }}
              path={IMAGE_PATH}
              value={draft.og_image}
              onChange={(value) => {
                if (isSvgDataUri(value)) setErrors((prev) => ({ ...prev, og_image: SVG_IMAGE_ERROR }));
                else update('og_image', value);
              }}
              error={errors.og_image}
              disabled={locked}
              onProcessingChange={setImageBusy}
            />
          </FormCard>

          <section aria-labelledby="seo-index-title" className="card-site p-5 sm:p-6">
            <h2 id="seo-index-title" className="text-[15px] font-semibold text-fg sm:text-base">
              Tampil di Google
            </h2>
            <p id="seo-index-help" className="mt-0.5 text-xs leading-relaxed text-muted">
              Mengatur apakah Google boleh menampilkan situs ini di hasil pencarian.
            </p>
            <div role="radiogroup" aria-labelledby="seo-index-title" aria-describedby="seo-index-help" className="mt-4 grid gap-2.5">
              {indexModeOptions(isSchool).map((option) => {
                const checked = draft.index_mode === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={indexOptionId(option.value)}
                    className={`flex items-start gap-3 rounded-2xl p-3.5 ring-1 ring-inset transition-colors ${
                      checked ? 'bg-brand-50 ring-primary' : 'bg-surface ring-line hover:ring-line-strong'
                    } ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    <input
                      id={indexOptionId(option.value)}
                      type="radio"
                      name="seo-index-mode"
                      value={option.value}
                      checked={checked}
                      onChange={() => update('index_mode', option.value)}
                      disabled={locked}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{option.text}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.index_mode && <p className="error-site">{errors.index_mode}</p>}

            <Field
              id={FIELD_ID.schema_type}
              label="Jenis organisasi"
              error={errors.schema_type}
              help="Membantu Google memahami situs Anda, mis. sebagai sekolah atau usaha."
              className="mt-5 border-t border-line pt-5"
            >
              <select
                {...a11y(FIELD_ID.schema_type, { error: errors.schema_type, help: true })}
                value={draft.schema_type}
                onChange={(event) => update('schema_type', event.target.value as SiteSchemaType)}
                disabled={locked}
                className="input-site"
              >
                {SITE_SCHEMA_TYPES.map((type) => (
                  <option key={type || 'auto'} value={type}>
                    {type ? SCHEMA_LABEL[type] : `${SCHEMA_LABEL['']} (${isSchool ? SCHEMA_LABEL.School : SCHEMA_LABEL.Organization})`}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <FormCard
            id="seo-verify-title"
            title="Verifikasi kepemilikan"
            description="Diperlukan agar Anda bisa memantau situs di Google Search Console (lihat panduan)."
          >
            <Field
              id={FIELD_ID.google_verification}
              label="Kode verifikasi Google Search Console"
              optional
              error={errors.google_verification}
              help={
                googleToken
                  ? `Kode yang dipakai: ${googleToken}`
                  : 'Pilih metode verifikasi “Tag HTML” di Search Console, lalu tempel seluruh tag meta-nya di sini. Kodenya kami ambil otomatis.'
              }
            >
              <input
                {...a11y(FIELD_ID.google_verification, { error: errors.google_verification, help: true })}
                value={draft.google_verification}
                onChange={(event) => update('google_verification', event.target.value)}
                disabled={locked}
                placeholder={'<meta name="google-site-verification" content="…">'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="input-site font-mono text-[14px] max-sm:text-[16px]"
              />
            </Field>
            <Field
              id={FIELD_ID.bing_verification}
              label="Kode verifikasi Bing Webmaster Tools"
              optional
              error={errors.bing_verification}
              help={bingToken ? `Kode yang dipakai: ${bingToken}` : 'Bila ingin terdaftar juga di Bing. Caranya sama: tempel tag meta msvalidate.01.'}
            >
              <input
                {...a11y(FIELD_ID.bing_verification, { error: errors.bing_verification, help: true })}
                value={draft.bing_verification}
                onChange={(event) => update('bing_verification', event.target.value)}
                disabled={locked}
                placeholder={'<meta name="msvalidate.01" content="…">'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="input-site font-mono text-[14px] max-sm:text-[16px]"
              />
            </Field>
          </FormCard>

          {!readOnly && (
            <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-4 ring-1 ring-inset ring-line sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-sm text-muted" aria-live="polite">
                {imageBusy ? IMAGE_BUSY : dirty ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan sudah tersimpan.'}{' '}
                <span className="max-sm:hidden">Tekan Ctrl + S untuk menyimpan cepat.</span>
              </p>
              <button type="button" onClick={() => void save()} disabled={!dirty || saving || imageBusy} className="btn btn-primary">
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Alamat penting dan panduan">
          <section aria-labelledby="seo-links-title" className="card-site p-5 sm:p-6">
            <h2 id="seo-links-title" className="text-[15px] font-semibold text-fg sm:text-base">
              Alamat penting
            </h2>
            <ul className="mt-2 divide-y divide-line">
              <ExternalRow href={homeUrl} icon={<Globe className="h-4 w-4" aria-hidden />} label="Situs Anda" />
              <ExternalRow href={response.urls.sitemap} icon={<FileCode className="h-4 w-4" aria-hidden />} label="Sitemap (peta situs)" />
              <ExternalRow href={response.urls.robots} icon={<FileCode className="h-4 w-4" aria-hidden />} label="robots.txt" />
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-subtle">Alamat ini bisa dibuka setelah domain Anda aktif.</p>
          </section>

          <section aria-labelledby="seo-guide-title" className="card-site p-5 sm:p-6">
            <h2 id="seo-guide-title" className="text-[15px] font-semibold text-fg sm:text-base">
              Daftarkan situs ke Google
            </h2>
            <ol className="mt-3 space-y-3">
              <GuideStep n={1}>
                Buka{' '}
                <a href={SEARCH_CONSOLE_URL} target="_blank" rel="noopener noreferrer" className="link-site">
                  Google Search Console
                  <span className="sr-only"> (tab baru)</span>
                </a>{' '}
                dan masuk dengan akun Google Anda.
              </GuideStep>
              <GuideStep n={2}>
                Klik <strong className="font-medium text-fg">Tambahkan properti</strong>, pilih <strong className="font-medium text-fg">Awalan URL</strong>
                , lalu isi <code className="break-all rounded bg-alt px-1 py-0.5 font-mono text-[12px] text-fg">{homeUrl}</code>.
              </GuideStep>
              <GuideStep n={3}>
                Pilih metode verifikasi <strong className="font-medium text-fg">Tag HTML</strong>, salin tag meta-nya, tempel di kolom kode verifikasi
                Google di halaman ini, lalu klik <strong className="font-medium text-fg">Simpan pengaturan</strong>.
              </GuideStep>
              <GuideStep n={4}>
                Kembali ke Search Console dan klik <strong className="font-medium text-fg">Verifikasi</strong>.
              </GuideStep>
              <GuideStep n={5}>
                Buka menu <strong className="font-medium text-fg">Peta situs</strong>, isi{' '}
                <code className="rounded bg-alt px-1 py-0.5 font-mono text-[12px] text-fg">sitemap.xml</code>, lalu klik{' '}
                <strong className="font-medium text-fg">Kirim</strong>.
              </GuideStep>
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-subtle">
              Google biasanya butuh beberapa hari sampai beberapa minggu untuk mulai menampilkan situs baru.
            </p>
          </section>
        </aside>
      </div>

      <Toast toast={toast} onClose={dismissToast} />
    </form>
  );
}

/** Kartu status: bisa tampil di Google, atau alasan-alasannya beserta langkah perbaikan. */
function IndexStatus({
  site,
  reasons,
  isSchool,
  dirty,
  onChangeMode,
}: {
  site: Site;
  reasons: SiteIndexReason[];
  isSchool: boolean;
  dirty: boolean;
  onChangeMode: () => void;
}) {
  const ok = reasons.length === 0;
  const name = isSchool ? 'sekolah' : 'perusahaan';
  const items: Record<SiteIndexReason, { title: string; text: string; action?: ReactNode }> = {
    suspended: {
      title: 'Situs dinonaktifkan sementara',
      text: 'Situs yang dinonaktifkan tidak bisa dibuka siapa pun, termasuk Google. Hubungi kami untuk mengaktifkannya kembali.',
    },
    manual_noindex: {
      title: 'Anda memilih menyembunyikan situs dari Google',
      text: 'Pilihan “Tampil di Google” sedang “Tidak”. Ubah ke Otomatis atau Ya, lalu simpan.',
      action: (
        <button type="button" onClick={onChangeMode} className="btn btn-outline btn-sm">
          Ubah pilihan
        </button>
      ),
    },
    // Nama hanya dicocokkan dengan nama contoh template; pembeli yang nama aslinya memang sama (mis. nama sekolah nyata
    // yang dipakai sebagai demo) memilih "Ya, tampilkan" alih-alih mengganti nama.
    default_content: {
      title: `Nama ${name} masih sama dengan nama contoh template`,
      text: `Ubah nama ${name} di Kelola konten, lalu simpan. Setelah itu situs otomatis boleh tampil di Google. Bila nama itu memang nama ${name} Anda, pilih “Ya, tampilkan” di Tampil di Google, lalu simpan.`,
      action: (
        <div className="flex flex-wrap gap-2">
          <Link to={siteLinks(site.id).content} className="btn btn-outline btn-sm">
            Buka Kelola konten
          </Link>
          <button type="button" onClick={onChangeMode} className="btn btn-outline btn-sm">
            Ubah pilihan
          </button>
        </div>
      ),
    },
  };

  return (
    <section
      aria-labelledby="seo-status-title"
      className={`mt-6 rounded-[24px] p-5 ring-1 ring-inset sm:p-6 ${ok ? 'bg-success-50 ring-success/20' : 'bg-warning-50 ring-warning/25'}`}
    >
      <div className="flex gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface ${ok ? 'text-success' : 'text-warning'}`}
          aria-hidden
        >
          {ok ? <CircleCheck className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="seo-status-title" className="text-base font-semibold text-fg sm:text-lg">
            {ok ? 'Situs Anda bisa muncul di Google' : 'Situs Anda belum bisa muncul di Google'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {ok
              ? 'Google boleh menampilkan situs ini. Agar lebih cepat ditemukan, daftarkan situs di Google Search Console (lihat panduan).'
              : 'Perbaiki hal berikut agar Google boleh menampilkan situs Anda:'}
          </p>
          {!ok && (
            <ul className="mt-3 space-y-2.5">
              {reasons.map((reason) => (
                <li key={reason} className="rounded-2xl bg-surface p-3.5 ring-1 ring-inset ring-line sm:p-4">
                  <p className="text-sm font-medium text-fg">{items[reason].title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{items[reason].text}</p>
                  {items[reason].action && <div className="mt-2.5">{items[reason].action}</div>}
                </li>
              ))}
            </ul>
          )}
          {dirty && <p className="mt-3 text-xs text-subtle">Status ini diperbarui setelah perubahan disimpan.</p>}
        </div>
      </div>
    </section>
  );
}

function FormCard({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card-site p-5 sm:p-6">
      <h2 id={id} className="text-[15px] font-semibold text-fg sm:text-base">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function ExternalRow({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alt text-subtle">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg group-hover:text-primary">{label}</span>
          <span className="block truncate text-xs text-muted">{href}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <span className="sr-only">(tab baru)</span>
      </a>
    </li>
  );
}

function GuideStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold tabular-nums text-primary" aria-hidden>
        {n}
      </span>
      <span className="min-w-0 text-sm leading-relaxed text-muted">{children}</span>
    </li>
  );
}
