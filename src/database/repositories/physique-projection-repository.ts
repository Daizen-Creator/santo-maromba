import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import {
  PhysiqueProjectionResult,
  PhysiqueProjectionSnapshot,
  ProjectionRealizedComparison
} from '../../shared/types';

interface ProjectionRow {
  id: string;
  profile_id: string;
  input_json: string;
  result_json: string;
  created_at: string;
}

interface ActualWeight {
  date: string;
  weight_kg: number;
}

function dateDistanceDays(first: string, second: string): number {
  return Math.abs(Date.parse(first + 'T00:00:00.000Z') - Date.parse(second + 'T00:00:00.000Z')) / 86_400_000;
}

export class PhysiqueProjectionRepository {
  constructor(private db: IDatabase) {}

  save(result: PhysiqueProjectionResult, profileId: string = 'default-user'): PhysiqueProjectionSnapshot {
    const id = 'projection-' + randomUUID();
    const createdAt = new Date().toISOString();
    this.db.execute(
      `INSERT INTO physique_projections (id, profile_id, input_json, result_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, profileId, JSON.stringify(result.input), JSON.stringify(result), createdAt]
    );
    return this.withComparisons({
      id,
      createdAt,
      ...result,
      comparisons: []
    }, profileId);
  }

  getAll(profileId: string = 'default-user'): PhysiqueProjectionSnapshot[] {
    const rows = this.db.query<ProjectionRow>(
      `SELECT id, profile_id, input_json, result_json, created_at
       FROM physique_projections WHERE profile_id = ? ORDER BY created_at DESC LIMIT 100`,
      [profileId]
    );

    return rows.map(row => {
      const result = JSON.parse(row.result_json) as PhysiqueProjectionResult;
      return this.withComparisons({
        id: row.id,
        createdAt: row.created_at,
        ...result,
        input: JSON.parse(row.input_json),
        comparisons: []
      }, row.profile_id);
    });
  }

  private withComparisons(snapshot: PhysiqueProjectionSnapshot, profileId: string): PhysiqueProjectionSnapshot {
    const actuals = this.db.query<ActualWeight>(
      `SELECT date, weight_kg FROM weight_records WHERE profile_id = ?
       UNION ALL
       SELECT date, weight_kg FROM body_measurements
       WHERE profile_id = ? AND weight_kg IS NOT NULL`,
      [profileId, profileId]
    );
    const futurePoints = snapshot.points.filter(point => point.months > 0) as Array<
      PhysiqueProjectionSnapshot['points'][number] & { months: 3 | 6 | 9 | 12 }
    >;
    const comparisons: ProjectionRealizedComparison[] = futurePoints.map(point => {
      const closest = actuals
        .map(record => ({ record, distance: dateDistanceDays(point.targetDate, record.date) }))
        .filter(candidate => candidate.distance <= 14)
        .sort((a, b) => a.distance - b.distance)[0];
      return {
        months: point.months,
        targetDate: point.targetDate,
        expectedWeightKg: point.weightKg,
        actualWeightKg: closest ? Number(closest.record.weight_kg) : null,
        actualDate: closest?.record.date,
        differenceKg: closest ? Number((Number(closest.record.weight_kg) - point.weightKg).toFixed(1)) : undefined
      };
    });

    return { ...snapshot, comparisons };
  }
}
