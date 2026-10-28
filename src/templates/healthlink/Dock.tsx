// Bilah aksi bawah HealthLink (HP saja, wadah < @3xl): kartu putih melayang berisi "Chat Dokter" + "Video Call", muncul
// setelah hero digulir lewat (sebelumnya ubin di kartu hero sudah memberi aksi yang sama). Menempel di tepi bawah area
// gulir lewat lapisan sticky setinggi 0 (pola lapisan pratinjau Shell). Sisi kanan dikosongkan 76px untuk tombol
// WhatsApp melayang Shell (16px dari tepi, 48px) dan tombol "Kembali ke atas" (76px dari bawah) — tidak bertabrakan,
// dengan atau tanpa nomor WhatsApp. Tersembunyi = `inert` + aria-hidden (tidak bisa difokus).
import { MessageCircle, Video } from 'lucide-react';
import { useRef } from 'react';
import { ActionLink } from '../shared/Shell';
import { usePastHero } from './hooks';
import type { HealthLinkModel } from './model';

const DOCK_BUTTON = 'flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] px-2 text-[14px] font-semibold transition-colors duration-200';

export function Dock({ m }: { m: HealthLinkModel }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = usePastHero(ref);
  const chat = m.chatAction && m.dockChatLabel ? m.chatAction : null;
  const video = m.videoAction && m.dockVideoLabel ? m.videoAction : null;
  if (!chat && !video) return null;
  return (
    <div ref={ref} className="pointer-events-none sticky bottom-0 z-30 h-0 @3xl:hidden">
      <div
        data-hl-dock=""
        data-visible={visible ? 'true' : 'false'}
        aria-hidden={visible ? undefined : true}
        inert={!visible}
        className="hl-dock pointer-events-auto absolute bottom-[max(14px,calc(env(safe-area-inset-bottom)+6px))] left-3 right-[76px] flex gap-2 rounded-[20px] bg-white p-1.5 ring-1 ring-inset ring-[#0E1B2B]/[0.1]"
      >
        {chat && (
          <ActionLink action={chat} className={`${DOCK_BUTTON} bg-(--hl-solid) text-white hover:bg-(--hl-solid-hover)`}>
            <MessageCircle aria-hidden className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{m.dockChatLabel}</span>
          </ActionLink>
        )}
        {video && (
          <ActionLink action={video} className={`${DOCK_BUTTON} bg-(--hl-tint) text-(--hl-tint-ink) ring-1 ring-inset ring-transparent hover:ring-(--hl-solid)`}>
            <Video aria-hidden className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{m.dockVideoLabel}</span>
          </ActionLink>
        )}
      </div>
    </div>
  );
}
