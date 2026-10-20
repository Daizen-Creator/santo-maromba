import { IDatabase } from '../driver';
import { PhotoPose, PhotoRecord } from '../../shared/types';

export interface StoredPhotoInput {
  id: string;
  date: string;
  pose: PhotoPose;
  customPoseName?: string;
  filePath: string;
  lightingNotes?: string;
  notes?: string;
  isPrimary?: boolean;
}

export class PhotoRepository {
  constructor(private readonly db: IDatabase) {}

  getAll(profileId: string = 'default-user'): PhotoRecord[] {
    return this.db.query<any>(
      'SELECT * FROM photos WHERE profile_id = ? ORDER BY date DESC, created_at DESC',
      [profileId]
    ).map(row => this.toRecord(row));
  }

  getByDate(date: string, profileId: string = 'default-user'): PhotoRecord[] {
    return this.db.query<any>(
      'SELECT * FROM photos WHERE profile_id = ? AND date = ? ORDER BY created_at ASC',
      [profileId, date]
    ).map(row => this.toRecord(row));
  }

  getById(id: string, profileId: string = 'default-user'): PhotoRecord | null {
    const row = this.db.queryOne<any>(
      'SELECT * FROM photos WHERE id = ? AND profile_id = ?',
      [id, profileId]
    );
    return row ? this.toRecord(row) : null;
  }

  addPhoto(photo: StoredPhotoInput, profileId: string = 'default-user'): PhotoRecord {
    const now = new Date().toISOString();
    this.db.execute(
      `INSERT INTO photos (
        id, profile_id, date, pose, custom_pose_name, file_path, lighting_notes, notes, is_primary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photo.id,
        profileId,
        photo.date,
        photo.pose,
        photo.customPoseName || null,
        photo.filePath,
        photo.lightingNotes || null,
        photo.notes || null,
        photo.isPrimary ? 1 : 0,
        now
      ]
    );

    return {
      id: photo.id,
      profileId,
      date: photo.date,
      pose: photo.pose,
      customPoseName: photo.customPoseName,
      filePath: photo.filePath,
      lightingNotes: photo.lightingNotes,
      notes: photo.notes,
      isPrimary: Boolean(photo.isPrimary),
      createdAt: now
    };
  }

  updateFilePath(id: string, filePath: string, profileId: string = 'default-user'): void {
    const result = this.db.execute(
      'UPDATE photos SET file_path = ? WHERE id = ? AND profile_id = ?',
      [filePath, id, profileId]
    );
    if (result.changes === 0) throw new Error('Foto não encontrada para atualizar o arquivo.');
  }

  updateNotes(id: string, notes: string, profileId: string = 'default-user'): PhotoRecord {
    const result = this.db.execute(
      'UPDATE photos SET notes = ? WHERE id = ? AND profile_id = ?',
      [notes.trim() || null, id, profileId]
    );
    if (result.changes === 0) throw new Error('Foto não encontrada para atualizar as observações.');
    const updated = this.getById(id, profileId);
    if (!updated) throw new Error('Falha ao recuperar a foto atualizada.');
    return updated;
  }

  deletePhoto(id: string, profileId: string = 'default-user'): string {
    const existing = this.getById(id, profileId);
    if (!existing) throw new Error('Foto não encontrada.');
    this.db.execute('DELETE FROM photos WHERE id = ? AND profile_id = ?', [id, profileId]);
    return existing.filePath;
  }

  private toRecord(row: any): PhotoRecord {
    return {
      id: row.id,
      profileId: row.profile_id,
      date: row.date,
      pose: row.pose,
      customPoseName: row.custom_pose_name || undefined,
      filePath: row.file_path,
      lightingNotes: row.lighting_notes || undefined,
      notes: row.notes || undefined,
      isPrimary: Boolean(row.is_primary),
      createdAt: row.created_at
    };
  }
}
