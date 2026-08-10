import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { api } from '../api';
import { colors } from '../theme';
import { readCachedMerchant, cacheMerchant } from '../offline';
import { useAppBranding } from '../branding';

const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL ||
  (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(':4000', ':3000');

type MerchantInfo = {
  businessName?: string;
  slug?: string;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

export function MerchantMyQrModal({
  visible,
  onClose,
  token,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
}) {
  const { branding } = useAppBranding(token);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const companyName = branding.companyName || 'Stampz';
  const profileUrl = merchant?.slug ? `${WEB_BASE}/b/${merchant.slug}` : '';
  const qrValue = profileUrl || (merchant?.slug ? `stampz:business:${merchant.slug}` : '');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setMsg('');
    (async () => {
      try {
        const m = await api<MerchantInfo>('/merchants/me', { token });
        if (cancelled) return;
        setMerchant(m);
        await cacheMerchant(m);
      } catch {
        const cached = await readCachedMerchant<MerchantInfo>();
        if (!cancelled) setMerchant(cached?.data || null);
        if (!cancelled && !cached?.data) setMsg('Could not load business QR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, token]);

  async function captureCardPng(): Promise<string> {
    if (!cardRef.current) throw new Error('Card not ready');
    // Wait a frame so QR SVG is painted into the card
    await new Promise((r) => setTimeout(r, 120));
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      // Slightly higher res for share/download
      width: 720,
    });
    return uri;
  }

  async function shareQr() {
    setBusy(true);
    setMsg('');
    try {
      const path = await captureCardPng();
      if (Platform.OS === 'web') {
        await Share.share({
          message: `Join ${merchant?.businessName || 'us'} on ${companyName}\n${profileUrl}`,
          url: profileUrl,
          title: merchant?.businessName || `${companyName} QR`,
        });
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'image/png',
          dialogTitle: `Share my ${companyName} QR`,
          UTI: 'public.png',
        });
      } else {
        await Share.share({
          message: `Join ${merchant?.businessName || 'us'} on ${companyName}\n${profileUrl}`,
          url: path,
        });
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Share failed');
    } finally {
      setBusy(false);
    }
  }

  async function downloadQr() {
    setBusy(true);
    setMsg('');
    try {
      const path = await captureCardPng();
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const base64 = await FileSystem.readAsStringAsync(path, {
            encoding: FileSystem.EncodingType.Base64,
          }).catch(() => null);
          if (base64) {
            const a = document.createElement('a');
            a.href = `data:image/png;base64,${base64}`;
            a.download = `${merchant?.slug || 'stampz'}-qr-card.png`;
            a.click();
          } else {
            // Fallback: open captured file URL
            window.open(path, '_blank');
          }
        }
        setMsg('Full QR card downloaded');
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        setMsg('Allow photo library access to download');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(path);
      setMsg('Full QR card saved to Photos / Gallery');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable onPress={onClose} style={s.close} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.coral} style={{ marginTop: 120 }} />
        ) : !merchant?.slug ? (
          <>
            <BrandHeader name={companyName} logoUrl={branding.logoUrl} />
            <Text style={s.error}>Set up your business first to get a QR code.</Text>
          </>
        ) : (
          <>
            {/* Captured as one image on Share / Download */}
            <View ref={cardRef} collapsable={false} style={s.card}>
              <BrandHeader name={companyName} logoUrl={branding.logoUrl} />
              <Text style={s.title}>My QR Code</Text>
              <Text style={s.sub}>
                Show your QR so customers can join your loyalty card on {companyName}
              </Text>

              <View style={s.qrBox}>
                <QRCode
                  value={qrValue}
                  size={220}
                  color="#1C1C1E"
                  backgroundColor="#FFFFFF"
                  ecl="H"
                  {...(merchant.logoUrl
                    ? {
                        logo: { uri: merchant.logoUrl },
                        logoSize: 48,
                        logoBackgroundColor: '#FFFFFF',
                        logoMargin: 6,
                        logoBorderRadius: 12,
                      }
                    : {})}
                />
              </View>

              <Text style={s.name}>{merchant.businessName || 'Your business'}</Text>
              {!!merchant.phone && <Text style={s.phone}>{merchant.phone}</Text>}
              <Text style={s.url}>{profileUrl}</Text>
              <Text style={s.powered}>Powered by {companyName}</Text>
            </View>

            <View style={s.actions}>
              <Pressable style={s.actionBtn} onPress={shareQr} disabled={busy}>
                <Ionicons name="share-outline" size={18} color={colors.coral} />
                <Text style={s.actionText}>{busy ? '…' : 'Share'}</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, s.downloadBtn]} onPress={downloadQr} disabled={busy}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={[s.actionText, { color: '#fff' }]}>{busy ? '…' : 'Download'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {!!msg && <Text style={s.toast}>{msg}</Text>}

        <View style={s.wave} pointerEvents="none" />
      </View>
    </Modal>
  );
}

function BrandHeader({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <View style={s.brandRow}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={s.brandLogo} />
      ) : (
        <View style={s.brandBadge}>
          <Text style={s.brandBadgeText}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={s.brand}>{name}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0C',
    paddingTop: Platform.OS === 'ios' ? 64 : 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0B0B0C',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  brand: {
    color: colors.coral,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 24,
  },
  sub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 280,
    lineHeight: 20,
  },
  qrBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
    textAlign: 'center',
  },
  phone: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  url: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  powered: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    zIndex: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.coral,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#0B0B0C',
  },
  downloadBtn: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  actionText: {
    color: colors.coral,
    fontWeight: '800',
    fontSize: 14,
  },
  error: {
    color: '#FF8A8E',
    marginTop: 40,
    textAlign: 'center',
    fontWeight: '700',
  },
  toast: {
    marginTop: 16,
    color: '#B7E4C7',
    fontWeight: '700',
    fontSize: 13,
    zIndex: 2,
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: colors.coral,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    opacity: 0.95,
  },
});
