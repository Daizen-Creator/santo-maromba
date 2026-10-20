import { describe, expect, it } from 'vitest';
import { calculatePhysiqueProjection } from '../domain/physique-projection';
import { PhysiqueProjectionInput } from '../shared/types';

const baseInput: PhysiqueProjectionInput = {
  asOfDate: '2026-10-19',
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  bodyFatPct: 20,
  trainingExperience: 'beginner',
  adherencePercent: 100,
  goal: 'muscle_gain',
  measurements: { shouldersCm: 118, chestCm: 100, armCm: 35, waistCm: 88, thighCm: 58 }
};

describe('Projeção física', () => {
  it('gera marcos de hoje, 3, 6, 9 e 12 meses com composição e proporções', () => {
    const result = calculatePhysiqueProjection(baseInput);
    expect(result.points.map(point => point.months)).toEqual([0, 3, 6, 9, 12]);
    expect(result.points[0].targetDate).toBe('2026-10-19');
    expect(result.points[1].targetDate).toBe('2027-01-19');
    expect(result.points[0].ffmi).toBeGreaterThan(0);
    expect(result.points[0].shoulderWaistRatio).toBeCloseTo(1.34, 1);
    expect(result.points[4].weightKg).toBeGreaterThan(result.points[0].weightKg);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it('escala o resultado com a constância e não estima medidas sem linha de base', () => {
    const noAdherence = calculatePhysiqueProjection({ ...baseInput, adherencePercent: 0 });
    const noMeasurements = calculatePhysiqueProjection({ ...baseInput, measurements: {} });
    expect(noAdherence.points[4].weightKg).toBe(80);
    expect(noMeasurements.points[4].waistCm).toBeUndefined();
    expect(noMeasurements.points[4].shoulderWaistRatio).toBeUndefined();
  });

  it('projeta tendência de perda para cutting e valida idades adultas', () => {
    const cut = calculatePhysiqueProjection({ ...baseInput, goal: 'fat_loss' });
    expect(cut.points[4].weightKg).toBeLessThan(cut.points[0].weightKg);
    expect(cut.points[4].bodyFatPct).toBeLessThan(cut.points[0].bodyFatPct);
    expect(() => calculatePhysiqueProjection({ ...baseInput, age: 17 })).toThrow('adultos');
  });

  it('clampa corretamente datas no fim do mês', () => {
    const result = calculatePhysiqueProjection({ ...baseInput, asOfDate: '2026-01-31' });
    expect(result.points[1].targetDate).toBe('2026-04-30');
  });
});
