import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, EmptyState, Heading, Loading, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getHskInfos, getTopic, getTopicInfos } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { buildTiers, hskName, parseCategoryId } from '@/data/sets';
import { useTheme } from '@/hooks/use-theme';
import { LEARNED_BOX, useProgress } from '@/store/progress';

const TIER_DETAIL = ['Fewest strokes, most common', 'A bit more complex', 'The most strokes'];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const progress = useProgress((s) => s.chars);

  const { data, loading } = useAsync(async () => {
    const ref = parseCategoryId(id);
    if (!ref) return null;
    if (ref.kind === 'topic') {
      const topic = await getTopic(db, ref.topicId);
      return {
        title: topic ? `${topic.emoji} ${topic.name}` : id,
        tiers: buildTiers(id, await getTopicInfos(db, ref.topicId)),
      };
    }
    return { title: hskName(ref.level), tiers: buildTiers(id, await getHskInfos(db, ref.level)) };
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <EmptyState title="Category not found" />;

  return (
    <Screen>
      <Stack.Screen options={{ title: data.title }} />
      {data.tiers.map((tier, t) => (
        <View key={tier.name} style={styles.tier}>
          <View>
            <Heading>{tier.name}</Heading>
            <Body secondary>{TIER_DETAIL[t]}</Body>
          </View>
          {tier.lessons.map((lesson) => {
            const learned = lesson.chars.filter(
              (c) => (progress[c]?.box ?? 0) >= LEARNED_BOX,
            ).length;
            const practised = lesson.chars.filter((c) => progress[c]).length;
            return (
              <Card
                key={lesson.id}
                onPress={() =>
                  router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })
                }>
                <View style={styles.row}>
                  <Body style={{ fontWeight: '600' }}>{lesson.title}</Body>
                  <Body secondary>
                    {learned === lesson.chars.length
                      ? '✓ Learned'
                      : practised
                        ? `${learned}/${lesson.chars.length} learned`
                        : ''}
                  </Body>
                </View>
                <Text style={[styles.chars, { color: theme.text }]}>{lesson.chars.join(' ')}</Text>
                <ProgressBar value={learned / lesson.chars.length} />
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tier: { gap: Spacing.two, marginBottom: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  chars: { fontSize: 28, letterSpacing: 2 },
});
