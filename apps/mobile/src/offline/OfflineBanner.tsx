import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useOfflineOptional } from './OfflineContext';

export function OfflineBanner({ token }: { token?: string | null }) {
  const offline = useOfflineOptional();
  if (!offline) return null;

  const showOffline = !offline.online;
  const showPending = offline.pending > 0;
  if (!showOffline && !showPending) return null;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: showOffline ? '#FFF4E5' : '#E8F8EF',
        borderWidth: 1,
        borderColor: showOffline ? '#FFD9A8' : '#B7E4C7',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Ionicons
        name={showOffline ? 'cloud-offline-outline' : 'cloud-upload-outline'}
        size={18}
        color={showOffline ? '#C27803' : '#1B7A4A'}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', fontSize: 12, color: colors.ink }}>
          {showOffline ? 'Offline mode' : 'Pending sync'}
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
          {showOffline
            ? `QR stamps & loyalty cards queue locally${showPending ? ` · ${offline.pending} waiting` : ''}`
            : `${offline.pending} item(s) will sync to the server`}
        </Text>
      </View>
      {!!token && showPending && offline.online && (
        <Pressable
          onPress={() => offline.syncNow(token)}
          disabled={offline.syncing}
          style={{
            backgroundColor: colors.coral,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            opacity: offline.syncing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
            {offline.syncing ? 'Syncing…' : 'Sync'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
