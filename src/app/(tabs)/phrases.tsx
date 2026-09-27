import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, Heading, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PHRASE_TOPICS } from '@/data/phrases';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';

export default function PhrasesScreen() {
  const theme = useTheme();
  const progress = useProgress((s) => s.phrases);

  return (
    <Screen safeTop title="Phrases">
      <Body secondary>
        Everyday phrases and sentences. Write them character by character to learn words in context.
      </Body>
      {PHRASE_TOPICS.map((topic) => {
        const written = topic.phrases.filter((p) => progress[p.zh]).length;
        return (
          <Card
            key={topic.id}
            onPress={() =>
              router.push({ pathname: '/phrase-topic/[id]', params: { id: topic.id } })
            }>
            <View style={styles.row}>
              <Text style={styles.emoji}>{topic.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Heading>{topic.name}</Heading>
                <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
                  {topic.phrases
                    .slice(0, 4)
                    .map((p) => p.zh)
                    .join(' ')}
                </Text>
              </View>
              <Body secondary>
                {written}/{topic.phrases.length}
              </Body>
            </View>
            <ProgressBar value={written / topic.phrases.length} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emoji: { fontSize: 32 },
  preview: { fontSize: 18, marginTop: 2 },
});
