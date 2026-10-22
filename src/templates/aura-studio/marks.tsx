// Simbol bawaan Aura Studio (orisinal, tanpa huruf, satu warna currentColor): dua kelopak lengkung bergaris tipis
// yang bertemu di dasar, dengan titik embun di atasnya. Monogram (ui.tsx) menaruhnya di dalam lingkaran garis tipis.
// Versi file: public/assets/templates/logos/aura-studio-mark.svg (dengan lingkaran).
export function AuraMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M16 26.5C10.2 23.4 8.6 15.9 12.4 9.2c2.6 3.4 4.1 8.6 3.6 17.3Z" />
      <path d="M16 26.5c5.8-3.1 7.4-10.6 3.6-17.3-2.6 3.4-4.1 8.6-3.6 17.3Z" />
      <path d="M8.5 22.6c2.2 2.6 4.8 3.9 7.5 3.9s5.3-1.3 7.5-3.9" opacity={0.55} />
      <circle cx="16" cy="5.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
