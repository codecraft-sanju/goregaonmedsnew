'use client';

import { useEffect, useRef, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle2, FolderOpen, Images, Loader2, RefreshCw, X } from 'lucide-react';
import { compressPrescription, ImageCompressionError } from '@/lib/imageCompression';
import { uploadPrescription, UploadError } from '@/lib/cloudinaryUpload';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

export type UploadState =
  | { status: 'idle' }
  | { status: 'compressing'; fileName: string }
  | { status: 'uploading'; fileName: string; progress: number; previewUrl: string }
  | { status: 'done'; fileName: string; previewUrl: string; url: string; originalSize: number; uploadedSize: number }
  | { status: 'error'; message: string; file?: File };

interface Props {
  state: UploadState;
  onChange: (state: UploadState) => void;
  error?: string;
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

function failureMessage(error: unknown) {
  if (error instanceof ImageCompressionError || error instanceof UploadError || error instanceof ApiError) return error.message;
  return 'Upload failed. Please try again.';
}

export function PrescriptionUploader({ state, onChange, error }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  // The preview URL lives in the parent's state so it survives step changes; revoke it only when replaced.
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const replacePreview = (next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
  };

  const start = async (file: File) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    onChange({ status: 'compressing', fileName: file.name });
    try {
      const compressed = await compressPrescription(file);
      const previewUrl = URL.createObjectURL(compressed);
      replacePreview(previewUrl);
      onChange({ status: 'uploading', fileName: file.name, progress: 0, previewUrl });
      const url = await uploadPrescription(
        compressed,
        (progress) => !abort.signal.aborted && onChange({ status: 'uploading', fileName: file.name, progress, previewUrl }),
        abort.signal,
      );
      if (abort.signal.aborted) return;
      onChange({ status: 'done', fileName: file.name, previewUrl, url, originalSize: file.size, uploadedSize: compressed.size });
    } catch (err) {
      if (abort.signal.aborted || (err as Error).name === 'AbortError') return;
      onChange({ status: 'error', message: failureMessage(err), file });
    }
  };

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void start(file);
  };

  const reset = () => {
    controller.current?.abort();
    replacePreview(null);
    onChange({ status: 'idle' });
  };

  const busy = state.status === 'compressing' || state.status === 'uploading';
  const previewUrl = state.status === 'uploading' || state.status === 'done' ? state.previewUrl : null;

  return (
    <div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSelect} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onSelect} />
      <input ref={filesInput} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onSelect} />

      <AnimatePresence mode="wait" initial={false}>
        {state.status === 'idle' || state.status === 'error' ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={cn('rounded-3xl border-2 border-dashed p-6 text-center', error || state.status === 'error' ? 'border-red-200 bg-red-50/40' : 'border-brand-200 bg-surface')}>
              <p className="font-semibold">Add a clear photo of your prescription</p>
              <p className="mt-1 text-sm text-ink-muted">Make sure the doctor’s name, medicines and date are readable.</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Camera', icon: Camera, ref: cameraInput },
                  { label: 'Gallery', icon: Images, ref: galleryInput },
                  { label: 'Files', icon: FolderOpen, ref: filesInput },
                ].map((source) => (
                  <button
                    key={source.label}
                    type="button"
                    onClick={() => source.ref.current?.click()}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-100 transition hover:ring-brand-300 active:scale-[0.98]"
                  >
                    <source.icon className="h-6 w-6 text-brand-600" aria-hidden />
                    {source.label}
                  </button>
                ))}
              </div>
            </div>
            {state.status === 'error' && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <span>{state.message}</span>
                {state.file && (
                  <button type="button" onClick={() => state.file && start(state.file)} className="inline-flex items-center gap-1 font-semibold">
                    <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                  </button>
                )}
              </div>
            )}
            {error && state.status !== 'error' && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-3xl bg-surface p-4 ring-1 ring-brand-100">
            <div className="flex gap-4">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-100/60">
                {previewUrl ? (
                  // Local blob preview: next/image cannot optimise object URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Prescription preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{state.fileName}</p>
                  <button type="button" onClick={reset} className="rounded-lg p-1 text-ink-soft hover:bg-white hover:text-ink" aria-label={busy ? 'Cancel upload' : 'Remove prescription'}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {state.status === 'compressing' && <p className="mt-2 text-sm text-ink-muted">Optimising photo for a faster upload…</p>}
                {state.status === 'uploading' && (
                  <div className="mt-3" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                    <div className="flex justify-between text-sm"><span className="text-ink-muted">Uploading securely…</span><span className="font-semibold tabular-nums">{state.progress}%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
                      <motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${state.progress}%` }} transition={{ ease: 'easeOut' }} />
                    </div>
                  </div>
                )}
                {state.status === 'done' && (
                  <>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Uploaded</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {state.uploadedSize < state.originalSize ? `Optimised ${formatSize(state.originalSize)} → ${formatSize(state.uploadedSize)}` : formatSize(state.uploadedSize)}
                    </p>
                    <button type="button" onClick={() => galleryInput.current?.click()} className="mt-2 text-sm font-semibold text-brand-700 hover:text-brand-800">Replace photo</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
