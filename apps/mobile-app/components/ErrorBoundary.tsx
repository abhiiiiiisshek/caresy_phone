import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Txt } from './ui';
import { color, space } from '../lib/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Last resort: one uncaught render error anywhere in the tree used to take the
// whole app to a blank/red screen with no recovery. This catches it and offers
// a restart instead — an anxious user mid-booking should never see a crash
// with no way forward.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Screen>
        <View style={s.body}>
          <Txt variant="h1" color={color.terracottaDeep}>Something went wrong</Txt>
          <Txt variant="body" color={color.muted}>
            The app hit an unexpected error. Your booking data is safe — restarting should fix it.
          </Txt>
          <Button title="Restart" onPress={() => this.setState({ error: null })} />
        </View>
      </Screen>
    );
  }
}

const s = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
