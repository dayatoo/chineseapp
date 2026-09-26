import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getInfos } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';

/** Edit a custom set: rename, reorder, remove characters, or delete the set. */
export default function EditSetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const set = useCustomSets((s) => s.sets.find((x) => x.id === id));
  const { rename, remove, removeChar, moveChar } = useCustomSets.getState();

  const { data: infos = [] } = useAsync(
    async () => getInfos(db, set?.chars ?? []),
    [set?.chars.join('')],
  );
  const infoByChar = new Map(infos.map((i) => [i.char, i]));

  if (!set) return <EmptyState title="Set not found" />;

  const iconButton = (
    label: string,
    a11y: string,
    onPress: () => void,
    enabled = true,
    color: string = theme.tint,
  ) => (
    <Pressable
      accessibilityLabel={a11y}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconButton, { borderColor: theme.border, opacity: enabled ? 1 : 0.3 }]}>
      <Text style={[styles.icon, { color }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Edit Set' }} />
      <Body>Name</Body>
      <TextInput
        value={set.name}
        onChangeText={(name) => rename(set.id, name)}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      />

      <Button
        label="Add characters"
        icon="＋"
        onPress={() => router.push({ pathname: '/set/[id]/add', params: { id: set.id } })}
      />

      {set.chars.map((char, i) => {
        const info = infoByChar.get(char);
        return (
          <View
            key={char}
            style={[
              styles.row,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Text style={[styles.char, { color: theme.text }]}>{char}</Text>
            <View style={{ flex: 1 }}>
              <Body>{info?.pinyin.split(',')[0] ?? ''}</Body>
              <Body secondary numberOfLines={1}>
                {info?.meaning ?? ''}
              </Body>
            </View>
            {iconButton('↑', `Move ${char} up`, () => moveChar(set.id, i, i - 1), i > 0)}
            {iconButton(
              '↓',
              `Move ${char} down`,
              () => moveChar(set.id, i, i + 1),
              i < set.chars.length - 1,
            )}
            {iconButton('✕', `Remove ${char}`, () => removeChar(set.id, char), true, theme.error)}
          </View>
        );
      })}

      <Button
        label="Delete set"
        variant="danger"
        onPress={() =>
          Alert.alert(
            `Delete “${set.name}”?`,
            'Your practice progress on these characters is kept.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  router.dismissTo('/my-sets');
                  remove(set.id);
                },
              },
            ],
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, fontSize: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  char: { fontSize: 36, width: 52, textAlign: 'center' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18, fontWeight: '600' },
});
