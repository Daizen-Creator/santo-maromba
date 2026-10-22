import { describe, expect, it } from 'vitest';
import { buildMeasurementTrend } from '../domain/measurement-trend';
import { BodyMeasurementRecord } from '../shared/types';

const record = (id: string, date: string, waistCircCm?: number, bodyFatPct?: number): BodyMeasurementRecord => ({
  id, date, waistCircCm, bodyFatPct, source: 'self_reported', createdAt: `${date}T12:00:00.000Z`
});

describe('Série temporal de medidas corporais', () => {
  it('monta a série na ordem cronológica somente com valores registrados', () => {
    const points = buildMeasurementTrend([
      record('later', '2026-10-20', 82),
      record('empty', '2026-10-15'),
      record('earlier', '2026-10-01', 86)
    ], 'waistCircCm');
    expect(points).toEqual([
      { date: '2026-10-01', value: 86 },
      { date: '2026-10-20', value: 82 }
    ]);
  });

  it('seleciona a métrica pedida sem preencher medições ausentes', () => {
    expect(buildMeasurementTrend([record('a', '2026-10-01', 86, 24)], 'bodyFatPct'))
      .toEqual([{ date: '2026-10-01', value: 24 }]);
    expect(buildMeasurementTrend([record('empty', '2026-10-01')], 'bodyFatPct')).toEqual([]);
  });

  it('exibe a série de altura real por data', () => {
    expect(buildMeasurementTrend([
      { ...record('later-height', '2026-10-20'), heightCm: 175.2 },
      { ...record('earlier-height', '2025-10-20'), heightCm: 174.5 }
    ], 'heightCm')).toEqual([
      { date: '2025-10-20', value: 174.5 },
      { date: '2026-10-20', value: 175.2 }
    ]);
  });
});
