'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, uploadMedia } from '@/lib/api';

type GalleryPhoto = { id: string; url: string };

export function PromoPhotoPicker({
  token,
  value,
  onChange,
}: {
  token?: string | null;
  value?: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'gallery' | 'upload'>('gallery');
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) {
      setGallery([]);
      return;
    }
    try {
      const me = await api<{ gallery?: GalleryPhoto[] }>('/merchants/me', { token });
      setGallery(me.gallery || []);
    } catch {
      setGallery([]);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      setError('');
      load();
    }
  }, [open, load]);

  async function onFile(file: File | undefined) {
    if (!file || !token) {
      setError(token ? 'Choose a file' : 'Sign in required to upload');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Max file size is 2 MB');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadMedia(file, { token });
      try {
        await api('/merchants/me/gallery', {
          method: 'POST',
          token,
          body: { url: uploaded.url },
        });
      } catch {
        /* gallery limit — still allow use as promo */
      }
      onChange(uploaded.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {value ? (
          <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-black/8 bg-[#F4F5F7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-black/15 bg-[#F8F8FA] text-[10px] font-bold text-[#8E8E93]">
            No photo
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-[#1C1C1E] px-3 py-2 text-xs font-bold text-white"
        >
          {value ? 'Change promo photo' : 'Add promo photo'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-full border border-black/10 px-3 py-2 text-xs font-bold text-[#8E8E93]"
          >
            Remove
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] text-[#8E8E93]">
        Shows as the card front cover — pick from your business gallery or upload a new photo.
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Promo photo"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <h3 className="text-sm font-extrabold">Promote your business</h3>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8E8E93]"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 border-b border-black/5 px-4 py-2">
              {(['gallery', 'upload'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                    tab === t ? 'bg-[#FF5A5F] text-white' : 'bg-[#F4F5F7] text-[#5C5651]'
                  }`}
                >
                  {t === 'gallery' ? 'Business gallery' : 'Upload'}
                </button>
              ))}
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-4">
              {error ? <p className="mb-2 text-xs font-semibold text-red-600">{error}</p> : null}
              {tab === 'gallery' ? (
                gallery.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {gallery.map((g) => {
                      const on = value === g.url;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            onChange(g.url);
                            setOpen(false);
                          }}
                          className={`aspect-[4/3] overflow-hidden rounded-xl border-2 ${
                            on ? 'border-[#FF5A5F]' : 'border-transparent'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={g.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-[#8E8E93]">
                    No gallery photos yet. Upload one to promote your shop on the card front.
                  </p>
                )
              ) : (
                <div className="space-y-3 py-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={busy || !token}
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-black/15 bg-[#F8F8FA] px-4 py-8 text-sm font-bold text-[#1C1C1E] disabled:opacity-50"
                  >
                    {busy ? 'Uploading…' : 'Choose image (max 2 MB)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
