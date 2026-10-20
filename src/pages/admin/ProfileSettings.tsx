import React, { useState } from 'react';
import { User, Mail, Phone, Camera, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge, Button, Field, Input, LoadingState, PageHeader, Panel, PasswordInput, cn } from '../../components/admin/ui';

/** currentUser di localStorage (baris users dari login/get_users). */
interface ProfileUser {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: string;
}

const readStoredUser = (): ProfileUser | null => {
  const storedUser = localStorage.getItem('currentUser');
  return storedUser ? JSON.parse(storedUser) : null;
};

const ProfileSettings: React.FC = () => {
  const [user] = useState(readStoredUser);
  const [formData, setFormData] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    password: ''
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, avatar: compressedDataUrl });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // form hanya tampil bila user ada
    setIsSaving(true);
    setStatus(null);

    try {
      const apiUrl = '/api.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          id: user.id,
          ...formData,
          role: user.role, // Keep existing role
          status: user.status // Keep existing status
        })
      });
      const data = await response.json();
      if (data.success) {
        const updatedUser: ProfileUser & { password?: string } = { ...user, ...formData };
        delete updatedUser.password;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setStatus({ type: 'success', message: 'Profil berhasil diperbarui.' });
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Gagal memperbarui profil.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Tidak bisa terhubung ke server.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <LoadingState label="Memuat profil..." />;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <PageHeader title="Profil saya" description="Atur data diri dan kata sandi akun kamu." />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-4">
        {/* Profile Card */}
        <div className="min-w-0 lg:col-span-1">
          <Panel padding="lg" className="flex h-full flex-col items-center text-center">
            <div className="group relative mb-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-adm-line-strong bg-adm-ghost transition-colors group-hover:border-cobalt sm:h-28 sm:w-28">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Foto profil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-adm-subtle" strokeWidth={1.75} />
                )}
              </div>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-obsidian/60 opacity-0 transition-opacity focus-within:opacity-100 focus-within:ring-2 focus-within:ring-cobalt group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" strokeWidth={1.75} />
                <span className="sr-only">Unggah foto profil</span>
                <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
              </label>
              {/* Penanda unggah yang selalu tampak di HP (tanpa hover) */}
              <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-cobalt text-white ring-2 ring-adm-surface sm:hidden" aria-hidden>
                <Camera className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </div>
            <h3 className="max-w-full truncate text-base font-semibold text-adm-fg">{formData.name}</h3>
            <Badge status={user.role} className="mt-2 capitalize">{user.role === 'admin' ? 'Admin' : 'Pengguna'}</Badge>

            <div className="mt-5 w-full space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-adm-ghost px-3 py-2.5 text-left">
                <Mail className="h-4 w-4 shrink-0 text-adm-subtle" strokeWidth={1.75} />
                <span className="min-w-0 truncate text-[13px] text-adm-muted">{formData.email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-adm-ghost px-3 py-2.5 text-left">
                <Phone className="h-4 w-4 shrink-0 text-adm-subtle" strokeWidth={1.75} />
                <span className="min-w-0 truncate text-[13px] text-adm-muted">{formData.phone}</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Edit Form */}
        <div className="min-w-0 lg:col-span-3">
          <Panel as="form" onSubmit={handleSubmit} padding="lg" className="flex h-full flex-col justify-between gap-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="profile_name">
                <Input
                  id="profile_name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Field>
              <Field label="Email" htmlFor="profile_email">
                <Input
                  id="profile_email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </Field>
              <Field label="Nomor HP" htmlFor="profile_phone">
                <Input
                  id="profile_phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </Field>
              <Field label="Kata sandi baru" hint="Kosongkan kalau tidak ingin mengganti kata sandi." htmlFor="profile_password">
                <PasswordInput
                  id="profile_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-adm-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              {status && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  role={status.type === 'error' ? 'alert' : 'status'}
                  className={cn(
                    'flex items-center gap-2 text-[13px] font-medium sm:text-sm',
                    status.type === 'success' ? 'text-adm-mint-fg' : 'text-adm-danger-fg',
                  )}
                >
                  {status.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  )}
                  {status.message}
                </motion.div>
              )}
              <Button type="submit" loading={isSaving} icon={<Save />} className="max-sm:w-full sm:ml-auto">
                {isSaving ? 'Menyimpan...' : 'Simpan perubahan'}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
