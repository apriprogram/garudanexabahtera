// Satu section template di panel kiri CMS: bisa diciutkan, sakelar tampil/sembunyi (section toggleable),
// lalu field-field section (teks, gambar, warna, list).
import { ChevronDown, EyeOff } from 'lucide-react';
import { isListField, type ListItem, type SiteContent, type TemplateSection } from '../../../templates/types';
import { CmsField } from './CmsField';
import { fieldPath, isSectionEnabled, readList, readText } from './content';
import { ListFieldEditor } from './ListFieldEditor';
import { Notice, Switch } from './ui';
import type { ContentErrors } from './validation';

interface SectionEditorProps {
  section: TemplateSection;
  content: SiteContent;
  defaults: SiteContent;
  open: boolean;
  onToggleOpen: () => void;
  /** Fokus/klik di section ini → pratinjau digulir ke section yang sama */
  onActivate: () => void;
  onTextChange: (key: string, value: string) => void;
  onListChange: (key: string, items: ListItem[]) => void;
  onListItemRemoved: (key: string, item: ListItem, index: number) => void;
  onEnabledChange: (enabled: boolean) => void;
  errors: ContentErrors;
  onBlurPath: (path: string) => void;
  readOnly?: boolean;
}

export function SectionEditor({
  section,
  content,
  defaults,
  open,
  onToggleOpen,
  onActivate,
  onTextChange,
  onListChange,
  onListItemRemoved,
  onEnabledChange,
  errors,
  onBlurPath,
  readOnly,
}: SectionEditorProps) {
  const enabled = isSectionEnabled(content, section.key);
  const panelId = `cms-section-${section.key}`;
  const errorCount = Object.keys(errors).filter((path) => path.startsWith(`${section.key}.`)).length;

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      onFocusCapture={onActivate}
      className={`card-site scroll-mt-[calc(var(--cms-sticky-top,8rem)+1rem)] ${errorCount ? 'ring-danger/40' : ''}`}
      data-cms-section={section.key}
    >
      <div className="flex items-center gap-3 py-2 pl-2 pr-4 sm:pl-3 sm:pr-5">
        <button
          type="button"
          onClick={() => {
            onToggleOpen();
            onActivate();
          }}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-alt"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alt text-subtle" aria-hidden>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span id={`${panelId}-title`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-fg max-sm:text-sm">
              {section.label}
              {!enabled && (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-alt px-2 text-[11px] font-medium text-subtle ring-1 ring-inset ring-line">
                  <EyeOff className="h-3 w-3" aria-hidden />
                  Disembunyikan
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex h-5 items-center rounded-full bg-danger-50 px-2 text-[11px] font-medium text-danger-700">
                  {errorCount} perlu diperbaiki
                </span>
              )}
            </span>
            {section.description && <span className="mt-0.5 block text-xs leading-relaxed text-muted line-clamp-2">{section.description}</span>}
          </span>
        </button>
        {section.toggleable && (
          <Switch
            checked={enabled}
            onChange={(next) => {
              onEnabledChange(next);
              onActivate();
            }}
            disabled={readOnly}
            label={`Tampilkan bagian ${section.label} di situs`}
          />
        )}
      </div>

      {open && (
        <div id={panelId} className="space-y-5 border-t border-line px-4 py-5 sm:px-5">
          {!enabled && (
            <Notice tone="info">
              Bagian ini disembunyikan dari situs. Isiannya tetap tersimpan dan tampil lagi saat Anda mengaktifkan sakelarnya.
            </Notice>
          )}
          {section.fields.map((field) => {
            if (isListField(field)) {
              return (
                <ListFieldEditor
                  key={field.key}
                  sectionKey={section.key}
                  field={field}
                  items={readList(content, section.key, field.key)}
                  onChange={(items) => onListChange(field.key, items)}
                  onRemoved={(item, index) => onListItemRemoved(field.key, item, index)}
                  errors={errors}
                  onBlurPath={onBlurPath}
                  disabled={readOnly}
                />
              );
            }
            const path = fieldPath(section.key, field.key);
            return (
              <CmsField
                key={field.key}
                field={field}
                path={path}
                value={readText(content, section.key, field.key)}
                defaultValue={field.type === 'image' || field.type === 'color' ? readText(defaults, section.key, field.key) : undefined}
                onChange={(value) => onTextChange(field.key, value)}
                onBlur={() => onBlurPath(path)}
                error={errors[path]}
                disabled={readOnly}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
