// Layar memuat / gagal / tidak ditemukan / template tidak dikenal untuk CMS.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, FileQuestion, LayoutTemplate, MessageCircle, RefreshCw } from 'lucide-react';

export function EditorSkeleton() {
  return (
    <div role="status" aria-label="Memuat editor situs" className="animate-pulse">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="h-9 w-9 rounded-full bg-alt" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-48 rounded-full bg-alt" />
            <span className="block h-3 w-32 rounded-full bg-alt" />
          </span>
          <span className="hidden h-9 w-28 rounded-full bg-alt sm:block" />
          <span className="h-9 w-24 rounded-full bg-alt" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:px-8 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[72px] rounded-[24px] bg-surface ring-1 ring-inset ring-line" />
          ))}
        </div>
        <div className="hidden h-[70vh] rounded-[24px] bg-surface ring-1 ring-inset ring-line lg:block" />
      </div>
      <span className="sr-only">Memuat...</span>
    </div>
  );
}

function StateCard({ icon, title, children, actions }: { icon: ReactNode; title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-14 sm:py-20">
      <div className="card-site flex flex-col items-center px-6 py-10 text-center sm:px-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-alt">{icon}</span>
        <h1 className="mt-4 text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function EditorLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateCard
      icon={<CircleAlert className="h-6 w-6 text-danger" aria-hidden />}
      title="Gagal memuat situs"
      actions={
        <>
          <button type="button" onClick={onRetry} className="btn btn-primary">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Coba lagi
          </button>
          <Link to="/akun" className="btn btn-outline">
            Kembali ke pesanan saya
          </Link>
        </>
      }
    >
      <p role="alert">{message}</p>
    </StateCard>
  );
}

export function EditorNotFound() {
  return (
    <StateCard
      icon={<FileQuestion className="h-6 w-6 text-subtle" aria-hidden />}
      title="Situs tidak ditemukan"
      actions={
        <Link to="/akun" className="btn btn-primary">
          Kembali ke pesanan saya
        </Link>
      }
    >
      <p>Situs ini tidak ada atau bukan milik akun Anda. Situs bisa dikelola setelah pesanan template Anda berstatus Aktif.</p>
    </StateCard>
  );
}

/** `helpHref` = tautan wa.me bantuan situs (pesan menyebut domainnya), sama dengan notice situs dinonaktifkan. */
export function EditorUnknownTemplate({ code, backTo, helpHref }: { code: string; backTo: string; helpHref: string }) {
  return (
    <StateCard
      icon={<LayoutTemplate className="h-6 w-6 text-warning" aria-hidden />}
      title="Template tidak dikenal"
      actions={
        <>
          <Link to={backTo} className="btn btn-primary">
            Kembali ke pesanan
          </Link>
          <a href={helpHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Hubungi kami via WhatsApp
            <span className="sr-only">(tab baru)</span>
          </a>
        </>
      }
    >
      <p>
        Editor untuk template <span className="font-mono text-fg">{code || '(kosong)'}</span> belum tersedia, jadi konten situs ini belum bisa
        diubah dari sini. Hubungi kami agar kami bantu memperbaruinya.
      </p>
    </StateCard>
  );
}
