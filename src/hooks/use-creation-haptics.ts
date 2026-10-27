import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { useSettings } from '@/state/settings-context';

/** Vibración breve cada vez que sube `created` (se creó un vértice o una arista), si está activada en Ajustes. */
export function useCreationHaptics(created: number) {
  const { settings } = useSettings();
  const last = useRef(created);

  useEffect(() => {
    if (created === last.current) return;
    last.current = created;
    if (!settings.haptics) return;
    // La API recomendada en Android: no usa el vibrador ni necesita el permiso VIBRATE.
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(() => {
      // Sin soporte háptico no hay nada que avisar: crear el vértice ya se ve en pantalla.
    });
  }, [created, settings.haptics]);
}
