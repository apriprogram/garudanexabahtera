// Format template situs pembeli + skema CMS. Kontrak: docs/platform/SPEC.md §7. Jangan ubah bentuknya.
import type { ComponentType } from 'react';

export type FieldType = 'text' | 'textarea' | 'image' | 'url' | 'email' | 'phone' | 'color';

export interface TemplateField {
  type: FieldType;
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  maxLength?: number;
}

export interface TemplateListField {
  type: 'list';
  key: string;
  label: string;
  /** Label satu item, mis. "Layanan" → tombol "Tambah layanan" */
  itemLabel: string;
  fields: TemplateField[];
  max?: number;
}

export type AnyTemplateField = TemplateField | TemplateListField;

export interface TemplateSection {
  key: string;
  label: string;
  description?: string;
  /** Section boleh disembunyikan pembeli (pakai `enabled`) */
  toggleable?: boolean;
  fields: AnyTemplateField[];
}

export type ListItem = Record<string, string>;

export type SectionContent = { enabled?: boolean } & Record<string, string | boolean | ListItem[] | undefined>;

export type SiteContent = Record<string, SectionContent>;

export interface TemplateRenderProps {
  content: SiteContent;
  /** true di pratinjau CMS / demo: tautan tidak membuka halaman lain */
  preview?: boolean;
}

export interface TemplateDefinition {
  code: string;
  name: string;
  sections: TemplateSection[];
  defaultContent: SiteContent;
  Component: ComponentType<TemplateRenderProps>;
}

export const isListField = (field: AnyTemplateField): field is TemplateListField => field.type === 'list';
