import { colorSchemeFor, DEFAULT_SETTINGS, deserializeSettings, type Settings, serializeSettings } from '../settings';

describe('deserializeSettings', () => {
  it('sin nada guardado o con JSON inválido devuelve los valores por defecto', () => {
    expect(deserializeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(deserializeSettings('no json')).toEqual(DEFAULT_SETTINGS);
    expect(deserializeSettings('[1, 2]')).toEqual(DEFAULT_SETTINGS);
  });

  it('conserva los campos válidos', () => {
    const text = '{"theme":"dark","speed":2,"showColorNumbers":true,"haptics":false}';
    expect(deserializeSettings(text)).toEqual({ theme: 'dark', speed: 2, showColorNumbers: true, haptics: false });
  });

  it('cada campo inválido o ausente vuelve a su valor por defecto', () => {
    expect(deserializeSettings('{"theme":"azul","speed":3,"haptics":"sí"}')).toEqual({
      theme: 'system',
      speed: 1,
      showColorNumbers: false,
      haptics: true,
    });
  });

  it('ida y vuelta conserva los ajustes', () => {
    const s: Settings = { theme: 'light', speed: 0.25, showColorNumbers: true, haptics: false };
    expect(deserializeSettings(serializeSettings(s))).toEqual(s);
  });
});

describe('colorSchemeFor', () => {
  it('sistema sigue al sistema; claro y oscuro se fuerzan', () => {
    expect(colorSchemeFor('system')).toBe('auto');
    expect(colorSchemeFor('light')).toBe('light');
    expect(colorSchemeFor('dark')).toBe('dark');
  });
});
