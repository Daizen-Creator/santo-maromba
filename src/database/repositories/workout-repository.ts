import { IDatabase } from '../driver';
import { randomUUID } from 'crypto';
import { Exercise, SaveWorkoutScheduleInput, SaveWorkoutTemplateInput, WorkoutScheduleEntry, WorkoutSession, WorkoutSet, WorkoutTemplate } from '../../shared/types';
import { SaveWorkoutScheduleInputSchema, SaveWorkoutTemplateInputSchema } from '../../shared/schema';
import { INITIAL_EXERCISES } from '../seeds/exercise-seeds';

export class WorkoutRepository {
  constructor(private db: IDatabase) {
    this.seedExercises();
  }

  private seedExercises(): void {
    const catalog = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?',
      ['exercise_catalog_version']
    );
    if (catalog?.value === '3') return;

    this.db.transaction(() => {
      const now = new Date().toISOString();
      for (const exercise of INITIAL_EXERCISES) {
        this.db.execute(
          `INSERT INTO exercises (
            id, name, primary_muscle, secondary_muscles, equipment, difficulty,
            instructions, description, execution_tips, image_url, image_credit, youtube_url,
            common_errors, alternatives, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, primary_muscle = excluded.primary_muscle,
            secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment,
            difficulty = excluded.difficulty, instructions = excluded.instructions,
            description = excluded.description, execution_tips = excluded.execution_tips,
            image_url = excluded.image_url, image_credit = excluded.image_credit,
            youtube_url = excluded.youtube_url, common_errors = excluded.common_errors,
            alternatives = excluded.alternatives`,
          [
            exercise.id,
            exercise.name,
            exercise.primaryMuscle,
            JSON.stringify(exercise.secondaryMuscles || []),
            exercise.equipment,
            exercise.difficulty,
            exercise.instructions,
            exercise.description || exercise.instructions,
            exercise.executionTips || null,
            exercise.imageUrl || null,
            exercise.imageCredit || null,
            exercise.youtubeUrl || null,
            exercise.commonErrors || null,
            JSON.stringify(exercise.alternatives || []),
            now
          ]
        );
      }
      this.db.execute(
        `INSERT INTO app_metadata (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        ['exercise_catalog_version', '3']
      );
    });
  }

  getExercises(): Exercise[] {
    const rows = this.db.query<any>('SELECT * FROM exercises ORDER BY name ASC');
    if (rows.length === 0) return INITIAL_EXERCISES;

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      primaryMuscle: r.primary_muscle,
      secondaryMuscles: r.secondary_muscles ? JSON.parse(r.secondary_muscles) : [],
      equipment: r.equipment,
      difficulty: r.difficulty,
      instructions: r.instructions,
      description: r.description || r.instructions,
      executionTips: r.execution_tips || undefined,
      imageUrl: r.image_url || undefined,
      imageCredit: r.image_credit || undefined,
      youtubeUrl: r.youtube_url || undefined,
      commonErrors: r.common_errors || undefined,
      alternatives: r.alternatives ? JSON.parse(r.alternatives) : []
    }));
  }

  getSessions(): WorkoutSession[] {
    const sessions = this.db.query<any>('SELECT * FROM workout_sessions ORDER BY date DESC, created_at DESC');

    return sessions.map(s => {
      const setsRows = this.db.query<any>(
        `SELECT ws.*, e.name as exercise_name
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.session_id = ?
         ORDER BY ws.set_number ASC`,
        [s.id]
      );

      const sets: WorkoutSet[] = setsRows.map(set => ({
        id: set.id,
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name,
        setNumber: Number(set.set_number),
        weightKg: Number(set.weight_kg),
        reps: Number(set.reps),
        completed: Boolean(set.completed),
        rpe: set.rpe === null || set.rpe === undefined ? undefined : Number(set.rpe),
        rir: set.rir === null || set.rir === undefined ? undefined : Number(set.rir),
        isPr: Boolean(set.is_pr),
        notes: set.notes || undefined
      }));

      return {
        id: s.id,
        date: s.date,
        splitName: s.split_name,
        completed: Boolean(s.completed),
        durationMinutes: s.duration_minutes ? Number(s.duration_minutes) : undefined,
        perceivedExertion: s.perceived_exertion ? Number(s.perceived_exertion) : undefined,
        discomfortLevel: s.discomfort_level == null ? undefined : Number(s.discomfort_level),
        discomfortArea: s.discomfort_area || undefined,
        recoveryRating: s.recovery_rating == null ? undefined : Number(s.recovery_rating),
        notes: s.notes || undefined,
        sets,
        createdAt: s.created_at
      };
    });
  }

  logSession(session: {
    date: string;
    splitName: string;
    completed: boolean;
    durationMinutes?: number;
    perceivedExertion?: number;
    discomfortLevel?: number;
    discomfortArea?: string;
    recoveryRating?: number;
    notes?: string;
    sets: Array<{
      exerciseId: string;
      setNumber: number;
      weightKg: number;
      reps: number;
      completed?: boolean;
      rpe?: number;
      rir?: number;
      isPr?: boolean;
      notes?: string;
    }>;
  }): WorkoutSession {
    const sessionId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const bestSets = this.db.query<any>(
      `SELECT ws.exercise_id, ws.weight_kg, ws.reps
       FROM workout_sets ws JOIN workout_sessions s ON s.id = ws.session_id
       WHERE ws.completed = 1 ORDER BY ws.weight_kg DESC, ws.reps DESC`
    );
    const bestSetByExercise = new Map<string, { weightKg: number; reps: number }>();
    for (const row of bestSets) {
      if (!bestSetByExercise.has(row.exercise_id)) {
        bestSetByExercise.set(row.exercise_id, { weightKg: Number(row.weight_kg), reps: Number(row.reps) });
      }
    }
    const bestVolumes = this.db.query<any>(
      `SELECT ws.exercise_id, ws.session_id, SUM(ws.weight_kg * ws.reps) AS volume
       FROM workout_sets ws JOIN workout_sessions s ON s.id = ws.session_id
       WHERE ws.completed = 1 GROUP BY ws.exercise_id, ws.session_id`
    );
    const bestVolumeByExercise = new Map<string, number>();
    for (const row of bestVolumes) {
      bestVolumeByExercise.set(row.exercise_id, Math.max(
        bestVolumeByExercise.get(row.exercise_id) || 0,
        Number(row.volume)
      ));
    }
    const currentVolumeByExercise = new Map<string, number>();
    for (const set of session.sets) {
      if (set.completed === false) continue;
      currentVolumeByExercise.set(
        set.exerciseId,
        (currentVolumeByExercise.get(set.exerciseId) || 0) + set.weightKg * set.reps
      );
    }
    const volumePrExerciseIds = new Set<string>();
    for (const [exerciseId, volume] of currentVolumeByExercise) {
      if (volume > (bestVolumeByExercise.get(exerciseId) || 0)) volumePrExerciseIds.add(exerciseId);
    }
    const firstSetByExercise = new Set<string>();

    this.db.transaction(() => {
      this.db.execute(
        `INSERT INTO workout_sessions (
          id, date, split_name, completed, duration_minutes, perceived_exertion,
          discomfort_level, discomfort_area, recovery_rating, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          session.date,
          session.splitName,
          session.completed ? 1 : 0,
          session.durationMinutes || null,
          session.perceivedExertion || null,
          session.discomfortLevel ?? null,
          session.discomfortArea?.trim() || null,
          session.recoveryRating ?? null,
          session.notes || null,
          now
        ]
      );

      for (const set of session.sets) {
        const setId = `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const bestSet = bestSetByExercise.get(set.exerciseId);
        const eligibleForPr = set.completed !== false;
        const loadOrRepPr = eligibleForPr && (!bestSet || set.weightKg > bestSet.weightKg
          || (set.weightKg === bestSet.weightKg && set.reps > bestSet.reps));
        const isFirstCompletedSet = eligibleForPr && !firstSetByExercise.has(set.exerciseId);
        const isVolumePr = isFirstCompletedSet && volumePrExerciseIds.has(set.exerciseId);
        if (eligibleForPr) firstSetByExercise.add(set.exerciseId);
        const isPr = loadOrRepPr || isVolumePr;
        if (eligibleForPr && loadOrRepPr) bestSetByExercise.set(set.exerciseId, { weightKg: set.weightKg, reps: set.reps });
        this.db.execute(
          `INSERT INTO workout_sets (
            id, session_id, exercise_id, set_number, weight_kg, reps, completed, rpe, rir, is_pr, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            setId,
            sessionId,
            set.exerciseId,
            set.setNumber,
            set.weightKg,
            set.reps,
            set.completed === false ? 0 : 1,
            set.rpe ?? null,
            set.rir ?? null,
            isPr ? 1 : 0,
            set.notes || null,
            now
          ]
        );
      }
    });

    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId)!;
  }

  getExerciseHistory(exerciseId: string): WorkoutSet[] {
    const rows = this.db.query<any>(
      `SELECT ws.*, e.name as exercise_name
       FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.exercise_id = ?
       ORDER BY ws.created_at ASC`,
      [exerciseId]
    );

    return rows.map(r => ({
      id: r.id,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      setNumber: Number(r.set_number),
      weightKg: Number(r.weight_kg),
      reps: Number(r.reps),
      completed: Boolean(r.completed),
      rpe: r.rpe === null || r.rpe === undefined ? undefined : Number(r.rpe),
      rir: r.rir === null || r.rir === undefined ? undefined : Number(r.rir),
      isPr: Boolean(r.is_pr),
      notes: r.notes || undefined
    }));
  }

  getTemplates(): WorkoutTemplate[] {
    const rows = this.db.query<any>('SELECT * FROM workout_templates ORDER BY updated_at DESC, name COLLATE NOCASE');
    return rows.flatMap(row => {
      try {
        const parsed = SaveWorkoutTemplateInputSchema.safeParse({ name: row.name, plans: JSON.parse(row.plans_json) });
        return parsed.success ? [{
          id: row.id,
          name: parsed.data.name,
          plans: parsed.data.plans,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }] : [];
      } catch {
        return [];
      }
    });
  }

  saveTemplate(rawInput: SaveWorkoutTemplateInput): WorkoutTemplate {
    const input = SaveWorkoutTemplateInputSchema.parse(rawInput);
    const normalizedName = input.name.normalize('NFC').toLocaleLowerCase('pt-BR');
    const templates = this.getTemplates();
    const existing = input.id ? templates.find(template => template.id === input.id) : undefined;
    if (input.id && !existing) throw new Error('O modelo de treino selecionado não existe mais.');
    if (templates.some(template => template.id !== input.id && template.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe um modelo de treino com esse nome.');
    }
    const plannedExerciseIds = [...new Set(input.plans.flatMap(plan => plan.exercises.map(item => item.exerciseId)))];
    if (plannedExerciseIds.length === 0) throw new Error('Adicione ao menos um exercício antes de salvar o modelo.');
    for (const exerciseId of plannedExerciseIds) {
      if (!this.db.queryOne('SELECT 1 FROM exercises WHERE id = ?', [exerciseId])) {
        throw new Error(`O exercício ${exerciseId} não existe no catálogo local.`);
      }
    }

    const now = new Date().toISOString();
    const id = existing?.id || `workout-template-${randomUUID()}`;
    if (existing) {
      this.db.execute(
        'UPDATE workout_templates SET name = ?, plans_json = ?, updated_at = ? WHERE id = ?',
        [input.name, JSON.stringify(input.plans), now, id]
      );
    } else {
      this.db.execute(
        'INSERT INTO workout_templates (id, name, plans_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.name, JSON.stringify(input.plans), now, now]
      );
    }
    const saved = this.getTemplates().find(template => template.id === id);
    if (!saved) throw new Error('Não foi possível reabrir o modelo de treino salvo.');
    return saved;
  }

  getSchedule(): WorkoutScheduleEntry[] {
    const rows = this.db.query<any>('SELECT * FROM workout_schedule ORDER BY date DESC');
    return rows.flatMap(row => {
      const parsed = SaveWorkoutScheduleInputSchema.safeParse({
        date: row.date,
        kind: row.kind,
        title: row.title || undefined,
        notes: row.notes || undefined
      });
      if (!parsed.success || typeof row.id !== 'string' || typeof row.created_at !== 'string' || typeof row.updated_at !== 'string') return [];
      return [{ id: row.id, ...parsed.data, createdAt: row.created_at, updatedAt: row.updated_at }];
    });
  }

  saveScheduleEntry(rawInput: SaveWorkoutScheduleInput): WorkoutScheduleEntry {
    const input = SaveWorkoutScheduleInputSchema.parse(rawInput);
    const existing = this.db.queryOne<any>('SELECT id, created_at FROM workout_schedule WHERE date = ?', [input.date]);
    const now = new Date().toISOString();
    const entry: WorkoutScheduleEntry = {
      id: existing?.id || `workout-schedule-${randomUUID()}`,
      ...input,
      createdAt: existing?.created_at || now,
      updatedAt: now
    };
    this.db.execute(
      `INSERT INTO workout_schedule (id, date, kind, title, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET kind = excluded.kind, title = excluded.title,
         notes = excluded.notes, updated_at = excluded.updated_at`,
      [entry.id, entry.date, entry.kind, entry.title || null, entry.notes || null, entry.createdAt, entry.updatedAt]
    );
    return entry;
  }
}
