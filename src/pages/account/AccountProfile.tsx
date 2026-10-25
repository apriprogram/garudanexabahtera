// Profil saya (/akun/profil): foto profil dan biodata pembeli (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §4).
// Dimuat dengan customer_get_profile, disimpan sekaligus dengan satu tombol lewat customer_update_profile. Foto diolah
// di klien (persegi ≤ 512 px, WebP) sebelum dikirim; `avatar` tidak dikirim bila foto tidak diubah, '' bila dihapus.
// Setelah simpan, profileStore diperbarui: nama & foto di menu akun langsung berganti, dan isian otomatis form pesan
// (getCurrentUser) ikut memakai data baru. Email = email login, tidak bisa diubah di sini.
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, LoaderCircle, Trash2, Undo2 } from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import type { CustomerProfile } from '../../types/platform';
import { UserAvatar } from './AccountLayout';
import { useLeaveGuard } from './cms/useLeaveGuard';
import { Field } from './components/Field';
import { fieldProps } from './components/fieldProps';
import { Notice } from './components/Notice';
import { useDocumentTitle } from './components/payment';
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_SOURCE_MB,
  avatarFileError,
  loadProfile,
  prepareAvatar,
  safeAvatarUrl,
  setProfile,
} from './components/profileStore';
import { ErrorState, Skeleton } from './components/States';
import {
  checkPhone,
  checkText,
  focusFirstError,
  hasErrors,
  normalizePhone,
  type FieldErrors,
} from './components/validation';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: CustomerProfile };

const loadErrorMessage = (err: unknown) =>
  err instanceof ApiError && err.code === 'NETWORK' ? err.message : errorMessage(err, 'Profil belum bisa dimuat. Silakan coba lagi.');

export default function AccountProfile() {
  useDocumentTitle('Profil saya');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((profile) => alive && setState({ status: 'ready', profile }))
      .catch((err: unknown) => alive && setState({ status: 'error', message: loadErrorMessage(err) }));
    return () => {
      alive = false;
    };
  }, []);

  const retry = () => {
    setState({ status: 'loading' });
    loadProfile()
      .then((profile) => setState({ status: 'ready', profile }))
      .catch((err: unknown) => setState({ status: 'error', message: loadErrorMessage(err) }));
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <div className="max-w-3xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">Profil saya</h1>
          <p className="mt-1.5 text-[14px] text-muted sm:text-base">
            Foto dan biodata akun Anda. Nama dan nomor HP dipakai untuk mengisi otomatis form pemesanan berikutnya.
          </p>
        </header>

        <div className="mt-6 sm:mt-8" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && <ProfileSkeleton />}
          {state.status === 'error' && <ErrorState title="Profil belum bisa dimuat" message={state.message} onRetry={retry} />}
          {state.status === 'ready' && <ProfileForm initial={state.profile} />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Form ─────────────────────────── */

type TextField = 'name' | 'phone' | 'company_name' | 'address' | 'city';
type ProfileField = 'avatar' | TextField;
type Values = Record<TextField, string>;

/** Urutan fokus ke field error = urutan tampil. `avatar` = tombol "Unggah foto". */
const FIELD_ORDER: ProfileField[] = ['avatar', 'name', 'phone', 'company_name', 'address', 'city'];
const TEXT_FIELDS: TextField[] = ['name', 'phone', 'company_name', 'address', 'city'];

/** Foto: tidak diubah (kunci avatar tidak dikirim), dihapus (''), atau diganti data URI hasil prepareAvatar. */
type AvatarChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; dataUrl: string };

const valuesFrom = (profile: CustomerProfile): Values => ({
  name: profile.name ?? '',
  phone: profile.phone ?? '',
  company_name: profile.company_name ?? '',
  address: profile.address ?? '',
  city: profile.city ?? '',
});

/** Aturan sama dengan server (customer_update_profile). */
function checkField(key: TextField, values: Values): string | undefined {
  switch (key) {
    case 'name':
      return checkText(values.name, 'Nama', { min: 2, max: 100 });
    case 'phone':
      return checkPhone(values.phone, 'Nomor HP');
    case 'company_name':
      return checkText(values.company_name, 'Nama perusahaan', { required: false, max: 150 });
    case 'address':
      return checkText(values.address, 'Alamat', { required: false, max: 255 });
    case 'city':
      return checkText(values.city, 'Kota', { required: false, max: 100 });
  }
}

const LEAVE_MESSAGE = 'Perubahan profil belum disimpan. Tinggalkan halaman ini?';

function ProfileForm({ initial }: { initial: CustomerProfile }) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState<Values>(() => valuesFrom(initial));
  const [avatar, setAvatar] = useState<AvatarChange>({ kind: 'keep' });
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  // Setelah percobaan simpan pertama, field diperiksa langsung saat diketik (pola sama dengan form pesan)
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Galat dari server: field baru bisa difokus setelah tidak nonaktif lagi (saving selesai dan sudah dirender)
  const focusAfterSave = useRef<FieldErrors<ProfileField> | null>(null);

  useEffect(() => {
    if (saving || !focusAfterSave.current) return;
    focusFirstError(FIELD_ORDER, focusAfterSave.current);
    focusAfterSave.current = null;
  }, [saving]);

  const baseline = valuesFrom(saved);
  const dirty = avatar.kind !== 'keep' || TEXT_FIELDS.some((key) => values[key].trim() !== baseline[key].trim());
  useLeaveGuard(dirty && !saving, LEAVE_MESSAGE);

  const savedAvatar = safeAvatarUrl(saved.avatar);
  // Pratinjau foto baru = data URI dari canvas prepareAvatar (bukan nilai dari server)
  const shownAvatar = avatar.kind === 'new' ? avatar.dataUrl : avatar.kind === 'remove' ? null : savedAvatar;
  const busy = saving || processing;

  const recheck = (key: TextField, next: Values) => setErrors((prev) => ({ ...prev, [key]: checkField(key, next) }));

  const set = (key: TextField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    setSuccess(false);
    // Error tidak dihapus begitu saja: field diperiksa ulang, jadi pesan hilang hanya bila isiannya sudah benar
    if (submitted || errors[key]) recheck(key, next);
  };

  const blur = (key: TextField) => () => {
    // Field kosong yang belum pernah diisi tidak langsung dimarahi; cukup saat simpan
    if (!submitted && !values[key].trim()) return;
    recheck(key, values);
  };

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Kosongkan, supaya memilih file yang sama lagi tetap memicu change
    e.target.value = '';
    if (!file) return;
    setSuccess(false);
    const problem = avatarFileError(file);
    if (problem) {
      setErrors((prev) => ({ ...prev, avatar: problem }));
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await prepareAvatar(file);
      setAvatar({ kind: 'new', dataUrl });
      setErrors((prev) => ({ ...prev, avatar: undefined }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, avatar: errorMessage(err, 'Foto tidak bisa dibaca. Coba file lain.') }));
    } finally {
      setProcessing(false);
    }
  };

  const removePhoto = () => {
    setSuccess(false);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    // Foto baru yang belum disimpan cukup dibuang; foto tersimpan ditandai untuk dihapus saat simpan
    setAvatar(savedAvatar ? { kind: 'remove' } : { kind: 'keep' });
  };

  const undoPhoto = () => {
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    setAvatar({ kind: 'keep' });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setSuccess(false);
    setSubmitted(true);
    const found: FieldErrors<ProfileField> = {};
    for (const key of TEXT_FIELDS) found[key] = checkField(key, values);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstError(FIELD_ORDER, found);
      return;
    }

    const body: Record<string, unknown> = {
      name: values.name.trim(),
      phone: normalizePhone(values.phone),
      company_name: values.company_name.trim() || null,
      address: values.address.trim() || null,
      city: values.city.trim() || null,
    };
    if (avatar.kind === 'remove') body.avatar = '';
    if (avatar.kind === 'new') body.avatar = avatar.dataUrl;

    setSaving(true);
    try {
      const res = await apiPost<{ profile: CustomerProfile }>('customer_update_profile', body);
      const profile = setProfile(res.profile);
      setSaved(profile);
      setValues(valuesFrom(profile));
      setAvatar({ kind: 'keep' });
      setSubmitted(false);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const serverErrors: FieldErrors<ProfileField> = {};
        for (const key of FIELD_ORDER) {
          if (err.fieldErrors[key]) serverErrors[key] = err.fieldErrors[key];
        }
        if (hasErrors(serverErrors)) {
          setErrors(serverErrors);
          focusAfterSave.current = serverErrors;
          return;
        }
      }
      setFormError(errorMessage(err, 'Profil belum tersimpan. Silakan coba lagi.'));
    } finally {
      setSaving(false);
    }
  };

  const text = (key: TextField, required = false, hasHelp = false) => ({
    ...fieldProps(key, errors[key], hasHelp, required),
    value: values[key],
    onChange: set(key),
    onBlur: blur(key),
    disabled: saving,
  });

  const photoStatus = processing
    ? 'Memproses foto...'
    : avatar.kind === 'new'
      ? 'Pratinjau foto baru. Klik Simpan perubahan untuk memakainya.'
      : avatar.kind === 'remove'
        ? 'Foto akan dihapus saat Anda menyimpan perubahan.'
        : '';

  return (
    <form onSubmit={onSubmit} noValidate className="card-site overflow-hidden">
      <section aria-labelledby="profile-photo-title" className="px-5 py-6 sm:px-8 sm:py-7">
        <h2 id="profile-photo-title" className="text-base font-semibold text-fg sm:text-lg">
          Foto profil
        </h2>
        <p className="mt-0.5 text-sm text-muted">Tampil di menu akun Anda. Tanpa foto, yang tampil inisial nama.</p>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <UserAvatar name={values.name.trim() || saved.name} src={shownAvatar} className="h-24 w-24 text-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <button
                id="avatar"
                type="button"
                className="btn btn-outline"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-describedby={errors.avatar ? 'avatar-error' : 'avatar-help'}
              >
                {processing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
                Unggah foto
              </button>
              {/* Foto baru tanpa foto tersimpan cukup dibatalkan (tombol Batalkan), tidak perlu dua tombol yang sama */}
              {shownAvatar && (avatar.kind !== 'new' || savedAvatar) && (
                <button type="button" className="btn btn-ghost text-danger-700 hover:bg-danger-50 hover:text-danger-700" onClick={removePhoto} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hapus foto
                </button>
              )}
              {avatar.kind !== 'keep' && (
                <button type="button" className="btn btn-ghost" onClick={undoPhoto} disabled={busy}>
                  <Undo2 className="h-4 w-4" aria-hidden />
                  Batalkan
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              id="avatar-file"
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={pickPhoto}
              tabIndex={-1}
              aria-hidden
              className="sr-only"
            />
            {/* Wadah live region selalu ada (bukan display:none), supaya pembaca layar membacakan perubahan statusnya */}
            <div aria-live="polite">{photoStatus && <p className="mt-2 text-[13px] font-medium text-fg">{photoStatus}</p>}</div>
            {errors.avatar ? (
              <p id="avatar-error" className="error-site">
                {errors.avatar}
              </p>
            ) : (
              <p id="avatar-help" className="help-site">
                JPG, PNG, atau WEBP, maksimal {AVATAR_MAX_SOURCE_MB} MB. Foto dipotong persegi dari bagian tengah.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="profile-bio-title" className="border-t border-line px-5 py-6 sm:px-8 sm:py-7">
        <h2 id="profile-bio-title" className="text-base font-semibold text-fg sm:text-lg">
          Biodata
        </h2>
        <p className="mt-0.5 text-sm text-muted">Semua isian wajib, kecuali yang bertanda opsional.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nama lengkap" error={errors.name}>
            <input {...text('name', true)} type="text" autoComplete="name" placeholder="mis. Budi Santoso" maxLength={100} className="input-site" />
          </Field>
          <Field id="email" label="Email" help="Email ini dipakai untuk masuk dan tidak bisa diubah di sini.">
            <input
              {...fieldProps('email', undefined, true)}
              type="email"
              value={saved.email}
              readOnly
              className="input-site bg-alt text-muted"
            />
          </Field>
          <Field id="phone" label="Nomor HP" error={errors.phone} help="Nomor WhatsApp aktif untuk konfirmasi pesanan.">
            <input
              {...text('phone', true, true)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="mis. 0812-3456-7890"
              className="input-site"
            />
          </Field>
          <Field id="company_name" label="Nama perusahaan" optional error={errors.company_name}>
            <input
              {...text('company_name')}
              type="text"
              autoComplete="organization"
              placeholder="mis. PT Maju Bersama"
              maxLength={150}
              className="input-site"
            />
          </Field>
          <Field id="address" label="Alamat" optional error={errors.address} className="sm:col-span-2">
            <textarea
              {...text('address')}
              rows={3}
              autoComplete="street-address"
              placeholder="mis. Jl. Merdeka No. 10, Kel. Sukamaju"
              maxLength={255}
              className="input-site min-h-[96px]"
            />
          </Field>
          <Field id="city" label="Kota" optional error={errors.city}>
            <input
              {...text('city')}
              type="text"
              autoComplete="address-level2"
              placeholder="mis. Bandung"
              maxLength={100}
              className="input-site"
            />
          </Field>
        </div>
      </section>

      <div className="border-t border-line bg-alt/60 px-5 py-5 sm:px-8 sm:py-6">
        {formError && (
          <Notice tone="danger" title="Profil belum tersimpan" onClose={() => setFormError(null)} className="mb-4">
            {formError}
          </Notice>
        )}
        {success && (
          <Notice tone="success" onClose={() => setSuccess(false)} className="mb-4">
            Profil tersimpan.
          </Notice>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-[13px] text-muted empty:hidden sm:mr-auto">{dirty ? 'Ada perubahan yang belum disimpan.' : ''}</p>
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
            {saving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Menyimpan...
              </>
            ) : (
              'Simpan perubahan'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function ProfileSkeleton() {
  return (
    <div className="card-site p-5 sm:p-8">
      <Skeleton className="h-5 w-28" />
      <div className="mt-5 flex items-center gap-5">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-3 w-full max-w-[260px]" />
        </div>
      </div>
      <Skeleton className="mt-9 h-5 w-24" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
