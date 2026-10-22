import { IDatabase } from '../driver';
import { DEFAULT_VISUAL_CUSTOMIZATION } from '../../domain/visual-customization';
import {
  CustomizationMediaInput,
  CustomizationMediaKind,
  CustomizationMediaRecord,
  MeasurementUnitPreferences,
  VisualCustomization
} from '../../shared/types';
import { MeasurementUnitPreferencesSchema, VisualCustomizationSchema } from '../../shared/schema';
import { DEFAULT_MEASUREMENT_UNIT_PREFERENCES } from '../../domain/measurement-units';

interface MediaRow {
  id: string;
  file_name: string;
  mime_type: CustomizationMediaInput['mimeType'];
  kind: CustomizationMediaKind;
  file_path: string;
  created_at: string;
}

export class CustomizationRepository {
  constructor(private readonly db: IDatabase) {}

  getConfig(): VisualCustomization {
    const row = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?', ['visual_customization']
    );
    if (!row) return structuredClone(DEFAULT_VISUAL_CUSTOMIZATION);
    try {
      return VisualCustomizationSchema.parse(JSON.parse(row.value));
    } catch {
      return structuredClone(DEFAULT_VISUAL_CUSTOMIZATION);
    }
  }

  saveConfig(config: VisualCustomization): VisualCustomization {
    this.db.execute(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['visual_customization', JSON.stringify(config), new Date().toISOString()]
    );
    return config;
  }

  getMeasurementUnits(): MeasurementUnitPreferences {
    const row = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?', ['measurement_units']
    );
    if (!row) return { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    try {
      return MeasurementUnitPreferencesSchema.parse(JSON.parse(row.value));
    } catch {
      return { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    }
  }

  saveMeasurementUnits(rawPreferences: MeasurementUnitPreferences): MeasurementUnitPreferences {
    const preferences = MeasurementUnitPreferencesSchema.parse(rawPreferences);
    this.db.execute(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['measurement_units', JSON.stringify(preferences), new Date().toISOString()]
    );
    return preferences;
  }

  addMedia(input: CustomizationMediaInput, id: string, filePath: string, createdAt: string): CustomizationMediaRecord {
    this.db.execute(
      `INSERT INTO customization_media (id, file_name, mime_type, kind, file_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.fileName, input.mimeType, input.kind, filePath, createdAt]
    );
    return {
      id, fileName: input.fileName, mimeType: input.mimeType, kind: input.kind,
      mediaUrl: `fittrack-customization://${encodeURIComponent(id)}`, createdAt
    };
  }

  getMedia(id: string): MediaRow | null {
    return this.db.queryOne<MediaRow>('SELECT * FROM customization_media WHERE id = ?', [id]) || null;
  }

  listMedia(): CustomizationMediaRecord[] {
    return this.db.query<MediaRow>('SELECT * FROM customization_media ORDER BY created_at DESC').map(row => ({
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      kind: row.kind,
      mediaUrl: `fittrack-customization://${encodeURIComponent(row.id)}`,
      createdAt: row.created_at
    }));
  }

  deleteMedia(id: string): void {
    this.db.execute('DELETE FROM customization_media WHERE id = ?', [id]);
  }
}
