import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { useSettings } from '@/state/settings-context';

/**
 * La API recomendada en Android: no usa el vibrador ni necesita el permiso VIBRATE. Confirm existe desde Android 11;
 * en versiones anteriores el módulo la rechaza y se usa Context_Click, que está en todas.
 */
export async function creationHaptic(perform = Haptics.performAndroidHapticsAsync): Promise<void> {
  try {
    await perform(Haptics.AndroidHaptics.Confirm);
  } catch {
    await perform(Haptics.AndroidHaptics.Context_Click).catch(() => {
      // Sin soporte háptico no hay nada que avisar: crear el vértice ya se ve en pantalla.
    });
  }
}

/** Vibración breve cada vez que sube `created` (se creó un vértice o una arista), si está activada en Ajustes. */
export function useCreationHaptics(created: number) {
  const { settings } = useSettings();
  const last = useRef(created);

  useEffect(() => {
    if (created === last.current) return;
    last.current = created;
    if (!settings.haptics) return;
    void creationHaptic();
  }, [created, settings.haptics]);
}
