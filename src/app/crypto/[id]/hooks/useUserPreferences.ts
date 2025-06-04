import { useState, useEffect, useRef } from 'react';
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
 * Deep merge function for nested objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // @ts-ignore - TypeScript doesn't like this but it's safe
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        // @ts-ignore - TypeScript doesn't like this but it's safe
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Custom hook for managing user preferences with localStorage persistence
 */
export function useUserPreferences({
  storageKey = 'cryptoChartPrefs',
  defaultPreferences = {}
}: UseUserPreferencesOptions = {}): UseUserPreferencesReturn {
  // Only use defaults if nothing is in localStorage
  const didInit = useRef(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return deepMerge({ ...DEFAULT_PREFERENCES, ...defaultPreferences }, parsed);
        }
      } catch (error) {
        // ignore
      }
    }
    return { ...DEFAULT_PREFERENCES, ...defaultPreferences };
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }, [preferences, storageKey]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => deepMerge(prev, updates));
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
