import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getPhraseTopic } from '@/data/phrases';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';

export default function PhraseTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const progress = useProgress((s) => s.phrases);
  const topic = getPhraseTopic(id);

  if (!topic) return <EmptyState title="Topic not found" />;

  const practise = (index: number) =>
    router.push({ pathname: '/phrase-practice/[id]', params: { id, index } });
  const firstUnwritten = topic.phrases.findIndex((p) => !progress[p.zh]);

  return (
    <Screen>
      <Stack.Screen options={{ title: `${topic.emoji} ${topic.name}` }} />
      <Button
        label={firstUnwritten > 0 ? 'Continue' : 'Start practice'}
        icon="✍️"
        onPress={() => practise(Math.max(0, firstUnwritten))}
      />
      {topic.phrases.map((phrase, i) => {
        const p = progress[phrase.zh];
        return (
          <Card key={phrase.zh} onPress={() => practise(i)}>
            <View style={styles.row}>
              <Text style={[styles.zh, { color: theme.text }]}>{phrase.zh}</Text>
              {p ? (
                <Text
                  accessibilityLabel={p.clean ? 'Written without mistakes' : 'Written'}
                  style={[styles.badge, { color: theme.success }]}>
                  {p.clean ? '★' : '✓'}
                </Text>
              ) : null}
            </View>
            <Body secondary>{phrase.pinyin}</Body>
            <Body>{phrase.en}</Body>
          </Card>
        );
      })}
      <Body secondary>Tap a phrase to write it. ✓ written, ★ written without mistakes.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  zh: { flex: 1, fontSize: 28, letterSpacing: 1 },
  badge: { fontSize: 22 },
});
