import {
  PhysiqueProjectionInput,
  PhysiqueProjectionPoint,
  PhysiqueProjectionResult
} from '../shared/types';

const PROJECTION_MONTHS = new Set([0, 3, 6, 9, 12]);

const EXPERIENCE_RATES = {
  beginner: { bulkRate: 0.0038, leanGainKg: 0.5, recompGainKg: 0.35 },
  intermediate: { bulkRate: 0.0025, leanGainKg: 0.28, recompGainKg: 0.2 },
  advanced: { bulkRate: 0.0015, leanGainKg: 0.12, recompGainKg: 0.1 }
} as const;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function addMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const targetMonth = month - 1 + months;
  const firstDay = new Date(Date.UTC(year, targetMonth, 1));
  const lastDay = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0)).getUTCDate();
  firstDay.setUTCDate(Math.min(day, lastDay));
  return firstDay.toISOString().slice(0, 10);
}

function validateInput(input: PhysiqueProjectionInput): void {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate)
    && new Date(input.asOfDate + 'T00:00:00.000Z').toISOString().slice(0, 10) === input.asOfDate;
  if (!validDate) throw new Error('Informe uma data base válida para a projeção.');
  if (!Number.isInteger(input.age) || input.age < 18 || input.age > 100) {
    throw new Error('A projeção está disponível para adultos entre 18 e 100 anos.');
  }
  if (!Number.isFinite(input.heightCm) || input.heightCm < 100 || input.heightCm > 250) {
    throw new Error('Informe uma altura válida entre 100 e 250 cm.');
  }
  if (!Number.isFinite(input.currentWeightKg) || input.currentWeightKg < 30 || input.currentWeightKg > 350) {
    throw new Error('Informe um peso válido entre 30 e 350 kg.');
  }
  if (!Number.isFinite(input.bodyFatPct) || input.bodyFatPct < 3 || input.bodyFatPct > 60) {
    throw new Error('Informe um percentual de gordura estimado entre 3% e 60%.');
  }
  if (!Number.isFinite(input.adherencePercent) || input.adherencePercent < 0 || input.adherencePercent > 100) {
    throw new Error('A constância deve estar entre 0% e 100%.');
  }
  for (const [key, value] of Object.entries(input.measurements)) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 300)) {
      throw new Error('A medida ' + key + ' deve ser maior que zero e menor que 300 cm.');
    }
  }
}

function makePoint(
  input: PhysiqueProjectionInput,
  months: number,
  weightKg: number,
  leanMassKg: number,
  fatMassKg: number,
  cumulativeLeanDelta: number,
  cumulativeFatDelta: number
): PhysiqueProjectionPoint {
  const heightM = input.heightCm / 100;
  const waistCm = input.measurements.waistCm === undefined
    ? undefined
    : Math.max(1, input.measurements.waistCm + cumulativeFatDelta * 0.7 + cumulativeLeanDelta * 0.08);
  const shouldersCm = input.measurements.shouldersCm === undefined
    ? undefined
    : Math.max(1, input.measurements.shouldersCm + cumulativeLeanDelta * 0.55 + cumulativeFatDelta * 0.22);

  return {
    months,
    targetDate: addMonths(input.asOfDate, months),
    weightKg: round(weightKg),
    leanMassKg: round(leanMassKg),
    fatMassKg: round(fatMassKg),
    bodyFatPct: round((fatMassKg / weightKg) * 100, 1),
    ffmi: round(leanMassKg / (heightM * heightM), 1),
    shouldersCm: shouldersCm === undefined ? undefined : round(shouldersCm),
    chestCm: input.measurements.chestCm === undefined
      ? undefined : round(input.measurements.chestCm + cumulativeLeanDelta * 0.7 + cumulativeFatDelta * 0.25),
    armCm: input.measurements.armCm === undefined
      ? undefined : round(input.measurements.armCm + cumulativeLeanDelta * 0.32 + cumulativeFatDelta * 0.12),
    waistCm: waistCm === undefined ? undefined : round(waistCm),
    thighCm: input.measurements.thighCm === undefined
      ? undefined : round(input.measurements.thighCm + cumulativeLeanDelta * 0.42 + cumulativeFatDelta * 0.2),
    shoulderWaistRatio: shouldersCm !== undefined && waistCm !== undefined && waistCm > 0
      ? round(shouldersCm / waistCm, 2) : undefined
  };
}

/**
 * Produces a transparent 12-month scenario. Rates are deliberately conservative,
 * adherence-scaled heuristics; they are not a clinical assessment or a promise.
 */
export function calculatePhysiqueProjection(input: PhysiqueProjectionInput): PhysiqueProjectionResult {
  validateInput(input);

  const rates = EXPERIENCE_RATES[input.trainingExperience];
  const adherence = input.adherencePercent / 100;
  const ageFactor = Math.max(0.72, 1 - Math.max(0, input.age - 35) * 0.006);
  let fatMassKg = input.currentWeightKg * input.bodyFatPct / 100;
  let leanMassKg = input.currentWeightKg - fatMassKg;
  let weightKg = input.currentWeightKg;
  let cumulativeLeanDelta = 0;
  let cumulativeFatDelta = 0;
  const points: PhysiqueProjectionPoint[] = [makePoint(
    input, 0, weightKg, leanMassKg, fatMassKg, cumulativeLeanDelta, cumulativeFatDelta
  )];

  for (let month = 1; month <= 12; month += 1) {
    let leanDelta = 0;
    let fatDelta = 0;

    if (input.goal === 'muscle_gain') {
      const totalGain = weightKg * rates.bulkRate * adherence;
      const leanGain = Math.min(rates.leanGainKg * ageFactor * adherence, totalGain * 0.72);
      leanDelta = leanGain;
      fatDelta = Math.max(0, totalGain - leanGain);
    } else if (input.goal === 'recomposition') {
      leanDelta = Math.min(rates.recompGainKg * ageFactor * adherence, fatMassKg * 0.02 * adherence);
      fatDelta = -Math.min(fatMassKg * 0.022 * adherence, 0.45 * adherence);
    } else {
      const requestedLoss = Math.min(weightKg * 0.015, fatMassKg * 0.045) * adherence;
      const minimumFatMass = weightKg * 0.05;
      const allowedFatLoss = Math.max(0, fatMassKg - minimumFatMass);
      const fatLossShare = Math.min(0.94, 0.86 + input.bodyFatPct * 0.001);
      fatDelta = -Math.min(allowedFatLoss, requestedLoss * fatLossShare);
      leanDelta = -(requestedLoss - Math.abs(fatDelta));
    }

    leanMassKg = Math.max(0, leanMassKg + leanDelta);
    fatMassKg = Math.max(0, fatMassKg + fatDelta);
    weightKg = leanMassKg + fatMassKg;
    cumulativeLeanDelta += leanDelta;
    cumulativeFatDelta += fatDelta;

    if (PROJECTION_MONTHS.has(month)) {
      points.push(makePoint(
        input, month, weightKg, leanMassKg, fatMassKg, cumulativeLeanDelta, cumulativeFatDelta
      ));
    }
  }

  return {
    input: { ...input, measurements: { ...input.measurements } },
    points,
    assumptions: [
      'Cenário heurístico de 12 meses baseado em experiência de treino, objetivo e constância informada.',
      'Pressupõe consistência aproximada na alimentação, treino e descanso; resultados reais variam.',
      'Medidas de circunferência são aproximações proporcionais e não substituem medições reais.',
      'FFMI e relação ombro/cintura são descritores; não representam diagnóstico nem padrão estético universal.'
    ]
  };
}
