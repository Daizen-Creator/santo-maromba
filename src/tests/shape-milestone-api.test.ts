import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../renderer/services/api';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('marcos do shape na PWA offline', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('salva, edita, reabre e exclui os marcos no armazenamento local', async () => {
    const saved = await api.saveShapeMilestone({ title: 'Reduzir cintura', metric: 'waistCircCm', targetValue: 82, direction: 'decrease' });
    expect((await api.getShapeMilestones())[0]).toEqual(saved);
    const updated = await api.saveShapeMilestone({ id: saved.id, title: saved.title, metric: saved.metric, targetValue: 80, direction: saved.direction, targetDate: '2027-02-01' });
    expect((await api.getShapeMilestones())[0]).toMatchObject({ id: saved.id, targetValue: 80, targetDate: '2027-02-01' });
    await expect(api.saveShapeMilestone({ id: 'shape-milestone-missing', title: saved.title, metric: saved.metric, targetValue: 80, direction: saved.direction, targetDate: '2027-02-01' })).rejects.toThrow('não existe mais');
    await api.deleteShapeMilestone(updated.id);
    expect(await api.getShapeMilestones()).toEqual([]);
  });
});
