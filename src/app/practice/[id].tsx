import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonNav } from '@/components/lesson-nav';
import { Button, EmptyState, Loading } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getCharacter } from '@/data/db';
import { resolveLesson } from '@/data/lessons';
import { useAsync, useDb } from '@/data/hooks';
import { parseLessonId } from '@/data/sets';
import type { CharacterData } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';
import { useProgress, weakCharacters } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { speak } from '@/tracing/feedback';
import { TracingCanvas } from '@/tracing/tracing-canvas';
import { useSessionStatus, useTracingSession } from '@/tracing/use-tracing-session';

export default function PracticeScreen() {
  const { id, index: indexParam } = useLocalSearchParams<{ id: string; index?: string }>();
  const db = useDb();
  const setLastLesson = useProgress((s) => s.setLastLesson);

  // Resolve the lesson once: the review list would otherwise change while it's being practised.
  const lesson = useAsync(async () => {
    const ref = parseLessonId(id);
    if (!ref) return null;
    const { sets } = useCustomSets.getState();
    return resolveLesson(db, ref, sets, weakCharacters(useProgress.getState().chars));
  }, [id]);

  const chars = lesson.data?.chars ?? [];
  const [index, setIndex] = useState(() => Math.max(0, Number(indexParam) || 0));
  const [attempt, setAttempt] = useState(0);
  const [forceDemo, setForceDemo] = useState(false);
  const char = chars[Math.min(index, chars.length - 1)];

  const character = useAsync(async () => (char ? getCharacter(db, char) : null), [char]);

  useEffect(() => {
    if (chars.length) setLastLesson(id, index);
  }, [id, index, chars.length, setLastLesson]);

  const goTo = (i: number) => {
    setIndex(i);
    setForceDemo(false);
  };

  if (lesson.loading) return <Loading />;
  if (!lesson.data || !chars.length) return <EmptyState title="Nothing to practise" />;

  const data = character.data?.char === char ? character.data : null;
  const isLast = index >= chars.length - 1;

  return (
    <View style={{ flex: 1 }}>
      {/* No swipe-back: on iOS 26 it works from anywhere on screen, so writing could exit the page. */}
      <Stack.Screen options={{ title: lesson.data.title, gestureEnabled: false }} />
      <LessonNav
        index={index}
        count={chars.length}
        onPrev={() => goTo(index - 1)}
        onNext={() => goTo(index + 1)}
      />
      {data ? (
        <CharacterPractice
          key={`${char}-${attempt}`}
          character={data}
          demo={forceDemo || undefined}
          isLast={isLast}
          onRetry={(withDemo) => {
            setForceDemo(withDemo);
            setAttempt((a) => a + 1);
          }}
          onNext={() => (isLast ? router.back() : goTo(index + 1))}
        />
      ) : character.loading || character.data?.char !== char ? (
        <Loading />
      ) : (
        <EmptyState title={`No stroke data for ${char}`} />
      )}
    </View>
  );
}

/** Tracing one character, from demo to completion. Re-keyed by the parent to start over. */
function CharacterPractice({
  character,
  demo,
  isLast,
  onRetry,
  onNext,
}: {
  character: CharacterData;
  /** Overrides the "stroke-order demo" setting. */
  demo?: boolean;
  isLast: boolean;
  onRetry: (withDemo: boolean) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session, dispatch, canvasProps } = useTracingSession(character, {
    demo,
    onComplete: () => {
      if (useSettings.getState().autoSpeak) speak(character.char);
    },
  });
  const status = useSessionStatus(session);

  // Fit the canvas on screen: full width on iPhone, ~70% of the short side on iPad.
  const canvasSize = Math.floor(
    Math.max(
      220,
      Math.min(
        width - Spacing.three * 2,
        MaxContentWidth,
        height - insets.top - insets.bottom - 330,
      ),
    ),
  );

  const { phase } = session;
  const [pinyin, ...otherReadings] = character.pinyin.split(', ');

  return (
    <View style={[styles.practice, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.info}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pinyin, { color: theme.text }]}>
            {pinyin}
            {otherReadings.length ? (
              <Text style={[styles.otherReadings, { color: theme.textSecondary }]}>
                {' '}
                · {otherReadings.join(', ')}
              </Text>
            ) : null}
          </Text>
          <Text style={[styles.meaning, { color: theme.textSecondary }]} numberOfLines={2}>
            {character.meaning}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Play pronunciation"
          onPress={() => speak(character.char)}
          style={({ pressed }) => [
            styles.speak,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}>
          <Text style={styles.speakIcon}>🔊</Text>
        </Pressable>
      </View>

      <TracingCanvas {...canvasProps} size={canvasSize} />

      <Text style={[styles.status, { color: status.color }]} accessibilityLiveRegion="polite">
        {status.text}
      </Text>

      <View style={[styles.actions, { maxWidth: canvasSize }]}>
        {phase === 'demo' && (
          <Button
            label="Skip"
            variant="secondary"
            onPress={() => dispatch({ type: 'skipDemo' })}
            style={styles.action}
          />
        )}
        {phase === 'tracing' && (
          <>
            <Button
              label="Hint"
              icon="💡"
              variant="secondary"
              onPress={() => dispatch({ type: 'requestHint' })}
              style={styles.action}
            />
            <Button
              label="Watch"
              icon="▶︎"
              variant="secondary"
              onPress={() => onRetry(true)}
              style={styles.action}
            />
          </>
        )}
        {phase === 'complete' && (
          <>
            <Button
              label="Again"
              icon="↺"
              variant="secondary"
              onPress={() => onRetry(false)}
              style={styles.action}
            />
            <Button
              label={isLast ? 'Finish' : 'Next'}
              icon={isLast ? '✓' : '→'}
              onPress={onNext}
              style={styles.action}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  practice: { flex: 1, alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  pinyin: { fontSize: 28, fontWeight: '600' },
  otherReadings: { fontSize: 18, fontWeight: '400' },
  meaning: { fontSize: 16, marginTop: 2 },
  speak: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakIcon: { fontSize: 24 },
  status: { fontSize: 17, fontWeight: '600', textAlign: 'center', minHeight: 24 },
  actions: { flexDirection: 'row', gap: Spacing.three, width: '100%' },
  action: { flex: 1 },
});
