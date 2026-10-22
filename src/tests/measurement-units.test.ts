import { describe, expect, it } from 'vitest';
import {
  displayMassToGrams,
  displayVolumeToMilliliters,
  formatFoodMass,
  formatWaterVolume,
  gramsToDisplayMass,
  millilitersToDisplayVolume
} from '../domain/measurement-units';

describe('Conversão de unidades de porções e hidratação', () => {
  it('converte massa entre gramas e quilogramas sem perder a unidade-base', () => {
    expect(gramsToDisplayMass(250, 'kg')).toBe(0.25);
    expect(displayMassToGrams(0.25, 'kg')).toBe(250);
    expect(displayMassToGrams(250, 'g')).toBe(250);
    expect(formatFoodMass(250, 'kg')).toBe('0,25 kg');
  });

  it('converte volume entre mililitros e litros sem alterar o total persistido', () => {
    expect(millilitersToDisplayVolume(1500, 'l')).toBe(1.5);
    expect(displayVolumeToMilliliters(1.5, 'l')).toBe(1500);
    expect(displayVolumeToMilliliters(1500, 'ml')).toBe(1500);
    expect(formatWaterVolume(1500, 'l')).toBe('1,5 L');
  });
});
