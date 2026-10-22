import { describe, expect, it } from 'vitest';
import { getPantryExpiryReminder } from '../domain/pantry-expiry';

describe('alertas de validade da despensa', () => {
  it('avisa alimentos vencidos e com validade em até sete dias', () => {
    expect(getPantryExpiryReminder('2026-10-21', '2026-10-22')).toEqual({ status: 'expired', daysRemaining: -1 });
    expect(getPantryExpiryReminder('2026-10-22', '2026-10-22')).toEqual({ status: 'expiring', daysRemaining: 0 });
    expect(getPantryExpiryReminder('2026-10-29', '2026-10-22')).toEqual({ status: 'expiring', daysRemaining: 7 });
    expect(getPantryExpiryReminder('2026-10-30', '2026-10-22')).toEqual({ status: 'valid', daysRemaining: 8 });
  });

  it('trata validade ausente ou datas impossíveis como desconhecidas', () => {
    expect(getPantryExpiryReminder(undefined, '2026-10-22')).toEqual({ status: 'unknown' });
    expect(getPantryExpiryReminder('2026-02-30', '2026-10-22')).toEqual({ status: 'unknown' });
    expect(getPantryExpiryReminder('2026-11-01', 'not-a-date')).toEqual({ status: 'unknown' });
  });
});
