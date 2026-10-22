import { BodyMeasurementRecord, ShapeMilestone } from '../shared/types';

export interface ShapeMilestoneProgress {
  currentValue?: number;
  measurementDate?: string;
  reached: boolean;
  distanceToTarget?: number;
}

export function getShapeMilestoneProgress(
  milestone: ShapeMilestone,
  measurements: BodyMeasurementRecord[]
): ShapeMilestoneProgress {
  const latest = [...measurements]
    .filter(measurement => typeof measurement[milestone.metric] === 'number' && Number.isFinite(measurement[milestone.metric]))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return { reached: false };

  const currentValue = latest[milestone.metric] as number;
  const reached = milestone.direction === 'increase'
    ? currentValue >= milestone.targetValue
    : currentValue <= milestone.targetValue;
  return {
    currentValue,
    measurementDate: latest.date,
    reached,
    distanceToTarget: reached ? 0 : Math.abs(milestone.targetValue - currentValue)
  };
}
