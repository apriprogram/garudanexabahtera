// Field gambar CMS: pratinjau, unggah/ganti (klik atau seret file), hapus, kembali ke gambar bawaan.
// Gambar diperkecil di klien (maks. 1600 px, ≤ 2 MB) lalu disimpan di konten sebagai data-URI sampai Simpan.
// onProcessingChange (opsional) memberi tahu induk selama gambar diproses, mis. agar tombol Simpan ditahan dulu.
import { useRef, useState, type DragEvent } from 'react';
import { ImageOff, ImagePlus, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { errorMessage } from '../../../lib/api';
import { fieldDomId, imageSrc, isDataUri } from './content';
import { FieldMessage, type FieldControlProps } from './FieldControl';
import { ACCEPT_ATTR, MAX_IMAGE_DIMENSION, MAX_IMAGE_MB, prepareImage } from './image';

interface ImageFieldProps extends FieldControlProps {
  /** true saat gambar mulai diproses, false saat selesai (berhasil maupun gagal) */
  onProcessingChange?: (busy: boolean) => void;
}

export function ImageField({ field, path, value, onChange, error, disabled, defaultValue, onProcessingChange }: ImageFieldProps) {
  const id = fieldDomId(path);
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);

  const src = imageSrc(value);
  const isNew = isDataUri(value);
  const canReset = !!defaultValue && value !== defaultValue;
  const shownError = uploadError || error;
  // Bantuan field (mis. Logo) sudah menyebut format/ukuran: tambahkan kalimat pendek saja agar tidak mengulang
  const help = field.help
    ? `${field.help} Gambar besar otomatis diperkecil.`
    : `PNG, JPG, WEBP, GIF, atau SVG. Gambar besar otomatis diperkecil ke ${MAX_IMAGE_DIMENSION} px (maks. ${MAX_IMAGE_MB} MB).`;

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploadError('');
    setProcessing(true);
    onProcessingChange?.(true);
    try {
      const dataUrl = await prepareImage(file);
      setBroken(null);
      onChange(dataUrl);
    } catch (err) {
      setUploadError(errorMessage(err, 'Gagal memproses gambar. Coba file lain.'));
    } finally {
      setProcessing(false);
      onProcessingChange?.(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <p id={`${id}-label`} className="label-site">
        {field.label}
      </p>
      <div className="flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-start">
        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-alt ring-1 ring-inset transition-colors min-[400px]:w-36 sm:w-40 ${
            dragging ? 'ring-2 ring-primary' : shownError ? 'ring-danger' : 'ring-line'
          }`}
        >
          {src && broken !== src ? (
            <img src={src} alt={`Pratinjau ${field.label.toLowerCase()}`} onError={() => setBroken(src)} className="h-full w-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-xs text-subtle">
              {src ? <ImageOff className="h-5 w-5" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
              {src ? 'Gambar tidak bisa dimuat' : 'Belum ada gambar'}
            </span>
          )}
          {isNew && !processing && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700 ring-1 ring-inset ring-warning/25">
              Belum disimpan
            </span>
          )}
          {processing && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/85 text-xs font-medium text-muted" role="status">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              Memproses gambar...
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              id={id}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || processing}
              aria-labelledby={`${id}-label ${id}`}
              aria-describedby={shownError ? `${id}-error` : `${id}-help`}
              aria-invalid={shownError ? true : undefined}
              className="btn btn-outline btn-sm"
            >
              <Upload className="h-4 w-4" aria-hidden />
              {src ? 'Ganti gambar' : 'Unggah gambar'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  setUploadError('');
                  onChange('');
                }}
                disabled={disabled || processing}
                className="btn btn-ghost btn-sm"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Hapus
              </button>
            )}
            {canReset && (
              <button
                type="button"
                onClick={() => {
                  setUploadError('');
                  onChange(defaultValue ?? '');
                }}
                disabled={disabled || processing}
                className="btn btn-ghost btn-sm"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Pakai bawaan
              </button>
            )}
          </div>
          <FieldMessage id={id} error={shownError} help={help} />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void handleFile(file);
        }}
      />
    </div>
  );
}
