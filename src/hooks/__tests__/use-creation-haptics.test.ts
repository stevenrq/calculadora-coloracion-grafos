import { AndroidHaptics } from 'expo-haptics';

import { creationHaptic } from '@/hooks/use-creation-haptics';

/** Simula el módulo nativo: rechaza los tipos que el Android del teléfono no tiene. */
function fakePerform(unsupported: AndroidHaptics[]) {
  const calls: AndroidHaptics[] = [];
  const perform = async (type: AndroidHaptics) => {
    calls.push(type);
    if (unsupported.includes(type)) throw new Error(`HapticTypeNotSupportedException: ${type}`);
  };
  return { calls, perform };
}

describe('creationHaptic', () => {
  test('en Android 11 o más usa Confirm', async () => {
    const { calls, perform } = fakePerform([]);
    await creationHaptic(perform);
    expect(calls).toEqual([AndroidHaptics.Confirm]);
  });

  test('si el sistema no tiene Confirm (Android 10 o menos), vibra con Context_Click', async () => {
    const { calls, perform } = fakePerform([AndroidHaptics.Confirm]);
    await creationHaptic(perform);
    expect(calls).toEqual([AndroidHaptics.Confirm, AndroidHaptics.Context_Click]);
  });

  test('sin ningún tipo háptico no lanza', async () => {
    const { perform } = fakePerform([AndroidHaptics.Confirm, AndroidHaptics.Context_Click]);
    await expect(creationHaptic(perform)).resolves.toBeUndefined();
  });
});
