import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';

export type MapLocationValue = {
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl?: string | null;
  address?: string | null;
};

const DEFAULT = { latitude: 27.7172, longitude: 85.324, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export function googleMapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function MapLocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (value: MapLocationValue) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasPin =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  const region: Region = hasPin
    ? {
        latitude: latitude!,
        longitude: longitude!,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT;

  function apply(lat: number, lng: number) {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));
    onChange({
      latitude: roundedLat,
      longitude: roundedLng,
      googleMapsUrl: googleMapsLink(roundedLat, roundedLng),
    });
    mapRef.current?.animateToRegion(
      {
        latitude: roundedLat,
        longitude: roundedLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      350,
    );
  }

  async function useCurrent() {
    setError('');
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Location permission required');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      apply(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get location');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <View style={s.actions}>
        <Pressable onPress={useCurrent} style={s.btn} disabled={busy}>
          <Text style={s.btnText}>{busy ? 'Locating…' : 'Use current location'}</Text>
        </Pressable>
        {hasPin ? (
          <Pressable
            onPress={() => onChange({ latitude: null, longitude: null, googleMapsUrl: '' })}
            style={s.btnOutline}
          >
            <Text style={s.btnOutlineText}>Clear pin</Text>
          </Pressable>
        ) : null}
      </View>

      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={region}
        onPress={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          apply(lat, lng);
        }}
        provider={Platform.OS === 'android' ? undefined : undefined}
      >
        {hasPin ? (
          <Marker
            coordinate={{ latitude: latitude!, longitude: longitude! }}
            draggable
            onDragEnd={(e) => {
              const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
              apply(lat, lng);
            }}
          />
        ) : null}
      </MapView>

      <Text style={s.coords}>
        {hasPin
          ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
          : 'Tap map or use current location to set pin'}
      </Text>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  btnOutlineText: { fontWeight: '800', fontSize: 13, color: colors.ink },
  map: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  coords: { fontSize: 12, fontWeight: '600', color: colors.muted },
  error: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
});
