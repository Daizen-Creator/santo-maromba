import { describe, expect, it } from 'vitest';
import { calculateCostPerProteinGram } from '../domain/nutrition-cost';

describe('custo informado por grama de proteína', () => {
  it('converte preço por kg e proteína por 100 g sem arredondamento grosseiro', () => {
    expect(calculateCostPerProteinGram(25, 23)).toBe(0.1087);
    expect(calculateCostPerProteinGram(0, 20)).toBe(0);
  });

  it('não calcula quando preço ou proteína não são válidos', () => {
    expect(calculateCostPerProteinGram(undefined, 20)).toBeNull();
    expect(calculateCostPerProteinGram(10, undefined)).toBeNull();
    expect(calculateCostPerProteinGram(10, 0)).toBeNull();
    expect(calculateCostPerProteinGram(-1, 20)).toBeNull();
    expect(calculateCostPerProteinGram(Number.NaN, 20)).toBeNull();
  });
});
