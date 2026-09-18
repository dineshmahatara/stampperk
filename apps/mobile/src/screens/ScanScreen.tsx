import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import {
  OfflineBanner,
  isNetworkError,
  readCachedPrograms,
  useOffline,
} from '../offline';
import { colors, styles } from '../theme';
import { Card, PrimaryButton } from '../ui';
import { MerchantMyQrModal } from '../components/MerchantMyQrModal';
import { ScanCustomerAssist, type AssistMode } from '../components/ScanCustomerAssist';
import { useAppBranding } from '../branding';

type Session = { token: string; user: { role: string; name?: string } };
type ProgramOpt = { id: string; title: string; active?: boolean };

function parseStampFeedback(result: string) {
  const stamp = result.match(/^Stamp OK · (\d+)\/(\d+)$/);
  if (stamp) {
    return {
      kind: 'stamp' as const,
      count: stamp[1],
      total: stamp[2],
      headline: 'Stamp given',
      detail: `${stamp[1]} of ${stamp[2]} stamps on this card`,
    };
  }
  if (result.startsWith('Reward unlocked')) {
    return {
      kind: 'reward' as const,
      count: null as string | null,
      total: null as string | null,
      headline: 'Reward unlocked!',
      detail: result.replace(/^Reward unlocked:\s*/, ''),
    };
  }
  const isError =
    /fail|error|enter|invalid|limit|required|denied|forbidden/i.test(result) &&
    !/^Stamp OK/i.test(result) &&
    !/^Synced/i.test(result) &&
    !/^Queue/i.test(result);
  return {
    kind: isError ? ('error' as const) : ('info' as const),
    count: null as string | null,
    total: null as string | null,
    headline: isError ? 'Could not stamp' : 'Update',
    detail: result,
  };
}

function Corner({ style }: { style: object }) {
  return <View style={[scanStyles.corner, style]} />;
}

function AltAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={scanStyles.alt}>
      <View style={scanStyles.altIcon}>
        <Ionicons name={icon} size={18} color={colors.coral} />
      </View>
      <Text style={scanStyles.altTitle}>{title}</Text>
      <Text style={scanStyles.altSub}>{subtitle}</Text>
    </Pressable>
  );
}

export function ScanScreen({ session }: { session: Session }) {
  const offline = useOffline();
  const { branding } = useAppBranding(session.token);
  const companyName = branding.companyName || 'Stamp Perk';
  const [tokenInput, setTokenInput] = useState('');
  const [result, setResult] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  const [torch, setTorch] = useState(false);
  const [saleAmount, setSaleAmount] = useState('');
  const [programs, setPrograms] = useState<ProgramOpt[]>([]);
  const [programId, setProgramId] = useState<string>('');
  const [showMyQr, setShowMyQr] = useState(false);
  const [assistMode, setAssistMode] = useState<AssistMode | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const locking = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showResult(message: string) {
    setResult(message);
    if (resultTimer.current) clearTimeout(resultTimer.current);
    // Keep success visible long enough to read; errors stay until dismissed
    const feedback = parseStampFeedback(message);
    if (feedback.kind === 'stamp' || feedback.kind === 'reward' || feedback.kind === 'info') {
      resultTimer.current = setTimeout(() => setResult(''), 4000);
    }
  }

  useEffect(() => {
    return () => {
      if (resultTimer.current) clearTimeout(resultTimer.current);
    };
  }, []);

  function focusPasteField() {
    // Free vertical space so the paste box isn't under the keyboard
    setCameraOn(false);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }

  const loadPrograms = useCallback(async () => {
    try {
      const list = await api<ProgramOpt[]>('/loyalty/programs', { token: session.token });
      const active = (list || []).filter((p) => p.active !== false);
      setPrograms(active);
      offline.rememberPrograms(active).catch(() => undefined);
      if (!programId && active[0]?.id) setProgramId(active[0].id);
    } catch {
      const cached = await readCachedPrograms<ProgramOpt[]>();
      if (cached?.data?.length) {
        setPrograms(cached.data);
        if (!programId && cached.data[0]?.id) setProgramId(cached.data[0].id);
      }
    }
  }, [offline, programId, session.token]);

  useEffect(() => {
    if (session.user.role !== 'CUSTOMER') loadPrograms();
  }, [loadPrograms, session.user.role]);

  async function stamp(payload: { customerQrToken: string }) {
    const body = {
      customerQrToken: payload.customerQrToken.trim(),
      programId: programId || undefined,
      saleAmount: saleAmount.trim() ? Number(saleAmount) : undefined,
    };
    if (!body.customerQrToken) {
      showResult('Enter or scan a customer QR token');
      return;
    }

    if (!offline.online) {
      const queued = await offline.queueStamp({ ...body, token: session.token });
      showResult(queued.message);
      return;
    }

    try {
      const res = await api<{
        rewardUnlocked: boolean;
        card: { stampCount: number; program: { totalStamps: number; rewardTitle: string } };
      }>('/qr/scan', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify(body),
      });
      showResult(
        res.rewardUnlocked
          ? `Reward unlocked: ${res.card.program.rewardTitle}`
          : `Stamp OK · ${res.card.stampCount}/${res.card.program.totalStamps}`,
      );
    } catch (e) {
      if (isNetworkError(e)) {
        const queued = await offline.queueStamp({ ...body, token: session.token });
        showResult(queued.message);
        return;
      }
      showResult(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function onBarcode({ data }: { data: string }) {
    if (!cameraOn || locking.current) return;
    locking.current = true;
    setTokenInput(data);
    await stamp({ customerQrToken: data.trim() });
    setTimeout(() => {
      locking.current = false;
    }, 2500);
  }

  async function syncNow() {
    showResult(offline.syncing ? 'Syncing…' : 'Syncing pending items…');
    const res = await offline.syncNow(session.token);
    showResult(
      `Synced ${res.scansSynced} stamp(s), ${res.enrollsSynced} card(s), ${res.programsSynced} program(s)` +
        (res.failed ? ` · ${res.failed} failed` : ''),
    );
  }

  if (session.user.role === 'CUSTOMER') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Your QR</Text>
        <OfflineBanner token={session.token} />
        <Card>
          <Text style={styles.muted}>
            Merchants scan your loyalty QR to give stamps. Open the My QR tab for your full code.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={scanStyles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={scanStyles.pad}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <View style={scanStyles.topBar}>
          <Text style={scanStyles.brand}>{companyName}</Text>
          <Pressable
            onPress={() => setTorch((v) => !v)}
            style={scanStyles.iconBtn}
            hitSlop={10}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={20}
              color={torch ? colors.warning : '#fff'}
            />
          </Pressable>
        </View>

        <OfflineBanner token={session.token} />

        <Text style={scanStyles.hintTop}>Please align the customer QR within the frame</Text>

        {!permission?.granted ? (
          <View style={scanStyles.permBox}>
            <Ionicons name="camera-outline" size={36} color={colors.coral} />
            <Text style={scanStyles.permText}>Camera access is needed to scan loyalty QR codes.</Text>
            <PrimaryButton label="Allow camera" onPress={requestPermission} arrow />
          </View>
        ) : (
          <View style={scanStyles.frameWrap}>
            <View style={scanStyles.frame}>
              {cameraOn ? (
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={onBarcode}
                />
              ) : (
                <View style={scanStyles.paused}>
                  <Ionicons name="pause-circle-outline" size={40} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Camera paused</Text>
                </View>
              )}
              <Corner style={{ top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3 }} />
              <Corner style={{ bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3 }} />
              {cameraOn && <View style={scanStyles.scanLine} />}
              {cameraOn && (
                <View
                  style={[
                    scanStyles.livePill,
                    { backgroundColor: offline.online ? colors.coral : '#C27803' },
                  ]}
                >
                  <View style={scanStyles.liveDot} />
                  <Text style={scanStyles.liveText}>
                    {offline.online ? 'Scanning…' : 'Offline scanning…'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={scanStyles.rowBtns}>
          <Pressable style={scanStyles.secondaryBtn} onPress={() => setCameraOn((v) => !v)}>
            <Ionicons name={cameraOn ? 'pause' : 'play'} size={16} color="#fff" />
            <Text style={scanStyles.secondaryText}>{cameraOn ? 'Pause' : 'Resume'}</Text>
          </Pressable>
          {offline.pending > 0 && (
            <Pressable
              style={scanStyles.secondaryBtn}
              onPress={syncNow}
              disabled={offline.syncing || !offline.online}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={scanStyles.secondaryText}>
                {offline.syncing ? 'Syncing…' : `Sync ${offline.pending}`}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable style={scanStyles.showMyQr} onPress={() => setShowMyQr(true)}>
          <Ionicons name="qr-code-outline" size={20} color={colors.ink} />
          <Text style={scanStyles.showMyQrText}>Show my QR code</Text>
        </Pressable>
        <Text style={scanStyles.showMyQrHint}>
          Customers can scan your business QR to join — no Customer Mode needed
        </Text>

        {programs.length > 0 && (
          <Card style={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={[styles.cardTitle, { color: '#fff' }]}>Loyalty program</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 8 }}>
              First stamp also creates the customer card.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {programs.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setProgramId(p.id)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: programId === p.id ? colors.coral : 'rgba(255,90,95,0.15)',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 12,
                      color: programId === p.id ? '#fff' : colors.coralSoft,
                    }}
                  >
                    {p.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 10, backgroundColor: '#0B0B0C', color: '#fff' }]}
              value={saleAmount}
              onChangeText={setSaleAmount}
              placeholder="Sale amount (spend cards)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="decimal-pad"
              onFocus={focusPasteField}
            />
          </Card>
        )}

        <Text style={[styles.h2, { color: '#fff' }]}>Can&apos;t scan?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <AltAction
            icon="call-outline"
            title="Phone"
            subtitle="Search by phone"
            onPress={() => {
              setCameraOn(false);
              setAssistMode('phone');
            }}
          />
          <AltAction
            icon="mail-outline"
            title="Email"
            subtitle="Search by email"
            onPress={() => {
              setCameraOn(false);
              setAssistMode('email');
            }}
          />
          <AltAction
            icon="person-add-outline"
            title="Add"
            subtitle="Create customer"
            onPress={() => {
              setCameraOn(false);
              setAssistMode('add');
            }}
          />
        </View>

        <Card style={{ backgroundColor: '#161618', borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={[styles.cardTitle, { color: '#fff' }]}>Paste QR token</Text>
          <TextInput
            style={[styles.input, { minHeight: 72, backgroundColor: '#0B0B0C', color: '#fff' }]}
            multiline
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="stampperk:customer:…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
            onFocus={focusPasteField}
          />
          <PrimaryButton
            label={offline.online ? 'Give stamp' : 'Queue offline stamp'}
            arrow
            onPress={() => stamp({ customerQrToken: tokenInput.trim() })}
          />
        </Card>

        {Platform.OS === 'web' && (
          <Text style={[styles.hint, { color: 'rgba(255,255,255,0.45)' }]}>
            Camera scanning works best on a physical Android/iOS device.
          </Text>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <MerchantMyQrModal
        visible={showMyQr}
        onClose={() => setShowMyQr(false)}
        token={session.token}
      />
      <ScanCustomerAssist
        visible={!!assistMode}
        initialMode={assistMode || 'phone'}
        token={session.token}
        onClose={() => setAssistMode(null)}
        onReadyToStamp={(customer) => {
          const payload = customer.qrPayload || `stampperk:customer:${customer.qrToken}`;
          setAssistMode(null);
          setTokenInput(payload);
          void stamp({ customerQrToken: payload });
        }}
      />

      {!!result &&
        (() => {
          const fb = parseStampFeedback(result);
          const icon =
            fb.kind === 'error'
              ? 'alert-circle'
              : fb.kind === 'reward'
                ? 'gift'
                : fb.kind === 'stamp'
                  ? 'checkmark-circle'
                  : 'information-circle';
          const iconColor =
            fb.kind === 'error'
              ? '#FF6B6B'
              : fb.kind === 'reward'
                ? '#FFD166'
                : colors.success;
          return (
            <Modal visible transparent animationType="fade" onRequestClose={() => setResult('')}>
              <Pressable style={scanStyles.feedbackScrim} onPress={() => setResult('')}>
                <Pressable
                  style={[
                    scanStyles.feedbackCard,
                    fb.kind === 'error' && scanStyles.feedbackCardError,
                    fb.kind === 'reward' && scanStyles.feedbackCardReward,
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Ionicons name={icon} size={44} color={iconColor} />
                  <Text style={scanStyles.feedbackHeadline}>{fb.headline}</Text>
                  {fb.kind === 'stamp' && fb.count && fb.total ? (
                    <Text style={scanStyles.feedbackCount}>
                      {fb.count}
                      <Text style={scanStyles.feedbackCountTotal}>/{fb.total}</Text>
                    </Text>
                  ) : null}
                  <Text style={scanStyles.feedbackDetail}>{fb.detail}</Text>
                  <Pressable style={scanStyles.feedbackDismiss} onPress={() => setResult('')}>
                    <Text style={scanStyles.feedbackDismissText}>OK</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          );
        })()}
    </SafeAreaView>
  );
}

const scanStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B0C' },
  pad: { padding: 20, paddingBottom: 140 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brand: { color: colors.coral, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTop: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },
  frameWrap: { alignItems: 'center', marginBottom: 14 },
  frame: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
    borderRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: '#4DA3FF',
    top: '58%',
    opacity: 0.9,
  },
  livePill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  paused: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#161618',
    marginBottom: 14,
  },
  permText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 4,
  },
  rowBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
  },
  secondaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  showMyQr: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  showMyQrText: { color: colors.ink, fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  showMyQrHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  feedbackScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.45)',
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 8,
  },
  feedbackCardError: {
    borderColor: 'rgba(255,107,107,0.5)',
  },
  feedbackCardReward: {
    borderColor: 'rgba(255,209,102,0.55)',
  },
  feedbackHeadline: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  feedbackCount: {
    color: colors.success,
    fontWeight: '900',
    fontSize: 52,
    letterSpacing: -1,
    lineHeight: 58,
  },
  feedbackCountTotal: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 28,
    fontWeight: '800',
  },
  feedbackDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },
  feedbackDismiss: {
    marginTop: 14,
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  feedbackDismissText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  alt: {
    flex: 1,
    backgroundColor: '#161618',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 6,
  },
  altIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,90,95,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altTitle: { fontWeight: '800', fontSize: 12, color: '#fff', textAlign: 'center' },
  altSub: { fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
});
