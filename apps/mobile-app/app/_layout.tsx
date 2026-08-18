import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '../lib/AuthProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { color } from '../lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: color.bg },
                headerStyle: { backgroundColor: color.bg },
                headerTintColor: color.greenDeep,
                headerTitleStyle: { fontWeight: '700' },
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                // Apple §7 + §4: spatial push (right→left) with spring, 320ms normal
                animation: 'slide_from_right',
                animationDuration: 320,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            />
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
