import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Capybara mascot — vector built with Views, no image asset.
// Palette from the inspo photo: orange body #E8933A, brown snout/ears #6B3E2E / #7A4A33,
// on light sky #AEDFF5. Peek + bob + blink, all native-driver.

export function CapyMascot({ compact = false }: { compact?: boolean }) {
  const peek = useRef(new Animated.Value(-120)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const earL = useRef(new Animated.Value(0)).current;
  const earR = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(peek, { toValue: 0, damping: 14, stiffness: 110, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // ears subtle wiggle offset
    Animated.loop(
      Animated.sequence([
        Animated.timing(earL, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(earL, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(earR, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(earR, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    let alive = true;
    const doBlink = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.05, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]).start();
      setTimeout(doBlink, 3200 + Math.random() * 1800);
    };
    const t = setTimeout(doBlink, 2200);
    return () => { alive = false; clearTimeout(t); };
  }, [peek, bob, blink, earL, earR]);

  const scale = compact ? 0.78 : 1;

  return (
    <Animated.View style={[s.wrap, { transform: [{ translateY: Animated.add(peek, bob) }, { scale }] }]}>
      {/* soft shadow under body */}
      <View style={s.shadow} />

      {/* body — big rounded pear */}
      <View style={s.body}>
        {/* left ear */}
        <Animated.View style={[s.ear, s.earLeft, { transform: [{ rotate: earL.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '-2deg'] }) }, { scale: earL.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]} />
        {/* right ear */}
        <Animated.View style={[s.ear, s.earRight, { transform: [{ rotate: earR.interpolate({ inputRange: [0, 1], outputRange: ['8deg', '2deg'] }) }] }]} />

        {/* head */}
        <View style={s.head}>
          {/* eyes */}
          <Animated.View style={[s.eye, s.eyeLeft, { transform: [{ scaleY: blink }] }]} />
          <Animated.View style={[s.eye, s.eyeRight, { transform: [{ scaleY: blink }] }]} />
          {/* blush dots (right small like photo) */}
          <View style={s.blush} />

          {/* snout */}
          <View style={s.snout}>
            <View style={s.noseTopLeft} />
            <View style={s.noseTopRight} />
            <View style={s.noseStem} />
            <View style={s.noseSmileLeft} />
            <View style={s.noseSmileRight} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// Floating deco — tiny stars/planets like Q-learn, each with its own bob
export function FloatDot({ size = 8, color: c = '#fff', style, delay = 0 }: { size?: number; color?: string; style?: any; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -6, duration: 1400 + delay * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1400 + delay * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: c, opacity: 0.95, transform: [{ translateY: y }] }, style]} />;
}

const s = StyleSheet.create({
  wrap: { width: 260, height: 220, alignItems: 'center', justifyContent: 'flex-end' },
  shadow: { position: 'absolute', bottom: 8, width: 140, height: 22, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.08)' },
  body: {
    width: 210,
    height: 200,
    backgroundColor: '#E8933A',
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 22,
    overflow: 'visible',
  },
  ear: {
    position: 'absolute',
    width: 48,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B3E2E',
    top: -12,
  },
  earLeft: { left: 18, transform: [{ rotate: '-18deg' }] },
  earRight: { right: 22, transform: [{ rotate: '18deg' }] },
  head: {
    width: 176,
    height: 156,
    borderRadius: 88,
    backgroundColor: '#E8933A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  eye: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#3B2316', top: 48 },
  eyeLeft: { left: 36 },
  eyeRight: { right: 28 },
  blush: { position: 'absolute', right: 12, top: 36, width: 14, height: 18, borderRadius: 9, backgroundColor: '#5A2F1F', opacity: 0.9 },
  snout: {
    marginTop: 36,
    width: 108,
    height: 86,
    borderRadius: 54,
    backgroundColor: '#7A4A33',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  noseTopLeft: { position: 'absolute', top: 16, left: 28, width: 24, height: 18, borderRadius: 12, backgroundColor: '#3B2316', transform: [{ rotate: '-12deg' }] },
  noseTopRight: { position: 'absolute', top: 16, right: 28, width: 24, height: 18, borderRadius: 12, backgroundColor: '#3B2316', transform: [{ rotate: '12deg' }] },
  noseStem: { width: 4, height: 28, backgroundColor: '#3B2316', borderRadius: 2, marginTop: 8 },
  noseSmileLeft: { position: 'absolute', bottom: 18, left: 32, width: 16, height: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#3B2316', borderRadius: 8, borderTopWidth: 0, borderRightWidth: 0, transform: [{ rotate: '12deg' }] },
  noseSmileRight: { position: 'absolute', bottom: 18, right: 32, width: 16, height: 10, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#3B2316', borderRadius: 8, borderTopWidth: 0, borderLeftWidth: 0, transform: [{ rotate: '-12deg' }] },
});
