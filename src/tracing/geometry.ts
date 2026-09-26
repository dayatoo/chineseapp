/*
 * Curve geometry used for stroke matching and animation.
 * Ported from hanzi-writer (https://github.com/chanind/hanzi-writer), MIT License,
 * Copyright (c) 2014 David Chanin.
 */
import type { Point } from '@/data/types';

export const subtract = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });

export const magnitude = (p: Point) => Math.sqrt(p.x * p.x + p.y * p.y);

export const distance = (p1: Point, p2: Point) => magnitude(subtract(p1, p2));

export const equals = (p1: Point, p2: Point) => p1.x === p2.x && p1.y === p2.y;

export const average = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

export function length(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i], points[i - 1]);
  return total;
}

export const cosineSimilarity = (p1: Point, p2: Point) =>
  (p1.x * p2.x + p1.y * p2.y) / magnitude(p1) / magnitude(p2);

/** Direction vector of each segment of a polyline. */
export function segmentVectors(points: Point[]): Point[] {
  return points.slice(1).map((p, i) => subtract(p, points[i]));
}

/** A point on the line through p1 and p2, `dist` beyond p2 (p1, p2, result in that order). */
export function extendPointOnLine(p1: Point, p2: Point, dist: number): Point {
  const vect = subtract(p2, p1);
  const norm = dist / magnitude(vect);
  return { x: p2.x + norm * vect.x, y: p2.y + norm * vect.y };
}

/** Discrete Fréchet distance between two polylines. */
export function frechetDist(curve1: Point[], curve2: Point[]): number {
  const long = curve1.length >= curve2.length ? curve1 : curve2;
  const short = curve1.length >= curve2.length ? curve2 : curve1;
  let prev: number[] = [];
  for (let i = 0; i < long.length; i++) {
    const cur: number[] = [];
    for (let j = 0; j < short.length; j++) {
      const d = distance(long[i], short[j]);
      if (i === 0 && j === 0) cur.push(d);
      else if (j === 0) cur.push(Math.max(prev[0], d));
      else if (i === 0) cur.push(Math.max(cur[j - 1], d));
      else cur.push(Math.max(Math.min(prev[j], prev[j - 1], cur[j - 1]), d));
    }
    prev = cur;
  }
  return prev[short.length - 1];
}

/** Breaks segments longer than maxLen into smaller ones. */
export function subdivideCurve(curve: Point[], maxLen = 0.05): Point[] {
  const out = curve.slice(0, 1);
  for (const point of curve.slice(1)) {
    const prev = out[out.length - 1];
    const segLen = distance(point, prev);
    if (segLen > maxLen) {
      const n = Math.ceil(segLen / maxLen);
      const step = segLen / n;
      for (let i = 0; i < n; i++) out.push(extendPointOnLine(point, prev, -step * (i + 1)));
    } else {
      out.push(point);
    }
  }
  return out;
}

/** Resamples a curve as numPoints points equally spaced along its length. */
export function outlineCurve(curve: Point[], numPoints = 30): Point[] {
  const segmentLen = length(curve) / (numPoints - 1);
  const out = [curve[0]];
  const remaining = curve.slice(1);
  for (let i = 0; i < numPoints - 2; i++) {
    let last = out[out.length - 1];
    let remainingDist = segmentLen;
    for (;;) {
      const nextDist = distance(last, remaining[0]);
      if (nextDist < remainingDist && remaining.length > 1) {
        remainingDist -= nextDist;
        last = remaining.shift()!;
      } else {
        out.push(extendPointOnLine(last, remaining[0], remainingDist - nextDist));
        break;
      }
    }
  }
  out.push(curve[curve.length - 1]);
  return out;
}

/** Translates and scales a curve so shapes can be compared independent of position and size. */
export function normalizeCurve(curve: Point[]): Point[] {
  const outlined = outlineCurve(curve);
  const mean = {
    x: average(outlined.map((p) => p.x)),
    y: average(outlined.map((p) => p.y)),
  };
  const translated = outlined.map((p) => subtract(p, mean));
  const first = translated[0];
  const last = translated[translated.length - 1];
  const scale = Math.sqrt(average([first.x ** 2 + first.y ** 2, last.x ** 2 + last.y ** 2]));
  return subdivideCurve(translated.map((p) => ({ x: p.x / scale, y: p.y / scale })));
}

/** Rotates around the origin. */
export const rotate = (curve: Point[], theta: number): Point[] =>
  curve.map((p) => ({
    x: Math.cos(theta) * p.x - Math.sin(theta) * p.y,
    y: Math.sin(theta) * p.x + Math.cos(theta) * p.y,
  }));

/** Removes intermediate points that lie on a straight line between their neighbours. */
function filterParallelPoints(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out = [points[0], points[1]];
  for (const point of points.slice(2)) {
    const n = out.length;
    const cur = subtract(point, out[n - 1]);
    const prev = subtract(out[n - 1], out[n - 2]);
    if (cur.y * prev.x - cur.x * prev.y === 0) out.pop();
    out.push(point);
  }
  return out;
}

/** Moves the start of a polyline backwards by `dist` (so an animated brush covers the stroke's start). */
export function extendStart(points: Point[], dist: number): Point[] {
  const filtered = filterParallelPoints(points);
  if (filtered.length < 2) return filtered;
  return [extendPointOnLine(filtered[1], filtered[0], dist), ...filtered.slice(1)];
}

export function pathString(points: Point[]): string {
  return points
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`,
    )
    .join(' ');
}
