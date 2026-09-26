import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { CharacterInfo } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { LEARNED_BOX, useProgress } from '@/store/progress';

const MIN_TILE = 84;

/** Responsive grid of character tiles: more columns on iPad. */
export function CharacterGrid({
  infos,
  onPress,
  selected,
}: {
  infos: CharacterInfo[];
  onPress?: (info: CharacterInfo, index: number) => void;
  /** When given, tiles show a selected state (used when picking characters). */
  selected?: Set<string>;
}) {
  const { width } = useWindowDimensions();
  const available = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const columns = Math.max(3, Math.floor((available + Spacing.two) / (MIN_TILE + Spacing.two)));
  const tile = (available - Spacing.two * (columns - 1)) / columns;

  return (
    <View style={styles.grid}>
      {infos.map((info, i) => (
        <CharacterTile
          key={info.char}
          info={info}
          size={tile}
          selected={selected?.has(info.char)}
          onPress={onPress && (() => onPress(info, i))}
        />
      ))}
    </View>
  );
}

function CharacterTile({
  info,
  size,
  selected,
  onPress,
}: {
  info: CharacterInfo;
  size: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const progress = useProgress((s) => s.chars[info.char]);
  const status = !progress ? null : progress.box >= LEARNED_BOX ? 'learned' : 'practised';

  return (
    <Pressable
      accessibilityLabel={`${info.char}, ${info.pinyin.split(',')[0]}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          width: size,
          height: size * 1.12,
          backgroundColor: selected
            ? theme.tint
            : pressed
              ? theme.backgroundSelected
              : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <Text
        style={[
          styles.char,
          { fontSize: size * 0.46, color: selected ? theme.tintText : theme.text },
        ]}>
        {info.char}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.pinyin, { color: selected ? theme.tintText : theme.textSecondary }]}>
        {info.pinyin.split(',')[0]}
      </Text>
      {status && (
        <View
          style={[
            styles.badge,
            { backgroundColor: status === 'learned' ? theme.success : theme.hint },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontWeight: '400' },
  pinyin: { fontSize: 13, marginTop: 2 },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
});
