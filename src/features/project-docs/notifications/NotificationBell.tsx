// In-app notifications bell (docs/platform/PROJECT-DOCS-SPEC.md §5 pd_notifications_list / pd_notifications_read,
// §7 bell in the admin header and the customer account header).
// FOUNDATION STUB: renders the bell button only. The Customer UI owner adds the unread badge, the dropdown list and
// mark-as-read; keep the export name and the `variant` prop (Header.tsx and AccountLayout.tsx mount it).
import { Bell } from 'lucide-react';

const BUTTON_CLASS = {
  /** admin topbar icon button (same as the other buttons in components/admin/Header.tsx) */
  admin:
    'relative flex h-10 w-10 items-center justify-center rounded-xl text-adm-muted transition-colors hover:bg-adm-hover hover:text-adm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt max-sm:h-9 max-sm:w-9 max-sm:after:absolute max-sm:after:-inset-1',
  /** light account header (pages/account/AccountLayout.tsx) */
  account:
    'relative flex h-10 w-10 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-line transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg hover:ring-line-strong',
} as const;

export function NotificationBell({ variant }: { variant: 'admin' | 'account' }) {
  return (
    <button type="button" aria-label="Notifikasi" title="Notifikasi" className={BUTTON_CLASS[variant]}>
      <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export default NotificationBell;
