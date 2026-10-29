// Konfirmasi hapus satu tulisan (customer_delete_site_post), dipakai daftar dan editor tulisan. Gagal → pesan di dalam
// dialog + toast halaman (notify); tulisan yang ternyata sudah terhapus (POST_NOT_FOUND) dianggap berhasil; situs
// nonaktif → onSuspended.
import { useState } from 'react';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import type { SitePostAdmin } from '../../../types/sitePosts';
import type { ToastTone } from '../cms/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { KIND_COPY } from './postModel';

interface DeletePostDialogProps {
  siteId: number;
  /** null = dialog tertutup */
  post: SitePostAdmin | null;
  onClose: () => void;
  onDeleted: (post: SitePostAdmin) => void;
  onSuspended: (message: string) => void;
  /** Toast milik halaman (dialog tidak merender <Toast> sendiri), mis. saat gagal menghapus */
  notify: (tone: ToastTone, message: string, description?: string) => void;
}

export function DeletePostDialog({ siteId, post, onClose, onDeleted, onSuspended, notify }: DeletePostDialogProps) {
  const [busy, setBusy] = useState(false);
  // Pesan gagal milik tulisan tertentu: dialog untuk tulisan lain mulai tanpa pesan lama
  const [failure, setFailure] = useState<{ id: number; message: string } | null>(null);
  const copy = KIND_COPY[post?.kind ?? 'berita'];

  const close = () => {
    if (busy) return;
    setFailure(null);
    onClose();
  };

  const confirm = async () => {
    if (!post || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await apiPost('customer_delete_site_post', { site_id: siteId, post_id: post.id });
      onDeleted(post);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'POST_NOT_FOUND') {
        onDeleted(post);
      } else if (err instanceof ApiError && err.code === 'SITE_SUSPENDED') {
        onSuspended(err.message);
      } else {
        setFailure({ id: post.id, message: errorMessage(err, `Gagal menghapus ${copy.noun}. Silakan coba lagi.`) });
        notify('danger', `Gagal menghapus ${copy.noun}.`, errorMessage(err, 'Terjadi kesalahan. Coba lagi.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={post !== null}
      title={`Hapus ${copy.noun} ini?`}
      description={
        post && (
          <>
            <span className="font-medium text-fg">&ldquo;{post.title}&rdquo;</span> akan dihapus permanen beserta foto dan jumlah dilihatnya
            {post.status === 'published' ? ', dan halamannya di situs tidak bisa dibuka lagi' : ''}. Tindakan ini tidak bisa dibatalkan.
          </>
        )
      }
      confirmLabel="Ya, hapus"
      cancelLabel="Batal"
      tone="danger"
      loading={busy}
      error={failure && post && failure.id === post.id ? failure.message : null}
      onConfirm={() => void confirm()}
      onClose={close}
    />
  );
}
