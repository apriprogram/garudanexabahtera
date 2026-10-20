/** Atribut aksesibilitas untuk input di dalam <Field>: id, aria-invalid, aria-describedby. */
export function fieldProps(id: string, error?: string, hasHelp = false) {
  return {
    id,
    name: id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-error` : hasHelp ? `${id}-help` : undefined,
  };
}
