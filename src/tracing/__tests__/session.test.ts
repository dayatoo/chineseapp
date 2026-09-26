/**
 * @jest-environment node
 */
import { initialSession, type SessionAction, sessionReducer, type SessionState } from '../session';

const run = (state: SessionState, ...actions: SessionAction[]) =>
  actions.reduce(sessionReducer, state);
const wrong: SessionAction = { type: 'strokeWrong', reason: 'wrong-shape', hintAfterMisses: 3 };

describe('sessionReducer', () => {
  it('plays the demo stroke by stroke, then starts tracing', () => {
    let s = initialSession(2, true);
    expect(s.phase).toBe('demo');
    s = run(s, { type: 'demoStrokeDone' });
    expect(s).toMatchObject({ phase: 'demo', strokeIndex: 1 });
    s = run(s, { type: 'demoStrokeDone' });
    expect(s).toMatchObject({ phase: 'tracing', strokeIndex: 0 });
  });

  it('can skip the demo', () => {
    expect(run(initialSession(3, true), { type: 'skipDemo' })).toMatchObject({
      phase: 'tracing',
      strokeIndex: 0,
    });
  });

  it('stays on a stroke until it is drawn correctly', () => {
    let s = initialSession(2, false);
    s = run(s, wrong, wrong);
    expect(s).toMatchObject({ strokeIndex: 0, missesOnStroke: 2, totalMisses: 2 });
    expect(s.feedback).toMatchObject({ ok: false, reason: 'wrong-shape' });
    s = run(s, { type: 'strokeCorrect' });
    expect(s).toMatchObject({
      strokeIndex: 1,
      missesOnStroke: 0,
      totalMisses: 2,
      phase: 'tracing',
    });
    s = run(s, { type: 'strokeCorrect' });
    expect(s).toMatchObject({ phase: 'complete', totalMisses: 2 });
  });

  it('triggers a hint after repeated misses on the same stroke', () => {
    let s = run(initialSession(1, false), wrong, wrong);
    expect(s.hintId).toBe(0);
    s = run(s, wrong);
    expect(s.hintId).toBe(1);
    s = run(s, wrong);
    expect(s.hintId).toBe(2);
  });

  it('gives each attempt a new feedback id', () => {
    const s1 = run(initialSession(3, false), wrong);
    const s2 = run(s1, wrong);
    expect(s2.feedback!.id).not.toBe(s1.feedback!.id);
  });

  it('ignores strokes outside the tracing phase', () => {
    const demo = initialSession(2, true);
    expect(run(demo, { type: 'strokeCorrect' })).toBe(demo);
  });
});
