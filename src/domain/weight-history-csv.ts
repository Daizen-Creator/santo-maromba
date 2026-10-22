import { WeightRecord } from '../shared/types';

function csvCell(value: string): string {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function displayDate(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function buildWeightHistoryCsv(records: WeightRecord[]): string {
  const lines = [
    ['Data', 'Peso (kg)', 'Origem', 'Observações'].map(csvCell).join(';'),
    ...[...records]
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      .map(record => [
        displayDate(record.date),
        record.weightKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        record.source === 'verified' ? 'Medição verificada' : 'Relato do usuário',
        record.notes || ''
      ].map(csvCell).join(';'))
  ];

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
