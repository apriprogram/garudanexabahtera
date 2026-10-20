// Drawer detail proyek (hanya baca) + pratinjau dokumen, dipindah dari Dashboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Hand,
  Mail,
  Paperclip,
  Phone,
  Printer,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Badge, Button, Drawer, ErrorState, Eyebrow, IconBox, IconButton, LoadingState, Modal, ModalBody, ModalFooter, Notice, Panel, cn } from '../../../components/admin/ui';
import { errorMessage } from '../../../lib/api';
import { formatTanggal } from '../../../types/platform';
import {
  downloadProjectFile,
  fetchProjectFile,
  formatProjectPrice,
  isPrivateProjectFile,
  parseProjectFiles,
  serviceLabel,
  type Project,
  type ProjectFile,
  type UserLite,
} from './projectShared';
import { Avatar, ProjectStatusBadge, SectionTitle, SourceBadge } from './ProjectUi';

/**
 * Alamat pratinjau file: file baru/lama di luar folder dokumen langsung dari data/path-nya, file tersimpan di folder
 * dokumen (tertutup untuk publik) diambil dengan token lalu ditampilkan sebagai blob URL yang dilepas saat ditutup.
 */
function usePreviewUrl(file: ProjectFile | null) {
  const [loaded, setLoaded] = useState<{ file: ProjectFile; url?: string; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!file || !isPrivateProjectFile(file)) return;
    let cancelled = false;
    let url = '';
    fetchProjectFile(file).then(
      (blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setLoaded({ file, url });
      },
      (err) => {
        if (!cancelled) setLoaded({ file, error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, attempt]);

  if (!file) return { src: undefined, error: undefined, retry: () => {} };
  if (!isPrivateProjectFile(file)) return { src: file.path || file.data, error: undefined, retry: () => {} };
  const current = loaded?.file === file ? loaded : null;
  return {
    src: current?.url,
    error: current?.error,
    retry: () => {
      setLoaded(null);
      setAttempt((n) => n + 1);
    },
  };
}

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const isImage = (name: string) => IMAGE_EXT.some((ext) => name.toLowerCase().endsWith(ext));
const isPreviewable = (name: string) => name.toLowerCase().endsWith('.pdf') || isImage(name);

const longDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export function ProjectViewDrawer({
  open,
  project,
  usersList,
  onClose,
  onEdit,
}: {
  open: boolean;
  project: Project | null;
  usersList: UserLite[];
  onClose: () => void;
  onEdit: (project: Project) => void;
}) {
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isGrabMode, setIsGrabMode] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const startPinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [downloading, setDownloading] = useState<ProjectFile | null>(null);
  const [downloadError, setDownloadError] = useState('');

  // Reset pratinjau saat file berganti/ditutup, dan saat drawer ditutup
  const [prevPreviewFile, setPrevPreviewFile] = useState(previewFile);
  if (previewFile !== prevPreviewFile) {
    setPrevPreviewFile(previewFile);
    // Pesan gagal unduh milik daftar file tidak ikut ke pratinjau (dan sebaliknya)
    setDownloadError('');
    if (!previewFile) {
      setPanOffset({ x: 0, y: 0 });
      setPdfZoom(100);
      setIsGrabMode(false);
    }
  }
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPreviewFile(null);
      setDownloadError('');
    }
  }

  const preview = usePreviewUrl(open ? previewFile : null);
  const downloadFile = async (file: ProjectFile) => {
    setDownloading(file);
    setDownloadError('');
    try {
      await downloadProjectFile(file);
    } catch (err) {
      setDownloadError(`Gagal mengunduh ${file.name}: ${errorMessage(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  // Objek yang sama di setiap render, agar `downloading === file` tetap cocok selama unduhan berjalan
  const files = useMemo(() => (project ? parseProjectFiles(project.project_files) : []), [project]);
  const price = project ? formatProjectPrice(project) : null;

  return (
    <>
      <Drawer
        open={open && !!project}
        onClose={() => {
          if (!previewFile) onClose();
        }}
        width="sm:max-w-xl md:max-w-2xl"
        customBody
      >
        {project && (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-adm-line px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <IconBox icon={<Eye />} tone="cobalt" />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-adm-fg sm:text-lg">Detail proyek</h2>
                  <p className="mt-0.5 text-[13px] text-adm-muted sm:text-sm">Informasi proyek dan klien (hanya baca)</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" icon={<Edit2 />} onClick={() => onEdit(project)}>
                  Edit
                </Button>
                <IconButton icon={<X />} label="Tutup" variant="soft" size="sm" onClick={onClose} />
              </div>
            </div>

            <ModalBody className="custom-scrollbar space-y-6 sm:space-y-7">
              {project.image && (
                <section>
                  <SectionTitle icon={Camera}>Media & pratinjau</SectionTitle>
                  <div className="mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-2xl border border-adm-line bg-adm-ghost">
                    <img src={project.image} alt={project.name} className="h-full w-full object-cover" />
                  </div>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <ProjectStatusBadge status={project.status} />
                <SourceBadge source={project.source} />
                {project.show_on_website === 1 ? (
                  <Badge tone="mint" size="sm" icon={<Globe />}>
                    Tampil di website
                  </Badge>
                ) : (
                  <Badge tone="mist" size="sm">
                    Tidak tampil di website
                  </Badge>
                )}
                <span className="text-[13px] text-adm-muted">{serviceLabel(project.service_type)}</span>
              </div>

              {project.assigned_user && (
                <section>
                  <SectionTitle icon={Users}>Penanggung jawab (PM)</SectionTitle>
                  <div className="flex flex-wrap gap-2.5">
                    {project.assigned_user.split(', ').map((userName, i) => {
                      const user = usersList.find((u) => u.name === userName);
                      return (
                        <div key={i} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-adm-ghost p-2 pr-3">
                          <Avatar src={user?.avatar} initial={userName.charAt(0).toUpperCase()} />
                          <p className="truncate text-sm font-medium text-adm-fg">{userName}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <div>
                <h3 className="break-words text-xl font-semibold tracking-tight text-adm-fg sm:text-2xl">{project.name}</h3>
                {project.description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-adm-muted">{project.description}</p>}
                {project.created_at && <p className="mt-2 text-xs text-adm-subtle">Dibuat {formatTanggal(project.created_at, true)}</p>}
              </div>

              <section>
                <SectionTitle icon={Users}>Informasi klien</SectionTitle>
                <Panel className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar initial={(project.client_name || '?').charAt(0).toUpperCase()} className="h-10 w-10 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-adm-fg">{project.client_name || '-'}</p>
                      <p className="text-xs text-adm-muted">Klien proyek</p>
                    </div>
                  </div>
                  {project.client_email && (
                    <div className="flex items-center gap-3 text-sm">
                      <IconBox icon={<Mail />} tone="ghost" size="sm" />
                      <a href={`mailto:${project.client_email}`} className="min-w-0 break-all text-adm-fg hover:text-adm-link hover:underline">
                        {project.client_email}
                      </a>
                    </div>
                  )}
                  {project.client_phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <IconBox icon={<Phone />} tone="ghost" size="sm" />
                      <a href={`tel:${project.client_phone}`} className="min-w-0 break-all text-adm-fg hover:text-adm-link hover:underline">
                        {project.client_phone}
                      </a>
                    </div>
                  )}
                </Panel>
              </section>

              <section>
                <SectionTitle icon={DollarSign}>Keuangan & jadwal</SectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Panel padding="sm" className="sm:col-span-2">
                    <p className="mb-1 text-xs text-adm-muted">Anggaran</p>
                    <p className={cn('text-base font-semibold tabular-nums', price ? 'text-adm-mint-fg' : 'text-adm-muted')}>{price ?? 'Belum ditentukan'}</p>
                  </Panel>
                  <Panel padding="sm">
                    <p className="mb-1 text-xs text-adm-muted">Tanggal mulai</p>
                    <p className="text-sm font-semibold text-adm-fg">{longDate(project.start_date)}</p>
                  </Panel>
                  {project.end_date && (
                    <Panel padding="sm">
                      <p className="mb-1 text-xs text-adm-muted">Perkiraan tanggal selesai</p>
                      <p className="text-sm font-semibold text-adm-mint-fg">{longDate(project.end_date)}</p>
                    </Panel>
                  )}
                </div>
              </section>

              {files.length > 0 && (
                <section>
                  <SectionTitle icon={Paperclip}>Materi proyek</SectionTitle>
                  {downloadError && (
                    <Notice tone="danger" onClose={() => setDownloadError('')} className="mb-3">
                      {downloadError}
                    </Notice>
                  )}
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-inset ring-adm-line transition-colors hover:ring-adm-line-strong">
                        <div className="flex min-w-0 items-center gap-3">
                          <IconBox icon={<FileText />} tone="cobalt" size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-adm-fg">{file.name}</p>
                            <p className="text-[11px] text-adm-subtle">{file.size}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {isPreviewable(file.name) && <IconButton icon={<Eye />} label="Pratinjau dokumen" size="sm" onClick={() => setPreviewFile(file)} />}
                          <IconButton icon={<Download />} label="Unduh file" size="sm" loading={downloading === file} onClick={() => downloadFile(file)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Tutup
              </Button>
              <Button onClick={() => onEdit(project)}>Edit proyek</Button>
            </ModalFooter>
          </>
        )}
      </Drawer>

      {/* Pratinjau dokumen */}
      <Modal
        open={!!previewFile && open}
        onClose={() => setPreviewFile(null)}
        title={previewFile ? <span className="block truncate">{previewFile.name}</span> : undefined}
        description="Pratinjau dokumen (hanya baca)"
        icon={<FileText />}
        size="xl"
        zIndex={110}
        customBody
      >
        {previewFile && (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-adm-line px-5 py-2.5 sm:px-6">
              <div className="mr-2 flex items-center gap-0.5 rounded-xl bg-adm-ghost p-1">
                <IconButton
                  icon={<Hand />}
                  label="Mode geser (seret untuk menggulir)"
                  size="sm"
                  aria-pressed={isGrabMode}
                  onClick={() => setIsGrabMode(!isGrabMode)}
                  className={isGrabMode ? 'bg-adm-cobalt-soft text-adm-cobalt-fg hover:bg-adm-cobalt-soft hover:text-adm-cobalt-fg' : undefined}
                />
                <span className="mx-1 h-4 w-px bg-adm-line-strong" aria-hidden />
                <IconButton icon={<ZoomOut />} label="Perkecil" size="sm" onClick={() => setPdfZoom((prev) => Math.max(50, prev - 25))} />
                <span className="w-11 text-center text-xs font-semibold tabular-nums text-adm-muted">{pdfZoom}%</span>
                <IconButton icon={<ZoomIn />} label="Perbesar" size="sm" onClick={() => setPdfZoom((prev) => Math.min(300, prev + 25))} />
              </div>
              <IconButton
                icon={<ExternalLink />}
                label="Buka di tab baru untuk fitur lengkap"
                href={preview.src}
                target="_blank"
                rel="noopener noreferrer"
                disabled={!preview.src}
              />
              <IconButton icon={<Printer />} label="Cetak dokumen" onClick={() => window.print()} />
              <IconButton icon={<Download />} label="Unduh file" loading={downloading === previewFile} onClick={() => downloadFile(previewFile)} />
            </div>
            {downloadError && (
              <Notice tone="danger" onClose={() => setDownloadError('')} className="mx-5 mt-3 shrink-0 sm:mx-6">
                {downloadError}
              </Notice>
            )}

            <div className={cn('custom-scrollbar relative min-h-0 flex-1 overflow-hidden bg-adm-ghost', isGrabMode && 'cursor-grab select-none active:cursor-grabbing')}>
              {isGrabMode && (
                <div
                  className="absolute inset-0 z-10"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startPanX = panOffset.x;
                    const startPanY = panOffset.y;
                    const onMouseMove = (ev: MouseEvent) => setPanOffset({ x: startPanX + ev.clientX - startX, y: startPanY + ev.clientY - startY });
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                  onTouchStart={(e) => {
                    const touches = e.touches;
                    if (touches.length === 2) {
                      const dx = touches[0].clientX - touches[1].clientX;
                      const dy = touches[0].clientY - touches[1].clientY;
                      startPinchRef.current = { dist: Math.hypot(dx, dy), zoom: pdfZoom };
                      return;
                    }
                    if (touches.length === 1) {
                      const startX = touches[0].clientX;
                      const startY = touches[0].clientY;
                      const startPanX = panOffset.x;
                      const startPanY = panOffset.y;
                      const onTouchMove = (ev: TouchEvent) => {
                        if (ev.touches.length === 1) {
                          const t = ev.touches[0];
                          setPanOffset({ x: startPanX + t.clientX - startX, y: startPanY + t.clientY - startY });
                        }
                      };
                      const onTouchEnd = () => {
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                      };
                      document.addEventListener('touchmove', onTouchMove, { passive: false });
                      document.addEventListener('touchend', onTouchEnd);
                    }
                  }}
                  onTouchMove={(e) => {
                    const touches = e.touches;
                    if (touches.length === 2 && startPinchRef.current) {
                      e.preventDefault();
                      const dx = touches[0].clientX - touches[1].clientX;
                      const dy = touches[0].clientY - touches[1].clientY;
                      const ratio = Math.hypot(dx, dy) / startPinchRef.current.dist;
                      setPdfZoom(Math.round(Math.min(300, Math.max(50, startPinchRef.current.zoom * ratio))));
                    }
                  }}
                  onTouchEnd={() => {
                    startPinchRef.current = null;
                  }}
                />
              )}
              <div
                className="flex min-h-full items-center justify-center transition-all duration-200 ease-out"
                style={{
                  transform: `scale(${pdfZoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center',
                  width: '100%',
                }}
              >
                {preview.error ? (
                  <ErrorState title="Gagal memuat dokumen" error={preview.error} onRetry={preview.retry} />
                ) : !preview.src ? (
                  <LoadingState label="Memuat dokumen…" />
                ) : isImage(previewFile.name) ? (
                  <img src={preview.src} alt={previewFile.name} className="h-auto max-w-full object-contain" />
                ) : (
                  <iframe src={preview.src} className="h-[80vh] w-full border-none bg-adm-surface" title="Pratinjau dokumen" />
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-center border-t border-adm-line px-5 py-3">
              <Eyebrow>Akhir dokumen</Eyebrow>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

export default ProjectViewDrawer;
