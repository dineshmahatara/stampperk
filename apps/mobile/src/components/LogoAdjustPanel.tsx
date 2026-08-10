import { useRef } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme';

export type LogoTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  posX: number;
  posY: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function LogoAdjustPanel({
  logoUrl,
  stampColor = '#16352A',
  value,
  onChange,
}: {
  logoUrl: string;
  stampColor?: string;
  value: LogoTransform;
  onChange: (next: LogoTransform) => void;
}) {
  const layout = useRef({ w: 1, h: 1 });
  const valueRef = useRef(value);
  valueRef.current = value;

  const cardPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const { w, h } = layout.current;
        onChange({
          ...valueRef.current,
          posX: clamp((locationX / w) * 100, 10, 90),
          posY: clamp((locationY / h) * 100, 10, 68),
        });
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const { w, h } = layout.current;
        onChange({
          ...valueRef.current,
          posX: clamp((locationX / w) * 100, 10, 90),
          posY: clamp((locationY / h) * 100, 10, 68),
        });
      },
    }),
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    layout.current = {
      w: e.nativeEvent.layout.width,
      h: e.nativeEvent.layout.height,
    };
  }

  return (
    <View style={s.box}>
      <Text style={s.title}>Place logo on card</Text>
      <Text style={s.hint}>Drag on the card to set position · − / + for size</Text>

      <View
        style={[s.card, { backgroundColor: stampColor }]}
        onLayout={onLayout}
        {...cardPan.panHandlers}
      >
        <View style={s.cardText}>
          <Text style={s.biz} numberOfLines={1}>
            YOUR BUSINESS
          </Text>
          <Text style={s.tag}>LOYALTY</Text>
        </View>
        <View
          style={[
            s.logo,
            {
              left: `${value.posX}%`,
              top: `${value.posY}%`,
              transform: [
                { translateX: -26 },
                { translateY: -26 },
                { scale: value.scale },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: logoUrl }}
            style={[
              s.logoImg,
              {
                transform: [
                  { translateX: (value.offsetX / 100) * 52 },
                  { translateY: (value.offsetY / 100) * 52 },
                ],
              },
            ]}
          />
        </View>
        <View style={s.bar}>
          <Text style={s.barText}>Drag to place</Text>
        </View>
      </View>

      <View style={s.row}>
        <Pressable
          onPress={() => onChange({ ...value, scale: clamp(value.scale - 0.1, 0.7, 2.2) })}
          style={s.btn}
        >
          <Text style={s.btnText}>−</Text>
        </Pressable>
        <Text style={s.scaleLabel}>{value.scale.toFixed(2)}×</Text>
        <Pressable
          onPress={() => onChange({ ...value, scale: clamp(value.scale + 0.1, 0.7, 2.2) })}
          style={s.btn}
        >
          <Text style={s.btnText}>+</Text>
        </Pressable>
      </View>

      <View style={s.presets}>
        {[
          { label: 'Top', posX: 50, posY: 18 },
          { label: 'Center', posX: 50, posY: 38 },
          { label: 'Left', posX: 22, posY: 28 },
          { label: 'Right', posX: 78, posY: 28 },
        ].map((p) => (
          <Pressable
            key={p.label}
            onPress={() => onChange({ ...value, posX: p.posX, posY: p.posY })}
            style={s.preset}
          >
            <Text style={s.presetText}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => onChange({ scale: 1, offsetX: 0, offsetY: 0, posX: 50, posY: 32 })}
        style={s.reset}
      >
        <Text style={s.resetText}>Reset placement</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 14,
    marginBottom: 10,
  },
  title: { fontWeight: '800', fontSize: 14, color: colors.ink, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 10 },
  card: {
    height: 176,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardText: { position: 'absolute', left: 12, right: 12, bottom: 28, alignItems: 'center' },
  biz: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  tag: { color: '#C9B08A', fontWeight: '700', fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  logo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#C9B08A',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logoImg: { width: '100%', height: '100%' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#C9B08A',
    paddingVertical: 4,
    alignItems: 'center',
  },
  barText: { fontSize: 9, fontWeight: '800', color: '#16352A', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 22, fontWeight: '800', color: colors.ink },
  scaleLabel: { fontWeight: '800', color: colors.coral, minWidth: 48, textAlign: 'center' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  preset: {
    backgroundColor: '#F4F5F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: { fontWeight: '700', fontSize: 11, color: colors.ink },
  reset: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F4F5F7',
    borderRadius: 999,
  },
  resetText: { fontWeight: '700', fontSize: 12, color: colors.ink },
});
