import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Heading, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { resolveLesson } from '@/data/lessons';
import { useAsync, useDb } from '@/data/hooks';
import { parseLessonId } from '@/data/sets';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';
import { summarize, useProgress, weakCharacters } from '@/store/progress';

const FIRST_LESSON = { id: 'topic-numbers.0.0', index: 0 };

export default function HomeScreen() {
  const theme = useTheme();
  const db = useDb();
  const chars = useProgress((s) => s.chars);
  const lastLesson = useProgress((s) => s.lastLesson);
  const customSets = useCustomSets((s) => s.sets);
  const stats = summarize(chars);
  const weak = weakCharacters(chars);

  // Pick up where the learner left off, or start with the first Numbers lesson.
  const target = lastLesson && lastLesson.id !== 'review' ? lastLesson : FIRST_LESSON;
  const { data: continueLesson } = useAsync(async () => {
    const ref = parseLessonId(target.id);
    return (ref && (await resolveLesson(db, ref, customSets, []))) ?? null;
  }, [target.id, customSets]);

  return (
    <Screen safeTop>
      <View style={styles.hero}>
        <Text style={[styles.heroChar, { color: theme.tint }]}>写</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Hanzi Trace</Text>
          <Body secondary>Learn to write Chinese characters, one stroke at a time.</Body>
        </View>
      </View>

      {continueLesson && (
        <Card
          onPress={() =>
            router.push({
              pathname: '/practice/[id]',
              params: { id: target.id, index: target.index },
            })
          }>
          <Body secondary>{target === FIRST_LESSON ? 'Start here' : 'Continue'}</Body>
          <Heading>{continueLesson.title}</Heading>
          <Text style={[styles.preview, { color: theme.text }]} numberOfLines={1}>
            {continueLesson.chars.join(' ')}
          </Text>
        </Card>
      )}

      <Card
        onPress={
          weak.length
            ? () => router.push({ pathname: '/lesson/[id]', params: { id: 'review' } })
            : undefined
        }>
        <Body secondary>Review weak characters</Body>
        {weak.length ? (
          <>
            <Text style={[styles.preview, { color: theme.text }]} numberOfLines={1}>
              {weak.join(' ')}
            </Text>
            <Body secondary>
              Characters you made mistakes on come back here until you write them cleanly.
            </Body>
          </>
        ) : (
          <Body>Nothing to review yet. Keep practising!</Body>
        )}
      </Card>

      <Card>
        <Heading>Your progress</Heading>
        <View style={styles.stats}>
          <Stat value={stats.practised} label="practised" />
          <Stat value={stats.learned} label="learned" />
          <Stat value={`${Math.round(stats.accuracy * 100)}%`} label="clean traces" />
        </View>
        <ProgressBar value={stats.practised ? stats.learned / stats.practised : 0} />
        <Body secondary>A character is learned after tracing it cleanly 3 times in a row.</Body>
      </Card>

      <Button
        label="Browse all characters"
        variant="secondary"
        onPress={() => router.navigate('/browse')}
      />
      <Button
        label="Write everyday phrases"
        variant="secondary"
        onPress={() => router.navigate('/phrases')}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={{ color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  heroChar: { fontSize: 64 },
  heroTitle: { fontSize: 30, fontWeight: '700' },
  preview: { fontSize: 32, letterSpacing: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
});
