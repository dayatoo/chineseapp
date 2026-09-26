import type { MismatchReason } from './matcher';

/**
 * State machine for tracing one character:
 *   demo → tracing (one stroke at a time; a wrong stroke must be repeated) → complete
 */
export type SessionState = {
  phase: 'demo' | 'tracing' | 'complete';
  /** Index of the stroke to draw next (during demo: the stroke being animated). */
  strokeIndex: number;
  strokeCount: number;
  missesOnStroke: number;
  totalMisses: number;
  /** Most recent stroke result, for feedback. `id` changes on every attempt. */
  feedback: { id: number; ok: boolean; reason?: MismatchReason } | null;
  /** Increments whenever a hint animation should play. */
  hintId: number;
};

export type SessionAction =
  | { type: 'reset'; strokeCount: number; demo: boolean }
  | { type: 'demoStrokeDone' }
  | { type: 'skipDemo' }
  | { type: 'strokeCorrect' }
  | { type: 'strokeWrong'; reason: MismatchReason; hintAfterMisses: number }
  | { type: 'requestHint' };

export const initialSession = (strokeCount: number, demo: boolean): SessionState => ({
  phase: demo ? 'demo' : 'tracing',
  strokeIndex: 0,
  strokeCount,
  missesOnStroke: 0,
  totalMisses: 0,
  feedback: null,
  hintId: 0,
});

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'reset':
      return initialSession(action.strokeCount, action.demo);

    case 'demoStrokeDone':
      if (state.phase !== 'demo') return state;
      return state.strokeIndex + 1 < state.strokeCount
        ? { ...state, strokeIndex: state.strokeIndex + 1 }
        : { ...state, phase: 'tracing', strokeIndex: 0 };

    case 'skipDemo':
      return state.phase === 'demo' ? { ...state, phase: 'tracing', strokeIndex: 0 } : state;

    case 'strokeCorrect': {
      if (state.phase !== 'tracing') return state;
      const strokeIndex = state.strokeIndex + 1;
      return {
        ...state,
        strokeIndex,
        phase: strokeIndex >= state.strokeCount ? 'complete' : 'tracing',
        missesOnStroke: 0,
        feedback: { id: (state.feedback?.id ?? 0) + 1, ok: true },
      };
    }

    case 'strokeWrong': {
      if (state.phase !== 'tracing') return state;
      const missesOnStroke = state.missesOnStroke + 1;
      return {
        ...state,
        missesOnStroke,
        totalMisses: state.totalMisses + 1,
        feedback: { id: (state.feedback?.id ?? 0) + 1, ok: false, reason: action.reason },
        hintId: missesOnStroke >= action.hintAfterMisses ? state.hintId + 1 : state.hintId,
      };
    }

    case 'requestHint':
      return state.phase === 'tracing' ? { ...state, hintId: state.hintId + 1 } : state;
  }
}
