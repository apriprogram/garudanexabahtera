// What every workspace tab receives from ProjectWorkspace.
import type { DocType, PdSettings, ProjectDetail } from '../../../../features/project-docs/types';
import type { ToastTone } from '../../template-orders/shared/hooks';

export interface WorkspaceContext {
  project: ProjectDetail;
  /** pd_settings_get (default terms, tax, SLA defaults); null while loading or when it failed */
  settings: PdSettings | null;
  isAdmin: boolean;
  /** Developer: BRD, Jadwal and UAT only */
  canEditType: (type: DocType) => boolean;
  /** reload the project after a change */
  reload: () => void;
  notify: (tone: ToastTone, message: string) => void;
  openTab: (tab: 'ringkasan' | 'dokumen' | 'jadwal' | 'invoice' | 'aktivitas') => void;
  /** in-app navigation that asks first while the Ringkasan form has unsaved changes */
  go: (to: string) => void;
  /** the Ringkasan form reports its unsaved changes (drives the leave guard) */
  setSetupDirty: (dirty: boolean) => void;
}
