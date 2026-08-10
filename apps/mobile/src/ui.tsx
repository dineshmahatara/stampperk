import { ReactNode } from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, styles } from './theme';

export function PrimaryButton({
  label,
  onPress,
  outline,
  ghost,
  arrow,
  disabled,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  ghost?: boolean;
  arrow?: boolean;
  disabled?: boolean;
}) {
  const style = outline ? styles.btnOutline : ghost ? styles.btnGhost : styles.btn;
  const textStyle = outline || ghost ? styles.btnTextOutline : styles.btnText;
  return (
    <Pressable
      style={[style, disabled && { opacity: 0.45 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={textStyle}>{label}</Text>
      {arrow && (
        <Ionicons
          name="arrow-forward"
          size={18}
          color={outline || ghost ? colors.coral : colors.white}
        />
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{title}</Text>
          {!!subtitle && <Text style={[styles.muted, { marginBottom: 0 }]}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

export function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={[styles.card, { width: '47%', marginBottom: 0 }]}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={18} color={colors.coral} />
      </View>
      <Text style={styles.kpi}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} style={[styles.row, { paddingVertical: 14 }]}>
        <View style={styles.iconTile}>
          <Ionicons name={icon} size={18} color={colors.coral} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, danger && { color: colors.coral }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.muted, { marginBottom: 0, fontSize: 13 }]}>{subtitle}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export function AccentTitle({
  lead,
  accent,
}: {
  lead: string;
  accent: string;
}) {
  return (
    <Text style={styles.h1}>
      {lead} <Text style={{ color: colors.coral }}>{accent}</Text>
    </Text>
  );
}
