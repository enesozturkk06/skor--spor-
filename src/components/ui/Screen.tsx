import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';

import { BackdropGlow } from './BackdropGlow';

type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (default true). */
  scroll?: boolean;
  /** Constrain content width — 'form' for auth/onboarding, 'content' for dashboards. */
  width?: 'form' | 'content' | 'full';
  edges?: Edge[];
  /** Pinned area under the scroll content (e.g. primary CTA). */
  footer?: ReactNode;
  glow?: boolean;
  /** Extra bottom padding, e.g. to clear the floating tab bar. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Pull-to-refresh (native). RefreshControl has no web implementation, so
   * screens that use this must also offer a visible refresh action on web.
   */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({
  children,
  scroll = true,
  width = 'content',
  edges = ['top', 'left', 'right', 'bottom'],
  footer,
  glow = true,
  bottomInset = 0,
  contentStyle,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const maxWidth = width === 'form' ? layout.formMaxWidth : width === 'content' ? layout.contentMaxWidth : undefined;
  const inner = [styles.inner, maxWidth ? { maxWidth } : null, contentStyle];

  return (
    <View style={styles.root}>
      {glow ? <BackdropGlow /> : null}
      <SafeAreaView edges={edges} style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + bottomInset }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={
                onRefresh ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.orange}
                    colors={[colors.orange, colors.gold]}
                    progressBackgroundColor={colors.surfaceAlt}
                    title={refreshing ? 'Yenileniyor…' : undefined}
                    titleColor={colors.textMuted}
                  />
                ) : undefined
              }
            >
              <View style={inner}>{children}</View>
            </ScrollView>
          ) : (
            <View style={[styles.flex, styles.scrollContent, { paddingBottom: bottomInset }]}>
              <View style={[inner, styles.flex]}>{children}</View>
            </View>
          )}
          {footer ? (
            <View style={styles.footer}>
              <View style={[styles.inner, maxWidth ? { maxWidth } : null]}>{footer}</View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingTop: spacing.lg, alignItems: 'center' },
  inner: { width: '100%', alignSelf: 'center' },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
});
