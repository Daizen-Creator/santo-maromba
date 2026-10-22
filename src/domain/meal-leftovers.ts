function assertNonNegativeFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${field} precisa ser um número válido e não negativo.`);
}

export function calculateLeftoverAmount(plannedAmountG: number, consumedAmountG: number): number {
  assertNonNegativeFinite(plannedAmountG, 'A quantidade planejada');
  assertNonNegativeFinite(consumedAmountG, 'A quantidade consumida');
  return Math.max(0, plannedAmountG - consumedAmountG);
}

export function calculateConsumedFromLeftovers(plannedAmountG: number, leftoverAmountG: number): number {
  assertNonNegativeFinite(plannedAmountG, 'A quantidade planejada');
  assertNonNegativeFinite(leftoverAmountG, 'A quantidade de sobras');
  return Math.max(0, plannedAmountG - Math.min(plannedAmountG, leftoverAmountG));
}
