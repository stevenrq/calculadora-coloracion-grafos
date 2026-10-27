import Storage from 'expo-sqlite/kv-store';
import { createContext, type ReactNode, use, useEffect, useRef, useState } from 'react';
import { Appearance } from 'react-native';

import { colorSchemeFor, DEFAULT_SETTINGS, deserializeSettings, type Settings, serializeSettings } from './settings';

const SETTINGS_KEY = 'settings:v1';

interface SettingsValue {
  settings: Settings;
  update(patch: Partial<Settings>): void;
  /** La pantalla de Ajustes está abierta. */
  open: boolean;
  setOpen(open: boolean): void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

function initialSettings(): Settings {
  try {
    return deserializeSettings(Storage.getItemSync(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Ajustes de la app, persistidos tras cada cambio; el tema se aplica a toda la app (también a lo nativo). */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);
  const [open, setOpen] = useState(false);
  // Igual que los guardados: lo leído al abrir no se reescribe.
  const loaded = useRef(settings);

  useEffect(() => {
    Appearance.setColorScheme(colorSchemeFor(settings.theme));
  }, [settings.theme]);

  useEffect(() => {
    if (settings === loaded.current) return;
    try {
      Storage.setItemSync(SETTINGS_KEY, serializeSettings(settings));
    } catch (error) {
      console.warn('No se pudieron guardar los ajustes', error);
    }
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch }));

  return <SettingsContext value={{ settings, update, open, setOpen }}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = use(SettingsContext);
  if (!value) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return value;
}
