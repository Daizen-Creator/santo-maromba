import { WeightAnalyticsPoint, WeightRecord } from '../shared/types';

/**
 * Calcula a média móvel de 7 dias para uma série cronológica de registros de peso.
 * Cada ponto no dia D é a média ponderada/aritmética dos registros dos últimos 7 dias.
 */
export function calculateMovingAverages(records: WeightRecord[]): WeightAnalyticsPoint[] {
  if (records.length === 0) return [];

  // Ordena os registros do mais antigo para o mais recente
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((record, index) => {
    const recordTime = new Date(record.date).getTime();
    const sevenDaysAgo = recordTime - 7 * 24 * 60 * 60 * 1000;

    // Filtra todos os registros dentro da janela dos 7 dias anteriores até o dia atual
    const windowRecords = sorted.slice(0, index + 1).filter(r => {
      const t = new Date(r.date).getTime();
      return t >= sevenDaysAgo && t <= recordTime;
    });

    let movingAverage7d: number | null = null;
    if (windowRecords.length > 0) {
      const sum = windowRecords.reduce((acc, curr) => acc + curr.weightKg, 0);
      movingAverage7d = Number((sum / windowRecords.length).toFixed(2));
    }

    return {
      date: record.date,
      weightKg: record.weightKg,
      movingAverage7d,
      source: record.source
    };
  });
}

/**
 * Calcula a variação de peso semanal e mensal com base nas médias ou medições
 */
export function calculateWeightDeltas(records: WeightRecord[]): {
  currentWeightKg: number | null;
  weeklyDeltaKg: number | null;
  monthlyDeltaKg: number | null;
  movingAverage7dKg: number | null;
} {
  if (records.length === 0) {
    return {
      currentWeightKg: null,
      weeklyDeltaKg: null,
      monthlyDeltaKg: null,
      movingAverage7dKg: null
    };
  }

  const analytics = calculateMovingAverages(records);
  const latest = analytics[analytics.length - 1];
  const latestDate = new Date(latest.date).getTime();

  const sevenDaysAgo = latestDate - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = latestDate - 30 * 24 * 60 * 60 * 1000;

  // Busca o registro mais próximo de 7 dias atrás
  let closestWeekRecord: WeightAnalyticsPoint | null = null;
  let minWeekDiff = Infinity;

  // Busca o registro mais próximo de 30 dias atrás
  let closestMonthRecord: WeightAnalyticsPoint | null = null;
  let minMonthDiff = Infinity;

  for (let i = 0; i < analytics.length - 1; i++) {
    const pt = analytics[i];
    const ptTime = new Date(pt.date).getTime();

    const weekDiff = Math.abs(ptTime - sevenDaysAgo);
    if (weekDiff < minWeekDiff) {
      minWeekDiff = weekDiff;
      closestWeekRecord = pt;
    }

    const monthDiff = Math.abs(ptTime - thirtyDaysAgo);
    if (monthDiff < minMonthDiff) {
      minMonthDiff = monthDiff;
      closestMonthRecord = pt;
    }
  }

  const weeklyDeltaKg = closestWeekRecord
    ? Number((latest.weightKg - closestWeekRecord.weightKg).toFixed(2))
    : null;

  const monthlyDeltaKg = closestMonthRecord
    ? Number((latest.weightKg - closestMonthRecord.weightKg).toFixed(2))
    : null;

  return {
    currentWeightKg: latest.weightKg,
    weeklyDeltaKg,
    monthlyDeltaKg,
    movingAverage7dKg: latest.movingAverage7d
  };
}

/**
 * Gera alertas inteligentes caso dados essenciais estejam desatualizados
 */
export function generateDataFreshnessAlerts(
  latestWeightRecord: WeightRecord | null,
  referenceDate: Date = new Date()
): string[] {
  const alerts: string[] = [];

  if (!latestWeightRecord) {
    alerts.push('Nenhum registro de peso encontrado. Registre sua pesagem atual para calibrar suas metas nutricionais.');
    return alerts;
  }

  const recordDate = new Date(latestWeightRecord.date);
  const diffDays = Math.floor((referenceDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 7) {
    alerts.push(`Sua última pesagem foi há ${diffDays} dias (${latestWeightRecord.date}). Para cálculos confiáveis de TMB e média móvel, atualize seu peso semanalmente.`);
  }

  if (latestWeightRecord.source === 'self_reported') {
    alerts.push('Seu peso mais recente é marcado como relato anterior. Registre uma medição verificada na balança para maior precisão.');
  }

  return alerts;
}

/**
 * Calcula a porcentagem de progresso em direção à meta de peso
 */
export function calculateWeightProgress(
  initialWeightKg: number | null,
  currentWeightKg: number | null,
  targetWeightKg: number | null
): number | null {
  if (initialWeightKg === null || currentWeightKg === null || targetWeightKg === null) {
    return null;
  }

  const totalDistance = Math.abs(targetWeightKg - initialWeightKg);
  if (totalDistance === 0) return 100;

  const coveredDistance = Math.abs(currentWeightKg - initialWeightKg);
  const progress = Math.min(100, Math.max(0, Math.round((coveredDistance / totalDistance) * 100)));
  return progress;
}
