import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { CharacterGrid } from '@/components/character-grid';
import { Body, Button, EmptyState, Loading, Screen } from '@/components/ui';
import { getInfos } from '@/data/db';
import { resolveLesson } from '@/data/lessons';
import { useAsync, useDb } from '@/data/hooks';
import { parseLessonId } from '@/data/sets';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';
import { useProgress, weakCharacters } from '@/store/progress';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const theme = useTheme();
  const customSets = useCustomSets((s) => s.sets);
  const progress = useProgress((s) => s.chars);
  const ref = parseLessonId(id);

  const { data, loading } = useAsync(async () => {
    if (!ref) return null;
    const lesson = await resolveLesson(db, ref, customSets, weakCharacters(progress));
    return lesson && { ...lesson, infos: await getInfos(db, lesson.chars) };
  }, [id, customSets, ref?.kind === 'review' ? progress : null]);

  if (loading) return <Loading />;
  if (!data) return <EmptyState title="Lesson not found" />;

  const practise = (index: number) =>
    router.push({ pathname: '/practice/[id]', params: { id, index } });
  const editButton =
    ref?.kind === 'custom'
      ? () => (
          <Pressable
            onPress={() => router.push({ pathname: '/set/[id]', params: { id: ref.setId } })}
            hitSlop={12}>
            <Text style={{ color: theme.tint, fontSize: 17 }}>Edit</Text>
          </Pressable>
        )
      : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: data.title, headerRight: editButton }} />
      {data.subtitle ? <Body secondary>{data.subtitle}</Body> : null}
      {data.infos.length ? (
        <>
          <Button label="Start practice" icon="✍️" onPress={() => practise(0)} />
          <CharacterGrid infos={data.infos} onPress={(_, i) => practise(i)} />
          <Body secondary>
            Tap a character to practise it. Green dot: learned. Blue dot: practised.
          </Body>
        </>
      ) : (
        <EmptyState title={ref?.kind === 'review' ? 'Nothing to review' : 'No characters yet'}>
          {ref?.kind === 'custom' && (
            <Button
              label="Add characters"
              onPress={() => router.push({ pathname: '/set/[id]/add', params: { id: ref.setId } })}
            />
          )}
        </EmptyState>
      )}
    </Screen>
  );
}
