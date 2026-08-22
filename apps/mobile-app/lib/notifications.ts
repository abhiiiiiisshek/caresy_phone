import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// How push works: device gets an Expo push token, we upsert it into
// push_tokens (migration 21). The existing cron at api/cron/send-push already
// drains that table to FCM — no server change needed.

// Lazy-load expo-notifications so the app boots even before `expo install expo-notifications`.
let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch {}
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensurePushPermission(): Promise<string | null> {
  if (!Notifications) return null;
  if (Constants.isDevice === false) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Caresy updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
  return token;
}

export async function registerPushToken(token: string, userId: string) {
  // push_tokens schema: user_id, token, platform, created_at
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: 'token' }
  );
  if (error) console.warn('[push] upsert failed', error.message);
}
