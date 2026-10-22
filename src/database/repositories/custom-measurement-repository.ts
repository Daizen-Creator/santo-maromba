import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import {
  CustomBodyMeasurements,
  CustomMeasurementDefinition,
  CustomMeasurementRecord,
  SaveCustomMeasurementDefinitionInput,
  SaveCustomMeasurementInput
} from '../../shared/types';
import {
  SaveCustomMeasurementDefinitionInputSchema,
  SaveCustomMeasurementInputSchema
} from '../../shared/schema';

export class CustomMeasurementRepository {
  constructor(private readonly db: IDatabase) {}

  getAll(): CustomBodyMeasurements {
    const definitions = this.db.query<any>('SELECT * FROM custom_measurement_definitions ORDER BY name COLLATE NOCASE').map(row => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      createdAt: row.created_at
    } satisfies CustomMeasurementDefinition));
    const records = this.db.query<any>('SELECT * FROM custom_measurements ORDER BY date DESC, created_at DESC').map(row => ({
      id: row.id,
      definitionId: row.definition_id,
      date: row.date,
      value: Number(row.value),
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies CustomMeasurementRecord));
    return { definitions, records };
  }

  saveDefinition(rawInput: SaveCustomMeasurementDefinitionInput): CustomMeasurementDefinition {
    const input = SaveCustomMeasurementDefinitionInputSchema.parse(rawInput);
    const normalizedName = input.name.normalize('NFC').toLocaleLowerCase('pt-BR');
    if (this.getAll().definitions.some(item => item.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe uma medida personalizada com esse nome.');
    }
    const definition: CustomMeasurementDefinition = {
      id: `custom-measure-${randomUUID()}`,
      ...input,
      createdAt: new Date().toISOString()
    };
    this.db.execute(
      'INSERT INTO custom_measurement_definitions (id, name, unit, created_at) VALUES (?, ?, ?, ?)',
      [definition.id, definition.name, definition.unit, definition.createdAt]
    );
    return definition;
  }

  saveValue(rawInput: SaveCustomMeasurementInput): CustomMeasurementRecord {
    const input = SaveCustomMeasurementInputSchema.parse(rawInput);
    const definition = this.db.queryOne('SELECT 1 FROM custom_measurement_definitions WHERE id = ?', [input.definitionId]);
    if (!definition) throw new Error('A medida personalizada selecionada não existe.');
    const existing = this.db.queryOne<any>(
      'SELECT id, created_at FROM custom_measurements WHERE definition_id = ? AND date = ?',
      [input.definitionId, input.date]
    );
    const now = new Date().toISOString();
    const record: CustomMeasurementRecord = {
      id: existing?.id || `custom-measure-value-${randomUUID()}`,
      ...input,
      createdAt: existing?.created_at || now,
      updatedAt: now
    };
    this.db.execute(
      `INSERT INTO custom_measurements (id, definition_id, date, value, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(definition_id, date) DO UPDATE SET value = excluded.value,
         notes = excluded.notes, updated_at = excluded.updated_at`,
      [record.id, record.definitionId, record.date, record.value, record.notes || null, record.createdAt, record.updatedAt]
    );
    return record;
  }
}
