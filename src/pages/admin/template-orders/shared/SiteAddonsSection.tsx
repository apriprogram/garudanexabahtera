// Bagian "Fitur tambahan" di detail pesanan (docs/platform/SITE-ADDONS-SPEC.md §4.2, §7): keadaan fitur berbayar situs
// pesanan itu, riwayat tagihannya, dan Aktifkan gratis / Nonaktifkan (admin_set_site_addon) dengan konfirmasi.
// admin_set_site_addon khusus admin (ADMIN_ACTIONS): staf lain hanya melihat keadaan dan riwayat, tanpa tombol.
import { useState } from 'react';
import { Gift, PowerOff } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Field, Notice, Textarea } from '../../../../components/admin/ui';
import { ApiError, apiPost, errorMessage } from '../../../../lib/api';
import { getRole } from '../../../../lib/auth';
import { formatRupiah, formatTanggal } from '../../../../types/platform';
import type { SiteAddonOrder, SiteAddonState } from '../../../../types/siteAddons';
import type { ToastTone } from './hooks';
import { AddonOrderHistory, AddonPaymentBadge, DetailList } from './OrderUi';
import { addonPriceText, addonSourceLabel, addonStatus } from './orderUtils';

/** Batas catatan sama dengan backend (pf_str 'Catatan', 255). */
const NOTE_MAX = 255;

type Target = { addon: SiteAddonState; active: boolean };

const mono = (text: string) => <span className="font-mono text-[13px] tabular-nums">{text}</span>;

export function SiteAddonsSection({
  siteId,
  domain,
  addons,
  orders,
  onUpdated,
  notify,
}: {
  siteId: number;
  domain: string;
  /** Fitur yang didukung template situs ini (capableAddons) */
  addons: SiteAddonState[];
  /** addon_orders pesanan ini, terbaru dulu */
  orders: SiteAddonOrder[];
  /** Keadaan fitur terbaru dari respons admin_set_site_addon */
  onUpdated: (addons: SiteAddonState[]) => void;
  notify: (tone: ToastTone, message: string) => void;
}) {
  const isAdmin = getRole() === 'admin';
  // Isi dialog tetap tampil selama animasi tutup
  const [target, setTarget] = useState<Target | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (addon: SiteAddonState, active: boolean) => {
    setTarget({ addon, active });
    setConfirmOpen(true);
    setNote('');
    setNoteError('');
    setError('');
  };

  const close = () => {
    if (!busy) setConfirmOpen(false);
  };

  const submit = async () => {
    if (!target || busy) return;
    const value = note.trim();
    if (value.length > NOTE_MAX) {
      setNoteError(`Catatan maksimal ${NOTE_MAX} karakter.`);
      return;
    }
    const { addon, active } = target;
    setBusy(true);
    setError('');
    try {
      const res = await apiPost<{ addons?: SiteAddonState[] }>('admin_set_site_addon', {
        site_id: siteId,
        addon: addon.code,
        active,
        ...(value ? { note: value } : {}),
      });
      onUpdated(Array.isArray(res.addons) ? res.addons : []);
      setConfirmOpen(false);
      notify('success', active ? `Fitur ${addon.name} aktif di ${domain}.` : `Fitur ${addon.name} dinonaktifkan di ${domain}.`);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.note) setNoteError(err.fieldErrors.note);
      else setError(errorMessage(err, 'Gagal mengubah fitur tambahan.'));
      // Rincian galat tampil di dalam dialog; toast memberi tahu bahwa perubahan tidak tersimpan
      notify('error', active ? `Gagal mengaktifkan fitur ${addon.name}.` : `Gagal menonaktifkan fitur ${addon.name}.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmAddon = target?.addon;
  const paidPurchase = confirmAddon?.purchase && confirmAddon.purchase.source === 'beli' && confirmAddon.purchase.price > 0;

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {addons.map((addon) => {
          const info = addonStatus(addon, orders);
          const purchase = addon.purchase;
          const pending = addon.pending;
          const items =
            info.status === 'active'
              ? [
                  { label: 'Aktif sejak', value: formatTanggal(addon.activated_at, true) },
                  { label: 'Sumber', value: addonSourceLabel(addon.source) },
                  ...(purchase
                    ? [
                        { label: 'Nomor tagihan', value: mono(purchase.addon_number) },
                        { label: 'Harga', value: addonPriceText(purchase.price) },
                        ...(purchase.invoice_number ? [{ label: 'No. nota', value: mono(purchase.invoice_number) }] : []),
                      ]
                    : []),
                ]
              : info.status === 'pending' && pending
                ? [
                    { label: 'Tagihan menunggu', value: mono(pending.addon_number) },
                    { label: 'Harga', value: formatRupiah(pending.price) },
                    { label: 'Pembayaran', value: <AddonPaymentBadge status={pending.payment_status} size="sm" /> },
                    { label: 'Dibuat', value: formatTanggal(pending.created_at, true) },
                  ]
                : info.status === 'revoked' && info.revoked
                  ? [
                      { label: 'Dinonaktifkan pada', value: formatTanggal(info.revoked.revoked_at, true) },
                      { label: 'Nomor tagihan', value: mono(info.revoked.addon_number) },
                      { label: 'Sumber', value: addonSourceLabel(info.revoked.source) },
                      { label: 'Harga saat ini', value: formatRupiah(addon.price) },
                    ]
                  : [{ label: 'Harga saat ini', value: `${formatRupiah(addon.price)} sekali bayar`, full: true }];
          return (
            <li key={addon.code} className="rounded-xl px-4 py-3 ring-1 ring-inset ring-adm-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-adm-fg">{addon.name}</p>
                <Badge tone={info.tone} size="sm">
                  {info.label}
                </Badge>
              </div>
              {info.status === 'locked' && (
                <p className="mt-1 text-[13px] leading-relaxed text-adm-muted">Pembeli bisa membelinya sendiri dari Akun Saya &gt; Fitur tambahan.</p>
              )}
              <DetailList className="mt-3" items={items} />
              {isAdmin ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {addon.active ? (
                    <Button size="sm" variant="danger-soft" icon={<PowerOff />} disabled={busy} onClick={() => open(addon, false)}>
                      Nonaktifkan
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" icon={<Gift />} disabled={busy} onClick={() => open(addon, true)}>
                      Aktifkan gratis
                    </Button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-adm-muted">Hanya admin yang bisa mengaktifkan atau menonaktifkan fitur.</p>
              )}
            </li>
          );
        })}
      </ul>

      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-adm-fg">Riwayat tagihan fitur</h4>
        <AddonOrderHistory orders={orders} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={close}
        onConfirm={submit}
        loading={busy}
        tone={target?.active === false ? 'danger' : 'default'}
        icon={target?.active === false ? <PowerOff /> : <Gift />}
        title={target?.active === false ? `Nonaktifkan ${confirmAddon?.name}?` : `Aktifkan ${confirmAddon?.name} gratis?`}
        description={
          target?.active === false ? (
            <>
              Halaman berita & pengumuman di situs <span className="font-mono font-semibold text-adm-fg">{domain}</span> disembunyikan dan pemilik tidak
              bisa mengelola berita sampai fitur aktif lagi. Tulisan yang sudah ada tidak dihapus.
              {paidPurchase && ' Tidak ada pengembalian dana otomatis; proses refund secara manual bila perlu.'}
            </>
          ) : (
            <>
              Fitur langsung aktif di situs <span className="font-mono font-semibold text-adm-fg">{domain}</span> tanpa biaya dan tanpa nota.
              {confirmAddon?.pending && ` Tagihan ${confirmAddon.pending.addon_number} yang menunggu pembayaran dibatalkan.`}
            </>
          )
        }
        confirmText={target?.active === false ? 'Ya, nonaktifkan' : 'Ya, aktifkan'}
      >
        <div className="space-y-3">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="Catatan" optional htmlFor="addon-note" error={noteError} hint="Tersimpan di riwayat pesanan, hanya terlihat oleh tim.">
            <Textarea
              id="addon-note"
              rows={2}
              maxLength={NOTE_MAX}
              value={note}
              invalid={!!noteError}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError('');
              }}
              placeholder={target?.active === false ? 'mis. Pembayaran dikembalikan atas permintaan pembeli.' : 'mis. Kompensasi gangguan situs.'}
            />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}
