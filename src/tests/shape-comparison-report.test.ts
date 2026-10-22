import { describe, expect, it, vi } from 'vitest';
import { formatShapeChange, printShapeComparisonReport } from '../domain/shape-comparison-report';

describe('relatório de comparação física', () => {
  it('formata variação a partir de dois valores reais e mantém ausência explícita', () => {
    expect(formatShapeChange(82.4, 79.6, 'kg')).toBe('-2.8 kg');
    expect(formatShapeChange(80, 81.2, 'cm')).toBe('+1.2 cm');
    expect(formatShapeChange(undefined, 81.2, 'cm')).toBe('—');
  });

  it('abre a impressão e limpa o estado de relatório após o evento afterprint', () => {
    const classes = new Set<string>();
    const body = { classList: {
      add: vi.fn((name: string) => classes.add(name)),
      remove: vi.fn((name: string) => classes.delete(name))
    } } as unknown as HTMLElement;
    let afterPrint: (() => void) | undefined;
    const window = {
      addEventListener: vi.fn((_name: string, listener: EventListenerOrEventListenerObject) => {
        afterPrint = listener as () => void;
      }),
      removeEventListener: vi.fn(),
      print: vi.fn()
    } as unknown as Window;

    printShapeComparisonReport({ body, window });
    expect(classes.has('shape-report-printing')).toBe(true);
    expect(window.print).toHaveBeenCalledOnce();
    afterPrint?.();
    expect(classes.has('shape-report-printing')).toBe(false);
  });
});
