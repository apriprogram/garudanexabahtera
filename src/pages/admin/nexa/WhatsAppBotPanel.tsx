// Bot WhatsApp lewat WAHA di tab Tanya Nexa (permintaan pemilik 2026-10-29, docs/platform/WHATSAPP-BOT-SPEC.md): saklar,
// alamat WAHA, API key, session, nomor WA admin penerima notifikasi, lama jeda bot, alamat webhook untuk dasbor WAHA,
// pesan uji ke nomor admin, dan log alih ke admin manusia dengan tombol Selesai (bot aktif lagi untuk chat itu).
// Tersimpan lewat tombolnya sendiri (waha_save_config), terpisah dari "Simpan semua perubahan" halaman ini. Kunci HMAC
// webhook tidak pernah lewat sini: hanya WAHA_HMAC_KEY di .env server.
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, RotateCw, Save, Send } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  Panel,
  PanelHeader,
  PasswordInput,
  Switch,
} from '../../../components/admin/ui';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import {
  formatHandoffTime,
  handoffStatus,
  parseWahaState,
  type WahaConfig,
  type WahaHandoff,
  type WahaState,
  type WhatsAppNotify,
} from './whatsappBotModel';

/** Pesan gagal yang ditampilkan: koneksi putus → kalimat baku panel admin, selain itu pesan server. */
const failureText = (error: unknown) =>
  error instanceof ApiError && error.status === 0 ? 'Tidak bisa terhubung ke server.' : errorMessage(error, 'kesalahan tidak diketahui');

interface Draft {
  enabled: boolean;
  url: string;
  session: string;
  adminNumber: string;
  pauseHours: string;
  key: string;
  clearKey: boolean;
}

const draftOf = (config: WahaConfig): Draft => ({
  enabled: config.enabled,
  url: config.url,
  session: config.session,
  adminNumber: config.admin_number,
  pauseHours: String(config.pause_hours),
  key: '',
  clearKey: false,
});

export function WhatsAppBotPanel({ notify }: { notify: WhatsAppNotify }) {
  const [state, setState] = useState<WahaState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'test' | `close:${string}`>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [confirmClearKey, setConfirmClearKey] = useState(false);
  const webhookUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/api.php?action=waha_webhook`;

  const apply = useCallback((data: unknown, resetDraft: boolean) => {
    const next = parseWahaState(data);
    if (!next) throw new Error('Respons server tidak sesuai.');
    setState(next);
    if (resetDraft) setDraft(draftOf(next.config));
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      apply(await apiPost('waha_get_config'), true);
    } catch (error) {
      setLoadError(failureText(error));
    }
  }, [apply]);

  useEffect(() => {
    // Satu kali saat tab dibuka (komponen hanya dipasang di tab Tanya Nexa)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat data saat dipasang, seperti GuidesManager
    void load();
  }, [load]);

  const save = async () => {
    if (!draft || busy) return;
    setBusy('save');
    setFieldErrors({});
    try {
      const data = await apiPost('waha_save_config', {
        enabled: draft.enabled,
        url: draft.url.trim(),
        session: draft.session.trim(),
        admin_number: draft.adminNumber.trim(),
        pause_hours: draft.pauseHours.trim(),
        ...(draft.key.trim() !== '' ? { key: draft.key.trim() } : draft.clearKey ? { key: null } : {}),
      });
      apply(data, true);
      notify('success', 'Pengaturan bot WhatsApp tersimpan.', draft.enabled ? 'Bot menjawab pesan yang masuk lewat webhook WAHA.' : 'Bot dimatikan: pesan WhatsApp tidak dijawab otomatis.');
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setFieldErrors(error.fieldErrors);
      notify('error', 'Gagal menyimpan pengaturan bot WhatsApp.', failureText(error));
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    if (busy) return;
    setBusy('test');
    try {
      await apiPost('waha_test');
      notify('success', 'Pesan uji terkirim.', 'Cek WhatsApp nomor admin: notifikasi alih ke admin akan sampai ke nomor itu.');
    } catch (error) {
      notify('error', 'Pesan uji gagal.', failureText(error));
    } finally {
      setBusy('');
    }
  };

  const closeHandoff = async (handoff: WahaHandoff) => {
    if (busy) return;
    setBusy(`close:${handoff.chat_id}`);
    try {
      apply(await apiPost('waha_close_handoff', { chat_id: handoff.chat_id }), false);
      notify('success', 'Bot aktif lagi untuk chat ini.', `${handoff.name || handoff.phone || handoff.chat_id} kembali dijawab Nexa AI.`);
    } catch (error) {
      notify('error', 'Gagal mengaktifkan bot lagi.', failureText(error));
    } finally {
      setBusy('');
    }
  };

  const copyWebhook = () => {
    void navigator.clipboard
      ?.writeText(webhookUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  const header = (
    <PanelHeader
      title="Bot WhatsApp (WAHA)"
      titleAs="h4"
      icon={<MessageCircle />}
      subtitle="Pesan klien ke nomor WhatsApp bisnis dijawab Nexa AI. Bila klien mengetik ADMIN, AI gagal atau belum aktif, chat dialihkan ke admin: nomor admin menerima notifikasi dan bot dijeda untuk chat itu."
    />
  );

  if (!state || !draft) {
    return (
      <Panel>
        {header}
        {loadError ? <ErrorState error={loadError} onRetry={() => void load()} size="sm" /> : <LoadingState label="Memuat pengaturan bot WhatsApp…" />}
      </Panel>
    );
  }

  const { config, handoffs } = state;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const keyStatus = draft.clearKey
    ? 'API key tersimpan akan dihapus saat pengaturan disimpan.'
    : config.key_masked !== ''
      ? `API key tersimpan: ${config.key_masked}`
      : config.key_env
        ? 'Memakai WAHA_API_KEY dari .env server (hanya untuk alamat WAHA_URL).'
        : 'Belum ada API key (kosongkan bila WAHA tidak memakai X-Api-Key).';

  return (
    <Panel className="space-y-4">
      {header}

      {!config.hmac_env && (
        <Notice tone="warning" title="WAHA_HMAC_KEY belum ada di .env server">
          Webhook menolak semua pesan sampai kunci HMAC diisi di .env server, sama dengan kunci HMAC webhook di session WAHA.
        </Notice>
      )}
      {!state.tables_ready && (
        <Notice tone="warning" title="Tabel bot WhatsApp belum ada">
          Jalankan migrasi database/migrations/2026-10-29_049_waha_whatsapp_bot.sql, lalu muat ulang tab ini.
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1 ring-inset ring-adm-line">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-adm-fg">Jawab otomatis</p>
          <p className="mt-0.5 text-xs text-adm-muted">Mati: pesan WhatsApp diabaikan bot (tetap bisa dibalas manual).</p>
        </div>
        <Switch checked={draft.enabled} onChange={(enabled) => set({ enabled })} label={draft.enabled ? 'Aktif' : 'Nonaktif'} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Alamat WAHA"
          htmlFor="waha_url"
          className="md:col-span-2"
          error={fieldErrors.waha_url}
          hint={config.url_env ? `Kosong = pakai WAHA_URL dari .env (${config.url_env}).` : 'Mis. https://waha.contoh.com atau http://IP-server:3000. Pakai https bila WAHA diakses lewat internet.'}
        >
          <Input
            id="waha_url"
            mono
            inputMode="url"
            autoCapitalize="none"
            placeholder={config.url_env || 'https://waha.contoh.com'}
            value={draft.url}
            invalid={!!fieldErrors.waha_url}
            onChange={(event) => set({ url: event.target.value })}
          />
        </Field>
        <Field label="API key WAHA (X-Api-Key)" htmlFor="waha_api_key" error={fieldErrors.waha_api_key} hint={keyStatus}>
          <PasswordInput
            id="waha_api_key"
            mono
            autoComplete="new-password"
            placeholder="Isi untuk mengganti"
            value={draft.key}
            invalid={!!fieldErrors.waha_api_key}
            onChange={(event) => set({ key: event.target.value, clearKey: false })}
          />
        </Field>
        <Field
          label="Session WAHA"
          htmlFor="waha_session"
          error={fieldErrors.waha_session}
          hint={`Kosong = ${config.session_env ? `WAHA_SESSION dari .env (${config.session_env})` : '"default"'}.`}
        >
          <Input
            id="waha_session"
            mono
            autoCapitalize="none"
            placeholder={config.session_env || 'default'}
            value={draft.session}
            invalid={!!fieldErrors.waha_session}
            onChange={(event) => set({ session: event.target.value })}
          />
        </Field>
        <Field
          label="Nomor WhatsApp admin"
          htmlFor="waha_admin_number"
          error={fieldErrors.waha_admin_number}
          hint={
            config.admin_number_env
              ? `Penerima notifikasi "klien butuh admin". Kosong = WAHA_ADMIN_NUMBER dari .env (${config.admin_number_env}).`
              : 'Penerima notifikasi "klien butuh admin", mis. 6281234567890. Harus beda dengan nomor bot.'
          }
        >
          <Input
            id="waha_admin_number"
            type="text"
            inputMode="tel"
            placeholder={config.admin_number_env || '6281234567890'}
            value={draft.adminNumber}
            invalid={!!fieldErrors.waha_admin_number}
            onChange={(event) => set({ adminNumber: event.target.value })}
          />
        </Field>
        <Field
          label="Lama jeda bot (jam)"
          htmlFor="waha_pause_hours"
          error={fieldErrors.waha_pause_hours}
          hint="Setelah dialihkan ke admin, atau admin membalas manual dari nomor bisnis, bot diam di chat itu selama ini (1–72 jam)."
        >
          <Input
            id="waha_pause_hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={72}
            value={draft.pauseHours}
            invalid={!!fieldErrors.waha_pause_hours}
            onChange={(event) => set({ pauseHours: event.target.value })}
          />
        </Field>
      </div>
      {config.key_masked !== '' && (
        <button
          type="button"
          className="text-xs font-medium text-adm-muted underline-offset-2 hover:underline"
          // Menandai hapus dikonfirmasi dulu (sama dengan kunci AI di atas), membatalkan tanda tidak
          onClick={() => (draft.clearKey ? set({ clearKey: false }) : setConfirmClearKey(true))}
        >
          {draft.clearKey ? 'Batal menghapus API key' : 'Hapus API key tersimpan'}
        </button>
      )}
      <ConfirmDialog
        open={confirmClearKey}
        onClose={() => setConfirmClearKey(false)}
        onConfirm={() => {
          set({ clearKey: true, key: '' });
          setConfirmClearKey(false);
          notify('info', 'API key WAHA akan dihapus.', 'Klik Simpan pengaturan WhatsApp untuk menghapusnya dari server.');
        }}
        tone="danger"
        title="Hapus API key WAHA?"
        description={`API key tersimpan ${config.key_masked} dihapus dari server saat kamu klik Simpan pengaturan WhatsApp.`}
      />

      <Field
        label="Alamat webhook untuk WAHA"
        htmlFor="waha_webhook_url"
        hint="Di session WAHA: config.webhooks[].url = alamat ini, events = message dan message.any, hmac.key = WAHA_HMAC_KEY di .env server."
      >
        <Input
          id="waha_webhook_url"
          mono
          readOnly
          value={webhookUrl}
          rightSlot={
            <button
              type="button"
              onClick={copyWebhook}
              aria-label={copied ? 'Alamat webhook tersalin' : 'Salin alamat webhook'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-muted hover:bg-adm-ghost-hover hover:text-adm-fg"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </button>
          }
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button icon={<Save />} disabled={busy !== ''} onClick={() => void save()}>
          {busy === 'save' ? 'Menyimpan…' : 'Simpan pengaturan WhatsApp'}
        </Button>
        <Button variant="secondary" icon={<Send />} disabled={busy !== '' || !config.effective.url || !config.effective.admin_number} onClick={() => void sendTest()}>
          {busy === 'test' ? 'Mengirim…' : 'Kirim pesan uji ke admin'}
        </Button>
        <p className="text-xs text-adm-muted">Pesan uji memakai pengaturan yang sudah tersimpan.</p>
      </div>

      <div className="space-y-3 border-t border-adm-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-adm-fg">Alih ke admin terbaru</p>
          <Button size="sm" variant="ghost" icon={<RotateCw />} disabled={busy !== ''} onClick={() => void load()}>
            Muat ulang
          </Button>
        </div>
        {handoffs.length === 0 ? (
          <p className="text-sm text-adm-muted">Belum ada chat yang dialihkan ke admin.</p>
        ) : (
          <ul className="space-y-2">
            {handoffs.map((handoff) => {
              const status = handoffStatus(handoff);
              return (
                <li key={handoff.id} className="space-y-1.5 rounded-2xl p-3.5 ring-1 ring-inset ring-adm-line">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold text-adm-fg">
                      {handoff.name || 'Tanpa nama'}
                      <span className="ml-2 font-normal text-adm-muted">{handoff.phone ? `+${handoff.phone}` : handoff.chat_id}</span>
                    </p>
                    <Badge tone={status.tone} size="sm">
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-adm-muted">
                    {formatHandoffTime(handoff.created_at)} · {handoff.reason_label}
                    {handoff.notified ? ' · notifikasi terkirim' : ' · notifikasi tidak terkirim'}
                  </p>
                  {handoff.message && <p className="line-clamp-2 break-words text-sm text-adm-fg">“{handoff.message}”</p>}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {handoff.phone && (
                      <Button size="sm" variant="soft" href={`https://wa.me/${handoff.phone}`} target="_blank" rel="noopener noreferrer">
                        Chat klien
                      </Button>
                    )}
                    {handoff.status !== 'selesai' && (
                      <Button size="sm" variant="secondary" disabled={busy !== ''} onClick={() => void closeHandoff(handoff)}>
                        {busy === `close:${handoff.chat_id}` ? 'Memproses…' : 'Selesai, aktifkan bot'}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
