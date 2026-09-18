import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.ts';

interface Settings {
  providerLabel: string;
  modelName: string;
  apiBaseUrl: string;
  apiTokenSet: boolean;
  apiTokenPreview: string;
  apiFormat: 'openai' | 'anthropic' | 'other';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  autoApproveReads: boolean;
  autoApproveWrites: boolean;
  autoApproveCommands: boolean;
  commandTimeoutMs: number;
  theme: 'dark' | 'light';
  customHeaders: Record<string, string>;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.settings.get();
      setSettings(data as unknown as Settings);
    } catch {
      // Settings not loaded yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateSettings = async (updates: Partial<Settings>) => {
    await api.settings.update(updates);
    await refreshSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
