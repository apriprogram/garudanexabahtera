// Komponen tampilan proyek klien (status, thumbnail, sumber, avatar), dipakai Project Clients & Dashboard.
import type { ComponentType, ReactNode } from 'react';
import { Briefcase, CheckCircle, Clock, Globe, Play, XCircle } from 'lucide-react';
import { Badge, SectionLabel, cn } from '../../../components/admin/ui';
import { projectTimeline, type Project } from './projectShared';

/** Pill status proyek (label sama seperti sebelumnya). */
export function ProjectStatusBadge({ status, size }: { status?: string; size?: 'sm' | 'md' }) {
  const s = status?.toLowerCase() || 'pending';
  if (s === 'active')
    return (
      <Badge tone="cobalt" icon={<Play />} size={size}>
        Aktif
      </Badge>
    );
  if (s === 'completed')
    return (
      <Badge tone="mint" icon={<CheckCircle />} size={size}>
        Selesai
      </Badge>
    );
  if (s === 'canceled' || s === 'cancel')
    return (
      <Badge tone="danger" icon={<XCircle />} size={size}>
        Dibatalkan
      </Badge>
    );
  return (
    <Badge tone="warning" icon={<Clock />} size={size}>
      Menunggu
    </Badge>
  );
}

/** Badge "Dari website" untuk pesanan custom dari form publik (source = website). */
export function SourceBadge({ source, className }: { source?: string; className?: string }) {
  if (source !== 'website') return null;
  return (
    <Badge tone="cobalt" variant="soft" size="sm" icon={<Globe />} className={className}>
      Dari website
    </Badge>
  );
}

/** Pill tenggat proyek. */
export function DeadlineBadge({ project }: { project: Pick<Project, 'start_date' | 'end_date'> }) {
  const { deadline, deadlineLabel } = projectTimeline(project);
  return (
    <Badge size="sm" tone={deadline !== null && deadline < 0 ? 'danger' : deadline === 0 ? 'warning' : 'cobalt'}>
      {deadlineLabel}
    </Badge>
  );
}

/** Thumbnail proyek. */
export function ProjectThumb({ project, className }: { project: Pick<Project, 'image'>; className?: string }) {
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-adm-line bg-adm-ghost', className)}>
      {project.image ? (
        <img src={project.image} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Briefcase className="h-[18px] w-[18px] text-adm-subtle" strokeWidth={1.75} aria-hidden />
      )}
    </span>
  );
}

/** Avatar bulat: foto atau inisial di atas tint cobalt. */
export function Avatar({ src, initial, alt = 'Foto profil', className }: { src?: string; initial: ReactNode; alt?: string; className?: string }) {
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-adm-cobalt-soft text-xs font-semibold text-adm-cobalt-fg', className)}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

/** Judul bagian form/detail dengan ikon kecil. */
export function SectionTitle({ icon: Icon, children }: { icon?: ComponentType<{ className?: string; strokeWidth?: number }>; children: ReactNode }) {
  return (
    <SectionLabel>
      <span className="inline-flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-adm-subtle" strokeWidth={1.75} />}
        {children}
      </span>
    </SectionLabel>
  );
}
