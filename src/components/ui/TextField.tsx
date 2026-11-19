import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, fonts, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type TextFieldProps = Omit<TextInputProps, 'style' | 'ref'> & {
  ref?: Ref<TextInputInstance>;
  label: string;
  icon?: IconName;
  error?: string | null;
  /** Unit shown on the right, e.g. "cm". */
  suffix?: string;
  secureToggle?: boolean;
};

export function TextField({
  ref,
  label,
  icon,
  error,
  suffix,
  secureToggle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.wrap}>
      <AppText variant="overline" color={error ? 'danger' : focused ? 'gold' : 'textMuted'}>
        {label}
      </AppText>
      <View style={[styles.field, focused && styles.focused, Boolean(error) && styles.errored]}>
        {icon ? <Icon name={icon} size={20} color={focused ? 'gold' : 'textFaint'} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.orange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {suffix ? (
          <AppText variant="smallStrong" color="textMuted">
            {suffix}
          </AppText>
        ) : null}
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            onPress={() => setHidden((v) => !v)}
            style={styles.toggle}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="textMuted" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.gold, backgroundColor: colors.surfaceAlt },
  errored: { borderColor: colors.danger },
  // 44×44 touch target; the negative margin keeps the 20 px icon where it was.
  toggle: { width: layout.minTouch, height: layout.minTouch, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    paddingVertical: spacing.md,
    outlineStyle: 'none',
  } as object,
});
