import { describe, expect, it } from 'vitest';
import { buildWeightHistoryCsv } from '../domain/weight-history-csv';
import { WeightRecord } from '../shared/types';

const record = (input: Partial<WeightRecord> & Pick<WeightRecord, 'id' | 'date' | 'weightKg'>): WeightRecord => ({
  source: 'verified',
  createdAt: `${input.date}T12:00:00.000Z`,
  ...input
});

describe('exportação do histórico de peso em CSV', () => {
  it('inclui registros reais em ordem cronológica com origem e formatação brasileira', () => {
    const csv = buildWeightHistoryCsv([
      record({ id: 'later', date: '2026-10-22', weightKg: 79.65, source: 'self_reported', notes: 'Após o treino' }),
      record({ id: 'earlier', date: '2026-10-20', weightKg: 82, notes: 'Balança doméstica' })
    ]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Data";"Peso (kg)";"Origem";"Observações"');
    expect(csv.indexOf('"20/10/2026"')).toBeLessThan(csv.indexOf('"22/10/2026"'));
    expect(csv).toContain('"82,0";"Medição verificada";"Balança doméstica"');
    expect(csv).toContain('"79,7";"Relato do usuário";"Após o treino"');
  });

  it('escapa delimitadores, aspas e prefixa notas que poderiam virar fórmula em planilhas', () => {
    const csv = buildWeightHistoryCsv([
      record({ id: 'note', date: '2026-10-22', weightKg: 80, notes: '=HYPERLINK("https://example.com";"abrir")' })
    ]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"";""abrir"")"');
  });
});
