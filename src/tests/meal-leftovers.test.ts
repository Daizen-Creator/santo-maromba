import { describe, expect, it } from 'vitest';
import { calculateConsumedFromLeftovers, calculateLeftoverAmount } from '../domain/meal-leftovers';

describe('Registro de sobras por ingrediente', () => {
  it('converte sobras em consumo real e permite reconstruir sobras salvas', () => {
    const consumed = calculateConsumedFromLeftovers(180, 45);
    expect(consumed).toBe(135);
    expect(calculateLeftoverAmount(180, consumed)).toBe(45);
  });

  it('limita sobras ao tamanho planejado e nunca calcula sobra negativa', () => {
    expect(calculateConsumedFromLeftovers(100, 150)).toBe(0);
    expect(calculateLeftoverAmount(100, 120)).toBe(0);
  });

  it('rejeita quantidades inválidas', () => {
    expect(() => calculateConsumedFromLeftovers(100, -1)).toThrow(RangeError);
    expect(() => calculateLeftoverAmount(Number.NaN, 0)).toThrow(RangeError);
  });
});
