import { useCallback, useEffect, useState } from 'react';
import { MeasurementUnitPreferences } from '../../shared/types';
import { DEFAULT_MEASUREMENT_UNIT_PREFERENCES } from '../../domain/measurement-units';
import { api } from '../services/api';

export function useMeasurementUnits() {
  const [preferences, setPreferences] = useState<MeasurementUnitPreferences>(DEFAULT_MEASUREMENT_UNIT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getMeasurementUnits()
      .then(value => { if (active) setPreferences(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as unidades.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updatePreferences = useCallback(async (changes: Partial<MeasurementUnitPreferences>) => {
    const next = { ...preferences, ...changes };
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveMeasurementUnits(next);
      setPreferences(saved);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Não foi possível salvar as unidades.';
      setError(message);
      throw reason;
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  return { preferences, loading, saving, error, updatePreferences };
}
