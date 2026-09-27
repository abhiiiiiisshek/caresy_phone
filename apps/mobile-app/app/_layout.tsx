import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../lib/AuthProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SplashGate } from '../components/SplashGate';
import { NetBanner } from '../components/States';
import { installNetworkProbe } from '../lib/network';
import { useReduceMotion } from '../lib/motion';
import { color, motion } from '../lib/theme';

// One wrapper around global fetch, installed before the first render, so every
// Supabase call reports connectivity without a single call site changing.
installNetworkProbe();

function Navigator() {
  // Auth is the only thing the splash waits on. Everything past it (profile,
  // next booking) loads behind skeletons, so the app is interactive while it
  // fills rather than held hostage to the slowest query.
  const { loading } = useAuth();
  const reduce = useReduceMotion();

  return (
    <SplashGate ready={!loading}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
          headerStyle: { backgroundColor: color.bg },
          headerTintColor: color.greenDeep,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          // Spatial push (right→left) so forward navigation has a direction and
          // back has a matching reverse — the cheapest way to give an app a
          // sense of place. Reduce Motion swaps it for a fade-through, which
          // carries the same hierarchy without the travel.
          animation: reduce ? 'fade' : 'slide_from_right',
          animationDuration: reduce ? motion.duration.fast : motion.duration.normal,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        {/* Sheets present from the bottom with the platform's own interactive
            dismiss, rather than as another pushed page. */}
        <Stack.Screen name="quick-help" options={{ presentation: 'modal', animation: reduce ? 'fade' : 'slide_from_bottom' }} />
        <Stack.Screen name="account-delete" options={{ presentation: 'modal', animation: reduce ? 'fade' : 'slide_from_bottom' }} />
      </Stack>
      <NetBanner />
    </SplashGate>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="dark" />
          <Navigator />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
