import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * La fecha actual, renovada al volver a la pantalla o a la app. Un `new Date()` suelto en el render no sirve: el
 * React Compiler lo memoiza y, como las pestañas siguen montadas, "Hoy" seguiría diciéndolo pasada la medianoche.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  // useFocusEffect repite el efecto cada vez que cambia la función: tiene que ser estable.
  useFocusEffect(useCallback(() => setNow(new Date()), []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);
  return now;
}
