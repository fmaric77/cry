import React, { useState } from 'react';
import { IndicatorSettings } from '../types';

interface IndicatorSettingsProps {
  settings: IndicatorSettings;
  onSettingsChange: (newSettings: IndicatorSettings) => void;
}

export function IndicatorSettingsPanel({ settings, onSettingsChange }: IndicatorSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <T extends keyof IndicatorSettings>(
    indicator: T,
    key: keyof IndicatorSettings[T],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      [indicator]: {
        ...settings[indicator],
        [key]: value
      }
    };
    onSettingsChange(newSettings);
  };

  const updateNestedSetting = <T extends keyof IndicatorSettings>(
    indicator: T,
    parentKey: string,
    childKey: string,
    value: any
  ) => {
    const newSettings = {
      ...settings,
      [indicator]: {
        ...settings[indicator],
        [parentKey]: {
          ...(settings[indicator] as any)[parentKey],
          [childKey]: value
        }
      }
    };
    onSettingsChange(newSettings);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '8px 12px',
          fontSize: 14,
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Indicators
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#111', // black background
        color: 'white', // white text
        border: '1px solid #333',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        maxHeight: '80vh',
        overflowY: 'auto',
        width: 300,
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: 'white' }}>Technical Indicators</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: 5,
            color: 'white'
          }}
        >
          ×
        </button>
      </div>

      {/* SMA Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Simple Moving Average (SMA)</label>
          <input
            type="checkbox"
            checked={settings.sma.enabled}
            onChange={(e) => updateSetting('sma', 'enabled', e.target.checked)}
          />
        </div>
        {settings.sma.enabled && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label>Period:</label>
            <input
              type="number"
              value={settings.sma.period}
              onChange={(e) => updateSetting('sma', 'period', parseInt(e.target.value))}
              style={{ width: 60, padding: 4 }}
              min="1"
              max="200"
            />
            <label>Color:</label>
            <input
              type="color"
              value={settings.sma.color}
              onChange={(e) => updateSetting('sma', 'color', e.target.value)}
              style={{ width: 40, height: 30 }}
            />
          </div>
        )}
      </div>

      {/* EMA Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Exponential Moving Average (EMA)</label>
          <input
            type="checkbox"
            checked={settings.ema.enabled}
            onChange={(e) => updateSetting('ema', 'enabled', e.target.checked)}
          />
        </div>
        {settings.ema.enabled && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label>Period:</label>
            <input
              type="number"
              value={settings.ema.period}
              onChange={(e) => updateSetting('ema', 'period', parseInt(e.target.value))}
              style={{ width: 60, padding: 4 }}
              min="1"
              max="200"
            />
            <label>Color:</label>
            <input
              type="color"
              value={settings.ema.color}
              onChange={(e) => updateSetting('ema', 'color', e.target.value)}
              style={{ width: 40, height: 30 }}
            />
          </div>
        )}
      </div>

      {/* RSI Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Relative Strength Index (RSI)</label>
          <input
            type="checkbox"
            checked={settings.rsi.enabled}
            onChange={(e) => updateSetting('rsi', 'enabled', e.target.checked)}
          />
        </div>
        {settings.rsi.enabled && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label>Period:</label>
            <input
              type="number"
              value={settings.rsi.period}
              onChange={(e) => updateSetting('rsi', 'period', parseInt(e.target.value))}
              style={{ width: 60, padding: 4 }}
              min="2"
              max="50"
            />
            <label>Color:</label>
            <input
              type="color"
              value={settings.rsi.color}
              onChange={(e) => updateSetting('rsi', 'color', e.target.value)}
              style={{ width: 40, height: 30 }}
            />
          </div>
        )}
      </div>

      {/* MACD Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>MACD</label>
          <input
            type="checkbox"
            checked={settings.macd.enabled}
            onChange={(e) => updateSetting('macd', 'enabled', e.target.checked)}
          />
        </div>
        {settings.macd.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>Fast:</label>
              <input
                type="number"
                value={settings.macd.fastPeriod}
                onChange={(e) => updateSetting('macd', 'fastPeriod', parseInt(e.target.value))}
                style={{ width: 50, padding: 4 }}
                min="1"
                max="50"
              />
              <label>Slow:</label>
              <input
                type="number"
                value={settings.macd.slowPeriod}
                onChange={(e) => updateSetting('macd', 'slowPeriod', parseInt(e.target.value))}
                style={{ width: 50, padding: 4 }}
                min="1"
                max="100"
              />
              <label>Signal:</label>
              <input
                type="number"
                value={settings.macd.signalPeriod}
                onChange={(e) => updateSetting('macd', 'signalPeriod', parseInt(e.target.value))}
                style={{ width: 50, padding: 4 }}
                min="1"
                max="50"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>MACD:</label>
              <input
                type="color"
                value={settings.macd.colors.macd}
                onChange={(e) => updateNestedSetting('macd', 'colors', 'macd', e.target.value)}
                style={{ width: 40, height: 25 }}
              />
              <label>Signal:</label>
              <input
                type="color"
                value={settings.macd.colors.signal}
                onChange={(e) => updateNestedSetting('macd', 'colors', 'signal', e.target.value)}
                style={{ width: 40, height: 25 }}
              />
              <label>Hist:</label>
              <input
                type="color"
                value={settings.macd.colors.histogram}
                onChange={(e) => updateNestedSetting('macd', 'colors', 'histogram', e.target.value)}
                style={{ width: 40, height: 25 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bollinger Bands Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Bollinger Bands</label>
          <input
            type="checkbox"
            checked={settings.bb.enabled}
            onChange={(e) => updateSetting('bb', 'enabled', e.target.checked)}
          />
        </div>
        {settings.bb.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>Period:</label>
              <input
                type="number"
                value={settings.bb.period}
                onChange={(e) => updateSetting('bb', 'period', parseInt(e.target.value))}
                style={{ width: 60, padding: 4 }}
                min="5"
                max="50"
              />
              <label>Std Dev:</label>
              <input
                type="number"
                value={settings.bb.stdDev}
                onChange={(e) => updateSetting('bb', 'stdDev', parseFloat(e.target.value))}
                style={{ width: 60, padding: 4 }}
                min="0.5"
                max="4"
                step="0.1"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>Upper:</label>
              <input
                type="color"
                value={settings.bb.colors.upper}
                onChange={(e) => updateNestedSetting('bb', 'colors', 'upper', e.target.value)}
                style={{ width: 35, height: 25 }}
              />
              <label>Mid:</label>
              <input
                type="color"
                value={settings.bb.colors.middle}
                onChange={(e) => updateNestedSetting('bb', 'colors', 'middle', e.target.value)}
                style={{ width: 35, height: 25 }}
              />
              <label>Lower:</label>
              <input
                type="color"
                value={settings.bb.colors.lower}
                onChange={(e) => updateNestedSetting('bb', 'colors', 'lower', e.target.value)}
                style={{ width: 35, height: 25 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stochastic Settings */}
      <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Stochastic Oscillator</label>
          <input
            type="checkbox"
            checked={settings.stoch.enabled}
            onChange={(e) => updateSetting('stoch', 'enabled', e.target.checked)}
          />
        </div>
        {settings.stoch.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>%K Period:</label>
              <input
                type="number"
                value={settings.stoch.kPeriod}
                onChange={(e) => updateSetting('stoch', 'kPeriod', parseInt(e.target.value))}
                style={{ width: 60, padding: 4 }}
                min="5"
                max="50"
              />
              <label>%D Period:</label>
              <input
                type="number"
                value={settings.stoch.dPeriod}
                onChange={(e) => updateSetting('stoch', 'dPeriod', parseInt(e.target.value))}
                style={{ width: 60, padding: 4 }}
                min="1"
                max="20"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label>%K Color:</label>
              <input
                type="color"
                value={settings.stoch.colors.k}
                onChange={(e) => updateNestedSetting('stoch', 'colors', 'k', e.target.value)}
                style={{ width: 40, height: 25 }}
              />
              <label>%D Color:</label>
              <input
                type="color"
                value={settings.stoch.colors.d}
                onChange={(e) => updateNestedSetting('stoch', 'colors', 'd', e.target.value)}
                style={{ width: 40, height: 25 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
