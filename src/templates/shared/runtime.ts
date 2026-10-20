// Konteks runtime template: mode pratinjau + gulir ke section di dalam root template (bukan seluruh dokumen),
// sehingga aman dipakai di pratinjau CMS yang berada di dalam halaman lain.
import { createContext, useContext } from 'react';

export interface TemplateRuntime {
  /** true di demo/pratinjau CMS: tautan keluar dan formulir tidak dijalankan */
  preview: boolean;
  /** Gulir halus ke section (kunci section atau anchor Indonesia, mis. "contact" / "kontak") */
  goTo: (target: string) => void;
}

export const TemplateRuntimeContext = createContext<TemplateRuntime>({ preview: false, goTo: () => undefined });

export const useTemplateRuntime = () => useContext(TemplateRuntimeContext);
