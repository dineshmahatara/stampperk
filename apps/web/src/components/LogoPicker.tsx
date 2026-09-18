'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { groupMediaLibrary, mediaLibraryGroupLabel } from '@stampperk/shared';
import { api, uploadMedia } from '@/lib/api';

type LibraryItem = {
  id: string;
  label: string;
  url: string;
  categorySlug?: string;
  categoryGroup: string;
  groupLabel?: string;
};

export function LogoPicker({
  token,
  value,
  categorySlug,
  onChange,
  label = 'Logo',
  uploadScope,
  buttonLabel = 'Choose logo',
}: {
  token?: string | null;
  value?: string;
  categorySlug?: string;
  onChange: (url: string) => void;
  label?: string;
  uploadScope?: 'platform';
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const q = categorySlug ? `?categorySlug=${encodeURIComponent(categorySlug)}` : '';
      const list = await api<LibraryItem[]>(`/media/library${q}`, {
        token: token || undefined,
      });
      setItems(list);
    } catch {
      setItems([]);
    }
  }, [categorySlug, token]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setGroupFilter(null);
      load();
    }
  }, [open, load]);

  const groups = useMemo(() => {
    const mapped = items.map((i) => ({
      id: i.id,
      categoryGroup: i.categoryGroup,
      categorySlug: i.categorySlug,
      label: i.label,
      path: i.url,
    }));
    return groupMediaLibrary(mapped, { search, groupId: groupFilter }).map((g) => ({
      ...g,
      items: g.items.map((item) => ({ ...item, url: item.path })),
    }));
  }, [items, search, groupFilter]);

  const allGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.categoryGroup)) {
        seen.set(
          item.categoryGroup,
          item.groupLabel || mediaLibraryGroupLabel(item.categoryGroup),
        );
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [items]);

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
      const uploaded = await uploadMedia(file, {
        token,
        merchantId: uploadScope === 'platform' ? null : undefined,
        scope: uploadScope,
      });
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
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#FFF1F2]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[#8E8E93]">{label}</span>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white"
          >
            {buttonLabel}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full bg-[#F4F5F7] px-4 py-2 text-sm font-bold text-[#1C1C1E]"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="shrink-0 p-5 pb-0">
              <h3 className="text-xl font-extrabold">Business logo</h3>
              <p className="mb-3 text-sm text-[#8E8E93]">
                Pick from Stamp Perk library or upload your own photo.
              </p>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTab('library')}
                  className={`rounded-full py-2 text-sm font-bold ${
                    tab === 'library' ? 'bg-[#FF5A5F] text-white' : 'bg-[#FFF1F2] text-[#1C1C1E]'
                  }`}
                >
                  Library
                </button>
                <button
                  type="button"
                  onClick={() => setTab('upload')}
                  className={`rounded-full py-2 text-sm font-bold ${
                    tab === 'upload' ? 'bg-[#FF5A5F] text-white' : 'bg-[#FFF1F2] text-[#1C1C1E]'
                  }`}
                >
                  Upload
                </button>
              </div>

              {error && <p className="mb-2 text-sm font-semibold text-red-600">{error}</p>}
              {busy && <p className="mb-2 text-sm font-semibold text-[#8E8E93]">Uploading…</p>}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
              {tab === 'library' && (
                <div className="space-y-3">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search icons…"
                    className="w-full rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#FF5A5F]"
                  />

                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setGroupFilter(null)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                        !groupFilter
                          ? 'bg-[#1C1C1E] text-white'
                          : 'bg-[#F4F5F7] text-[#1C1C1E]'
                      }`}
                    >
                      All
                    </button>
                    {allGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGroupFilter(g.id === groupFilter ? null : g.id)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                          groupFilter === g.id
                            ? 'bg-[#1C1C1E] text-white'
                            : 'bg-[#F4F5F7] text-[#1C1C1E]'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  {groups.map((group) => (
                    <div key={group.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-[#1C1C1E]">{group.label}</h4>
                        <span className="text-[11px] font-bold text-[#8E8E93]">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {group.items.map((item) => {
                          const selected = value === item.url;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onChange(item.url);
                                setOpen(false);
                              }}
                              className={`rounded-2xl border p-2 text-center ${
                                selected
                                  ? 'border-[#FF5A5F] bg-[#FFF1F2]'
                                  : 'border-black/8 bg-[#F8F8FA]'
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt=""
                                className="mx-auto mb-1 h-14 w-14 rounded-xl object-cover"
                              />
                              <div className="truncate text-[11px] font-bold">{item.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!groups.length && (
                    <p className="text-sm text-[#8E8E93]">
                      {search || groupFilter
                        ? 'No icons match your search.'
                        : 'No library icons yet.'}
                    </p>
                  )}
                </div>
              )}

              {tab === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-full bg-[#FF5A5F] py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Choose image file
                  </button>
                  <p className="text-xs text-[#8E8E93]">JPEG, PNG, or WebP · max 2 MB</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-full border border-black/10 py-2.5 text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
