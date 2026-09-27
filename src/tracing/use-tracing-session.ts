import { useCallback, useEffect, useReducer } from 'react';

import type { CharacterData, Point } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';

import { buzzComplete, buzzCorrect, buzzWrong } from './feedback';
import { LENIENCY_FACTOR, matchStroke, MISMATCH_MESSAGES } from './matcher';
import { initialSession, sessionReducer, type SessionState } from './session';

/**
 * Tracing state for one character: matches strokes, gives feedback, and records the result
 * when the character is complete. Pass the result's `canvasProps` to <TracingCanvas>.
 *
 * To move on to another character without remounting, change `character` and dispatch a
 * `reset` in the same update.
 */
export function useTracingSession(
  character: CharacterData,
  { demo, onComplete }: { demo?: boolean; onComplete?: (misses: number) => void } = {},
) {
  const settings = useSettings();
  const recordResult = useProgress((s) => s.recordResult);

  const [session, dispatch] = useReducer(sessionReducer, undefined, () =>
    initialSession(character.strokes.length, demo ?? settings.showDemo),
  );

  const onStroke = useCallback(
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
    onComplete?.(session.totalMisses);
    // Only when the character is completed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase]);

  return {
    session,
    dispatch,
    canvasProps: {
      character,
      session,
      showOutline: settings.showOutline,
      onStroke,
      onStrokeBegin,
      onDemoStrokeDone,
    },
  };
}

/** The line under the canvas: what to do next, or what went wrong. */
export function useSessionStatus(session: SessionState): { text: string; color: string } {
  const theme = useTheme();
  const { phase, feedback } = session;
  if (phase === 'demo') return { text: 'Watch the stroke order…', color: theme.textSecondary };
  if (phase === 'complete')
    return session.totalMisses === 0
      ? { text: 'Perfect! No mistakes 🎉', color: theme.success }
      : {
          text: `Done! ${session.totalMisses} ${session.totalMisses === 1 ? 'mistake' : 'mistakes'}`,
          color: theme.success,
        };
  if (feedback && !feedback.ok && feedback.reason)
    return { text: `${MISMATCH_MESSAGES[feedback.reason]}. Try again.`, color: theme.error };
  return {
    text: `Stroke ${session.strokeIndex + 1} of ${session.strokeCount}`,
    color: theme.textSecondary,
  };
}
