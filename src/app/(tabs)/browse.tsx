import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Body,
  Card,
  Heading,
  Loading,
  ProgressBar,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getHskInfos, getTopicInfos, getTopics } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { HSK_LEVELS, hskName } from '@/data/sets';
import { useTheme } from '@/hooks/use-theme';
import { LEARNED_BOX, useProgress } from '@/store/progress';

type Category = { id: string; name: string; emoji?: string; chars: string[] };

export default function BrowseScreen() {
  const db = useDb();
  const [mode, setMode] = useState<'topics' | 'hsk'>('topics');

  const topics = useAsync(async (): Promise<Category[]> => {
    const list = await getTopics(db);
    return Promise.all(
      list.map(async (t) => ({
        id: `topic-${t.id}`,
        name: t.name,
        emoji: t.emoji,
        chars: (await getTopicInfos(db, t.id)).map((i) => i.char),
      })),
    );
  }, []);

  const hsk = useAsync(
    async (): Promise<Category[]> =>
      Promise.all(
        HSK_LEVELS.map(async (level) => ({
          id: `hsk-${level}`,
          name: hskName(level),
          chars: (await getHskInfos(db, level)).map((i) => i.char),
        })),
      ),
    [],
  );

  const current = mode === 'topics' ? topics : hsk;

  return (
    <Screen safeTop title="Browse">
      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: 'topics', label: 'By Topic' },
          { value: 'hsk', label: 'By HSK Level' },
        ]}
      />
      {mode === 'hsk' && (
        <Body secondary>
          HSK is the official Chinese proficiency exam. Each level adds about 300 new characters
          (1,171 for levels 7–9).
        </Body>
      )}
      {current.loading ? (
        <Loading />
      ) : (
        current.data?.map((category) => <CategoryCard key={category.id} category={category} />)
      )}
    </Screen>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const theme = useTheme();
  const progress = useProgress((s) => s.chars);
  const learned = category.chars.filter((c) => (progress[c]?.box ?? 0) >= LEARNED_BOX).length;

  return (
    <Card onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}>
      <View style={styles.row}>
        {category.emoji ? <Text style={styles.emoji}>{category.emoji}</Text> : null}
        <View style={{ flex: 1 }}>
          <Heading>{category.name}</Heading>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
            {category.chars.slice(0, 12).join(' ')}
          </Text>
        </View>
        <Body secondary>
          {learned}/{category.chars.length}
        </Body>
      </View>
      <ProgressBar value={learned / Math.max(1, category.chars.length)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emoji: { fontSize: 32 },
  preview: { fontSize: 18, marginTop: 2 },
});
