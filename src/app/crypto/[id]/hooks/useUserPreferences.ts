import { useState, useEffect } from 'react';
import { UserPreferences, ChartMode, TimePeriod } from '../types';
import { defaultIndicatorSettings } from '../indicators';

interface UseUserPreferencesOptions {
  storageKey?: string;
  defaultPreferences?: Partial<UserPreferences>;
}

interface UseUserPreferencesReturn extends UserPreferences {
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  selectedPeriod: '1M' as TimePeriod,
  chartMode: 'line' as ChartMode,
  zoom: 1,
  pan: 0,
  refreshRate: 10000,
  showVolume: true,
  indicators: defaultIndicatorSettings
};

/**
 * Custom hook for managing user preferences with localStorage persistence
 */
export function useUserPreferences({
  storageKey = 'cryptoChartPrefs',
  defaultPreferences = {}
}: UseUserPreferencesOptions = {}): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>({
    ...DEFAULT_PREFERENCES,
    ...defaultPreferences
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }, [storageKey]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }, [preferences, storageKey]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences({ ...DEFAULT_PREFERENCES, ...defaultPreferences });
  };

  return {
    ...preferences,
    updatePreferences,
    resetPreferences
  };
}
