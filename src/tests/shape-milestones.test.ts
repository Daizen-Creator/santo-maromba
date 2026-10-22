import { describe, expect, it } from 'vitest';
import { getShapeMilestoneProgress } from '../domain/shape-milestones';
import { BodyMeasurementRecord, ShapeMilestone } from '../shared/types';

const milestone: ShapeMilestone = {
  id: 'shape-milestone-test', title: 'Cintura 80', metric: 'waistCircCm', targetValue: 80,
  direction: 'decrease', createdAt: '2026-10-01', updatedAt: '2026-10-01'
};
const measurements: BodyMeasurementRecord[] = [
  { id: 'older', date: '2026-10-01', waistCircCm: 86, source: 'Medição real', createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'newer', date: '2026-10-22', waistCircCm: 83, source: 'Medição real', createdAt: '2026-10-22T10:00:00.000Z' }
];

describe('acompanhamento de marcos corporais', () => {
  it('usa a medição mais recente salva e calcula a distância até a meta', () => {
    expect(getShapeMilestoneProgress(milestone, measurements)).toEqual({
      currentValue: 83, measurementDate: '2026-10-22', reached: false, distanceToTarget: 3
    });
  });

  it('reconhece metas de aumento e não inventa zero quando falta medição', () => {
    expect(getShapeMilestoneProgress({ ...milestone, metric: 'armFlexedCm', targetValue: 40, direction: 'increase' }, [
      { id: 'arm', date: '2026-10-20', armFlexedCm: 40, source: 'Medição real', createdAt: '2026-10-20T10:00:00.000Z' }
    ]).reached).toBe(true);
    expect(getShapeMilestoneProgress(milestone, []).currentValue).toBeUndefined();
  });
});
