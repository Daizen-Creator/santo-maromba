import { IDatabase } from '../driver';
import { BodyMeasurementRecord } from '../../shared/types';

export class MeasurementRepository {
  constructor(private db: IDatabase) {}

  getAll(profileId: string = 'default-user'): BodyMeasurementRecord[] {
    const rows = this.db.query<any>(
      'SELECT * FROM body_measurements WHERE profile_id = ? ORDER BY date DESC, created_at DESC',
      [profileId]
    );

    return rows.map(r => ({
      id: r.id,
      profileId: r.profile_id,
      date: r.date,
      weightKg: r.weight_kg ? Number(r.weight_kg) : undefined,
      waistCircCm: r.waist_circ_cm ? Number(r.waist_circ_cm) : undefined,
      armRelaxedCm: r.arm_relaxed_cm ? Number(r.arm_relaxed_cm) : undefined,
      armFlexedCm: r.arm_flexed_cm ? Number(r.arm_flexed_cm) : undefined,
      chestCm: r.chest_cm ? Number(r.chest_cm) : undefined,
      thighCm: r.thigh_cm ? Number(r.thigh_cm) : undefined,
      hipCm: r.hip_cm ? Number(r.hip_cm) : undefined,
      shoulderCircCm: r.shoulder_circ_cm ? Number(r.shoulder_circ_cm) : undefined,
      calfCm: r.calf_cm ? Number(r.calf_cm) : undefined,
      bodyFatPct: r.body_fat_pct ? Number(r.body_fat_pct) : undefined,
      source: r.source,
      notes: r.notes || undefined,
      createdAt: r.created_at
    }));
  }

  getByDate(date: string, profileId: string = 'default-user'): BodyMeasurementRecord | null {
    const row = this.db.queryOne<any>(
      'SELECT * FROM body_measurements WHERE profile_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
      [profileId, date]
    );

    if (!row) return null;

    return {
      id: row.id,
      profileId: row.profile_id,
      date: row.date,
      weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
      waistCircCm: row.waist_circ_cm ? Number(row.waist_circ_cm) : undefined,
      armRelaxedCm: row.arm_relaxed_cm ? Number(row.arm_relaxed_cm) : undefined,
      armFlexedCm: row.arm_flexed_cm ? Number(row.arm_flexed_cm) : undefined,
      chestCm: row.chest_cm ? Number(row.chest_cm) : undefined,
      thighCm: row.thigh_cm ? Number(row.thigh_cm) : undefined,
      hipCm: row.hip_cm ? Number(row.hip_cm) : undefined,
      shoulderCircCm: row.shoulder_circ_cm ? Number(row.shoulder_circ_cm) : undefined,
      calfCm: row.calf_cm ? Number(row.calf_cm) : undefined,
      bodyFatPct: row.body_fat_pct ? Number(row.body_fat_pct) : undefined,
      source: row.source,
      notes: row.notes || undefined,
      createdAt: row.created_at
    };
  }

  saveMeasurement(
    data: {
      date: string;
      weightKg?: number;
      waistCircCm?: number;
      armRelaxedCm?: number;
      armFlexedCm?: number;
      chestCm?: number;
      thighCm?: number;
      hipCm?: number;
      shoulderCircCm?: number;
      calfCm?: number;
      bodyFatPct?: number;
      source?: string;
      notes?: string;
    },
    profileId: string = 'default-user'
  ): BodyMeasurementRecord {
    const existing = this.getByDate(data.date, profileId);
    const now = new Date().toISOString();
    const source = data.source || 'Fita Métrica Manual';

    if (existing) {
      this.db.execute(
        `UPDATE body_measurements SET
          weight_kg = ?, waist_circ_cm = ?, arm_relaxed_cm = ?, arm_flexed_cm = ?,
          chest_cm = ?, thigh_cm = ?, hip_cm = ?, shoulder_circ_cm = ?, calf_cm = ?, body_fat_pct = ?,
          source = ?, notes = ?
        WHERE id = ?`,
        [
          data.weightKg ?? existing.weightKg ?? null,
          data.waistCircCm ?? existing.waistCircCm ?? null,
          data.armRelaxedCm ?? existing.armRelaxedCm ?? null,
          data.armFlexedCm ?? existing.armFlexedCm ?? null,
          data.chestCm ?? existing.chestCm ?? null,
          data.thighCm ?? existing.thighCm ?? null,
          data.hipCm ?? existing.hipCm ?? null,
          data.shoulderCircCm ?? existing.shoulderCircCm ?? null,
          data.calfCm ?? existing.calfCm ?? null,
          data.bodyFatPct ?? existing.bodyFatPct ?? null,
          source,
          data.notes ?? existing.notes ?? null,
          existing.id
        ]
      );
      return this.getByDate(data.date, profileId)!;
    } else {
      const id = `meas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.execute(
        `INSERT INTO body_measurements (
          id, profile_id, date, weight_kg, waist_circ_cm, arm_relaxed_cm, arm_flexed_cm,
          chest_cm, thigh_cm, hip_cm, shoulder_circ_cm, calf_cm, body_fat_pct, source, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          profileId,
          data.date,
          data.weightKg ?? null,
          data.waistCircCm ?? null,
          data.armRelaxedCm ?? null,
          data.armFlexedCm ?? null,
          data.chestCm ?? null,
          data.thighCm ?? null,
          data.hipCm ?? null,
          data.shoulderCircCm ?? null,
          data.calfCm ?? null,
          data.bodyFatPct ?? null,
          source,
          data.notes ?? null,
          now
        ]
      );
      return this.getByDate(data.date, profileId)!;
    }
  }
}
