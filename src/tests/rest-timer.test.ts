import { describe, expect, it } from 'vitest';
import { formatRestTime, remainingRestSeconds } from '../domain/rest-timer';

describe('Cronômetro de descanso', () => {
  it('conta regressivamente sem mostrar tempo negativo', () => {
    expect(remainingRestSeconds(90_000, 1_000)).toBe(89);
    expect(remainingRestSeconds(10_000, 10_000)).toBe(0);
    expect(remainingRestSeconds(5_000, 6_500)).toBe(0);
  });

  it('formata minutos e segundos para o painel de descanso', () => {
    expect(formatRestTime(90)).toBe('01:30');
    expect(formatRestTime(0)).toBe('00:00');
    expect(formatRestTime(Number.NaN)).toBe('00:00');
  });
});
