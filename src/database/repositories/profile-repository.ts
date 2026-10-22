import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { FitnessGoal, ProfileGoalChangeField, ProfileGoalHistoryRecord, UserProfile } from '../../shared/types';
import { calculateAge } from '../../domain/nutrition-calculator';

export class ProfileRepository {
  constructor(private db: IDatabase) {}

  getProfile(): UserProfile | null {
    const row = this.db.queryOne<any>('SELECT * FROM profiles LIMIT 1');
    if (!row) return null;

    const birthDate = row.birth_date;
    const age = calculateAge(birthDate);

    return {
      id: row.id,
      name: row.name,
      birthDate: row.birth_date,
      age,
      heightCm: Number(row.height_cm),
      biologicalSex: row.biological_sex,
      activityLevel: row.activity_level,
      trainingExperience: row.training_experience,
      fitnessGoal: row.fitness_goal,
      targetWeightKg: row.target_weight_kg ? Number(row.target_weight_kg) : undefined,
      dietaryRestrictions: row.dietary_restrictions ? JSON.parse(row.dietary_restrictions) : [],
      allergies: row.allergies ? JSON.parse(row.allergies) : [],
      dietaryPreferences: row.dietary_preferences || undefined,
      foodBudgetMonthly: row.food_budget_monthly ? Number(row.food_budget_monthly) : undefined,
      mealsPerDay: Number(row.meals_per_day),
      trainingDaysPerWeek: Number(row.training_days_per_week),
      workSchedule: row.work_schedule || undefined,
      studySchedule: row.study_schedule || undefined,
      sleepSchedule: row.sleep_schedule || undefined,
      wakeTime: row.wake_time || undefined,
      sleepTime: row.sleep_time || undefined,
      trainingSchedule: row.training_schedule || undefined,
      availableEquipment: row.available_equipment ? JSON.parse(row.available_equipment) : [],
      interruptionHistoryNotes: row.interruption_history_notes || undefined,
      initialHistoryConfirmed: Boolean(row.initial_history_confirmed),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getGoalHistory(): ProfileGoalHistoryRecord[] {
    const profile = this.getProfile();
    if (!profile) return [];
    return this.db.query<any>(
      'SELECT * FROM profile_goal_history WHERE profile_id = ? ORDER BY changed_at DESC, rowid DESC',
      [profile.id]
    ).map(row => ({
      id: row.id,
      profileId: row.profile_id,
      fitnessGoal: row.fitness_goal as FitnessGoal,
      targetWeightKg: row.target_weight_kg === null ? null : Number(row.target_weight_kg),
      changeKind: row.change_kind,
      changedFields: JSON.parse(row.changed_fields) as ProfileGoalChangeField[],
      changedAt: row.changed_at
    }));
  }

  saveProfile(profile: Partial<UserProfile> & { name: string; birthDate: string; heightCm: number }): UserProfile {
    const existing = this.getProfile();
    const now = new Date().toISOString();
    const id = existing?.id || profile.id || 'default-user';

    const biologicalSex = profile.biologicalSex || existing?.biologicalSex || 'unspecified';
    const activityLevel = profile.activityLevel || existing?.activityLevel || 'moderate';
    const trainingExperience = profile.trainingExperience || existing?.trainingExperience || 'beginner';
    const fitnessGoal = profile.fitnessGoal || existing?.fitnessGoal || 'muscle_gain';
    const mealsPerDay = profile.mealsPerDay || existing?.mealsPerDay || 4;
    const trainingDaysPerWeek = profile.trainingDaysPerWeek || existing?.trainingDaysPerWeek || 5;

    const dietaryRestrictions = JSON.stringify(profile.dietaryRestrictions || existing?.dietaryRestrictions || []);
    const allergies = JSON.stringify(profile.allergies || existing?.allergies || []);
    const availableEquipment = JSON.stringify(profile.availableEquipment || existing?.availableEquipment || []);
    const wakeTime = Object.prototype.hasOwnProperty.call(profile, 'wakeTime') ? profile.wakeTime || null : existing?.wakeTime ?? null;
    const sleepTime = Object.prototype.hasOwnProperty.call(profile, 'sleepTime') ? profile.sleepTime || null : existing?.sleepTime ?? null;

    const targetWeightKg = Object.prototype.hasOwnProperty.call(profile, 'targetWeightKg')
      ? profile.targetWeightKg ?? null
      : existing?.targetWeightKg ?? null;
    const changedFields: ProfileGoalChangeField[] = existing
      ? [
          ...(fitnessGoal !== existing.fitnessGoal ? ['fitnessGoal' as const] : []),
          ...(targetWeightKg !== (existing.targetWeightKg ?? null) ? ['targetWeightKg' as const] : [])
        ]
      : ['fitnessGoal', 'targetWeightKg'];

    this.db.transaction(() => {
      if (existing) {
        this.db.execute(
        `UPDATE profiles SET
          name = ?,
          birth_date = ?,
          height_cm = ?,
          biological_sex = ?,
          activity_level = ?,
          training_experience = ?,
          fitness_goal = ?,
          target_weight_kg = ?,
          dietary_restrictions = ?,
          allergies = ?,
          dietary_preferences = ?,
          food_budget_monthly = ?,
          meals_per_day = ?,
          training_days_per_week = ?,
          work_schedule = ?,
          study_schedule = ?,
          sleep_schedule = ?,
          wake_time = ?,
          sleep_time = ?,
          training_schedule = ?,
          available_equipment = ?,
          interruption_history_notes = ?,
          initial_history_confirmed = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          profile.name,
          profile.birthDate,
          profile.heightCm,
          biologicalSex,
          activityLevel,
          trainingExperience,
          fitnessGoal,
          targetWeightKg,
          dietaryRestrictions,
          allergies,
          profile.dietaryPreferences ?? existing.dietaryPreferences ?? null,
          profile.foodBudgetMonthly ?? existing.foodBudgetMonthly ?? null,
          mealsPerDay,
          trainingDaysPerWeek,
          profile.workSchedule ?? existing.workSchedule ?? null,
          profile.studySchedule ?? existing.studySchedule ?? null,
          profile.sleepSchedule ?? existing.sleepSchedule ?? null,
          wakeTime,
          sleepTime,
          profile.trainingSchedule ?? existing.trainingSchedule ?? null,
          availableEquipment,
          profile.interruptionHistoryNotes ?? existing.interruptionHistoryNotes ?? null,
          profile.initialHistoryConfirmed !== undefined
            ? (profile.initialHistoryConfirmed ? 1 : 0)
            : (existing.initialHistoryConfirmed ? 1 : 0),
          now,
          id
        ]
        );
      } else {
        this.db.execute(
        `INSERT INTO profiles (
          id, name, birth_date, height_cm, biological_sex, activity_level,
          training_experience, fitness_goal, target_weight_kg, dietary_restrictions,
          allergies, dietary_preferences, food_budget_monthly, meals_per_day,
          training_days_per_week, work_schedule, study_schedule, sleep_schedule,
          wake_time, sleep_time, training_schedule, available_equipment, interruption_history_notes,
          initial_history_confirmed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          profile.name,
          profile.birthDate,
          profile.heightCm,
          biologicalSex,
          activityLevel,
          trainingExperience,
          fitnessGoal,
          targetWeightKg,
          dietaryRestrictions,
          allergies,
          profile.dietaryPreferences ?? null,
          profile.foodBudgetMonthly ?? null,
          mealsPerDay,
          trainingDaysPerWeek,
          profile.workSchedule ?? null,
          profile.studySchedule ?? null,
          profile.sleepSchedule ?? null,
          wakeTime,
          sleepTime,
          profile.trainingSchedule ?? null,
          availableEquipment,
          profile.interruptionHistoryNotes ?? null,
          profile.initialHistoryConfirmed ? 1 : 0,
          now,
          now
        ]
        );
      }

      if (changedFields.length > 0) {
        this.db.execute(
          `INSERT INTO profile_goal_history (
            id, profile_id, fitness_goal, target_weight_kg, change_kind, changed_fields, changed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `profile-goal-${randomUUID()}`,
            id,
            fitnessGoal,
            targetWeightKg,
            existing ? 'updated' : 'initial',
            JSON.stringify(changedFields),
            now
          ]
        );
      }
    });

    const saved = this.getProfile();
    if (!saved) throw new Error('Falha ao recuperar perfil após persistência.');
    return saved;
  }
}
