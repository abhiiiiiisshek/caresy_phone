import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as Linking from 'expo-linking';
// Same fragment-aware parser the provider uses: Supabase's implicit grant puts
// the tokens after `#`, which expo-linking's own parser drops.
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '../../lib/supabase';
import { LoadingState, Screen } from '../../components/ui';

// Supabase redirects OAuth back to `caresy://auth/callback#access_token=...`.
// Android hands that deep link to the app, so expo-router resolves it as a
// route — and with no file here every Google sign-in from the Play build
// landed on "Unmatched Route". The tokens are consumed here too, not only in
// AuthProvider.signInWithGoogle: when the deep link cold-starts the app there
// is no openAuthSessionAsync promise left to receive them.
export default function AuthCallback() {
  const url = Linking.useURL();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      const { params } = QueryParams.getQueryParams(url);
      const access_token = params.access_token as string | undefined;
      const refresh_token = params.refresh_token as string | undefined;
      if (access_token && refresh_token) {
        // Errors are swallowed on purpose: openAuthSessionAsync may have
        // already set the very same session, and failing that race is not a
        // reason to strand the user on a spinner.
        await supabase.auth.setSession({ access_token, refresh_token }).catch(() => {});
      }
      if (!cancelled) setDone(true);
    })();
    return () => { cancelled = true; };
  }, [url]);

  // No URL ever arrives if the user reached this route some other way — go
  // home rather than spin forever.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (done) return <Redirect href="/" />;
  return (
    <Screen>
      <LoadingState label="Signing you in…" />
    </Screen>
  );
}
