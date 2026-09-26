import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Body, Button, Screen } from '@/components/ui';
import { extractHanzi, getInfos } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';

export default function NewSetScreen() {
  const db = useDb();
  const theme = useTheme();
  const create = useCustomSets((s) => s.create);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const pasted = extractHanzi(text);
  const { data: found = [] } = useAsync(
    async () => (await getInfos(db, pasted)).map((i) => i.char),
    [pasted.join('')],
  );
  const missing = pasted.filter((c) => !found.includes(c));

  const save = (thenPick: boolean) => {
    const id = create(name.trim() || (found.length ? found.slice(0, 4).join('') : 'My set'), found);
    // Close this modal, then open the new set (or the picker).
    if (router.canGoBack()) router.back();
    router.push({
      pathname: thenPick ? '/set/[id]/add' : '/lesson/[id]',
      params: { id: thenPick ? id : `custom-${id}` },
    });
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
  ];

  return (
    <Screen>
      <Body>Name</Body>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Week 3 vocabulary"
        placeholderTextColor={theme.textSecondary}
        style={inputStyle}
        returnKeyType="next"
      />
      <Body>Characters</Body>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type or paste Chinese text, e.g. 我爱你"
        placeholderTextColor={theme.textSecondary}
        style={[inputStyle, styles.textArea]}
        multiline
      />
      <Body secondary>
        {found.length
          ? `${found.length} characters: ${found.join(' ')}`
          : 'Anything that isn’t a Chinese character (spaces, punctuation, English) is ignored.'}
      </Body>
      {missing.length > 0 && (
        <Body style={{ color: theme.error }}>
          No stroke data for: {missing.join(' ')}. These will be skipped.
        </Body>
      )}
      <Button
        label={found.length ? 'Create set' : 'Create empty set'}
        onPress={() => save(false)}
      />
      <Button label="Create and pick from library" variant="secondary" onPress={() => save(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, fontSize: 18 },
  textArea: { minHeight: 120, fontSize: 24, textAlignVertical: 'top' },
});
