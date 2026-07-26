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
    allowNavigation: ['caresy.co.in', '*.caresy.co.in', 'accounts.google.com', '*.supabase.co', 'wa.me', 'api.whatsapp.com'],
  },
  backgroundColor: '#f8faf5',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#f8faf5',
      showSpinner: false,
    },
  },
};

export default config;
