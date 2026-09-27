import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonNav } from '@/components/lesson-nav';
import { Button, EmptyState, Loading, SegmentedControl } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getCharacter } from '@/data/db';
import { useAsync, useDb } from '@/data/hooks';
import { getPhraseTopic, type Phrase, type PhraseCell, phraseCells } from '@/data/phrases';
import type { CharacterData } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import { type PhraseMode, useSettings } from '@/store/settings';
import { speak } from '@/tracing/feedback';
import { fitGrid } from '@/tracing/grid-layout';
import { staticSession } from '@/tracing/session';
import { TracingCanvas, type TracingCanvasProps } from '@/tracing/tracing-canvas';
import { useSessionStatus, useTracingSession } from '@/tracing/use-tracing-session';

/** How long a finished character stays on screen before the next one starts. */
const ADVANCE_DELAY = 500;
const CELL_GAP = Spacing.two;
const MAX_CELL = 240;

type Cell = PhraseCell & { data: CharacterData | null };

const noop = () => {};

export default function PhrasePracticeScreen() {
  const { id, index: indexParam } = useLocalSearchParams<{ id: string; index?: string }>();
  const db = useDb();
  const topic = getPhraseTopic(id);
  const [index, setIndex] = useState(() => Math.max(0, Number(indexParam) || 0));
  const [attempt, setAttempt] = useState(0);
  const phrase = topic?.phrases[Math.min(index, topic.phrases.length - 1)];

  const cells = useAsync(async () => {
    if (!phrase) return null;
    const list = phraseCells(phrase.zh);
    const data = await Promise.all(list.map((cell) => getCharacter(db, cell.char)));
    return { zh: phrase.zh, cells: list.map((cell, i): Cell => ({ ...cell, data: data[i] })) };
  }, [phrase?.zh]);

  if (!topic || !phrase) return <EmptyState title="Phrases not found" />;

  const loaded = cells.data?.zh === phrase.zh ? cells.data : null;
  const isLast = index >= topic.phrases.length - 1;

  return (
    <View style={{ flex: 1 }}>
      {/* No swipe-back: on iOS 26 it works from anywhere on screen, so writing could exit the page. */}
      <Stack.Screen options={{ title: `${topic.emoji} ${topic.name}`, gestureEnabled: false }} />
      <LessonNav
        index={index}
        count={topic.phrases.length}
        onPrev={() => setIndex(index - 1)}
        onNext={() => setIndex(index + 1)}
      />
      {cells.error ? (
        <EmptyState title="Couldn't load this phrase" />
      ) : !loaded ? (
        <Loading />
      ) : loaded.cells.some((cell) => cell.data) ? (
        <PhrasePractice
          key={`${phrase.zh}-${attempt}`}
          phrase={phrase}
          cells={loaded.cells}
          isLast={isLast}
          onAgain={() => setAttempt((a) => a + 1)}
          onNext={() => (isLast ? router.back() : setIndex(index + 1))}
        />
      ) : (
        <EmptyState title={`No stroke data for ${phrase.zh}`} />
      )}
    </View>
  );
}

/** Writing one phrase, character by character. Re-keyed by the parent to start over. */
function PhrasePractice({
  phrase,
  cells,
  isLast,
  onAgain,
  onNext,
}: {
  phrase: Phrase;
  cells: Cell[];
  isLast: boolean;
  onAgain: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mode = useSettings((s) => s.phraseMode);
  const showOutline = useSettings((s) => s.showOutline);
  const updateSettings = useSettings((s) => s.update);
  const recordPhrase = useProgress((s) => s.recordPhrase);

  // Cells to write, as indices into `cells` (characters without stroke data are skipped).
  const writable = cells.flatMap((cell, i) => (cell.data ? [i] : []));
  const [pos, setPos] = useState(0);
  const [misses, setMisses] = useState(0);
  // Remounts the live canvas for each new character (and replays its demo).
  const [canvasKey, setCanvasKey] = useState(0);
  const done = pos >= writable.length;
  const activeCell = writable[Math.min(pos, writable.length - 1)];
  const current = cells[activeCell].data as CharacterData;

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { session, dispatch, canvasProps } = useTracingSession(current, {
    onComplete: (charMisses) => {
      // Let the finished character show for a moment, then move on to the next.
      timer.current = setTimeout(() => {
        const next = pos + 1;
        setMisses((m) => m + charMisses);
        setPos(next);
        if (next < writable.length) {
          const nextChar = cells[writable[next]].data as CharacterData;
          dispatch({
            type: 'reset',
            strokeCount: nextChar.strokes.length,
            demo: useSettings.getState().showDemo,
          });
          setCanvasKey((k) => k + 1);
        }
      }, ADVANCE_DELAY);
    },
  });
  const charStatus = useSessionStatus(session);

  useEffect(() => {
    if (!done) return;
    recordPhrase(phrase.zh, misses);
    if (useSettings.getState().autoSpeak) speak(phrase.zh);
    // Only when the phrase is completed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const watch = () => {
    dispatch({ type: 'reset', strokeCount: current.strokes.length, demo: true });
    setCanvasKey((k) => k + 1);
  };

  // The writing area takes whatever space is left; measure it to size the canvas or cells.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  const { phase } = session;
  const status = done
    ? {
        text:
          misses === 0
            ? 'Perfect! No mistakes 🎉'
            : `Done! ${misses} ${misses === 1 ? 'mistake' : 'mistakes'}`,
        color: theme.success,
      }
    : phase === 'complete'
      ? { text: `✓ ${current.char}`, color: theme.success }
      : charStatus;

  const liveCanvas = (size: number, active: boolean) => (
    <TracingCanvas key={canvasKey} {...canvasProps} size={size} active={active} />
  );

  return (
    <View style={[styles.practice, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.info}>
        <View style={{ flex: 1 }}>
          {mode === 'single' && (
            <PhraseStrip
              cells={cells}
              activeCell={done ? cells.length : activeCell}
              showOutline={showOutline}
            />
          )}
          <Text style={[styles.pinyin, { color: theme.text }]}>{phrase.pinyin}</Text>
          <Text style={[styles.meaning, { color: theme.textSecondary }]}>{phrase.en}</Text>
        </View>
        <Pressable
          accessibilityLabel="Play pronunciation"
          onPress={() => speak(phrase.zh)}
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

      <View style={styles.full}>
        <SegmentedControl<PhraseMode>
          value={mode}
          onChange={(phraseMode) => updateSettings({ phraseMode })}
          options={[
            { value: 'single', label: 'One at a time' },
            { value: 'row', label: 'Whole phrase' },
          ]}
        />
      </View>

      <View
        style={styles.area}
        onLayout={(e) =>
          setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }>
        {area &&
          (mode === 'single' && !done ? (
            liveCanvas(Math.floor(Math.min(area.width, area.height)), false)
          ) : (
            <PhraseCells
              cells={cells}
              activeCell={done ? cells.length : activeCell}
              area={area}
              showOutline={showOutline}
              renderActive={(size) => liveCanvas(size, true)}
            />
          ))}
      </View>

      <Text
        style={[styles.status, { color: status.color }]}
        numberOfLines={2}
        accessibilityLiveRegion="polite">
        {status.text}
      </Text>

      <View style={styles.actions}>
        {done ? (
          <>
            <Button
              label="Again"
              icon="↺"
              variant="secondary"
              onPress={onAgain}
              style={styles.action}
            />
            <Button
              label={isLast ? 'Finish' : 'Next'}
              icon={isLast ? '✓' : '→'}
              onPress={onNext}
              style={styles.action}
            />
          </>
        ) : phase === 'demo' ? (
          <Button
            label="Skip"
            variant="secondary"
            onPress={() => dispatch({ type: 'skipDemo' })}
            style={styles.action}
          />
        ) : phase === 'tracing' ? (
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
              onPress={watch}
              style={styles.action}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The phrase as text, with the character being written highlighted. With the outline off,
 * characters not yet written are blanked out so they're written from memory.
 */
function PhraseStrip({
  cells,
  activeCell,
  showOutline,
}: {
  cells: Cell[];
  activeCell: number;
  showOutline: boolean;
}) {
  const theme = useTheme();
  return (
    <Text style={[styles.strip, { color: theme.text }]}>
      {cells.map((cell, i) => {
        const written = i < activeCell;
        const active = i === activeCell;
        return (
          <Text key={i}>
            <Text
              style={
                active
                  ? { color: theme.tint, textDecorationLine: 'underline' }
                  : written
                    ? undefined
                    : { color: theme.textSecondary }
              }>
              {written || showOutline ? cell.char : '＿'}
            </Text>
            {cell.trailing}
          </Text>
        );
      })}
    </Text>
  );
}

/**
 * The phrase as a row of practice grids, like squared exercise paper: written characters,
 * the one being written (`renderActive`), and blank (or outlined) ones still to come.
 */
function PhraseCells({
  cells,
  activeCell,
  area,
  showOutline,
  renderActive,
}: {
  cells: Cell[];
  /** `cells.length` once they're all written. */
  activeCell: number;
  area: { width: number; height: number };
  showOutline: boolean;
  renderActive: (size: number) => ReactNode;
}) {
  const theme = useTheme();
  // Punctuation gets a cell of its own, as on squared exercise paper.
  const slots = cells.flatMap((cell, i) => [
    { cell, i },
    ...(cell.trailing ? [{ cell: null, i, text: cell.trailing }] : []),
  ]);
  const { columns, size } = fitGrid(slots.length, area.width, area.height, {
    gap: CELL_GAP,
    max: MAX_CELL,
  });

  const staticCanvas = (data: CharacterData, written: boolean) => {
    const props: TracingCanvasProps = {
      character: data,
      size,
      session: staticSession(data.strokes.length, written),
      showOutline,
      disabled: true,
      onStroke: noop,
      onStrokeBegin: noop,
      onDemoStrokeDone: noop,
    };
    return <TracingCanvas {...props} />;
  };
  const textCell = (text: string, color: string) => (
    <View style={[styles.textCell, { borderColor: theme.grid, backgroundColor: theme.paper }]}>
      <Text style={{ fontSize: size * 0.6, color }}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.cells, { width: columns * size + (columns - 1) * CELL_GAP }]}>
      {slots.map(({ cell, i, text }) => (
        <View key={cell ? i : `${i}p`} style={{ width: size, height: size }}>
          {!cell
            ? textCell(text ?? '', theme.textSecondary)
            : !cell.data
              ? textCell(cell.char, theme.text)
              : i === activeCell
                ? renderActive(size)
                : staticCanvas(cell.data, i < activeCell)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  practice: { flex: 1, alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three },
  full: { width: '100%', maxWidth: MaxContentWidth },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  strip: { fontSize: 30, letterSpacing: 2, marginBottom: 2 },
  pinyin: { fontSize: 18, fontWeight: '600' },
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
  area: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP },
  textCell: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Two lines' worth, so a long message doesn't shrink the writing area mid-stroke.
  status: { fontSize: 17, fontWeight: '600', textAlign: 'center', minHeight: 44 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    minHeight: 48,
  },
  action: { flex: 1 },
});
