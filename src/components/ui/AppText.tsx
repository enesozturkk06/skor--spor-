import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
};

/**
 * CSS/native `textTransform: uppercase` is locale-unaware and turns Turkish
 * "i" into "I" (GİRİŞ → GIRIŞ). We uppercase string children with the tr-TR
 * locale instead and disable the style-level transform.
 */
const LOCALE = 'tr-TR';
const NO_TRANSFORM: TextStyle = { textTransform: 'none' };

function upperChildren(children: ReactNode): ReactNode {
  // Nested <AppText> elements apply their own variant, so only raw strings change here.
  return Children.map(children, (child) => (typeof child === 'string' ? child.toLocaleUpperCase(LOCALE) : child));
}

export function AppText({ variant = 'body', color = 'text', align, style, children, ...rest }: AppTextProps) {
  const base = typography[variant] as TextStyle;
  const override = StyleSheet.flatten(style) as TextStyle | undefined;
  const transform = override?.textTransform ?? base.textTransform;
  const upper = transform === 'uppercase';

  return (
    <Text
      {...rest}
      style={[base, { color: colors[color] }, align ? { textAlign: align } : null, style, upper ? NO_TRANSFORM : null]}
    >
      {upper ? upperChildren(children) : children}
    </Text>
  );
}
