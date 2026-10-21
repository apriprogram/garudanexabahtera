// Bilah atas CMS (lengket di bawah header akun): kembali, judul + domain, status simpan, Lihat situs, Simpan.
// Di HP ada baris kedua: tab "Edit konten" / "Pratinjau".
import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleCheck, ExternalLink, Eye, Loader2, Lock, PencilLine, Save } from 'lucide-react';

export type MobileTab = 'edit' | 'preview';
export type SaveState = 'saved' | 'dirty' | 'saving' | 'readonly';

interface EditorToolbarProps {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle: string;
  siteHref: string;
  saveState: SaveState;
  canSave: boolean;
  onSave: () => void;
  tab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

/**
 * Status simpan. Kelas display (`hidden`, `inline-flex`) ditentukan pemanggil: tanpa tailwind-merge, `inline-flex` di
 * kelas dasar akan mengalahkan `hidden` milik pemanggil sehingga kedua status tampil sekaligus di HP.
 * Di HP (< 640px) teks panjang diganti versi pendek agar baris tab tidak melebar.
 */
function SaveStatus({ state, className = '' }: { state: SaveState; className?: string }) {
  const content: { icon: ReactNode; text: string; short?: string; tone: string } = {
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />, text: 'Menyimpan...', tone: 'text-muted' },
    dirty: { icon: <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />, text: 'Belum disimpan', tone: 'text-warning-700' },
    saved: {
      icon: <CircleCheck className="h-3.5 w-3.5 text-success" aria-hidden />,
      text: 'Semua perubahan tersimpan',
      short: 'Tersimpan',
      tone: 'text-muted',
    },
    readonly: { icon: <Lock className="h-3.5 w-3.5 text-subtle" aria-hidden />, text: 'Hanya bisa dilihat', tone: 'text-subtle' },
  }[state];
  return (
    <span role="status" className={`items-center gap-1.5 whitespace-nowrap text-xs font-medium ${content.tone} ${className}`}>
      {content.icon}
      {content.short ? (
        <>
          <span className="max-sm:hidden">{content.text}</span>
          <span className="sm:hidden">{content.short}</span>
        </>
      ) : (
        content.text
      )}
    </span>
  );
}

export const EditorToolbar = forwardRef<HTMLDivElement, EditorToolbarProps>(function EditorToolbar(
  { backTo, backLabel, title, subtitle, siteHref, saveState, canSave, onSave, tab, onTabChange },
  ref,
) {
  return (
    <div
      ref={ref}
      className="sticky top-[calc(4rem_+_env(safe-area-inset-top))] z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          to={backTo}
          aria-label={backLabel}
          title={backLabel}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg max-sm:h-9 max-sm:w-9"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-fg sm:text-lg">{title}</h1>
          <p className="truncate text-xs text-subtle sm:text-[13px]">{subtitle}</p>
        </div>
        <SaveStatus state={saveState} className="hidden md:inline-flex" />
        <a
          href={siteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm shrink-0 max-sm:w-8 max-sm:px-0"
          aria-label="Lihat situs (tab baru)"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span className="max-sm:sr-only">Lihat situs</span>
        </a>
        {saveState !== 'readonly' && (
          <button type="button" onClick={onSave} disabled={!canSave} className="btn btn-primary btn-sm shrink-0" aria-keyshortcuts="Control+S Meta+S">
            {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            {saveState === 'saving' ? 'Menyimpan...' : 'Simpan'}
          </button>
        )}
      </div>

      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] items-center gap-2 px-4 pb-2.5 sm:px-6 lg:hidden">
        <div role="group" aria-label="Tampilan editor" className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-pressed={tab === 'edit'}
            onClick={() => onTabChange('edit')}
            className="chip-site max-sm:h-8 max-sm:px-3 max-sm:text-xs"
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            Edit konten
          </button>
          <button
            type="button"
            aria-pressed={tab === 'preview'}
            onClick={() => onTabChange('preview')}
            className="chip-site max-sm:h-8 max-sm:px-3 max-sm:text-xs"
          >
            <Eye className="h-4 w-4" aria-hidden />
            Pratinjau
          </button>
        </div>
        <SaveStatus state={saveState} className="ml-auto inline-flex min-w-0 md:hidden" />
      </div>
    </div>
  );
});
