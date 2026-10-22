import { MeasurementUnitPreferences } from '../shared/types';

export const DEFAULT_MEASUREMENT_UNIT_PREFERENCES: MeasurementUnitPreferences = {
  foodMassUnit: 'g',
  waterVolumeUnit: 'ml'
};

export const gramsToDisplayMass = (grams: number, unit: MeasurementUnitPreferences['foodMassUnit']): number =>
  unit === 'kg' ? grams / 1000 : grams;

export const displayMassToGrams = (amount: number, unit: MeasurementUnitPreferences['foodMassUnit']): number =>
  unit === 'kg' ? amount * 1000 : amount;

export const millilitersToDisplayVolume = (milliliters: number, unit: MeasurementUnitPreferences['waterVolumeUnit']): number =>
  unit === 'l' ? milliliters / 1000 : milliliters;

export const displayVolumeToMilliliters = (amount: number, unit: MeasurementUnitPreferences['waterVolumeUnit']): number =>
  unit === 'l' ? amount * 1000 : amount;

export const formatFoodMass = (grams: number, unit: MeasurementUnitPreferences['foodMassUnit']): string =>
  `${gramsToDisplayMass(grams, unit).toLocaleString('pt-BR', {
    maximumFractionDigits: unit === 'kg' ? 4 : 1
  })} ${unit}`;

export const formatWaterVolume = (milliliters: number, unit: MeasurementUnitPreferences['waterVolumeUnit']): string =>
  `${millilitersToDisplayVolume(milliliters, unit).toLocaleString('pt-BR', {
    maximumFractionDigits: unit === 'l' ? 2 : 0
  })} ${unit === 'l' ? 'L' : 'mL'}`;
