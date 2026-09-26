import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { CharacterData, Point } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

import type { SessionState } from './session';
import { StrokeAnimation } from './stroke-animation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Character data lives in a 1024×1024 box, y up from -124 to 900. */
const VIEW = 1024;
const CHAR_TRANSFORM = 'translate(0, 900) scale(1, -1)';
const USER_STROKE_WIDTH = 44;
/** Strokes shorter than this (in character units) are treated as accidental taps and ignored. */
const MIN_STROKE_LENGTH = 20;

/** Converts a flat [x0, y0, x1, y1, …] list in view coordinates to character coordinates. */
function toCharPoints(flat: number[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) points.push({ x: flat[i], y: 900 - flat[i + 1] });
  return points;
}

function flatLength(flat: number[]): number {
  let total = 0;
  for (let i = 2; i + 1 < flat.length; i += 2) {
    total += Math.hypot(flat[i] - flat[i - 2], flat[i + 1] - flat[i - 1]);
  }
  return total;
}

export type TracingCanvasProps = {
  character: CharacterData;
  size: number;
  session: SessionState;
  showOutline: boolean;
  /** Called with a finished stroke in character coordinates. */
  onStroke: (points: Point[]) => void;
  /** Called when a stroke starts, including during the demo (which it should end). */
  onStrokeBegin: () => void;
  onDemoStrokeDone: () => void;
};

/**
 * The writing surface: a 米字格 practice grid with the character's outline, the strokes
 * written so far, stroke-order demo and hint animations, and the user's live brush stroke.
 * Parent owns the session state; re-key this component to reset it for a new attempt.
 */
export function TracingCanvas({
  character,
  size,
  session,
  showOutline,
  onStroke,
  onStrokeBegin,
  onDemoStrokeDone,
}: TracingCanvasProps) {
  const theme = useTheme();
  const scale = VIEW / size;
  const { strokes, medians } = character;
  const { phase, strokeIndex, feedback, hintId } = session;

  // ----- live user stroke -----
  const points = useSharedValue<number[]>([]);
  const strokeOpacity = useSharedValue(1);
  // The live stroke turns red when the verdict on it is "wrong". Remember which verdict was
  // current when the stroke began, so a new stroke starts out in ink again.
  const [feedbackIdAtStart, setFeedbackIdAtStart] = useState<number | undefined>(undefined);
  const liveIsWrong = !!feedback && !feedback.ok && feedback.id !== feedbackIdAtStart;

  const handleStrokeStart = useCallback(() => {
    setFeedbackIdAtStart(feedback?.id);
    onStrokeBegin();
  }, [feedback?.id, onStrokeBegin]);
  const handleStrokeEnd = useCallback(
    (flat: number[]) => {
      if (flat.length < 4 || flatLength(flat) < MIN_STROKE_LENGTH) {
        points.set([]);
        return;
      }
      onStroke(toCharPoints(flat));
    },
    [onStroke, points],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Writing is allowed during the demo too; the first touch stops it.
        .enabled(phase !== 'complete')
        .minDistance(0)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
          strokeOpacity.set(1);
          points.set([e.x * scale, e.y * scale]);
          scheduleOnRN(handleStrokeStart);
        })
        .onUpdate((e) => {
          points.modify((flat) => {
            'worklet';
            flat.push(e.x * scale, e.y * scale);
            return flat;
          });
        })
        .onFinalize(() => {
          scheduleOnRN(handleStrokeEnd, points.get().slice());
        }),
    [phase, scale, points, strokeOpacity, handleStrokeStart, handleStrokeEnd],
  );

  // React to the verdict on the last stroke: correct strokes are replaced by the real stroke
  // shape; wrong ones (drawn red) fade out.
  useEffect(() => {
    if (!feedback) return;
    if (feedback.ok) points.set([]);
    else strokeOpacity.set(withTiming(0, { duration: 700 }));
  }, [feedback, points, strokeOpacity]);

  const liveProps = useAnimatedProps(() => {
    const flat = points.get();
    let d = '';
    for (let i = 0; i + 1 < flat.length; i += 2) {
      d += `${i === 0 ? 'M' : ' L'} ${flat[i]} ${flat[i + 1]}`;
    }
    return { d: d || 'M 0 0', strokeOpacity: strokeOpacity.get() };
  });

  // ----- character layers -----
  const done = phase === 'complete';
  // The stroke just drawn correctly animates into place; the rest are filled in directly.
  const animateLast = phase !== 'demo' && feedback?.ok === true && strokeIndex > 0;
  const filledCount = done ? strokes.length : animateLast ? strokeIndex - 1 : strokeIndex;
  const inkColor = done ? theme.success : theme.ink;
  const showHint = phase === 'tracing' && hintId > 0;

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel={`Writing area for ${character.char}`}
        style={[styles.canvas, { width: size, height: size, borderColor: theme.grid }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
          <Rect x={0} y={0} width={VIEW} height={VIEW} fill={theme.paper} />
          <PracticeGrid color={theme.grid} />

          <G transform={CHAR_TRANSFORM}>
            {(showOutline || phase === 'demo') &&
              strokes.map((d, i) => <Path key={`o${i}`} d={d} fill={theme.outline} />)}

            {strokes.slice(0, filledCount).map((d, i) => (
              <Path key={`s${i}`} d={d} fill={inkColor} />
            ))}

            {animateLast && !done && (
              <StrokeAnimation
                key={`done-${strokeIndex - 1}`}
                outline={strokes[strokeIndex - 1]}
                median={medians[strokeIndex - 1]}
                color={theme.ink}
                speed={3}
              />
            )}

            {phase === 'demo' && (
              <StrokeAnimation
                key={`demo-${strokeIndex}`}
                outline={strokes[strokeIndex]}
                median={medians[strokeIndex]}
                color={theme.ink}
                delay={strokeIndex === 0 ? 400 : 120}
                onDone={onDemoStrokeDone}
              />
            )}

            {showHint && (
              <>
                <StrokeAnimation
                  key={`hint-${hintId}-${strokeIndex}`}
                  outline={strokes[strokeIndex]}
                  median={medians[strokeIndex]}
                  color={theme.hint}
                  opacity={0.55}
                  speed={0.6}
                />
                <Circle
                  cx={medians[strokeIndex][0].x}
                  cy={medians[strokeIndex][0].y}
                  r={34}
                  fill={theme.hint}
                />
              </>
            )}
          </G>

          <AnimatedPath
            animatedProps={liveProps}
            fill="none"
            stroke={liveIsWrong ? theme.error : theme.ink}
            strokeWidth={USER_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </GestureDetector>
  );
}

/** The traditional 米字格 grid: border, centre cross and diagonals. */
function PracticeGrid({ color }: { color: string }) {
  const dash = [18, 14];
  return (
    <G stroke={color} strokeWidth={4}>
      <Line x1={0} y1={VIEW / 2} x2={VIEW} y2={VIEW / 2} strokeDasharray={dash} />
      <Line x1={VIEW / 2} y1={0} x2={VIEW / 2} y2={VIEW} strokeDasharray={dash} />
      <Line x1={0} y1={0} x2={VIEW} y2={VIEW} strokeDasharray={dash} />
      <Line x1={VIEW} y1={0} x2={0} y2={VIEW} strokeDasharray={dash} />
    </G>
  );
}

const styles = StyleSheet.create({
  canvas: { borderWidth: 2, borderRadius: 6, overflow: 'hidden', alignSelf: 'center' },
});
