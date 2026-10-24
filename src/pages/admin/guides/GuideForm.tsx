// Form tambah/edit artikel panduan (aksi admin_save_guide), dialog di tab Panduan. Validasi sama dengan server
// (GUIDE_LIMITS, lihat guideModel.ts); error per kolom dari server tampil di bawah kolomnya, pesan umum di atas form.
// Menutup form yang sudah diubah ditanya dulu, dan memuat ulang/menutup tab browser diperingatkan browser.
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Eye, Save } from 'lucide-react';
import {
  Button,
  Chip,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Notice,
  Segmented,
  Select,
  Switch,
  Textarea,
  checkboxClass,
  cn,
} from '../../../components/admin/ui';
import { ARTICLE_CTAS, GUIDE_LIMITS, type AdminGuide, type ArticleCta } from '../../../content/panduan/core';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { GuideBodyPreview, GuidePreview } from './GuidePreview';
import {
  AUTHOR_NAMES,
  CTA_LABEL,
  GUIDE_FIELDS,
  LINKING_PAGES,
  PLACEHOLDER_EXAMPLES,
  charCount,
  cleanSlugInput,
  draftFromGuide,
  formatCount,
  inputFromDraft,
  isGuideField,
  isLinkedSlug,
  normalizeGuide,
  parseSources,
  slugify,
  todayWib,
  trimSlug,
  validateDraft,
  type GuideDraft,
  type GuideErrors,
  type GuideField,
} from './guideModel';

/** id elemen kolom (fokus ke error pertama). */
const fieldId = (field: GuideField) => `guide-${field}`;

/** Penghitung karakter di kanan label: "12/60", merah bila lewat batas. */
function Counter({ id, value, max }: { id: string; value: string; max: number }) {
  const count = charCount(value.trim());
  return (
    <span id={id} className={cn('mb-1.5 shrink-0 text-xs tabular-nums', count > max ? 'font-medium text-adm-danger-fg' : 'text-adm-subtle')}>
      <span aria-hidden>
        {count}/{max}
      </span>
      <span className="sr-only">
        {count} dari maks. {max} karakter
      </span>
    </span>
  );
}

export function GuideForm({
  open,
  guide,
  guides,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = artikel baru */
  guide: AdminGuide | null;
  /** Semua artikel: pilihan artikel terkait dan pemeriksaan slug ganda */
  guides: readonly AdminGuide[];
  onClose: () => void;
  /** Tersimpan. saved = baris dari server, null bila respons tanpa artikel (daftar dimuat ulang). */
  onSaved: (saved: AdminGuide | null, created: boolean) => void;
}) {
  const isEdit = guide !== null;
  const others = guides.filter((other) => other.id !== guide?.id);
  const [today] = useState(todayWib);
  // Form dipasang ulang (key) setiap kali dibuka, jadi isian awal cukup dibaca sekali
  const [initial] = useState(() => draftFromGuide(guide, others, today));
  const [draft, setDraft] = useState<GuideDraft>(initial);
  // Artikel baru: slug mengikuti judul sampai slug diubah sendiri (dikosongkan = ikut judul lagi)
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [errors, setErrors] = useState<GuideErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bodyMode, setBodyMode] = useState<'write' | 'preview'>('write');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  // Ada isian yang belum disimpan: muat ulang / tutup tab browser ditanya browser dulu
  useEffect(() => {
    if (!open || !dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty]);

  const update = <K extends keyof GuideDraft>(key: K, value: GuideDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (isGuideField(key) && errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const changeTitle = (title: string) => {
    setDraft((prev) => ({ ...prev, title, ...(slugTouched ? {} : { slug: slugify(title) }) }));
    if (errors.title || (!slugTouched && errors.slug)) setErrors((prev) => ({ ...prev, title: undefined, ...(slugTouched ? {} : { slug: undefined }) }));
  };

  const changeSlug = (value: string) => {
    const slug = cleanSlugInput(value);
    setSlugTouched(isEdit || slug !== '');
    update('slug', slug);
  };

  /**
   * Artikel baru dengan slug kosong (atau hanya "-"): slug otomatis dari judul lagi. Dipakai saat kolom slug ditinggalkan
   * dan saat Simpan; selama masih diketik kolomnya boleh kosong.
   */
  const withAutoSlug = (current: GuideDraft): GuideDraft =>
    !isEdit && !trimSlug(current.slug) ? { ...current, slug: slugify(current.title) } : current;

  /** Kolom slug ditinggalkan: strip di ujung dirapikan, slug kosong artikel baru kembali otomatis dari judul. */
  const leaveSlug = () => {
    const next = withAutoSlug({ ...draft, slug: trimSlug(draft.slug) }).slug;
    if (next !== draft.slug) {
      if (!isEdit && !trimSlug(draft.slug)) setSlugTouched(false);
      update('slug', next);
    }
  };

  const toggleRelated = (slug: string) =>
    update('related', draft.related.includes(slug) ? draft.related.filter((item) => item !== slug) : [...draft.related, slug]);

  /** Fokus ke kolom yang error (isi artikel: kembali ke mode Tulis dulu). */
  const focusField = (field: GuideField) => {
    if (field === 'body') setBodyMode('write');
    window.setTimeout(() => {
      const el = document.getElementById(fieldId(field));
      const target = el instanceof HTMLFieldSetElement ? el.querySelector<HTMLElement>('input:not([disabled])') : el;
      target?.focus();
    }, 0);
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError('');
    // Simpan dengan Enter di kolom slug yang dikosongkan: kolomnya belum ditinggalkan, slug otomatis dipasang di sini
    const current = withAutoSlug(draft);
    if (current !== draft) {
      setDraft(current);
      setSlugTouched(false);
    }
    const found = validateDraft(current, others, today);
    setErrors(found);
    const firstInvalid = GUIDE_FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setSaving(true);
    try {
      const data = await apiPost<{ guide?: unknown }>('admin_save_guide', { ...inputFromDraft(current, guide?.id) });
      onSaved(normalizeGuide(data.guide), !isEdit);
    } catch (error) {
      // Error per kolom dari server di bawah kolomnya; kunci yang tidak dikenal form ikut pesan di atas form
      const fieldErrors: GuideErrors = {};
      const extra: string[] = [];
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [key, message] of Object.entries(error.fieldErrors)) {
          if (typeof message !== 'string' || !message.trim()) continue;
          if (isGuideField(key)) fieldErrors[key] = message;
          else extra.push(message);
        }
      }
      const reason =
        error instanceof ApiError && error.status === 0
          ? 'Tidak bisa terhubung ke server.'
          : `Gagal menyimpan: ${errorMessage(error, 'kesalahan tidak diketahui')}`;
      setErrors(fieldErrors);
      setFormError([reason, ...extra].join(' '));
      const firstServer = GUIDE_FIELDS.find((field) => fieldErrors[field]);
      if (firstServer) focusField(firstServer);
      else window.setTimeout(() => noticeRef.current?.focus(), 0);
    } finally {
      setSaving(false);
    }
  };

  const slug = trimSlug(draft.slug);
  // Artikel baru yang slugnya dikosongkan: URL yang tampil = slug otomatis yang dipakai saat kolom ditinggalkan/Simpan
  const shownSlug = withAutoSlug({ ...draft, slug }).slug;
  const slugChanged = isEdit && slug !== guide.slug;
  const authorNames = AUTHOR_NAMES.includes(draft.author) || !draft.author ? AUTHOR_NAMES : [...AUTHOR_NAMES, draft.author];
  const relatedFull = draft.related.length >= GUIDE_LIMITS.relatedMax;
  const sources = useMemo(() => parseSources(draft.sources), [draft.sources]);

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={isEdit ? 'Edit artikel' : 'Tambah artikel'}
        description="Kolom bertanda * wajib diisi. Artikel baru tampil di website setelah Terbitkan dinyalakan."
        icon={<BookOpen />}
        size="xl"
        customBody
      >
        <form onSubmit={handleSubmit} noValidate aria-busy={saving || undefined} className="flex min-h-0 flex-1 flex-col">
          <ModalBody className="space-y-5 sm:space-y-6">
            {formError && (
              <div ref={noticeRef} tabIndex={-1} className="rounded-2xl outline-none">
                <Notice tone="danger">{formError}</Notice>
              </div>
            )}

            <Field
              label="Judul"
              htmlFor={fieldId('title')}
              required
              error={errors.title}
              hint="Judul halaman (H1) sekaligus judul di hasil Google."
              labelAction={<Counter id="guide-title-count" value={draft.title} max={GUIDE_LIMITS.titleMax} />}
            >
              <Input
                id={fieldId('title')}
                value={draft.title}
                onChange={(event) => changeTitle(event.target.value)}
                invalid={!!errors.title}
                aria-required
                aria-describedby="guide-title-count"
                placeholder="mis. Biaya membuat website company profile"
              />
            </Field>

            <Field
              label="Slug"
              htmlFor={fieldId('slug')}
              required
              error={errors.slug}
              hint={
                <>
                  URL artikel: <span className="break-all font-mono text-adm-fg">/panduan/{shownSlug || 'slug-artikel'}</span>
                  {!slugTouched && ' (dibuat otomatis dari judul)'}
                  {slugChanged && guide.reviewed && (
                    <span className="mt-1 block text-adm-warning-fg">
                      Artikel ini sudah terbit: mengganti slug berarti mengganti URL-nya, dan tautan lama tidak lagi berfungsi.
                    </span>
                  )}
                  {/* 4 slug pertama ditautkan kode situs (PLANNED_ARTICLE_SLUGS), juga selagi artikelnya masih draf */}
                  {slugChanged && isLinkedSlug(guide.slug) && (
                    <span className="mt-1 block text-adm-warning-fg">
                      Alamat <span className="break-all font-mono">/panduan/{guide.slug}</span> ditautkan dari {LINKING_PAGES}. Dengan
                      slug baru, halaman-halaman itu kehilangan tautan ke artikel ini.
                    </span>
                  )}
                </>
              }
            >
              <Input
                id={fieldId('slug')}
                mono
                value={draft.slug}
                onChange={(event) => changeSlug(event.target.value)}
                onBlur={leaveSlug}
                invalid={!!errors.slug}
                aria-required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="mis. biaya-website-company-profile"
              />
            </Field>

            <Field
              label="Deskripsi"
              htmlFor={fieldId('description')}
              required
              error={errors.description}
              hint={`Ringkasan 1–2 kalimat (min. ${GUIDE_LIMITS.descriptionMin} karakter). Tampil sebagai cuplikan di hasil Google dan di bawah judul artikel.`}
              labelAction={<Counter id="guide-description-count" value={draft.description} max={GUIDE_LIMITS.descriptionMax} />}
            >
              <Textarea
                id={fieldId('description')}
                rows={3}
                value={draft.description}
                onChange={(event) => update('description', event.target.value)}
                invalid={!!errors.description}
                aria-required
                aria-describedby="guide-description-count"
                className="min-h-[84px] resize-y"
                placeholder="mis. Rincian biaya domain, hosting, desain, dan perawatan website company profile, lengkap dengan contoh angka."
              />
            </Field>

            <Field
              label="Isi artikel"
              htmlFor={bodyMode === 'write' ? fieldId('body') : undefined}
              required
              error={errors.body}
              hint={
                <>
                  Markdown: <code className="font-mono">## Subjudul</code>, <code className="font-mono">**tebal**</code>,{' '}
                  <code className="font-mono">[teks](https://…)</code>, <code className="font-mono">- daftar</code>, dan tabel. Token
                  data diganti data template saat tampil:{' '}
                  {PLACEHOLDER_EXAMPLES.map((token, index) => (
                    <Fragment key={token}>
                      {index > 0 && ', '}
                      <code className="break-all font-mono">{token}</code>
                    </Fragment>
                  ))}
                  . {formatCount(charCount(draft.body.trim()))} karakter (min. {GUIDE_LIMITS.bodyMin}).
                </>
              }
              labelAction={
                <Segmented
                  size="sm"
                  ariaLabel="Mode isi artikel"
                  className="mb-1.5"
                  items={[
                    { value: 'write', label: 'Tulis' },
                    { value: 'preview', label: 'Pratinjau' },
                  ]}
                  value={bodyMode}
                  onChange={setBodyMode}
                />
              }
            >
              {bodyMode === 'write' ? (
                <Textarea
                  id={fieldId('body')}
                  value={draft.body}
                  onChange={(event) => update('body', event.target.value)}
                  invalid={!!errors.body}
                  aria-required
                  className="min-h-[360px] resize-y font-mono text-[14px] leading-relaxed sm:min-h-[480px]"
                  placeholder={'Tulis isi artikel...\n\n## Subjudul pertama\n\nParagraf pembuka.'}
                />
              ) : (
                // Kartu terang seperti halaman artikel di website (token website, bukan token admin)
                <div className="min-h-[360px] rounded-xl bg-surface p-4 text-fg ring-1 ring-inset ring-adm-line sm:min-h-[480px] sm:p-6">
                  <GuideBodyPreview markdown={draft.body} sources={sources} />
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Ajakan di akhir artikel" htmlFor={fieldId('cta')} error={errors.cta}>
                <Select
                  id={fieldId('cta')}
                  value={draft.cta}
                  onChange={(event) => update('cta', event.target.value as ArticleCta)}
                  invalid={!!errors.cta}
                >
                  {ARTICLE_CTAS.map((cta) => (
                    <option key={cta} value={cta}>
                      {CTA_LABEL[cta]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Penulis" htmlFor={fieldId('author')} error={errors.author}>
                <Select
                  id={fieldId('author')}
                  value={draft.author}
                  onChange={(event) => update('author', event.target.value)}
                  invalid={!!errors.author}
                >
                  {authorNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal terbit" htmlFor={fieldId('datePublished')} required error={errors.datePublished}>
                <Input
                  id={fieldId('datePublished')}
                  type="date"
                  max={today}
                  value={draft.datePublished}
                  onChange={(event) => update('datePublished', event.target.value)}
                  invalid={!!errors.datePublished}
                  aria-required
                />
              </Field>
            </div>

            <Field
              label="Sumber"
              optional
              htmlFor={fieldId('sources')}
              error={errors.sources}
              hint={
                <>
                  Satu URL per baris, maks. {GUIDE_LIMITS.sourcesMax}. Tampil sebagai daftar &ldquo;Sumber&rdquo; di akhir artikel, kecuali isi
                  sudah punya bagian <code className="font-mono">## Sumber</code> sendiri.
                </>
              }
            >
              <Textarea
                id={fieldId('sources')}
                rows={4}
                value={draft.sources}
                onChange={(event) => update('sources', event.target.value)}
                invalid={!!errors.sources}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-h-[96px] resize-y font-mono text-[14px]"
                placeholder="https://www.bps.go.id/…"
              />
            </Field>

            <fieldset id={fieldId('related')} className="min-w-0" aria-describedby="guide-related-hint">
              <legend className="mb-1.5 text-[13px] font-medium text-adm-fg">
                Artikel terkait <span className="font-normal text-adm-subtle">(opsional)</span>
              </legend>
              {others.length === 0 ? (
                <p className="text-xs text-adm-muted">Belum ada artikel lain.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-adm-line overflow-y-auto overscroll-contain rounded-xl ring-1 ring-inset ring-adm-line">
                  {others.map((other) => {
                    const checked = draft.related.includes(other.slug);
                    const disabled = !checked && relatedFull;
                    return (
                      <li key={other.id}>
                        <label
                          className={cn(
                            'flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-sm text-adm-fg transition-colors',
                            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-adm-hover',
                          )}
                        >
                          <input
                            type="checkbox"
                            className={checkboxClass}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleRelated(other.slug)}
                          />
                          <span className="min-w-0 flex-1 break-words">{other.title}</span>
                          {!other.reviewed && <Chip>Draf</Chip>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errors.related ? (
                <p id="guide-related-hint" className="mt-1.5 text-xs text-adm-danger-fg" role="alert">
                  {errors.related}
                </p>
              ) : (
                <p id="guide-related-hint" className="mt-1.5 text-xs leading-relaxed text-adm-muted">
                  Dipilih {draft.related.length} dari maks. {GUIDE_LIMITS.relatedMax}. Draf baru ikut tampil setelah terbit.
                </p>
              )}
            </fieldset>

            <div className="rounded-2xl p-4 ring-1 ring-inset ring-adm-line">
              <Switch
                id={fieldId('published')}
                checked={draft.published}
                onChange={(next) => update('published', next)}
                label="Terbitkan"
                description="Nyalakan setelah isi disunting dan dicek faktanya. Draf tidak tampil di website."
              />
              {errors.published && (
                <p className="mt-1.5 text-xs text-adm-danger-fg" role="alert">
                  {errors.published}
                </p>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" icon={<Eye />} onClick={() => setPreviewOpen(true)} className="sm:mr-auto">
              Pratinjau
            </Button>
            <Button variant="secondary" onClick={requestClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" icon={<Save />} loading={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <GuidePreview
        open={open && previewOpen}
        article={{ ...draft, sources }}
        onClose={() => setPreviewOpen(false)}
        zIndex={105}
      />

      <ConfirmDialog
        open={open && confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        tone="danger"
        title="Buang perubahan?"
        description="Isian artikel yang belum disimpan akan hilang."
        confirmText="Ya, buang"
        cancelText="Lanjut menyunting"
      />
    </>
  );
}

export default GuideForm;
