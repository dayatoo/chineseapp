import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable page with centred, width-limited content (keeps iPad layouts readable). */
export function Screen({
  children,
  title,
  safeTop = false,
  ...rest
}: ScrollViewProps & { title?: string; safeTop?: boolean }) {
  const theme = useTheme();
  const content = (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      {...rest}
      style={[{ backgroundColor: theme.background }, rest.style]}
      contentContainerStyle={[styles.screenContent, rest.contentContainerStyle]}>
      {title ? <Title style={styles.screenTitle}>{title}</Title> : null}
      {children}
    </ScrollView>
  );
  if (!safeTop) return content;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {content}
    </SafeAreaView>
  );
}

export function Title(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.title, { color: theme.text }, props.style]} />;
}

export function Heading(props: TextProps) {
  const theme = useTheme();
  return <Text {...props} style={[styles.heading, { color: theme.text }, props.style]} />;
}

export function Body({ secondary, ...props }: TextProps & { secondary?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      {...props}
      style={[styles.body, { color: secondary ? theme.textSecondary : theme.text }, props.style]}
    />
  );
}

export function Card({
  children,
  style,
  onPress,
  ...rest
}: PressableProps & { style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      {...rest}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const background = variant === 'primary' ? theme.tint : theme.backgroundElement;
  const color =
    variant === 'primary' ? theme.tintText : variant === 'danger' ? theme.error : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'primary' ? background : theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Text style={[styles.buttonText, { color }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.backgroundElement }]}>
            <Text
              style={[styles.segmentText, { color: selected ? theme.text : theme.textSecondary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`,
            backgroundColor: color ?? theme.success,
          },
        ]}
      />
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.center}>
      <Heading style={{ textAlign: 'center' }}>{title}</Heading>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  screenContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six * 2,
    gap: Spacing.three,
  },
  screenTitle: { marginTop: Spacing.two },
  title: { fontSize: 34, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
});
