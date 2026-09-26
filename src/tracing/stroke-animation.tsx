import { useEffect, useId, useMemo } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ClipPath, Defs, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { Point } from '@/data/types';

import { extendStart, length, pathString } from './geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Brush width in character units; wide enough to cover any stroke once clipped to its outline. */
const BRUSH_WIDTH = 200;

/** hanzi-writer's timing: longer strokes take longer. `speed` 1 ≈ half a second per stroke. */
export const strokeDuration = (median: Point[], speed = 1) => (length(median) + 600) / (3 * speed);

/**
 * Draws one stroke as if written with a brush: a thick line grows along the stroke's median,
 * clipped to the stroke's outline (the technique hanzi-writer uses). Must be rendered inside
 * the character-space <G>.
 */
export function StrokeAnimation({
  outline,
  median,
  color,
  speed = 1,
  delay = 0,
  opacity = 1,
  onDone,
}: {
  outline: string;
  median: Point[];
  color: string;
  speed?: number;
  delay?: number;
  opacity?: number;
  onDone?: () => void;
}) {
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { d, len } = useMemo(() => {
    const extended = extendStart(median, BRUSH_WIDTH / 2);
    return { d: pathString(extended), len: length(extended) + BRUSH_WIDTH / 2 };
  }, [median]);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: strokeDuration(median, speed) }, (finished) => {
          if (finished && onDone) scheduleOnRN(onDone);
        }),
      ),
    );
    // Run once per mount; callers re-key the component to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - progress.get()),
  }));

  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={outline} />
        </ClipPath>
      </Defs>
      <AnimatedPath
        d={d}
        clipPath={`url(#${clipId})`}
        fill="none"
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={BRUSH_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeDasharray={[len, len]}
        animatedProps={animatedProps}
      />
    </>
  );
}
