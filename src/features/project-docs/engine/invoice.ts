// Invoice math (spec §4.2), identical in backend/modules/project_docs.php, backend/modules/project_docs.js and here.
// The server always recomputes the totals; the engine uses this for the live preview in the invoice form.
import type { InvoiceCalcOptions, InvoiceItem, InvoiceTotals } from '../types';
import { roundRupiah } from './format';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/**
 * subtotal = Σ round(qty × unit_price); base = subtotal − discount (≥ 0);
 * PPN on: dpp = round(base × num / den), ppn = round(dpp × rate / 100); off: dpp = base, ppn = 0 (rate 0);
 * total = base + ppn; PPh 23 on: pph23 = round(base × rate / 100), else 0 (rate 0); amount_due = total − pph23.
 * Every step rounds to whole rupiah, half away from zero.
 */
export function calcInvoice(items: InvoiceItem[], o: InvoiceCalcOptions): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + roundRupiah(num(item.qty) * num(item.unit_price)), 0);
  const discount = Math.max(0, roundRupiah(num(o.discount)));
  const base = Math.max(0, subtotal - discount);

  const ppnOn = Boolean(o.ppn_enabled);
  const den = num(o.dpp_denominator);
  const dpp = ppnOn && den > 0 ? roundRupiah((base * num(o.dpp_numerator)) / den) : base;
  const ppn_rate = ppnOn ? num(o.ppn_rate) : 0;
  const ppn_amount = ppnOn ? roundRupiah((dpp * ppn_rate) / 100) : 0;
  const total = base + ppn_amount;

  const pph23_rate = o.pph23_enabled ? num(o.pph23_rate) : 0;
  const pph23_amount = o.pph23_enabled ? roundRupiah((base * pph23_rate) / 100) : 0;

  return { subtotal, discount, base, dpp, ppn_rate, ppn_amount, total, pph23_rate, pph23_amount, amount_due: total - pph23_amount };
}
