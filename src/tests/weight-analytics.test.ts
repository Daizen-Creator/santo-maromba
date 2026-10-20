import { describe, it, expect } from 'vitest';
import {
  calculateMovingAverages,
  calculateWeightDeltas,
  calculateWeightProgress,
  generateDataFreshnessAlerts
} from '../domain/weight-analytics';
import { WeightRecord } from '../shared/types';

describe('Análise de Peso e Média Móvel — Regras de Negócio', () => {
  const mockRecords: WeightRecord[] = [
    {
      id: '1',
      date: '2026-10-01',
      weightKg: 70.0,
      source: 'verified',
      createdAt: '2026-10-01T10:00:00Z'
    },
    {
      id: '2',
      date: '2026-10-03',
      weightKg: 70.5,
      source: 'verified',
      createdAt: '2026-10-03T10:00:00Z'
    },
    {
      id: '3',
      date: '2026-10-06',
      weightKg: 71.0,
      source: 'verified',
      createdAt: '2026-10-06T10:00:00Z'
    },
    {
      id: '4',
      date: '2026-10-10',
      weightKg: 71.5,
      source: 'verified',
      createdAt: '2026-10-10T10:00:00Z'
    }
  ];

  it('deve calcular a média móvel de 7 dias com janela deslizante correta', () => {
    const ma = calculateMovingAverages(mockRecords);
    expect(ma).toHaveLength(4);

    // Registro 1: apenas ele mesmo na janela de 7 dias -> 70.0
    expect(ma[0].movingAverage7d).toBe(70.0);

    // Registro 2 (dia 3): registros de dia 1 e dia 3 na janela -> (70.0 + 70.5)/2 = 70.25
    expect(ma[1].movingAverage7d).toBe(70.25);

    // Registro 3 (dia 6): dias 1, 3 e 6 estão na janela de 7 dias -> (70 + 70.5 + 71)/3 = 70.5
    expect(ma[2].movingAverage7d).toBe(70.5);

    // Registro 4 (dia 10): dias 3, 6 e 10 estão na janela (dia 1 foi há 9 dias, excluído) -> (70.5 + 71 + 71.5)/3 = 71.0
    expect(ma[3].movingAverage7d).toBe(71.0);
  });

  it('deve calcular variações de peso recentes', () => {
    const deltas = calculateWeightDeltas(mockRecords);
    expect(deltas.currentWeightKg).toBe(71.5);
    expect(deltas.movingAverage7dKg).toBe(71.0);
  });

  it('deve alertar quando não houver pesagem recente nos últimos 7 dias', () => {
    const oldRecord: WeightRecord = {
      id: 'old',
      date: '2026-10-01',
      weightKg: 72.0,
      source: 'verified',
      createdAt: '2026-10-01T10:00:00Z'
    };

    const refDate = new Date('2026-10-19'); // 18 dias depois
    const alerts = generateDataFreshnessAlerts(oldRecord, refDate);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toContain('18 dias');
  });

  it('deve calcular porcentagem de progresso em direção à meta', () => {
    // Início: 60 kg, Atual: 70 kg, Meta: 80 kg -> 10 kg percorridos de 20 kg = 50%
    const progress = calculateWeightProgress(60, 70, 80);
    expect(progress).toBe(50);

    // Quando atinge a meta: 80 kg
    const complete = calculateWeightProgress(60, 80, 80);
    expect(complete).toBe(100);
  });
});
