/**
 * Atribut aksesibilitas untuk input di dalam <Field>: id, aria-invalid, aria-describedby, dan aria-required untuk
 * field wajib (form memakai noValidate, jadi status wajib diumumkan lewat ARIA, bukan atribut `required`).
 */
export function fieldProps(id: string, error?: string, hasHelp = false, required = false) {
  return {
    id,
    name: id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : hasHelp ? `${id}-help` : undefined,
    'aria-required': required ? (true as const) : undefined,
  };
}
