// Text helpers of the notification bell: relative time ("5 menit lalu") and the in-app link check.

/** 'YYYY-MM-DD HH:MM:SS' (database time) → ms; NaN when unreadable. */
const parseTimestamp = (value: string) => new Date(String(value ?? '').replace(' ', 'T')).getTime();

/** "Baru saja", "5 menit lalu", "3 jam lalu", "Kemarin", "4 hari lalu", else "21 Okt 2026". */
export function relativeTime(createdAt: string, now: number): string {
  const time = parseTimestamp(createdAt);
  if (Number.isNaN(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Only same-app paths are followed ('/akun/proyek/3', never '//host' or 'https://…'). */
export const inAppLink = (link: string | null | undefined): string | null =>
  typeof link === 'string' && /^\/(?![/\\])/.test(link) ? link : null;

/** Badge text of the unread count. */
export const unreadBadge = (count: number) => (count > 99 ? '99+' : String(count));
