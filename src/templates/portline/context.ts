// Konteks Portline: tombol di bagian lain (kartu perusahaan grup, "Track a shipment", tautan media/karier) bisa mengisi
// awal formulir kontak (unit bisnis / jenis pertanyaan) sebelum halaman digulir ke Kontak. Tanpa formulir → no-op.
import { createContext, useContext } from 'react';
import type { EnquiryPrefill } from './model';

export interface EnquiryBus {
  /** Nilai awal terbaru (id naik setiap kali diisi, agar formulir tahu ada isian baru) */
  prefill: (EnquiryPrefill & { id: number }) | null;
  setPrefill: (value: EnquiryPrefill) => void;
}

export const EnquiryContext = createContext<EnquiryBus>({ prefill: null, setPrefill: () => undefined });

export const useEnquiry = (): EnquiryBus => useContext(EnquiryContext);
