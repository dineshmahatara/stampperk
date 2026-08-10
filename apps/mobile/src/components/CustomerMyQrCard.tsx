import { useRef, useState } from 'react';
import {
  Alert,
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
import { colors } from '../theme';
import { useAppBranding } from '../branding';

type QrData = {
  qrPayload: string;
  qrToken?: string;
};

export function CustomerMyQrCard({
  qr,
  memberName,
  token,
}: {
  qr: QrData;
  memberName?: string;
  token?: string;
}) {
  const { branding } = useAppBranding(token);
  const companyName = branding.companyName || 'Stampz';
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const memberId =
    qr.qrToken || String(qr.qrPayload || '').replace(/^stampz:customer:/i, '');

  async function captureCardPng(): Promise<string> {
    if (!cardRef.current) throw new Error('Card not ready');
    await new Promise((r) => setTimeout(r, 120));
    return captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 720,
    });
  }

  async function doShare() {
    setBusy(true);
    setMsg('');
    try {
      const path = await captureCardPng();
      if (Platform.OS === 'web') {
        await Share.share({
          message: `My ${companyName} Member ID: ${memberId}`,
          title: `${companyName} Member QR`,
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
          message: `My ${companyName} Member ID: ${memberId}`,
          url: path,
        });
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Share failed');
    } finally {
      setBusy(false);
    }
  }

  function shareQr() {
    const title = 'Share your member QR?';
    const body =
      'Anyone with this QR can earn stamps or redeem rewards as you. Only share with people you trust.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`)) {
        void doShare();
      }
      return;
    }
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => void doShare() },
    ]);
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
            a.download = `stampz-member-${memberId}-qr.png`;
            a.click();
          } else {
            window.open(path, '_blank');
          }
        }
        setMsg('QR card downloaded');
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        setMsg('Allow photo library access to download');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(path);
      setMsg('QR card saved to Photos / Gallery');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <View ref={cardRef} collapsable={false} style={s.card}>
        <Text style={s.brand}>{companyName}</Text>
        <Text style={s.title}>My Member QR</Text>
        {!!memberName && <Text style={s.name}>{memberName}</Text>}

        <View style={s.qrBox}>
          <QRCode
            value={qr.qrPayload}
            size={200}
            color={colors.coral}
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>

        <Text style={s.memberId}>{memberId}</Text>
        <Text style={s.memberLabel}>Member ID</Text>
        <Text style={s.hint}>Show at the counter for stamps · works offline</Text>
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

      {!!msg && <Text style={s.toast}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  brand: {
    color: colors.coral,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.75,
  },
  qrBox: {
    backgroundColor: colors.pink,
    borderRadius: 24,
    padding: 20,
    marginTop: 18,
    marginBottom: 14,
  },
  memberId: {
    letterSpacing: 3,
    color: colors.coral,
    fontSize: 22,
    fontWeight: '800',
  },
  memberLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 260,
  },
  powered: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
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
    backgroundColor: colors.white,
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
  toast: {
    marginTop: 12,
    color: '#2D6A4F',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
