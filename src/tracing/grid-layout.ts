/**
 * Picks the number of columns that gives the biggest square cells for `count` cells in a
 * `width`×`height` area, capped at `max`. Ties go to more columns, so short phrases stay on
 * one line.
 */
export function fitGrid(
  count: number,
  width: number,
  height: number,
  { gap, max }: { gap: number; max: number },
): { columns: number; size: number } {
  let best = { columns: 1, size: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const size = Math.floor(
      Math.min((width - gap * (columns - 1)) / columns, (height - gap * (rows - 1)) / rows, max),
    );
    if (size >= best.size) best = { columns, size };
  }
  return best;
}
