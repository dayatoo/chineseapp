import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Loading } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getCharacter } from '@/data/db';
import { resolveLesson } from '@/data/lessons';
import { useAsync, useDb } from '@/data/hooks';
import { parseLessonId } from '@/data/sets';
import type { CharacterData, Point } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';
import { useProgress, weakCharacters } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { buzzComplete, buzzCorrect, buzzWrong, speak } from '@/tracing/feedback';
import { LENIENCY_FACTOR, matchStroke, MISMATCH_MESSAGES } from '@/tracing/matcher';
import { initialSession, sessionReducer } from '@/tracing/session';
import { TracingCanvas } from '@/tracing/tracing-canvas';

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

function LessonNav({
  index,
  count,
  onPrev,
  onNext,
}: {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const arrow = (label: string, enabled: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      accessibilityLabel={a11y}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={16}
      style={styles.navButton}>
      <Text style={[styles.navArrow, { color: enabled ? theme.tint : theme.border }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.nav}>
      {arrow('‹', index > 0, onPrev, 'Previous character')}
      <View style={styles.dots}>
        {count <= 16 ? (
          Array.from({ length: count }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? theme.tint : i < index ? theme.textSecondary : theme.border,
                },
              ]}
            />
          ))
        ) : (
          <Text style={{ color: theme.textSecondary }}>
            {index + 1} / {count}
          </Text>
        )}
      </View>
      {arrow('›', index < count - 1, onNext, 'Next character')}
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
  const settings = useSettings();
  const recordResult = useProgress((s) => s.recordResult);

  const [session, dispatch] = useReducer(sessionReducer, undefined, () =>
    initialSession(character.strokes.length, demo ?? settings.showDemo),
  );

  const handleStroke = useCallback(
    (points: Point[]) => {
      // A stroke begun during the demo skips it, so it's for the first stroke even if this
      // callback is from before the skip.
      const strokeIndex = session.phase === 'demo' ? 0 : session.strokeIndex;
      const result = matchStroke(points, character.medians, strokeIndex, {
        leniency: LENIENCY_FACTOR[settings.leniency],
        outlineVisible: settings.showOutline,
      });
      if (result.ok) {
        buzzCorrect();
        dispatch({ type: 'strokeCorrect' });
      } else {
        buzzWrong();
        dispatch({
          type: 'strokeWrong',
          reason: result.reason,
          hintAfterMisses: settings.hintAfterMisses,
        });
      }
    },
    [
      character.medians,
      session.phase,
      session.strokeIndex,
      settings.leniency,
      settings.showOutline,
      settings.hintAfterMisses,
    ],
  );

  const onDemoStrokeDone = useCallback(() => dispatch({ type: 'demoStrokeDone' }), []);
  const onStrokeBegin = useCallback(() => dispatch({ type: 'skipDemo' }), []);

  useEffect(() => {
    if (session.phase !== 'complete') return;
    recordResult(character.char, session.totalMisses);
    buzzComplete();
    if (useSettings.getState().autoSpeak) speak(character.char);
    // Only when the character is completed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase]);

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

  const { phase, feedback } = session;
  let status: { text: string; color: string };
  if (phase === 'demo') status = { text: 'Watch the stroke order…', color: theme.textSecondary };
  else if (phase === 'complete')
    status =
      session.totalMisses === 0
        ? { text: 'Perfect! No mistakes 🎉', color: theme.success }
        : {
            text: `Done! ${session.totalMisses} ${session.totalMisses === 1 ? 'mistake' : 'mistakes'}`,
            color: theme.success,
          };
  else if (feedback && !feedback.ok && feedback.reason)
    status = { text: `${MISMATCH_MESSAGES[feedback.reason]}. Try again.`, color: theme.error };
  else
    status = {
      text: `Stroke ${session.strokeIndex + 1} of ${session.strokeCount}`,
      color: theme.textSecondary,
    };

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

      <TracingCanvas
        character={character}
        size={canvasSize}
        session={session}
        showOutline={settings.showOutline}
        onStroke={handleStroke}
        onStrokeBegin={onStrokeBegin}
        onDemoStrokeDone={onDemoStrokeDone}
      />

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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  navButton: { width: 44, alignItems: 'center' },
  navArrow: { fontSize: 34, fontWeight: '300' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
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
