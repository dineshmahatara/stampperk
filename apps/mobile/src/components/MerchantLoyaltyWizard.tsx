import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BUSINESS_CATEGORY_TREE,
  CARD_TEMPLATES,
  STAMP_COLORS,
  CARD_FONTS,
  categoryLabelFromSlug,
  type CreateLoyaltyProgramInput,
} from '@stampperk/shared';
import { colors, styles as theme } from '../theme';
import { PrimaryButton, ScreenHeader } from '../ui';
import { StampCardPreview, type ProfileContact } from './StampCardPreview';
import { LogoPicker } from './LogoPicker';
import { LogoAdjustPanel } from './LogoAdjustPanel';
import { PromoPhotoPicker } from './PromoPhotoPicker';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';

export type MobileWizardResult = {
  merchant?: {
    businessName: string;
    category: string;
    logoUrl?: string;
    phone?: string;
    city?: string;
    country: string;
  };
  program: CreateLoyaltyProgramInput;
};

export type LoyaltyProgramDraft = {
  id?: string;
  title?: string;
  totalStamps?: number;
  rewardTitle?: string;
  rewardDescription?: string | null;
  cardType?: 'CLASSIC' | 'THRESHOLD' | 'MULTI_STEP' | string;
  categorySlug?: string | null;
  templateId?: string | null;
  businessName?: string | null;
  logoUrl?: string | null;
  logoScale?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  logoPosX?: number | null;
  logoPosY?: number | null;
  promoImageUrl?: string | null;
  stampColor?: string | null;
  emptyStampColor?: string | null;
  accentColor?: string | null;
  fontStyle?: 'sans' | 'rounded' | 'display' | string | null;
  thresholdType?: 'VISITS' | 'SPEND' | string | null;
  thresholdValue?: number | null;
  stepsJson?: { at: number; rewardTitle: string; rewardDescription?: string }[] | null;
  doubleSided?: boolean | null;
  expiresAt?: string | Date | null;
  expiryDays?: number | null;
  referralEnabled?: boolean | null;
  referralBonusReferrer?: number | null;
  referralBonusReferee?: number | null;
};

type StepId =
  | 'business'
  | 'type'
  | 'reward'
  | 'design'
  | 'options'
  | 'preview'
  | 'done';

const STEP_META: Record<Exclude<StepId, 'done'>, { title: string; subtitle: string }> = {
  business: { title: 'Your business', subtitle: 'Tell customers who you are' },
  type: { title: 'Card type', subtitle: 'How should rewards work?' },
  reward: { title: 'Stamps & reward', subtitle: 'What customers earn' },
  design: { title: 'Look & feel', subtitle: 'Template, colors, style' },
  options: { title: 'Card options', subtitle: 'Sides, expiry, extras' },
  preview: { title: 'Preview', subtitle: 'Confirm before publishing' },
};

function dateOnly(value?: string | Date | null) {
  if (!value) return '';
  const s = String(value);
  return s.slice(0, 10);
}

export function MerchantLoyaltyWizard({
  mode,
  defaults,
  profile,
  token,
  initial,
  onComplete,
  onDone,
  onCancel,
}: {
  mode: 'onboarding' | 'create-card' | 'edit-card';
  defaults?: { businessName?: string; logoUrl?: string; categorySlug?: string };
  profile?: ProfileContact;
  token?: string | null;
  initial?: LoyaltyProgramDraft | null;
  onComplete: (result: MobileWizardResult) => Promise<void>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = mode === 'edit-card';
  const flow = useMemo<StepId[]>(
    () =>
      mode === 'onboarding'
        ? ['business', 'type', 'reward', 'design', 'options', 'preview', 'done']
        : ['type', 'reward', 'design', 'options', 'preview', 'done'],
    [mode],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const step = flow[stepIndex];
  const setupSteps = flow.filter((s) => s !== 'done');
  const progressIndex = Math.min(stepIndex, setupSteps.length - 1);
  const progressTotal = setupSteps.length;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState(
    initial?.businessName || defaults?.businessName || '',
  );
  const [categorySlug, setCategorySlug] = useState(
    initial?.categorySlug || defaults?.categorySlug || 'coffee-stamp-card',
  );
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || defaults?.logoUrl || '');
  const [logoScale, setLogoScale] = useState(initial?.logoScale ?? 1);
  const [logoOffsetX, setLogoOffsetX] = useState(initial?.logoOffsetX ?? 0);
  const [logoOffsetY, setLogoOffsetY] = useState(initial?.logoOffsetY ?? 0);
  const [logoPosX, setLogoPosX] = useState(initial?.logoPosX ?? 50);
  const [logoPosY, setLogoPosY] = useState(initial?.logoPosY ?? 32);
  const [promoImageUrl, setPromoImageUrl] = useState(initial?.promoImageUrl || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState(profile?.city || 'Kathmandu');

  const [cardType, setCardType] = useState<'CLASSIC' | 'THRESHOLD' | 'MULTI_STEP'>(
    (initial?.cardType as 'CLASSIC' | 'THRESHOLD' | 'MULTI_STEP') || 'CLASSIC',
  );
  const [templateId, setTemplateId] = useState(initial?.templateId || 'story-forest');
  const [totalStamps, setTotalStamps] = useState(initial?.totalStamps || 10);
  const [stampColor, setStampColor] = useState(initial?.stampColor || '#16352A');
  const [emptyStampColor, setEmptyStampColor] = useState(initial?.emptyStampColor || '#C9B08A');
  const [accentColor, setAccentColor] = useState(initial?.accentColor || '#F3EEE4');
  const [fontStyle, setFontStyle] = useState<'sans' | 'rounded' | 'display'>(
    (initial?.fontStyle as 'sans' | 'rounded' | 'display') || 'sans',
  );
  const [rewardTitle, setRewardTitle] = useState(initial?.rewardTitle || '1 Free Coffee');
  const [rewardDescription, setRewardDescription] = useState(
    initial?.rewardDescription || 'Collect stamps and unlock a free coffee',
  );
  const [title, setTitle] = useState(initial?.title || 'Loyalty Card');
  const [thresholdType, setThresholdType] = useState<'VISITS' | 'SPEND'>(
    (initial?.thresholdType as 'VISITS' | 'SPEND') || 'VISITS',
  );
  const [thresholdValue, setThresholdValue] = useState(initial?.thresholdValue || 10);
  const [stepsJson, setStepsJson] = useState(
    initial?.stepsJson?.length
      ? initial.stepsJson
      : [{ at: 4, rewardTitle: 'Small treat', rewardDescription: 'Early reward' }],
  );
  const [doubleSided, setDoubleSided] = useState(initial?.doubleSided !== false);
  const [expiresAt, setExpiresAt] = useState(dateOnly(initial?.expiresAt));
  const [expiryDays, setExpiryDays] = useState(initial?.expiryDays ?? 90);
  const [referralEnabled, setReferralEnabled] = useState(Boolean(initial?.referralEnabled));
  const [referralBonusReferrer, setReferralBonusReferrer] = useState(
    initial?.referralBonusReferrer ?? 1,
  );
  const [referralBonusReferee, setReferralBonusReferee] = useState(
    initial?.referralBonusReferee ?? 1,
  );

  const displayBusiness = businessName || defaults?.businessName || 'Your Business';
  const profileForCard: ProfileContact = profile || {
    phone: phone || undefined,
    city: city || undefined,
  };

  function applyTemplate(id: string) {
    const t = CARD_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setStampColor(t.stampColor);
    setEmptyStampColor(t.emptyStampColor);
    setAccentColor(t.accentColor);
    setFontStyle(t.fontStyle);
    setCardType(t.cardType);
  }

  function goNext() {
    setError('');
    if (step === 'business' && !businessName.trim()) {
      setError('Business name required');
      return;
    }
    if (step === 'reward' && !rewardTitle.trim()) {
      setError('Reward title required');
      return;
    }
    setStepIndex((i) => Math.min(i + 1, flow.length - 1));
  }

  function goBack() {
    setError('');
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function publishCard() {
    setBusy(true);
    setError('');
    try {
      const program: CreateLoyaltyProgramInput = {
        title: title || 'Loyalty Card',
        description: `Starter ${cardType.toLowerCase()} loyalty card`,
        totalStamps,
        rewardTitle,
        rewardDescription,
        cardType,
        categorySlug,
        templateId,
        businessName: businessName || defaults?.businessName || undefined,
        logoUrl: logoUrl || defaults?.logoUrl || undefined,
        logoScale,
        logoOffsetX,
        logoOffsetY,
        logoPosX,
        logoPosY,
        promoImageUrl: promoImageUrl || undefined,
        stampColor,
        emptyStampColor,
        accentColor,
        fontStyle,
        doubleSided,
        expiryDays,
        expiresAt: expiresAt || '',
        cardPhone: profileForCard.phone || phone || undefined,
        cardEmail: profileForCard.email || undefined,
        cardLocation:
          [profileForCard.address, profileForCard.city].filter(Boolean).join(', ') || city || undefined,
        cardWebsite: profileForCard.website || undefined,
        cardFacebook: profileForCard.facebook || undefined,
        cardInstagram: profileForCard.instagram || undefined,
        deliveryAvailable: Boolean(profileForCard.deliveryEnabled),
        referralEnabled,
        referralBonusReferrer,
        referralBonusReferee,
        ...(cardType === 'THRESHOLD' ? { thresholdType, thresholdValue } : {}),
        ...(cardType === 'MULTI_STEP' ? { stepsJson } : {}),
      };
      await onComplete({
        merchant:
          mode === 'onboarding'
            ? {
                businessName,
                category: categoryLabelFromSlug(categorySlug),
                logoUrl: logoUrl || undefined,
                phone: phone || undefined,
                city,
                country: 'NP',
              }
            : undefined,
        program,
      });
      setStepIndex(flow.length - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const meta = step !== 'done' ? STEP_META[step] : null;

  return (
    <SafeAreaView style={theme.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={theme.pad} bottomExtra={100}>
        {step !== 'done' ? (
          <>
            <ScreenHeader title={meta!.title} subtitle={meta!.subtitle} />
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${((progressIndex + 1) / progressTotal) * 100}%` },
                  ]}
                />
              </View>
              <Text style={s.progressText}>
                Step {progressIndex + 1} of {progressTotal}
              </Text>
            </View>
          </>
        ) : null}

        {!!error && <Text style={s.error}>{error}</Text>}

        {step === 'business' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Tell us about <Text style={{ color: colors.coral }}>your business</Text>
            </Text>
            <Text style={theme.muted}>Add the basics so customers recognize your brand.</Text>
            <Text style={theme.sectionLabel}>Business name</Text>
            <TextInput style={theme.input} value={businessName} onChangeText={setBusinessName} />
            <Text style={theme.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {BUSINESS_CATEGORY_TREE.flatMap((g) =>
                g.children.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategorySlug(c.id)}
                    style={[s.chip, categorySlug === c.id && s.chipOn]}
                  >
                    <Text style={categorySlug === c.id ? s.chipTextOn : s.chipText}>{c.label}</Text>
                  </Pressable>
                )),
              )}
            </ScrollView>
            <Text style={theme.sectionLabel}>Logo</Text>
            <LogoPicker
              token={token}
              value={logoUrl}
              categorySlug={categorySlug}
              onChange={(url) => {
                setLogoUrl(url);
                if (!url) {
                  setLogoScale(1);
                  setLogoOffsetX(0);
                  setLogoOffsetY(0);
                  setLogoPosX(50);
                  setLogoPosY(32);
                }
              }}
            />
            {!!logoUrl && (
              <LogoAdjustPanel
                logoUrl={logoUrl}
                value={{
                  scale: logoScale,
                  offsetX: logoOffsetX,
                  offsetY: logoOffsetY,
                  posX: logoPosX,
                  posY: logoPosY,
                }}
                onChange={(t) => {
                  setLogoScale(t.scale);
                  setLogoOffsetX(t.offsetX);
                  setLogoOffsetY(t.offsetY);
                  setLogoPosX(t.posX);
                  setLogoPosY(t.posY);
                }}
                stampColor={stampColor}
              />
            )}
            <Text style={theme.sectionLabel}>Phone</Text>
            <TextInput style={theme.input} value={phone} onChangeText={setPhone} />
            <Text style={theme.sectionLabel}>City</Text>
            <TextInput style={theme.input} value={city} onChangeText={setCity} />
          </View>
        )}

        {step === 'type' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Choose how <Text style={{ color: colors.coral }}>rewards</Text> work
            </Text>
            <Text style={theme.muted}>Pick one style for this loyalty card. You can add more cards later.</Text>
            {(
              [
                ['CLASSIC', 'Classic stamp card', 'Customers collect stamps and unlock a reward.'],
                ['THRESHOLD', 'Threshold reward', 'Unlock a reward after visits or spend.'],
                ['MULTI_STEP', 'Multi-step card', 'Milestones unlock rewards along the way.'],
              ] as const
            ).map(([id, titleText, desc]) => (
              <Pressable
                key={id}
                onPress={() => setCardType(id)}
                style={[s.option, cardType === id && s.optionOn]}
              >
                <View style={[s.radio, cardType === id && s.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optionTitle}>{titleText}</Text>
                  <Text style={theme.muted}>{desc}</Text>
                </View>
              </Pressable>
            ))}
            <View style={s.tip}>
              <Text style={theme.muted}>Tip: Start with Classic — it works for most cafés and shops.</Text>
            </View>
          </View>
        )}

        {step === 'reward' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Set the <Text style={{ color: colors.coral }}>reward</Text>
            </Text>
            <Text style={theme.muted}>How many stamps, and what do customers unlock?</Text>

            <Text style={theme.sectionLabel}>How many stamps?</Text>
            <View style={s.counter}>
              <Pressable onPress={() => setTotalStamps((n) => Math.max(3, n - 1))} style={s.counterBtn}>
                <Text style={s.counterBtnText}>−</Text>
              </Pressable>
              <Text style={s.counterValue}>{totalStamps} stamps</Text>
              <Pressable onPress={() => setTotalStamps((n) => Math.min(30, n + 1))} style={s.counterBtn}>
                <Text style={s.counterBtnText}>+</Text>
              </Pressable>
            </View>

            <Text style={theme.sectionLabel}>Card title</Text>
            <TextInput style={theme.input} value={title} onChangeText={setTitle} placeholder="Loyalty Card" />
            <Text style={theme.sectionLabel}>Reward title</Text>
            <TextInput style={theme.input} value={rewardTitle} onChangeText={setRewardTitle} />
            <Text style={theme.sectionLabel}>Reward details</Text>
            <TextInput
              style={theme.input}
              value={rewardDescription}
              onChangeText={setRewardDescription}
              multiline
            />

            {cardType === 'THRESHOLD' && (
              <>
                <Text style={theme.sectionLabel}>Threshold type</Text>
                <View style={s.rowWrap}>
                  {(['VISITS', 'SPEND'] as const).map((t) => (
                    <Pressable key={t} onPress={() => setThresholdType(t)} style={[s.chip, thresholdType === t && s.chipOn]}>
                      <Text style={thresholdType === t ? s.chipTextOn : s.chipText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={theme.sectionLabel}>Target value</Text>
                <TextInput
                  style={theme.input}
                  keyboardType="numeric"
                  value={String(thresholdValue)}
                  onChangeText={(v) => setThresholdValue(Number(v) || 1)}
                />
              </>
            )}

            {cardType === 'MULTI_STEP' && (
              <>
                <Text style={theme.sectionLabel}>First milestone stamp #</Text>
                <TextInput
                  style={theme.input}
                  keyboardType="numeric"
                  value={String(stepsJson[0]?.at || 4)}
                  onChangeText={(v) =>
                    setStepsJson([
                      {
                        ...stepsJson[0],
                        at: Number(v) || 1,
                        rewardTitle: stepsJson[0]?.rewardTitle || 'Bonus',
                      },
                    ])
                  }
                />
                <Text style={theme.sectionLabel}>Milestone reward</Text>
                <TextInput
                  style={theme.input}
                  value={stepsJson[0]?.rewardTitle || ''}
                  onChangeText={(v) =>
                    setStepsJson([{ ...stepsJson[0], at: stepsJson[0]?.at || 4, rewardTitle: v }])
                  }
                />
              </>
            )}
          </View>
        )}

        {step === 'design' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Make it <Text style={{ color: colors.coral }}>yours</Text>
            </Text>
            <Text style={theme.muted}>Choose a logo, template, and colors for your loyalty card.</Text>

            <Text style={theme.sectionLabel}>Logo</Text>
            <LogoPicker
              token={token}
              value={logoUrl || defaults?.logoUrl}
              categorySlug={categorySlug}
              onChange={(url) => {
                setLogoUrl(url);
                if (!url) {
                  setLogoScale(1);
                  setLogoOffsetX(0);
                  setLogoOffsetY(0);
                  setLogoPosX(50);
                  setLogoPosY(32);
                }
              }}
            />
            {!!(logoUrl || defaults?.logoUrl) && (
              <LogoAdjustPanel
                logoUrl={logoUrl || defaults?.logoUrl || ''}
                value={{
                  scale: logoScale,
                  offsetX: logoOffsetX,
                  offsetY: logoOffsetY,
                  posX: logoPosX,
                  posY: logoPosY,
                }}
                onChange={(t) => {
                  setLogoScale(t.scale);
                  setLogoOffsetX(t.offsetX);
                  setLogoOffsetY(t.offsetY);
                  setLogoPosX(t.posX);
                  setLogoPosY(t.posY);
                }}
                stampColor={stampColor}
              />
            )}

            <Text style={theme.sectionLabel}>Promo photo</Text>
            <PromoPhotoPicker token={token} value={promoImageUrl} onChange={setPromoImageUrl} />

            <Text style={theme.sectionLabel}>Template</Text>
            <View style={s.rowWrap}>
              {CARD_TEMPLATES.map((t) => (
                <Pressable key={t.id} onPress={() => applyTemplate(t.id)} style={[s.chip, templateId === t.id && s.chipOn]}>
                  <Text style={templateId === t.id ? s.chipTextOn : s.chipText}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={theme.sectionLabel}>Stamp / brand color</Text>
            <View style={s.rowWrap}>
              {STAMP_COLORS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setStampColor(c.value)}
                  style={[s.colorDot, { backgroundColor: c.value }, stampColor === c.value && s.colorDotOn]}
                />
              ))}
            </View>

            <Text style={theme.sectionLabel}>Font</Text>
            <View style={s.rowWrap}>
              {CARD_FONTS.map((f) => (
                <Pressable key={f.id} onPress={() => setFontStyle(f.id)} style={[s.chip, fontStyle === f.id && s.chipOn]}>
                  <Text style={fontStyle === f.id ? s.chipTextOn : s.chipText}>{f.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[theme.muted, { textAlign: 'center', marginTop: 8, marginBottom: 8 }]}>
              Live preview
            </Text>
            <StampCardPreview
              businessName={displayBusiness}
              categorySlug={categorySlug}
              logoUrl={logoUrl || defaults?.logoUrl}
              promoImageUrl={promoImageUrl || undefined}
              logoScale={logoScale}
              logoOffsetX={logoOffsetX}
              logoOffsetY={logoOffsetY}
              logoPosX={logoPosX}
              logoPosY={logoPosY}
              tagline={profileForCard.tagline || undefined}
              totalStamps={totalStamps}
              filledStamps={Math.min(3, totalStamps - 1)}
              rewardTitle={rewardTitle}
              stampColor={stampColor}
              emptyStampColor={emptyStampColor}
              accentColor={accentColor}
              fontStyle={fontStyle}
              doubleSided={false}
              profile={profileForCard}
            />
          </View>
        )}

        {step === 'options' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Almost <Text style={{ color: colors.coral }}>there</Text>
            </Text>
            <Text style={theme.muted}>Optional settings for this loyalty card.</Text>

            <Pressable onPress={() => setDoubleSided((v) => !v)} style={[s.option, doubleSided && s.optionOn]}>
              <View style={[s.radio, doubleSided && s.radioOn]} />
              <View style={{ flex: 1 }}>
                <Text style={s.optionTitle}>Double-sided card</Text>
                <Text style={theme.muted}>Front brand + back with stamps and contact.</Text>
              </View>
            </Pressable>

            <View style={s.tip}>
              <Text style={theme.muted}>
                Social, email, website, and location on the back come from Business Profile.
              </Text>
            </View>

            <Text style={theme.sectionLabel}>Expire date (YYYY-MM-DD)</Text>
            <TextInput style={theme.input} value={expiresAt} onChangeText={setExpiresAt} placeholder="2026-12-31" />
            <Text style={theme.sectionLabel}>Or expiry days from join</Text>
            <TextInput
              style={theme.input}
              keyboardType="numeric"
              value={String(expiryDays)}
              onChangeText={(v) => setExpiryDays(Number(v) || 0)}
            />

            <Pressable
              onPress={() => setReferralEnabled((v) => !v)}
              style={[s.option, referralEnabled && s.optionOn]}
            >
              <View style={[s.radio, referralEnabled && s.radioOn]} />
              <View style={{ flex: 1 }}>
                <Text style={s.optionTitle}>Refer & Earn</Text>
                <Text style={theme.muted}>
                  Reward customers who bring friends. Bonuses unlock after the friend’s first stamp.
                </Text>
              </View>
            </Pressable>
            {referralEnabled && (
              <View style={{ gap: 8 }}>
                <Text style={theme.sectionLabel}>Stamps for referrer</Text>
                <TextInput
                  style={theme.input}
                  keyboardType="number-pad"
                  value={String(referralBonusReferrer)}
                  onChangeText={(v) => setReferralBonusReferrer(Math.min(10, Math.max(0, Number(v) || 0)))}
                />
                <Text style={theme.sectionLabel}>Stamps for new friend</Text>
                <TextInput
                  style={theme.input}
                  keyboardType="number-pad"
                  value={String(referralBonusReferee)}
                  onChangeText={(v) => setReferralBonusReferee(Math.min(10, Math.max(0, Number(v) || 0)))}
                />
              </View>
            )}
          </View>
        )}

        {step === 'preview' && (
          <View style={s.block}>
            <Text style={s.h1}>
              Ready to <Text style={{ color: colors.coral }}>{isEdit ? 'save?' : 'publish?'}</Text>
            </Text>
            <Text style={[theme.muted, { textAlign: 'center', marginBottom: 10 }]}>
              {isEdit
                ? 'Review changes before updating this loyalty card.'
                : 'This is how customers will see your loyalty card.'}
            </Text>
            <StampCardPreview
              businessName={displayBusiness}
              categorySlug={categorySlug}
              logoUrl={logoUrl || defaults?.logoUrl}
              promoImageUrl={promoImageUrl || undefined}
              logoScale={logoScale}
              logoOffsetX={logoOffsetX}
              logoOffsetY={logoOffsetY}
              logoPosX={logoPosX}
              logoPosY={logoPosY}
              tagline={profileForCard.tagline || undefined}
              totalStamps={totalStamps}
              filledStamps={Math.min(3, totalStamps - 1)}
              rewardTitle={rewardTitle}
              stampColor={stampColor}
              emptyStampColor={emptyStampColor}
              accentColor={accentColor}
              fontStyle={fontStyle}
              doubleSided={doubleSided}
              profile={profileForCard}
              expiryLabel={expiresAt || (expiryDays ? `${expiryDays} days` : undefined)}
            />
            <View style={s.summary}>
              <Text style={s.summaryLine}>{title}</Text>
              <Text style={theme.muted}>
                {cardType} · {totalStamps} stamps → {rewardTitle}
              </Text>
            </View>
          </View>
        )}

        {step === 'done' && (
          <View style={s.celebrate}>
            <View style={s.celebrateBadge}>
              <Text style={s.celebrateEmoji}>🎉</Text>
            </View>
            <Text style={s.congrats}>{isEdit ? 'Card updated!' : 'Congratulations!'}</Text>
            <Text style={s.congratsSub}>
              {isEdit
                ? `${displayBusiness}, your loyalty card changes are saved.`
                : `${displayBusiness}, your loyalty card is live and ready for customers.`}
            </Text>

            <StampCardPreview
              businessName={displayBusiness}
              categorySlug={categorySlug}
              logoUrl={logoUrl || defaults?.logoUrl}
              promoImageUrl={promoImageUrl || undefined}
              logoScale={logoScale}
              logoOffsetX={logoOffsetX}
              logoOffsetY={logoOffsetY}
              logoPosX={logoPosX}
              logoPosY={logoPosY}
              tagline={profileForCard.tagline || undefined}
              totalStamps={totalStamps}
              filledStamps={3}
              rewardTitle={rewardTitle}
              stampColor={stampColor}
              emptyStampColor={emptyStampColor}
              accentColor={accentColor}
              fontStyle={fontStyle}
              doubleSided={doubleSided}
              profile={profileForCard}
              expiryLabel={expiresAt || (expiryDays ? `${expiryDays} days` : undefined)}
            />

            <View style={s.celebrateList}>
              {(isEdit
                ? [
                    'Loyalty card updated',
                    `${totalStamps} stamps · ${rewardTitle}`,
                    'Customers see the latest design',
                  ]
                : [
                    'Loyalty card published',
                    `${totalStamps} stamps · ${rewardTitle}`,
                    'Ready to scan & reward customers',
                  ]
              ).map((item) => (
                <View key={item} style={s.checkRow}>
                  <View style={s.check}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>
                  </View>
                  <Text style={{ fontWeight: '700', color: colors.ink, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={s.tip}>
              <Text style={theme.muted}>
                Open QR Scan to start giving stamps. Share your card from Campaigns anytime.
              </Text>
            </View>

            <PrimaryButton label="Go to my cards →" onPress={onDone} />
          </View>
        )}

        {step !== 'done' && (
          <View style={s.footer}>
            {step === 'preview' ? (
              <PrimaryButton
                label={
                  busy
                    ? isEdit
                      ? 'Saving…'
                      : 'Publishing…'
                    : isEdit
                      ? 'Save changes →'
                      : 'Publish loyalty card →'
                }
                onPress={publishCard}
                disabled={busy}
              />
            ) : (
              <PrimaryButton label="Continue →" onPress={goNext} />
            )}
            <PrimaryButton
              label={stepIndex === 0 ? 'Cancel' : 'Back'}
              outline
              onPress={goBack}
              disabled={busy}
            />
          </View>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  block: { gap: 4 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  error: { color: colors.coral, marginBottom: 8, fontWeight: '700' },
  progressWrap: { marginBottom: 16 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.pink,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: colors.coral, borderRadius: 999 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.pink,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: colors.coral },
  chipText: { fontWeight: '700', color: colors.ink, fontSize: 12 },
  chipTextOn: { fontWeight: '700', color: '#fff', fontSize: 12 },
  option: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  optionOn: { borderColor: colors.coral, backgroundColor: colors.pink },
  optionTitle: { fontWeight: '800', color: colors.ink, marginBottom: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#C7C7CC', marginTop: 2 },
  radioOn: { borderColor: colors.coral, backgroundColor: colors.coral },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, fontWeight: '700' },
  counterValue: { fontSize: 18, fontWeight: '800', color: colors.coral },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ink },
  tip: { backgroundColor: colors.pink, borderRadius: 16, padding: 12, marginVertical: 8 },
  summary: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  summaryLine: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 2 },
  footer: { marginTop: 16, gap: 4 },
  celebrate: { alignItems: 'stretch', paddingTop: 8 },
  celebrateBadge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  celebrateEmoji: { fontSize: 36 },
  congrats: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  congratsSub: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  celebrateList: { marginTop: 16, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
