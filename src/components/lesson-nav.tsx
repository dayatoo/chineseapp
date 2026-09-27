import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Previous/next arrows with a dot per item (or "3 / 20" for long lessons). */
export function LessonNav({
  index,
  count,
  onPrev,
  onNext,
}: {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const arrow = (label: string, enabled: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      accessibilityLabel={a11y}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={16}
      style={styles.navButton}>
      <Text style={[styles.navArrow, { color: enabled ? theme.tint : theme.border }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.nav}>
      {arrow('‹', index > 0, onPrev, 'Previous character')}
      <View style={styles.dots}>
        {count <= 16 ? (
          Array.from({ length: count }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? theme.tint : i < index ? theme.textSecondary : theme.border,
                },
              ]}
            />
          ))
        ) : (
          <Text style={{ color: theme.textSecondary }}>
            {index + 1} / {count}
          </Text>
        )}
      </View>
      {arrow('›', index < count - 1, onNext, 'Next character')}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  navButton: { width: 44, alignItems: 'center' },
  navArrow: { fontSize: 34, fontWeight: '300' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
