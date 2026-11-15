import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { enter } from '@/components/motion/entrance';
import { AppText, Button, Card, ProgressBar, ProgressRing, Screen } from '@/components/ui';
import { colors, gradients, spacing } from '@/theme';

/**
 * Internal preview of the motion primitives (count-up, ring, bar, entrance,
 * press feedback). Enabled only in development and in E2E builds
 * (EXPO_PUBLIC_MOTION_LAB=1); production builds redirect to the app.
 */
const ENABLED = __DEV__ || process.env.EXPO_PUBLIC_MOTION_LAB === '1';

export default function MotionLab() {
  const [run, setRun] = useState(0);
  if (!ENABLED) return <Redirect href="/" />;

  return (
    <Screen width="form">
      <View style={styles.stack} key={run}>
        <AppText variant="h1" accessibilityRole="header">
          Hareket laboratuvarı
        </AppText>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} entering={enter(i)} testID={`lab-enter-${i}`}>
            <Card>
              {i === 0 ? (
                <View style={styles.row}>
                  <ProgressRing progress={0.74} size={110} stroke={10} color={gradients.score} animated accessibilityLabel="lab-ring">
                    <AnimatedNumber value={74} variant="statL" testID="lab-number" />
                  </ProgressRing>
                  <View style={styles.flex}>
                    <ProgressBar progress={0.74} animated color={colors.orange} accessibilityLabel="lab-bar" />
                  </View>
                </View>
              ) : (
                <AppText variant="body">Kart {i + 1}</AppText>
              )}
            </Card>
          </Animated.View>
        ))}
        <Button label="Tekrar oynat" icon="refresh" onPress={() => setRun((n) => n + 1)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
});
