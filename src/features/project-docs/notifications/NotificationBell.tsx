// In-app notifications bell (docs/platform/PROJECT-DOCS-SPEC.md §5 pd_notifications_list / pd_notifications_read,
// §7 bell in the admin header and the customer account header). Mounted by components/admin/Header.tsx
// (variant admin: adm-* tokens, both themes) and pages/account/AccountLayout.tsx (variant account: light tokens).
//
// Polls every 60 s while the tab is visible (useNotifications) and again whenever the panel opens. The button shows
// the unread count; the panel lists the newest notifications with links into the app, "Tandai dibaca" per item and
// "Tandai semua dibaca". Keyboard: the button carries aria-expanded; opening moves focus into the panel, Escape
// closes it and returns focus to the button, and focus leaving the bell or a click outside closes it.
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Clock,
  FilePen,
  FileSignature,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn, FOCUS_INSET } from '../../../components/admin/ui/cn';
import type { NotificationType, PdNotification } from '../types';
import { inAppLink, relativeTime, unreadBadge } from './notificationCopy';
import { useNotifications } from './useNotifications';

export type NotificationBellVariant = 'admin' | 'account';

type Tone = 'brand' | 'success' | 'warning' | 'danger';

const TYPE_ICON: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  doc_review: { icon: FileSignature, tone: 'brand' },
  invoice_issued: { icon: ReceiptText, tone: 'brand' },
  doc_approved: { icon: CircleCheck, tone: 'success' },
  doc_rejected: { icon: FilePen, tone: 'warning' },
  payment_received: { icon: Wallet, tone: 'success' },
  invoice_due: { icon: Clock, tone: 'warning' },
  invoice_overdue: { icon: CircleAlert, tone: 'danger' },
};

const STYLE = {
  /** light account header (pages/account/AccountLayout.tsx) */
  account: {
    button:
      'relative flex h-10 w-10 items-center justify-center rounded-full text-muted ring-1 ring-inset ring-line transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg hover:ring-line-strong aria-expanded:bg-alt aria-expanded:text-fg',
    badge: 'bg-danger text-white ring-2 ring-surface',
    panel: 'rounded-2xl bg-surface text-fg shadow-float ring-1 ring-line',
    title: 'text-sm font-semibold text-fg',
    sub: 'text-xs text-subtle',
    action:
      'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-primary transition-colors after:absolute after:-inset-1.5 hover:bg-brand-50 disabled:pointer-events-none disabled:text-subtle',
    divider: 'border-line',
    item: 'flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-alt',
    unreadItem: 'bg-brand-50/60',
    itemTitle: 'text-[13px] leading-snug text-fg',
    itemBody: 'text-xs leading-relaxed text-muted',
    time: 'text-[11px] text-subtle',
    dot: 'bg-primary',
    markOne:
      'absolute right-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-subtle transition-colors after:absolute after:-inset-1.5 hover:bg-surface hover:text-primary',
    muted: 'text-muted',
    tone: {
      brand: 'bg-brand-50 text-primary',
      success: 'bg-success-50 text-success-700',
      warning: 'bg-warning-50 text-warning-700',
      danger: 'bg-danger-50 text-danger-700',
    },
  },
  /** admin topbar (components/admin/Header.tsx), same size as its other icon buttons */
  admin: {
    button: cn(
      'relative flex h-10 w-10 items-center justify-center rounded-xl text-adm-muted transition-colors hover:bg-adm-hover hover:text-adm-fg aria-expanded:bg-adm-hover aria-expanded:text-adm-fg max-sm:h-9 max-sm:w-9 max-sm:after:absolute max-sm:after:-inset-1',
      FOCUS_INSET,
    ),
    badge: 'bg-danger text-white ring-2 ring-adm-surface',
    panel: 'rounded-2xl bg-adm-surface shadow-float ring-1 ring-inset ring-adm-line',
    title: 'text-sm font-semibold text-adm-fg',
    sub: 'text-xs text-adm-subtle',
    action: cn(
      'relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-adm-link transition-colors hover:bg-adm-hover disabled:pointer-events-none disabled:text-adm-subtle max-sm:after:absolute max-sm:after:-inset-1.5',
      FOCUS_INSET,
    ),
    divider: 'border-adm-line',
    item: cn('flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-adm-hover', FOCUS_INSET),
    unreadItem: 'bg-adm-ghost',
    itemTitle: 'text-[13px] leading-snug text-adm-fg',
    itemBody: 'text-xs leading-relaxed text-adm-muted',
    time: 'text-[11px] text-adm-subtle',
    dot: 'bg-cobalt',
    markOne: cn(
      'absolute right-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-adm-subtle transition-colors hover:bg-adm-raised hover:text-adm-fg max-sm:after:absolute max-sm:after:-inset-1.5',
      FOCUS_INSET,
    ),
    muted: 'text-adm-muted',
    tone: {
      brand: 'bg-adm-cobalt-soft text-adm-cobalt-fg',
      success: 'bg-adm-mint-soft text-adm-mint-fg',
      warning: 'bg-adm-warning-soft text-adm-warning-fg',
      danger: 'bg-adm-danger-soft text-adm-danger-fg',
    },
  },
} as const;

type Style = (typeof STYLE)[NotificationBellVariant];

/** Panel width (px) and the minimum distance to the viewport edges. */
const PANEL_WIDTH = 380;
const EDGE = 12;

/** Trigger on the blue account topbar (onBrand): white icon and ring; the panel keeps the variant's style. */
const ON_BRAND = {
  button:
    'relative flex h-10 w-10 items-center justify-center rounded-full text-white/85 ring-1 ring-inset ring-white/30 transition-colors after:absolute after:-inset-1 hover:bg-white/10 hover:text-white hover:ring-white/50 focus-visible:outline-white aria-expanded:bg-white/15 aria-expanded:text-white',
  badge: 'bg-danger text-white ring-2 ring-brand-600',
};

export function NotificationBell({ variant, onBrand = false }: { variant: NotificationBellVariant; onBrand?: boolean }) {
  const style = STYLE[variant];
  const { items, unread, status, error, loadedAt, reload, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ right: 0, width: PANEL_WIDTH });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  // Close when the page changes (a notification link was followed, or the browser went back)
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  /** Keeps the panel inside the viewport: right-aligned to the bell, shifted right when the left edge would clip. */
  const place = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
    setPlacement({ width, right: Math.min(0, root.getBoundingClientRect().right - width - EDGE) });
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
    void reload();
  };

  // Tab past the last item (focus leaves the bell) closes the panel
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (open && next && !rootRef.current?.contains(next)) setOpen(false);
  };

  const label = unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi';

  return (
    <div ref={rootRef} className="relative" onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        title="Notifikasi"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={onBrand ? ON_BRAND.button : style.button}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums',
              onBrand ? ON_BRAND.badge : style.badge,
            )}
            aria-hidden
          >
            {unreadBadge(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn('absolute top-full z-50 mt-2 flex max-h-[min(32rem,calc(100dvh-6rem))] flex-col outline-none', style.panel)}
          style={{ right: placement.right, width: placement.width }}
        >
          <div className={cn('flex items-center justify-between gap-3 border-b px-4 pb-2.5 pt-3', style.divider)}>
            <div className="min-w-0">
              <h2 id={titleId} className={style.title}>
                Notifikasi
              </h2>
              <p className={style.sub} aria-live="polite">
                {unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
            <button type="button" className={style.action} onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              Tandai semua dibaca
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {items.length > 0 ? (
              <ul className="space-y-0.5">
                {items.map((n) => (
                  <NotificationItem key={n.id} notification={n} now={loadedAt} style={style} onRead={markRead} onFollow={() => setOpen(false)} />
                ))}
              </ul>
            ) : status === 'loading' ? (
              <PanelMessage style={style} icon={<LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />} title="Memuat notifikasi..." />
            ) : status === 'error' ? (
              <PanelMessage
                style={style}
                icon={<CircleAlert className="h-5 w-5" aria-hidden />}
                title="Notifikasi belum bisa dimuat"
                text={error ?? undefined}
                action={
                  <button type="button" className={style.action} onClick={() => void reload()}>
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Coba lagi
                  </button>
                }
              />
            ) : (
              <PanelMessage
                style={style}
                icon={<BellOff className="h-5 w-5" aria-hidden />}
                title="Belum ada notifikasi."
                text="Kabar persetujuan dokumen dan tagihan proyek akan muncul di sini."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  now,
  style,
  onRead,
  onFollow,
}: {
  notification: PdNotification;
  now: number;
  style: Style;
  onRead: (n: PdNotification) => void;
  onFollow: () => void;
}) {
  const meta = TYPE_ICON[n.type] ?? { icon: Bell, tone: 'brand' as const };
  const Icon = meta.icon;
  const href = inAppLink(n.link);
  const content = (
    <>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', style.tone[meta.tone])} aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn('min-w-0 flex-1', !n.read && 'pr-8')}>
        <span className={cn('block', style.itemTitle, n.read ? 'font-medium' : 'font-semibold')}>
          {!n.read && <span className="sr-only">Belum dibaca: </span>}
          {n.title}
        </span>
        {n.body && <span className={cn('mt-0.5 line-clamp-2 block break-words', style.itemBody)}>{n.body}</span>}
        <span className={cn('mt-1 flex items-center gap-1.5', style.time)}>
          {!n.read && <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />}
          {relativeTime(n.created_at, now)}
        </span>
      </span>
    </>
  );

  return (
    <li className="relative">
      {href ? (
        <Link
          to={href}
          className={cn(style.item, !n.read && style.unreadItem)}
          onClick={() => {
            onRead(n);
            onFollow();
          }}
        >
          {content}
        </Link>
      ) : (
        <div className={cn(style.item, !n.read && style.unreadItem)}>{content}</div>
      )}
      {!n.read && (
        <button type="button" className={style.markOne} onClick={() => onRead(n)} aria-label={`Tandai dibaca: ${n.title}`} title="Tandai dibaca">
          <Check className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

function PanelMessage({ style, icon, title, text, action }: { style: Style; icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', style.tone.brand)}>{icon}</span>
      <p className={cn('mt-3', style.title)}>{title}</p>
      {text && <p className={cn('mt-1 max-w-[16rem] text-xs leading-relaxed', style.muted)}>{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export default NotificationBell;
