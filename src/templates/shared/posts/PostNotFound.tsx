// Halaman tidak ditemukan di dalam situs (slug tidak ada/draf/jenis salah, atau path lain): H1 + tautan ke daftar &
// beranda, di antara header dan footer template. robots noindex diurus applySiteSeoHead (post null / rute notfound).
import { Home, SearchX } from 'lucide-react';
import { SiteLink } from '../SiteLink';
import type { SitePostKind } from '../../../types/sitePosts';
import { PAGE_H1 } from './parts';
import type { PostTheme } from './theme';

export function PostNotFound({ kind, theme }: { kind?: SitePostKind; theme: PostTheme }) {
  return (
    <div data-site-page="notfound" className="mx-auto flex max-w-[620px] flex-col items-center py-8 text-center @3xl:py-16">
      <span aria-hidden className={`flex h-14 w-14 items-center justify-center rounded-full ${theme.soft} ${theme.accent}`}>
        <SearchX className="h-7 w-7" />
      </span>
      <h1 className={`mt-6 ${PAGE_H1} ${theme.display} ${theme.heading}`}>
        {kind === 'berita' ? 'Berita tidak ditemukan' : kind === 'pengumuman' ? 'Pengumuman tidak ditemukan' : 'Halaman tidak ditemukan'}
      </h1>
      <p className={`mt-4 max-w-[48ch] text-[15.5px] leading-relaxed @3xl:text-[17px] ${theme.muted}`}>
        {kind
          ? 'Tulisan ini mungkin sudah dihapus, belum diterbitkan, atau alamatnya berubah.'
          : 'Alamat yang Anda buka tidak ada di situs ini. Periksa kembali alamatnya atau mulai dari beranda.'}
      </p>
      <div className="mt-8 flex w-full flex-col justify-center gap-2.5 @xl:w-auto @xl:flex-row">
        {kind && (
          <SiteLink path={`/${kind}`} className={theme.button}>
            Lihat semua {kind}
          </SiteLink>
        )}
        <SiteLink path="/" className={kind ? theme.buttonGhost : theme.button}>
          <Home aria-hidden className="h-4 w-4" />
          Ke beranda
        </SiteLink>
      </div>
    </div>
  );
}
