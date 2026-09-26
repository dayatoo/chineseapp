/*
 * Decides whether a drawn stroke matches the expected stroke of a character.
 * Adapted from hanzi-writer's strokeMatches (https://github.com/chanind/hanzi-writer),
 * MIT License, Copyright (c) 2014 David Chanin. Changes: works on plain median arrays and
 * reports *why* a stroke was rejected so the app can give specific feedback.
 */
import type { Point } from '@/data/types';

import {
  average,
  cosineSimilarity,
  distance,
  equals,
  frechetDist,
  length,
  normalizeCurve,
  rotate,
  segmentVectors,
} from './geometry';

export type Leniency = 'easy' | 'normal' | 'strict';

export const LENIENCY_FACTOR: Record<Leniency, number> = { easy: 1.4, normal: 1, strict: 0.7 };

export type MismatchReason =
  /** Not enough of a line to judge (a tap, or much shorter than the stroke). */
  | 'too-short'
  /** Right place and shape, drawn from the wrong end. */
  | 'backwards'
  /** Matches a later stroke: the stroke order is wrong. */
  | 'wrong-order'
  /** Not near the expected stroke. */
  | 'wrong-place'
  /** Near the stroke, but the shape or direction is off. */
  | 'wrong-shape';

export type MatchResult = { ok: true } | { ok: false; reason: MismatchReason };

export type MatchOptions = {
  /** Multiplier on all thresholds; bigger = more forgiving. */
  leniency?: number;
  /** Tighter distance check when the outline is visible to trace over. */
  outlineVisible?: boolean;
};

const COSINE_SIMILARITY_THRESHOLD = 0; // -1 to 1, smaller = more lenient
const START_AND_END_DIST_THRESHOLD = 250; // bigger = more lenient
const FRECHET_THRESHOLD = 0.4; // bigger = more lenient
const MIN_LEN_THRESHOLD = 0.35; // smaller = more lenient
const AVERAGE_DISTANCE_THRESHOLD = 350;
const SHAPE_FIT_ROTATIONS = [Math.PI / 16, Math.PI / 32, 0, -Math.PI / 32, -Math.PI / 16];

type MatchData = {
  isMatch: boolean;
  avgDist: number;
  withinDist: boolean;
  startAndEnd: boolean;
  direction: boolean;
  shape: boolean;
  lengthOk: boolean;
};

function stripDuplicates(points: Point[]): Point[] {
  const out = points.slice(0, 1);
  for (const p of points.slice(1)) if (!equals(p, out[out.length - 1])) out.push(p);
  return out;
}

const minDistanceTo = (median: Point[], point: Point) =>
  Math.min(...median.map((m) => distance(m, point)));

function directionMatches(points: Point[], median: Point[]): boolean {
  const strokeVectors = segmentVectors(median);
  const similarities = segmentVectors(points).map((edge) =>
    Math.max(...strokeVectors.map((sv) => cosineSimilarity(sv, edge))),
  );
  return average(similarities) > COSINE_SIMILARITY_THRESHOLD;
}

function shapeFits(points: Point[], median: Point[], leniency: number): boolean {
  const a = normalizeCurve(points);
  const b = normalizeCurve(median);
  const minDist = Math.min(...SHAPE_FIT_ROTATIONS.map((theta) => frechetDist(a, rotate(b, theta))));
  return minDist <= FRECHET_THRESHOLD * leniency;
}

function getMatchData(
  points: Point[],
  median: Point[],
  strokeIndex: number,
  leniency: number,
  outlineVisible: boolean,
): MatchData {
  const avgDist = average(points.map((p) => minDistanceTo(median, p)));
  const distMod = outlineVisible || strokeIndex > 0 ? 0.5 : 1;
  const withinDist = avgDist <= AVERAGE_DISTANCE_THRESHOLD * distMod * leniency;
  if (!withinDist) {
    return {
      isMatch: false,
      avgDist,
      withinDist,
      startAndEnd: false,
      direction: false,
      shape: false,
      lengthOk: false,
    };
  }
  const startAndEnd =
    distance(median[0], points[0]) <= START_AND_END_DIST_THRESHOLD * leniency &&
    distance(median[median.length - 1], points[points.length - 1]) <=
      START_AND_END_DIST_THRESHOLD * leniency;
  const direction = directionMatches(points, median);
  const shape = shapeFits(points, median, leniency);
  const lengthOk = (leniency * (length(points) + 25)) / (length(median) + 25) >= MIN_LEN_THRESHOLD;
  return {
    isMatch: startAndEnd && direction && shape && lengthOk,
    avgDist,
    withinDist,
    startAndEnd,
    direction,
    shape,
    lengthOk,
  };
}

/**
 * Checks a drawn stroke against stroke `strokeIndex` of a character.
 *
 * @param drawn    the user's stroke, in character coordinates (see StrokeData)
 * @param medians  the character's stroke medians, in stroke order
 */
export function matchStroke(
  drawn: Point[],
  medians: Point[][],
  strokeIndex: number,
  { leniency = 1, outlineVisible = false }: MatchOptions = {},
): MatchResult {
  const points = stripDuplicates(drawn);
  if (points.length < 2 || length(points) < 15) return { ok: false, reason: 'too-short' };

  const median = medians[strokeIndex];
  const data = getMatchData(points, median, strokeIndex, leniency, outlineVisible);

  // Does the stroke look more like one that comes later? Then the order is wrong.
  const laterMatches = medians
    .slice(strokeIndex + 1)
    .map((m, i) => getMatchData(points, m, strokeIndex + 1 + i, leniency, outlineVisible))
    .filter((d) => d.isMatch);
  const closestLater = Math.min(...laterMatches.map((d) => d.avgDist));

  if (data.isMatch) {
    if (closestLater >= data.avgDist) return { ok: true };
    // A later stroke fits better. Re-check with reduced leniency (0.3–0.6× depending on how
    // much better the other match is), so similar-looking strokes can still pass when drawn well.
    const adjustment = (0.6 * (closestLater + data.avgDist)) / (2 * data.avgDist);
    const strict = getMatchData(points, median, strokeIndex, leniency * adjustment, outlineVisible);
    return strict.isMatch ? { ok: true } : { ok: false, reason: 'wrong-order' };
  }

  if (laterMatches.length) return { ok: false, reason: 'wrong-order' };

  const reversed = [...points].reverse();
  if (getMatchData(reversed, median, strokeIndex, leniency, outlineVisible).isMatch) {
    return { ok: false, reason: 'backwards' };
  }
  if (!data.withinDist) return { ok: false, reason: 'wrong-place' };
  if (!data.lengthOk) return { ok: false, reason: 'too-short' };
  if (!data.startAndEnd && data.shape && data.direction)
    return { ok: false, reason: 'wrong-place' };
  return { ok: false, reason: 'wrong-shape' };
}

export const MISMATCH_MESSAGES: Record<MismatchReason, string> = {
  'too-short': 'Draw the whole stroke',
  backwards: 'Wrong direction: start from the other end',
  'wrong-order': 'Wrong stroke order: that stroke comes later',
  'wrong-place': 'Not quite there: follow the outline',
  'wrong-shape': 'Check the shape of the stroke',
};
