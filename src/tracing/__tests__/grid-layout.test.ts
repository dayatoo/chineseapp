/**
 * @jest-environment node
 */
import { fitGrid } from '../grid-layout';

const opts = { gap: 8, max: 240 };

describe('fitGrid', () => {
  it('keeps short phrases on one line, capped at the maximum size', () => {
    expect(fitGrid(2, 768, 600, opts)).toEqual({ columns: 2, size: 240 });
  });

  it('wraps long phrases on a phone to the size that fits best', () => {
    // 358×330: 4 columns × 3 rows of 83 beats 5 × 2 of 65 and 3 × 4 of 76.
    expect(fitGrid(10, 358, 330, opts)).toEqual({ columns: 4, size: 83 });
  });

  it('fits a tall, narrow area with one column', () => {
    expect(fitGrid(3, 100, 1000, opts)).toEqual({ columns: 1, size: 100 });
  });
});
