import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { CharacterGrid } from '@/components/character-grid';
import { Body, Button, EmptyState, Screen } from '@/components/ui';
import { searchCharacters } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';

/** Search the library (character, pinyin or English) and tap characters to add them to a set. */
export default function AddCharactersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const set = useCustomSets((s) => s.sets.find((x) => x.id === id));
  const { addChars, removeChar } = useCustomSets.getState();
  const [query, setQuery] = useState('');

  const { data: results = [] } = useAsync(() => searchCharacters(db, query), [query]);

  if (!set) return <EmptyState title="Set not found" />;
  const selected = new Set(set.chars);

  return (
    <Screen>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search: 水, shui, or water"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      />
      <Body secondary>
        {set.chars.length} in “{set.name}”. Tap to add or remove.
      </Body>
      {query.trim() && !results.length ? <Body>No matches.</Body> : null}
      <CharacterGrid
        infos={results}
        selected={selected}
        onPress={(info) =>
          selected.has(info.char) ? removeChar(set.id, info.char) : addChars(set.id, [info.char])
        }
      />
      <Button label="Done" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, fontSize: 18 },
});
