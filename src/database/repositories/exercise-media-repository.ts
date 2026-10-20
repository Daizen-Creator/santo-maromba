import { IDatabase } from '../driver';
import { ExerciseMediaRecord } from '../../shared/types';

interface ExerciseMediaRow {
  id: string;
  exercise_id: string;
  file_name: string;
  mime_type: ExerciseMediaRecord['mimeType'];
  original_name: string;
  created_at: string;
}

const toRecord = (row: ExerciseMediaRow): ExerciseMediaRecord => ({
  id: row.id,
  exerciseId: row.exercise_id,
  mimeType: row.mime_type,
  originalName: row.original_name,
  filePath: 'fittrack-exercise://' + encodeURIComponent(row.id),
  createdAt: row.created_at
});

export class ExerciseMediaRepository {
  constructor(private db: IDatabase) {}

  add(input: {
    id: string;
    exerciseId: string;
    fileName: string;
    mimeType: ExerciseMediaRecord['mimeType'];
    originalName: string;
  }): ExerciseMediaRecord {
    const createdAt = new Date().toISOString();
    this.db.execute(
      `INSERT INTO exercise_media (id, exercise_id, file_name, mime_type, original_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, input.exerciseId, input.fileName, input.mimeType, input.originalName, createdAt]
    );
    const saved = this.getById(input.id);
    if (!saved) throw new Error('Falha ao recuperar metadados da mídia.');
    return saved;
  }

  getById(id: string): ExerciseMediaRecord | null {
    const row = this.db.queryOne<ExerciseMediaRow>('SELECT * FROM exercise_media WHERE id = ?', [id]);
    return row ? toRecord(row) : null;
  }

  getFileName(id: string): string | null {
    return this.db.queryOne<{ file_name: string }>(
      'SELECT file_name FROM exercise_media WHERE id = ?', [id]
    )?.file_name || null;
  }

  getByExercise(exerciseId: string): ExerciseMediaRecord[] {
    return this.db.query<ExerciseMediaRow>(
      'SELECT * FROM exercise_media WHERE exercise_id = ? ORDER BY created_at ASC, id ASC',
      [exerciseId]
    ).map(toRecord);
  }

  getAll(): ExerciseMediaRecord[] {
    return this.db.query<ExerciseMediaRow>(
      'SELECT * FROM exercise_media ORDER BY created_at ASC, id ASC'
    ).map(toRecord);
  }

  delete(id: string): string | null {
    const fileName = this.getFileName(id);
    if (!fileName) return null;
    this.db.execute('DELETE FROM exercise_media WHERE id = ?', [id]);
    return fileName;
  }
}
