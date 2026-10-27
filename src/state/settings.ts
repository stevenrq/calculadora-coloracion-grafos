import { PLAYBACK_SPEEDS } from '@/lib/coloring/replay';

export type ThemePreference = 'system' | 'light' | 'dark';
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface Settings {
  theme: ThemePreference;
  /** Velocidad con la que arranca el paso a paso. */
  speed: PlaybackSpeed;
  showColorNumbers: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', speed: 1, showColorNumbers: false, haptics: true };

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings);
}

/** Lee los ajustes campo por campo: lo inválido o ausente toma su valor por defecto, nunca lanza. */
export function deserializeSettings(text: string | null): Settings {
  let parsed: unknown;
  try {
    parsed = text === null ? null : JSON.parse(text);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return DEFAULT_SETTINGS;
  const raw = parsed as Record<string, unknown>;
  return {
    theme: THEMES.find((t) => t === raw.theme) ?? DEFAULT_SETTINGS.theme,
    speed: PLAYBACK_SPEEDS.find((s) => s === raw.speed) ?? DEFAULT_SETTINGS.speed,
    showColorNumbers: typeof raw.showColorNumbers === 'boolean' ? raw.showColorNumbers : DEFAULT_SETTINGS.showColorNumbers,
    haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULT_SETTINGS.haptics,
  };
}

/** Valor para `Appearance.setColorScheme`: 'auto' quita el tema forzado y sigue al sistema. */
export function colorSchemeFor(theme: ThemePreference): 'light' | 'dark' | 'auto' {
  return theme === 'system' ? 'auto' : theme;
}
