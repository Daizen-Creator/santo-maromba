export type ShapeReportUnit = 'kg' | 'cm';

export function formatShapeChange(before: number | undefined, after: number | undefined, unit: ShapeReportUnit): string {
  if (before === undefined || after === undefined || !Number.isFinite(before) || !Number.isFinite(after)) return '—';
  const change = Math.round((after - before) * 10) / 10;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`;
}

interface PrintEnvironment {
  body: Pick<HTMLElement, 'classList'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener' | 'print'>;
}

export function printShapeComparisonReport(environment: PrintEnvironment = { body: document.body, window }): void {
  const className = 'shape-report-printing';
  const cleanup = () => {
    environment.body.classList.remove(className);
    environment.window.removeEventListener('afterprint', cleanup);
  };

  environment.body.classList.add(className);
  environment.window.addEventListener('afterprint', cleanup, { once: true });
  try {
    environment.window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
