// Kompatibilitas konten lama: field/section bertanda `introduced` (ditambahkan setelah pembeli bisa menyimpan konten)
// tidak boleh tiba-tiba memunculkan isi demo di situs pembeli yang sudah ada. Dipanggil resolveContent (../index).
//
// Aturan (hanya bila ADA konten tersimpan; konten null = demo / situs baru → nilai bawaan utuh):
// - section bertanda introduced yang tidak ada di konten tersimpan → enabled: false (isi bawaan tetap ada, jadi
//   pembeli yang menyalakannya di CMS langsung melihat contoh untuk diganti);
// - field bertanda introduced yang tidak ada di section tersimpan → "" (list → []).
// Section yang sama sekali belum tersimpan (konten parsial dari API) tetap memakai bawaan seperti sebelumnya.
import { isListField, type SiteContent, type TemplateDefinition } from '../types';
import { isPlainObject } from './utils';

export function applyIntroduced(def: TemplateDefinition, saved: Record<string, unknown>, resolved: SiteContent): SiteContent {
  const sections = Array.isArray(def?.sections) ? def.sections : [];
  let result = resolved;
  const patch = (key: string, values: Record<string, unknown>) => {
    if (result === resolved) result = { ...resolved };
    result[key] = { ...(result[key] ?? {}), ...values } as SiteContent[string];
  };

  for (const section of sections) {
    const stored = saved[section.key];
    if (!isPlainObject(stored)) {
      if (section.introduced && result[section.key]) patch(section.key, { enabled: false });
      continue;
    }
    for (const field of section.fields) {
      if (!field.introduced || Object.prototype.hasOwnProperty.call(stored, field.key)) continue;
      patch(section.key, { [field.key]: isListField(field) ? [] : '' });
    }
  }
  return result;
}
