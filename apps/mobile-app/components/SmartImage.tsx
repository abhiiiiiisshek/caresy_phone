// Progressive image loading.
//
// A raw <Image> on a remote URL paints nothing, then paints everything: a hole
// in the layout that pops. This replaces that with three states the eye reads
// as one continuous reveal:
//
//   1. a dominant-colour block, painted on the first frame, so the box is never
//      empty and the page's colour composition is right before the pixels land;
//   2. a shimmer over that block while bytes are in flight;
//   3. a cross-fade from the block to the decoded image, plus a 1.02 → 1 settle
//      that gives the arrival weight instead of a hard cut.
//
// `tint` is the dominant colour. There is no on-device dominant-colour
// extraction here — that needs pixel access we do not have without a native
// module — so callers pass the colour they already know (brand tokens for local
// art, a `dominant_color` column for uploads). A neutral card tone is the
// fallback, which still beats a white hole.
//
// Failures retry with jittered backoff and then fall back to a tappable retry
// tile rather than a broken-image glyph.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, type } from '../lib/theme';
import { backoffMs, useReduceMotion } from '../lib/motion';
import { Shimmer } from './Skeleton';

const MAX_RETRIES = 2;

export function SmartImage({
  source, style, tint = color.card, resizeMode = 'cover', accessibilityLabel, radius: r = radius.lg,
}: {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  resizeMode?: 'cover' | 'contain';
  accessibilityLabel?: string;
  radius?: number;
}) {
  const reduce = useReduceMotion();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const fade = useState(() => new Animated.Value(0))[0];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onLoad = useCallback(() => {
    setState('ready');
    Animated.timing(fade, {
      toValue: 1,
      duration: reduce ? 120 : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, reduce]);

  const onError = useCallback(() => {
    if (attempt >= MAX_RETRIES) { setState('failed'); return; }
    // Jittered backoff: without it, every failed image on a screen retries in
    // the same frame and a weak connection gets hammered in lockstep.
    timer.current = setTimeout(() => setAttempt((n) => n + 1), backoffMs(attempt));
  }, [attempt]);

  const retry = useCallback(() => {
    setState('loading');
    setAttempt((n) => n + 1);
    fade.setValue(0);
  }, [fade]);

  return (
    <View style={[si.box, { backgroundColor: tint, borderRadius: r }, style]}>
      {state === 'loading' ? <Shimmer style={[StyleSheet.absoluteFill, { borderRadius: r }]} /> : null}

      {state !== 'failed' ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: fade,
              transform: reduce ? [] : [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }) }],
            },
          ]}
        >
          <Image
            // Remounting on `attempt` is what actually re-issues the request:
            // RN caches the failure against the source, so the same element
            // will not try again on its own.
            key={attempt}
            source={source}
            onLoad={onLoad}
            onError={onError}
            resizeMode={resizeMode}
            style={[StyleSheet.absoluteFill, { borderRadius: r }]}
            alt={accessibilityLabel ?? ''}
            accessibilityLabel={accessibilityLabel}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      ) : (
        <Pressable onPress={retry} style={si.failed} accessibilityRole="button" accessibilityLabel="Image failed to load. Tap to retry.">
          <Animated.Text style={[type.caption, si.failedText]}>Tap to retry</Animated.Text>
        </Pressable>
      )}
    </View>
  );
}

const si = StyleSheet.create({
  box: { overflow: 'hidden' },
  failed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  failedText: { color: color.muted },
});
