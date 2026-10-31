// Input suara (Web Speech API; hanya di browser yang mendukungnya, mis. Chrome) untuk kolom pesan Nexa (NexaChat.tsx)
// dan tombol mikrofon kotak prompt hero (sections/hero/HeroPrompt.tsx). Hanya dipanggil di klien.

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export const speechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Mikrofon diizinkan header Permissions-Policy halaman ini (microphone=(self) di .htaccess / nginx.conf)? */
export const microphoneAllowed = (): boolean => {
  const policy = (document as unknown as { permissionsPolicy?: { allowsFeature(feature: string): boolean } }).permissionsPolicy;
  return policy ? policy.allowsFeature('microphone') : true;
};

/** Input suara bisa dipakai di browser ini. */
export const speechInputAvailable = (): boolean => speechRecognition() !== null && microphoneAllowed();
