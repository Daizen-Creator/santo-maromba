import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { ShapeMilestone, ShapeMilestoneInput } from '../../shared/types';
import { ShapeMilestoneIdSchema, ShapeMilestoneInputSchema } from '../../shared/schema';

export class ShapeMilestoneRepository {
  constructor(private readonly db: IDatabase, private readonly now: () => Date = () => new Date()) {}

  getAll(): ShapeMilestone[] {
    return this.db.query<any>(
      `SELECT * FROM shape_milestones
       ORDER BY CASE WHEN target_date IS NULL THEN 1 ELSE 0 END, target_date, created_at DESC`
    ).map(row => ({
      id: row.id,
      title: row.title,
      metric: row.metric,
      targetValue: Number(row.target_value),
      direction: row.direction,
      targetDate: row.target_date || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  save(rawInput: ShapeMilestoneInput): ShapeMilestone {
    const input = ShapeMilestoneInputSchema.parse(rawInput);
    const now = this.now().toISOString();
    const id = input.id ?? `shape-milestone-${randomUUID()}`;
    const existing = input.id
      ? this.db.queryOne<{ id: string; created_at: string }>('SELECT id, created_at FROM shape_milestones WHERE id = ?', [input.id])
      : undefined;
    if (input.id && !existing) throw new Error('Este marco não existe mais. Atualize a lista antes de editar.');

    if (existing) {
      this.db.execute(
        `UPDATE shape_milestones SET title = ?, metric = ?, target_value = ?, direction = ?, target_date = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [input.title, input.metric, input.targetValue, input.direction, input.targetDate ?? null, input.notes || null, now, id]
      );
    } else {
      this.db.execute(
        `INSERT INTO shape_milestones (id, title, metric, target_value, direction, target_date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.title, input.metric, input.targetValue, input.direction, input.targetDate ?? null, input.notes || null, now, now]
      );
    }
    const saved = this.getAll().find(item => item.id === id);
    if (!saved) throw new Error('Não foi possível carregar o marco salvo.');
    return saved;
  }

  delete(rawId: string): void {
    const id = ShapeMilestoneIdSchema.parse(rawId);
    const result = this.db.execute('DELETE FROM shape_milestones WHERE id = ?', [id]);
    if (result.changes === 0) throw new Error('Este marco já foi removido.');
  }
}
