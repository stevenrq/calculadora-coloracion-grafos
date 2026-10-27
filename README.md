# ColorGrafos

Aplicación móvil para Android del curso de **Teoría de Grafos**: calcula y explica la **coloración de grafos**
y el **número cromático χ(G)**. Funciona **sin internet**: todos los cálculos se hacen en el celular.

## Qué hace

- **Dibujo con gestos:** toca el lienzo para crear un vértice, toca dos vértices para unirlos, arrastra para
  mover, pellizca para hacer zoom. Deshacer/rehacer, renombrar, borrar y reorganizar.
- **Vista Texto:** escribe el grafo como lista de aristas (`A-B, B-C`) o lista de adyacencia (`A: B, C`), con
  errores y avisos en vivo.
- **Colorear:** DSATUR, Welsh-Powell, Greedy y búsqueda exacta por backtracking. χ(G) se calcula siempre con
  búsqueda exacta en segundo plano y se marca **Exacto** solo cuando está demostrado (si no, **Cota superior**).
- **Explicaciones:** cotas (clique, Δ+1, Brooks), bipartición con el ciclo impar resaltado, componentes, grados,
  clases de color y un **reproductor paso a paso** con la tabla de saturación de DSATUR.
- **Mis grafos:** ejemplos listos (C₅, K₃,₃, Petersen, ruedas, cubo Q₃, exámenes…).
- **Autoguardado:** el grafo se conserva al cerrar la app.

## Requisitos

- Node.js 20 o superior.
- Para probar en el celular durante el desarrollo: la app **Expo Go** (Play Store).

## Correr en modo desarrollo

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go (el celular y el computador deben estar en la misma red).

## Pruebas y revisión

```bash
npx jest          # pruebas unitarias (algoritmos, análisis, editor, texto)
npx tsc --noEmit  # tipos
npx expo lint     # estilo
```

## Generar el APK instalable

El APK se compila en la nube con EAS (no hace falta Android Studio):

1. Crea una cuenta gratuita en <https://expo.dev/signup>.
2. Inicia sesión: `npx eas-cli@latest login`.
3. Compila: `npx eas-cli@latest build -p android --profile preview`
   (acepta vincular el proyecto y generar el keystore la primera vez).
4. Al terminar, EAS muestra un enlace y un QR para descargar el `.apk`. Instálalo en el celular permitiendo
   "instalar apps de fuentes desconocidas".

## Estructura

- `src/app/` — pantallas (Expo Router): `index.tsx` (Colorear) y `graphs.tsx` (Mis grafos).
- `src/components/` — lienzo, barras, editor de texto y la hoja de resultados (`results/`).
- `src/lib/` — lógica pura y probada: modelo de grafo, texto, layouts, análisis y algoritmos de coloración.
- `src/state/` — reducer del editor (con deshacer/rehacer) y autoguardado.
- `docs/superpowers/` — diseño y planes de implementación.
