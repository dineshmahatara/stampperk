import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadMedia } from '../api';
import { colors, radii } from '../theme';
import { resolveMediaUrl } from './LogoImage';

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
      void load();
    }
  }, [open, load]);

  async function pickUpload() {
    if (!token) {
      setError('Sign in required to upload');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadMedia(
        {
          uri: asset.uri,
          name: asset.fileName || 'promo.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        { token },
      );
      try {
        await api('/merchants/me/gallery', {
          method: 'POST',
          token,
          body: { url: uploaded.url },
        });
      } catch {
        /* gallery limit — still allow promo */
      }
      onChange(uploaded.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  const previewUri = value ? resolveMediaUrl(value) : '';

  return (
    <View>
      <View style={s.row}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}>
            <Text style={s.thumbEmptyText}>No photo</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 8 }}>
          <Pressable style={s.btn} onPress={() => setOpen(true)}>
            <Text style={s.btnText}>{value ? 'Change promo photo' : 'Add promo photo'}</Text>
          </Pressable>
          {value ? (
            <Pressable style={s.clear} onPress={() => onChange('')}>
              <Text style={s.clearText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={s.hint}>Card front cover — gallery or upload.</Text>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.head}>
              <Text style={s.title}>Promote your business</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={s.close}>Close</Text>
              </Pressable>
            </View>
            <View style={s.tabs}>
              {(['gallery', 'upload'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[s.tab, tab === t && s.tabOn]}
                >
                  <Text style={tab === t ? s.tabTextOn : s.tabText}>
                    {t === 'gallery' ? 'Gallery' : 'Upload'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!!error && <Text style={s.error}>{error}</Text>}
            {tab === 'gallery' ? (
              <ScrollView contentContainerStyle={s.grid}>
                {gallery.length === 0 ? (
                  <Text style={s.empty}>No gallery photos yet. Upload one to promote your shop.</Text>
                ) : (
                  gallery.map((g) => {
                    const on = value === g.url;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          onChange(g.url);
                          setOpen(false);
                        }}
                        style={[s.cell, on && s.cellOn]}
                      >
                        <Image source={{ uri: resolveMediaUrl(g.url) }} style={s.cellImg} />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <View style={s.uploadBox}>
                {busy ? (
                  <ActivityIndicator color={colors.coral} />
                ) : (
                  <Pressable style={s.uploadBtn} onPress={() => void pickUpload()}>
                    <Text style={s.uploadText}>Choose image</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 96, height: 64, borderRadius: radii.md, backgroundColor: '#F4F5F7' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderStyle: 'dashed' },
  thumbEmptyText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  btn: { backgroundColor: colors.ink, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  clear: { alignSelf: 'flex-start' },
  clearText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  hint: { marginTop: 6, fontSize: 11, color: colors.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  close: { color: colors.coral, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#F4F5F7' },
  tabOn: { backgroundColor: colors.coral },
  tabText: { fontWeight: '700', fontSize: 12, color: colors.ink },
  tabTextOn: { fontWeight: '700', fontSize: 12, color: '#fff' },
  error: { color: '#dc2626', fontWeight: '700', fontSize: 12, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  cell: { width: '30%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  cellOn: { borderColor: colors.coral },
  cellImg: { width: '100%', height: '100%' },
  empty: { padding: 24, textAlign: 'center', color: colors.muted, fontWeight: '600' },
  uploadBox: { padding: 24, alignItems: 'center' },
  uploadBtn: { backgroundColor: '#F8F8FA', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 28, paddingHorizontal: 32 },
  uploadText: { fontWeight: '800', color: colors.ink },
});
