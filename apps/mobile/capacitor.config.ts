import type { CapacitorConfig } from '@capacitor/cli';

// Thin native shell around the live site: the webview loads caresy.co.in, so
// every web deploy updates the app instantly with no store re-release.
// ponytail: remote-URL shell. If Apple review pushes back or offline support
// is needed, switch to a static export bundled into webDir.
const config: CapacitorConfig = {
  appId: 'in.co.caresy.app',
  appName: 'Caresy',
  webDir: 'www',
  server: {
    url: 'https://caresy.co.in',
    errorPath: 'error.html',
    allowNavigation: ['caresy.co.in', '*.caresy.co.in', 'accounts.google.com', '*.supabase.co', 'wa.me', 'api.whatsapp.com'],
  },
  backgroundColor: '#f8faf5',
  plugins: {
    SplashScreen: {
      // A CEILING, not a cue. The webview loads the live site, so the page can
      // still be fetching when a 1200ms auto-hide fires — and the gap between
      // the native splash going and the site painting is a white flash.
      // NativeSplash in the web app calls SplashScreen.hide() as soon as its
      // own pixel-matched overlay has painted, which is normally well under a
      // second. This longer duration only matters if that call never arrives
      // (JS blocked, plugin missing): the splash still clears itself rather
      // than hanging forever, which is why launchAutoHide stays true.
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#f8faf5',
      showSpinner: false,
      androidSpinnerStyle: 'horizontal',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f8faf5',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
