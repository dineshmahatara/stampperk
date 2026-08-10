import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(token: string) {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  const push = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await api('/notifications/devices', {
    method: 'POST',
    token,
    body: JSON.stringify({
      token: push.data,
      platform: Platform.OS,
    }),
  });

  return push.data;
}

export function usePushRegistration(authToken: string | null) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    registerForPushNotifications(authToken)
      .then(setPushToken)
      .catch((e) => setError(e instanceof Error ? e.message : 'Push setup failed'));
  }, [authToken]);

  return { pushToken, error };
}
