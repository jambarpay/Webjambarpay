export function percentageChange(currentValue: number, previousValue: number): number {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
    return 0;
  }

  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}
