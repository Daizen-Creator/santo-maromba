import { BodyMeasurementRecord } from '../shared/types';

export const MEASUREMENT_METRICS = {
  heightCm: { label: 'Altura', unit: 'cm' },
  waistCircCm: { label: 'Cintura', unit: 'cm' },
  armRelaxedCm: { label: 'Braço relaxado', unit: 'cm' },
  armFlexedCm: { label: 'Braço contraído', unit: 'cm' },
  chestCm: { label: 'Peitoral', unit: 'cm' },
  shoulderCircCm: { label: 'Ombros', unit: 'cm' },
  thighCm: { label: 'Coxa', unit: 'cm' },
  hipCm: { label: 'Quadril', unit: 'cm' },
  calfCm: { label: 'Panturrilha', unit: 'cm' },
  weightKg: { label: 'Peso', unit: 'kg' },
  bodyFatPct: { label: 'Gordura corporal', unit: '%' }
} as const;

export type MeasurementMetric = keyof typeof MEASUREMENT_METRICS;
export interface MeasurementTrendPoint { date: string; value: number }

export function buildMeasurementTrend(
  records: BodyMeasurementRecord[],
  metric: MeasurementMetric
): MeasurementTrendPoint[] {
  return records
    .filter(record => Number.isFinite(record[metric]))
    .map(record => ({ date: record.date, value: record[metric]! }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
