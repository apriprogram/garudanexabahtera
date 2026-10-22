// Pratinjau langsung CMS: merender definition.Component (preview=true) dengan konten yang sedang diedit.
// Mode Desktop dirender selebar 1280 px lalu diperkecil agar tata letak desktop tetap akurat; mode HP selebar 390 px.
// Template memakai container query sehingga mengikuti lebar wadah ini, bukan viewport.
// Pengecilan memakai CSS `zoom` (header lengket template tetap benar); browser lama memakai transform.
import { Component, memo, useEffect, useLayoutEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Monitor, Smartphone, TriangleAlert } from 'lucide-react';
import type { SiteContent, TemplateDefinition } from '../../../templates/types';

export type PreviewDevice = 'desktop' | 'mobile';

const DEVICE_WIDTH: Record<PreviewDevice, number> = { desktop: 1280, mobile: 390 };
const FRAME_PADDING = 16;
const SUPPORTS_ZOOM = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '0.5');

class PreviewErrorBoundary extends Component<{ resetKey: unknown; children: ReactNode }, { failed: boolean; failedKey: unknown }> {
  state = { failed: false, failedKey: undefined as unknown };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ failedKey: this.props.resetKey });
    console.error('Pratinjau template gagal dirender:', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: unknown }) {
    // Konten berubah setelah gagal → coba render lagi
    if (this.state.failed && prev.resetKey !== this.props.resetKey && this.state.failedKey !== this.props.resetKey) {
      this.setState({ failed: false, failedKey: undefined });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-warning" aria-hidden />
        <p className="text-sm font-semibold text-fg">Pratinjau tidak bisa ditampilkan</p>
        <p className="max-w-sm text-sm text-muted">Ada isian yang membuat tampilan gagal dimuat. Ubah isian terakhir Anda, pratinjau akan dicoba lagi otomatis.</p>
      </div>
    );
  }
}

interface PreviewPaneProps {
  definition: TemplateDefinition;
  content: SiteContent;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  /** Section yang sedang diedit; pratinjau digulir ke sana */
  activeSection: string | null;
  className?: string;
}

// memo: SiteEditor mengirim konten lewat useDeferredValue. Tanpa memo, setiap ketikan tetap merender ulang seluruh template
// di render mendesak (dengan konten lama), jadi pratinjau tidak benar-benar ditunda dan dirender dua kali.
export const PreviewPane = memo(function PreviewPane({
  definition,
  content,
  device,
  onDeviceChange,
  activeSection,
  className = '',
}: PreviewPaneProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [innerHeight, setInnerHeight] = useState(0);
  const Template = definition.Component;

  const width = DEVICE_WIDTH[device];
  const scale = available > 0 ? Math.min(1, (available - FRAME_PADDING * 2) / width) : 1;

  // Lebar area pratinjau & tinggi template (berubah saat konten/gambar dimuat)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const inner = innerRef.current;
    if (!scroller || !inner) return;
    const measure = () => {
      setAvailable(scroller.clientWidth);
      setInnerHeight(inner.offsetHeight);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  // Gulir pratinjau ke section yang sedang diedit
  useEffect(() => {
    const scroller = scrollerRef.current;
    const inner = innerRef.current;
    if (!activeSection || !scroller || !inner) return;
    const target =
      activeSection === 'brand' || activeSection === 'hero'
        ? null
        : inner.querySelector<HTMLElement>(`[data-tpl-section="${activeSection.replace(/[^\w-]/g, '')}"]`);
    if (activeSection !== 'brand' && activeSection !== 'hero' && !target) return;
    const top = target ? target.getBoundingClientRect().top - inner.getBoundingClientRect().top : 0;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ top: Math.max(0, top - 8), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeSection, device]);

  return (
    <section aria-label="Pratinjau situs" className={`card-site flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">Pratinjau langsung</p>
          <p className="truncate text-xs text-subtle">Tautan & formulir tidak aktif di pratinjau.</p>
        </div>
        <div role="group" aria-label="Lebar pratinjau" className="flex shrink-0 rounded-full bg-alt p-1 ring-1 ring-inset ring-line">
          {(
            [
              { value: 'desktop', label: 'Desktop', Icon: Monitor },
              { value: 'mobile', label: 'HP', Icon: Smartphone },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={device === value}
              onClick={() => onDeviceChange(value)}
              className={`relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors after:absolute after:-inset-y-1.5 after:inset-x-0 ${
                device === value ? 'bg-surface text-fg shadow-soft ring-1 ring-inset ring-line' : 'text-muted hover:text-fg'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-alt" style={{ padding: FRAME_PADDING }}>
        <div
          className={`relative mx-auto overflow-clip bg-white ring-1 ring-line ${device === 'mobile' ? 'rounded-[28px] shadow-soft' : 'rounded-xl'}`}
          style={{ width: width * scale, height: !SUPPORTS_ZOOM && innerHeight ? innerHeight * scale : undefined }}
        >
          <div
            ref={innerRef}
            className={SUPPORTS_ZOOM ? undefined : 'absolute left-0 top-0 origin-top-left'}
            style={
              SUPPORTS_ZOOM
                ? { width, zoom: scale === 1 ? undefined : scale }
                : { width, transform: scale === 1 ? undefined : `scale(${scale})` }
            }
          >
            <PreviewErrorBoundary resetKey={content}>
              <Template content={content} preview />
            </PreviewErrorBoundary>
          </div>
        </div>
      </div>
    </section>
  );
});
