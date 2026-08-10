import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { passwordStrength } from '@stampz/shared';
import { api, ApiError, AuthUser } from '../api';
import { Locale } from '../i18n';
import { colors, radii } from '../theme';
import { useAppBranding } from '../branding';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { clearMobileReferral, readMobileReferral } from '../referral';

WebBrowser.maybeCompleteAuthSession();

export type Session = { token: string; user: AuthUser };

type AuthMode = 'login' | 'register';
type RegisterRole = 'CUSTOMER' | 'MERCHANT_OWNER';

const CORAL = '#FF5A5F';

const STRENGTH_COLORS = {
  empty: '#E5E7EB',
  weak: '#EF4444',
  fair: '#F59E0B',
  good: '#3B82F6',
  strong: '#10B981',
} as const;

function devicePayload() {
  return {
    deviceName: `${Platform.OS} ${Platform.Version}`.slice(0, 80),
    deviceType: (Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown') as
      | 'ios'
      | 'android'
      | 'unknown',
  };
}

export function LoginScreen({
  onLoggedIn,
  locale: _locale,
}: {
  onLoggedIn: (s: Session) => void;
  locale: Locale;
}) {
  const { branding } = useAppBranding();
  const appName = branding.companyName || 'Stampz';

  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RegisterRole>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('merchant@stampz.app');
  const [password, setPassword] = useState('Stampz123!');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [verifyHint, setVerifyHint] = useState('');

  useEffect(() => {
    if (mode !== 'register') return;
    void readMobileReferral().then((stored) => {
      if (stored?.referralCode) setInviteCode(stored.referralCode);
    });
  }, [mode]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setVerifyHint('');
    setCaptcha(null);
    setCaptchaAnswer('');
    if (next === 'register') {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setRole('CUSTOMER');
    } else {
      setEmail('merchant@stampz.app');
      setPassword('Stampz123!');
      setConfirmPassword('');
      setName('');
      setInviteCode('');
    }
  }

  async function login() {
    setBusy(true);
    setError('');
    setVerifyHint('');
    try {
      const res = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          captchaId: captcha?.id,
          captchaAnswer: captchaAnswer || undefined,
          ...devicePayload(),
        }),
      });
      setCaptcha(null);
      setCaptchaAnswer('');
      onLoggedIn({ token: res.accessToken, user: res.user });
    } catch (e) {
      if (e instanceof ApiError && e.captcha) {
        setCaptcha(e.captcha);
        setCaptchaAnswer('');
      }
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      setError('Enter your full name (at least 2 characters)');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError('');
    setVerifyHint('');
    try {
      const stored = await readMobileReferral();
      const code = (inviteCode || stored?.referralCode || '').trim().toUpperCase() || undefined;
      const res = await api<{
        accessToken: string;
        user: AuthUser;
        verifyUrl?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          referralCode: code,
          referralMerchantId: code ? stored?.referralMerchantId : undefined,
          referralProgramId: code ? stored?.referralProgramId : undefined,
          ...devicePayload(),
        }),
      });
      await clearMobileReferral();
      if (res.verifyUrl) {
        setVerifyHint(`Verify email (dev): ${res.verifyUrl}`);
      }
      onLoggedIn({ token: res.accessToken, user: res.user });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: 'google' | 'apple' | 'microsoft') {
    setBusy(true);
    setError('');
    try {
      const stored = mode === 'register' ? await readMobileReferral() : null;
      const nameByProvider =
        provider === 'google' ? 'Google Demo' : provider === 'apple' ? 'Apple Demo' : 'Microsoft Demo';
      const res = await api<{ accessToken: string; user: AuthUser }>('/auth/oauth', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          idToken: `demo-${provider}-${Date.now()}`,
          email: `${provider}.demo@stampz.app`,
          name: nameByProvider,
          sub: `${provider}-demo-sub`,
          role: mode === 'register' ? role : 'CUSTOMER',
          ...devicePayload(),
        }),
      });
      if (stored?.referralCode) {
        try {
          await api('/referrals/claim', {
            method: 'POST',
            token: res.accessToken,
            body: JSON.stringify({
              referralCode: stored.referralCode,
              referralMerchantId: stored.referralMerchantId,
              referralProgramId: stored.referralProgramId,
            }),
          });
          await clearMobileReferral();
        } catch {
          /* ignore */
        }
      }
      onLoggedIn({ token: res.accessToken, user: res.user });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';
  const strength = !isLogin ? passwordStrength(password) : null;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={s.pad} bottomExtra={48}>
        <View style={s.brandBlock}>
          <View style={s.logoMark}>
            {branding.logoUrl ? (
              <Image source={{ uri: branding.logoUrl }} style={s.logoImg} />
            ) : (
              <Text style={s.logoLetter}>{appName.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={s.brandTitle}>{appName}</Text>
          <Text style={s.brandSub}>Admin Panel</Text>
        </View>

        <Text style={s.welcome}>
          {isLogin ? 'Welcome Back! 👋' : 'Create Account ✨'}
        </Text>
        <Text style={s.welcomeSub}>
          {isLogin
            ? 'Sign in to access your dashboard'
            : 'Join Stampz to collect stamps or grow your business'}
        </Text>

        {!isLogin && (
          <View style={s.roleRow}>
            <Pressable
              style={[s.roleChip, role === 'CUSTOMER' && s.roleChipOn]}
              onPress={() => setRole('CUSTOMER')}
            >
              <Text style={[s.roleText, role === 'CUSTOMER' && s.roleTextOn]}>Customer</Text>
            </Pressable>
            <Pressable
              style={[s.roleChip, role === 'MERCHANT_OWNER' && s.roleChipOn]}
              onPress={() => setRole('MERCHANT_OWNER')}
            >
              <Text style={[s.roleText, role === 'MERCHANT_OWNER' && s.roleTextOn]}>Business</Text>
            </Pressable>
          </View>
        )}

        {!isLogin && (
          <Field
            label="Full name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
        )}

        <Field
          label="Email Address"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          // TEMP: center label preview — remove centerLabel later
          centerLabel
        />

        <Field
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          // TEMP: center label preview — remove centerLabel later
          centerLabel
          right={
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#9CA3AF"
              />
            </Pressable>
          }
        />

        {!!strength && strength.label !== 'empty' && (
          <View style={s.strengthBox}>
            <View style={s.strengthBars}>
              {[1, 2, 3, 4].map((n) => (
                <View
                  key={n}
                  style={[
                    s.strengthBar,
                    {
                      backgroundColor:
                        strength.score >= n
                          ? STRENGTH_COLORS[strength.label]
                          : STRENGTH_COLORS.empty,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[s.strengthLabel, { color: STRENGTH_COLORS[strength.label] }]}>
              Password strength: {strength.label}
            </Text>
          </View>
        )}

        {!isLogin && (
          <>
            <Field
              label="Confirm password"
              icon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              secureTextEntry
            />
            <Field
              label="Invite code (optional)"
              icon="gift-outline"
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              placeholder="Friend’s code"
              autoCapitalize="characters"
              maxLength={16}
            />
          </>
        )}

        {isLogin && (
          <Pressable
            style={s.forgotWrap}
            onPress={() =>
              Alert.alert('Forgot password', 'Password reset is coming soon. Contact support for help.')
            }
          >
            <Text style={s.forgot}>Forgot Password?</Text>
          </Pressable>
        )}

        {!!captcha && isLogin && (
          <View style={s.captchaBox}>
            <Text style={s.captchaLabel}>Security check: {captcha.question}</Text>
            <TextInput
              style={s.captchaInput}
              value={captchaAnswer}
              onChangeText={setCaptchaAnswer}
              placeholder="Answer"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              autoCorrect={false}
            />
          </View>
        )}

        {!!error && <Text style={s.error}>{error}</Text>}
        {!!verifyHint && <Text style={s.verifyHint}>{verifyHint}</Text>}

        {busy ? (
          <ActivityIndicator color={CORAL} style={{ marginVertical: 16 }} />
        ) : (
          <Pressable style={s.primaryBtn} onPress={isLogin ? login : register}>
            <Text style={s.primaryText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        )}

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or continue with</Text>
          <View style={s.dividerLine} />
        </View>

        <SocialButton
          label="Continue with Google"
          onPress={() => oauth('google')}
          disabled={busy}
          leading={<Text style={s.socialGlyph}>G</Text>}
        />
        <SocialButton
          label="Continue with Microsoft"
          onPress={() => oauth('microsoft')}
          disabled={busy}
          leading={<Text style={s.socialGlyph}>⬚</Text>}
        />
        <SocialButton
          label="Continue with Apple"
          onPress={() => oauth('apple')}
          disabled={busy}
          leading={<Ionicons name="logo-apple" size={18} color="#1C1C1E" />}
        />

        <View style={s.footer}>
          {isLogin ? (
            <Text style={s.footerText}>
              Don&apos;t have an account?{' '}
              <Text style={s.footerLink} onPress={() => switchMode('register')}>
                Sign up
              </Text>
              {' · '}
              <Text
                style={s.footerLink}
                onPress={() => Linking.openURL('mailto:support@stampz.app')}
              >
                Contact Support
              </Text>
            </Text>
          ) : (
            <Text style={s.footerText}>
              Already have an account?{' '}
              <Text style={s.footerLink} onPress={() => switchMode('login')}>
                Sign in
              </Text>
            </Text>
          )}
        </View>

        {isLogin && (
          <Text style={s.demoHint}>
            Demo: merchant@ / customer@ / admin@ stampz.app · Stampz123!
          </Text>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  maxLength,
  right,
  centerLabel,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'characters';
  maxLength?: number;
  right?: ReactNode;
  /** TEMP preview — drop when reverting label alignment */
  centerLabel?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, centerLabel && { textAlign: 'center' }]}>{label}</Text>
      <View style={s.inputRow}>
        <Ionicons name={icon} size={18} color="#9CA3AF" />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          maxLength={maxLength}
        />
        {right}
      </View>
    </View>
  );
}

function SocialButton({
  label,
  onPress,
  disabled,
  leading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  leading: ReactNode;
}) {
  return (
    <Pressable style={[s.socialBtn, disabled && { opacity: 0.55 }]} onPress={onPress} disabled={disabled}>
      <View style={s.socialLeading}>{leading}</View>
      <Text style={s.socialLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  pad: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  brandBlock: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: CORAL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: CORAL,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoImg: { width: '100%', height: '100%' },
  logoLetter: { color: '#fff', fontSize: 24, fontWeight: '900' },
  brandTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  brandSub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.muted },
  welcome: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  welcomeSub: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.md,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  roleChipOn: { borderColor: CORAL, backgroundColor: '#FFF5F5' },
  roleText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  roleTextOn: { color: CORAL, fontWeight: '800' },
  field: { marginBottom: 14 },
  fieldLabel: { marginBottom: 8, fontSize: 13, fontWeight: '600', color: '#6B7280' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink, padding: 0 },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgot: { color: CORAL, fontWeight: '700', fontSize: 13 },
  strengthBox: { marginTop: -6, marginBottom: 14 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 999 },
  strengthLabel: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  captchaBox: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
  },
  captchaLabel: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  captchaInput: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 10, fontSize: 13 },
  verifyHint: { color: '#047857', fontWeight: '600', marginBottom: 10, fontSize: 12, lineHeight: 16 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CORAL,
    borderRadius: 12,
    paddingVertical: 15,
    shadowColor: CORAL,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  socialLeading: { width: 28, alignItems: 'center' },
  socialGlyph: { fontSize: 16, fontWeight: '900', color: colors.ink },
  socialLabel: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 14, color: colors.ink },
  footer: { marginTop: 18, alignItems: 'center' },
  footerText: { textAlign: 'center', fontSize: 13, color: colors.muted, lineHeight: 20 },
  footerLink: { color: CORAL, fontWeight: '800' },
  demoHint: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11,
    color: '#A1A1AA',
    lineHeight: 16,
  },
});
