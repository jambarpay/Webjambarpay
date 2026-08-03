import { percentageChange } from './percentage-change';

describe('percentageChange', () => {
  it('compares the current month with the previous month', () => {
    expect(percentageChange(115, 100)).toBe(15);
    expect(percentageChange(80, 100)).toBe(-20);
  });

  it('handles an empty previous month', () => {
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(12, 0)).toBe(100);
  });
});
