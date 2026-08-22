import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../lib/AuthProvider';
import { color } from '../lib/theme';
import { ensurePushPermission, registerPushToken } from '../lib/notifications';

function PushRegistrar() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session) return;
    let mounted = true;
    (async () => {
      try {
        const token = await ensurePushPermission();
        if (token && mounted) await registerPushToken(token, session.user.id);
      } catch (e) {
        console.warn('[push] register failed', e);
      }
    })();
    let sub: any = null;
    try {
      const N = require('expo-notifications');
      sub = N.addNotificationResponseReceivedListener((r: any) => {
        console.log('[push] response', r.notification.request.content.data);
      });
    } catch {}
    return () => { mounted = false; if (sub) sub.remove(); };
  }, [session?.user.id]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <PushRegistrar />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
            headerStyle: { backgroundColor: color.bg },
            headerTintColor: color.greenDeep,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
