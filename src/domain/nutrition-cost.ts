/** Price is user-entered currency per kg; protein is catalog grams per 100 g. */
export function calculateCostPerProteinGram(unitPricePerKg?: number, proteinPer100g?: number): number | null {
  if (unitPricePerKg === undefined || proteinPer100g === undefined
    || !Number.isFinite(unitPricePerKg) || !Number.isFinite(proteinPer100g)
    || unitPricePerKg < 0 || proteinPer100g <= 0) return null;
  return Number((unitPricePerKg / (proteinPer100g * 10)).toFixed(4));
}
