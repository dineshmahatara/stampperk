import { forwardRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  children: ReactNode;
  /** Extra space under the last fields so keyboard / tab bar don't cover them */
  bottomExtra?: number;
  avoidOffset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Wrap with KeyboardAvoidingView (default true). Set false if parent already avoids. */
  avoidKeyboard?: boolean;
};

/**
 * Scroll form that stays usable when the soft keyboard is open.
 * Use this for any screen/modal with TextInputs near the bottom.
 */
export const KeyboardAwareScroll = forwardRef<ScrollView, Props>(function KeyboardAwareScroll(
  {
    children,
    bottomExtra = 120,
    avoidOffset = Platform.OS === 'ios' ? 12 : 0,
    contentContainerStyle,
    style,
    avoidKeyboard = true,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = 'on-drag',
    automaticallyAdjustKeyboardInsets = true,
    ...rest
  },
  ref,
) {
  const scroll = (
    <ScrollView
      ref={ref}
      style={avoidKeyboard ? { flex: 1 } : style}
      contentContainerStyle={[{ paddingBottom: bottomExtra }, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (!avoidKeyboard) return scroll;

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={avoidOffset}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
});
