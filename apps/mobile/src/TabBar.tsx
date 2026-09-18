import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './theme';

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

const TAB_META: Record<string, TabMeta> = {
  Dashboard: { label: 'Dashboard', icon: 'grid-outline', iconFocused: 'grid' },
  Cards: { label: 'Cards', icon: 'card-outline', iconFocused: 'card' },
  Scan: {
    label: 'QR Scan',
    icon: 'qr-code-outline',
    iconFocused: 'qr-code',
    center: true,
  },
  Profile: { label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
  Campaigns: { label: 'Campaigns', icon: 'megaphone-outline', iconFocused: 'megaphone' },
  More: { label: 'More', icon: 'apps-outline', iconFocused: 'apps' },
  // customer aliases
  Home: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  Discover: { label: 'Discover', icon: 'map-outline', iconFocused: 'map' },
  MyQR: { label: 'My QR', icon: 'qr-code-outline', iconFocused: 'qr-code', center: true },
  Rewards: { label: 'Rewards', icon: 'gift-outline', iconFocused: 'gift' },
  Overview: { label: 'Dashboard', icon: 'stats-chart-outline', iconFocused: 'stats-chart' },
  Merchants: { label: 'Merchants', icon: 'storefront-outline', iconFocused: 'storefront' },
  Approvals: {
    label: 'Approve',
    icon: 'shield-checkmark-outline',
    iconFocused: 'shield-checkmark',
    center: true,
  },
  Users: { label: 'Users', icon: 'people-outline', iconFocused: 'people' },
  Billing: { label: 'Billing', icon: 'card-outline', iconFocused: 'card' },
};

export function StampPerkTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const itemStyle = options.tabBarItemStyle as { display?: string } | undefined;
          if (itemStyle?.display === 'none') return null;

          const meta = TAB_META[route.name] || {
            label: options.title || route.name,
            icon: 'ellipse-outline' as const,
            iconFocused: 'ellipse' as const,
          };
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (meta.center) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.centerSlot}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
              >
                <View style={[styles.centerBtn, focused && styles.centerBtnOn]}>
                  <Ionicons name={meta.iconFocused} size={28} color={colors.white} />
                </View>
                <Text style={[styles.centerLabel, focused && { color: colors.coral }]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
            >
              <Ionicons
                name={focused ? meta.iconFocused : meta.icon}
                size={22}
                color={focused ? colors.coral : colors.muted}
              />
              <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 8,
    minHeight: 58,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  labelOn: {
    color: colors.coral,
    fontWeight: '700',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    marginTop: -22,
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coral,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 4,
    borderColor: colors.white,
  },
  centerBtnOn: {
    backgroundColor: colors.coralDark,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 4,
  },
});
