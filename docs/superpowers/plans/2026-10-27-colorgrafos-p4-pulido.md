# ColorGrafos P4 — Pulido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autoguardado que no se pierde al salir de la app, Ajustes (tema, velocidad por defecto, número de color en los vértices, vibración) desde un ícono en la cabecera, vibración al crear vértices y aristas, compartir una imagen PNG del grafo coloreado, ícono y pantalla de bienvenida propios, revisión de accesibilidad y bundle final listo para el APK.

**Architecture:** Igual que P1–P3: lo que decide vive en `src/lib/` y `src/state/` como funciones puras con pruebas (autoguardador con descarga inmediata, modelo de ajustes y su deserialización tolerante, contador `created` del editor, números de color, textos de la imagen para compartir, codificador PNG del generador de íconos), y la UI solo los usa. Los ajustes son un proveedor propio con su clave en `expo-sqlite/kv-store`; el tema se aplica con `Appearance.setColorScheme`, así todo `useColorScheme` (y las pestañas nativas) lo siguen sin tocar cada pantalla. Ajustes se abre como `Modal` desde un botón compartido en la cabecera de las cuatro pestañas, igual que los diálogos que ya existen.

**Tech Stack:** Expo SDK 58, RN 0.88, React 19.3 + React Compiler, TypeScript strict, Expo Router (NativeTabs), react-native-svg, expo-sqlite kv-store, Jest (jest-expo). Dependencias nuevas, todas con `npx expo install` y documentadas en SDK 58: `expo-haptics`, `react-native-view-shot`, `expo-sharing`.

**Spec:** `docs/superpowers/specs/2026-10-26-calculadora-coloracion-grafos-design.md` (§6.3, §6.6, §7.1 Ajustes, §7.3 Compartir y Paleta, §7.5 Autoguardado, §7.7, §8.2, §8.3, §10 P4).

## Global Constraints

- Todo el texto visible en español, con tildes y signos correctos; offline; solo Android.
- Dependencias solo con `npx expo install`; `ios/` y `android/` no se tocan (CNG); el ícono y la bienvenida se configuran en `app.json`.
- Objetivos táctiles ≥ 48 dp; colores solo desde `useTheme()` (claro/oscuro); `accessibilityLabel` en todo control sin texto; `accessibilityRole`/`accessibilityState` correctos en interruptores y opciones.
- Ajustes (§7.1): tema (sistema/claro/oscuro), velocidad de animación por defecto, mostrar número de color en los vértices, vibración sí/no. Se abren desde un ícono en la cabecera, no como pestaña.
- Vibración (§6.6): breve, al crear un vértice o una arista; nunca al deshacer, cargar, mover o borrar.
- Compartir (§7.3): imagen PNG del grafo coloreado con χ y la leyenda, mediante el menú de compartir de Android.
- Paleta (§7.3): con la opción activa, cada vértice muestra el número de color además del relleno.
- Antes de cerrar cada tarea: `npx jest`, `npx tsc --noEmit`, `npx expo lint` en verde.
- Commits en español con las líneas de atribución de la sesión; nunca push.

## Review Focus

1. Tema "Oscuro" con el sistema en claro (y al revés): las cuatro pestañas, la barra nativa, los diálogos y el lienzo lo siguen al instante; volver a "Sistema" sigue al sistema otra vez; la elección sobrevive a cerrar la app. → Task 2 (deserialización y `colorSchemeFor`), revisión en Task 8.
2. Compartir con 60 vértices y más de 12 colores: la leyenda no se sale de la imagen (se resume con "y N colores más"); si la persona cierra el menú de compartir no aparece un error; si compartir no está disponible o falla, aviso en español. → Task 6.
3. Cerrar o mandar la app a segundo plano menos de 500 ms después de editar: la edición se conserva al volver a abrir. → Task 1.
4. Vibración desactivada → nada vibra; activada → solo al crear (tocar vacío crea vértice, unir dos vértices, celda de la matriz que agrega), no al deshacer, cargar ejemplo, mover, seleccionar ni con una arista repetida. → Task 5.
5. `settings:v1` corrupto, viejo o con campos de otro tipo → cada campo inválido vuelve a su valor por defecto sin tumbar la app; números de color legibles sobre colores claros (amarillo) y oscuros (índigo). → Tasks 2 y 4.

---

### Task 1: Autoguardado que se descarga al pasar a segundo plano (#10 de P1)

**Files:**
- Create: `src/state/autosaver.ts`
- Modify: `src/state/editor-context.tsx`
- Test: `src/state/__tests__/autosaver.test.ts`

**Interfaces:**
- Produces: `createAutosaver<T>(save: (value: T) => void, delayMs: number): { schedule(value: T): void; flush(): void; cancel(): void }` — `schedule` reinicia el temporizador con el último valor; `flush` guarda ya lo pendiente (si hay) y cancela el temporizador; `cancel` descarta lo pendiente.

- [ ] **Step 1: Write the failing tests** (con `jest.useFakeTimers()`): `schedule(a)` + avanzar 499 ms → no guardó; a 500 ms guardó `a` una vez. `schedule(a)`, `schedule(b)` → guarda solo `b`. `schedule(a)` + `flush()` → guarda `a` al instante y avanzar el reloj no guarda otra vez. `flush()` sin nada pendiente → no guarda. `schedule(a)` + `cancel()` → nunca guarda.
- [ ] **Step 2: Run** `npx jest src/state/__tests__/autosaver.test.ts` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `createAutosaver` y úsalo en `useAutosave`: un autoguardador por clave (en `useState(() => createAutosaver(...))`), `schedule(state.doc)` en el efecto del doc, y un efecto con `AppState.addEventListener('change', s => { if (s !== 'active') saver.flush(); })` que también hace `flush()` al desmontar.
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `fix: el autoguardado se descarga al pasar a segundo plano`

---

### Task 2: Modelo de ajustes, proveedor y tema

**Files:**
- Create: `src/state/settings.ts`, `src/state/settings-context.tsx`
- Modify: `src/app/_layout.tsx` (envolver con `SettingsProvider`, por fuera de los demás)
- Test: `src/state/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: `PLAYBACK_SPEEDS` de `src/lib/coloring/replay.ts`.
- Produces:
  - `ThemePreference = 'system' | 'light' | 'dark'`; `PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]`.
  - `Settings { theme: ThemePreference; speed: PlaybackSpeed; showColorNumbers: boolean; haptics: boolean }`; `DEFAULT_SETTINGS = { theme: 'system', speed: 1, showColorNumbers: false, haptics: true }`.
  - `serializeSettings(s): string`; `deserializeSettings(text: string | null): Settings` — campo por campo: valor válido se conserva, inválido o ausente → el de `DEFAULT_SETTINGS`; JSON inválido o `null` → `DEFAULT_SETTINGS`.
  - `colorSchemeFor(theme): 'light' | 'dark' | 'auto'` (`system` → `'auto'`).
  - `SettingsProvider`; `useSettings(): { settings: Settings; update(patch: Partial<Settings>): void; open: boolean; setOpen(open: boolean): void }`. Clave `settings:v1`; guarda tras cada cambio (no reescribe lo leído al iniciar, como `saved:v1`); aplica `Appearance.setColorScheme(colorSchemeFor(settings.theme))` en un efecto.

- [ ] **Step 1: Write the failing tests:** `deserializeSettings(null)` y `'no json'` → `DEFAULT_SETTINGS`; `{"theme":"dark","speed":2,"showColorNumbers":true,"haptics":false}` → igual; `{"theme":"azul","speed":3,"haptics":"sí"}` → `theme: 'system'`, `speed: 1`, `haptics: true`, `showColorNumbers: false`; ida y vuelta `deserializeSettings(serializeSettings(s))` igual a `s`; `colorSchemeFor` en los tres casos.
- [ ] **Step 2: Run** `npx jest src/state/__tests__/settings.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** El proveedor lee con `Storage.getItemSync('settings:v1')` dentro de `try/catch` (como `initialSaved`) y guarda con `try/catch` + `console.warn`.
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: ajustes persistentes y tema claro, oscuro o del sistema`

---

### Task 3: Pantalla de Ajustes y botón en la cabecera; velocidad por defecto

**Files:**
- Create: `src/components/settings-sheet.tsx` (`SettingsSheet`), `src/components/settings-button.tsx` (`SettingsButton`)
- Modify: `src/app/_layout.tsx` (montar `<SettingsSheet />` una vez), `src/app/index.tsx`, `src/app/precedence.tsx`, `src/app/graphs.tsx`, `src/app/learn.tsx` (botón en la cabecera), `src/components/results/step-player.tsx`

**Interfaces:**
- Consumes: `useSettings`, `SegmentedControl`, `speedLabel`, `PLAYBACK_SPEEDS`.
- Produces: `SettingsButton()` (ícono `settings`, 48 dp, `accessibilityLabel="Ajustes"`, abre con `setOpen(true)`); `SettingsSheet()` (`Modal` con `animationType="slide"`, `onRequestClose` cierra).

- [ ] **Step 1: Implement `SettingsSheet`:** título "Ajustes" (`accessibilityRole="header"`) y botón cerrar (ícono `close`, "Cerrar ajustes"); sección "Tema" con `SegmentedControl` Sistema / Claro / Oscuro; "Velocidad de la animación" con las velocidades de `PLAYBACK_SPEEDS` (`speedLabel`) y la ayuda "Velocidad con la que empieza el paso a paso."; filas con `Switch` para "Mostrar el número de color en los vértices" (ayuda "Ayuda a distinguir colores parecidos.") y "Vibrar al crear vértices y aristas"; cada fila entera es tocable (≥ 48 dp) con `accessibilityRole="switch"` y `accessibilityState={{ checked }}`; al pie "ColorGrafos" y la versión de `expo-constants` (`Constants.expoConfig?.version`).
- [ ] **Step 2: Implement `SettingsButton`** y colócalo en el extremo derecho de la cabecera de las cuatro pestañas (en Colorear y Precedencias junto al control de modo y los conteos; en la práctica también; en Mis grafos y Aprende a la derecha del título).
- [ ] **Step 3: StepPlayer** arranca con `PLAYBACK_SPEEDS.indexOf(settings.speed)` en vez de `DEFAULT_SPEED_INDEX`; cambiar la velocidad en el reproductor no toca el ajuste.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS y sin errores.
- [ ] **Step 5: Commit** — `feat: pantalla de Ajustes desde la cabecera`

---

### Task 4: Número de color en los vértices

**Files:**
- Modify: `src/constants/palette.ts`, `src/components/graph-canvas/graph-canvas.tsx`, `src/app/index.tsx`
- Test: `src/constants/__tests__/palette.test.ts`

**Interfaces:**
- Produces: `coloringNumbers(coloring: Readonly<Record<string, number>>): Record<string, number>` (color `c` → número `c + 1`); prop nueva `vertexNumbers?: Readonly<Record<VertexId, number>>` en `GraphCanvasProps`.

- [ ] **Step 1: Write the failing test:** `coloringNumbers({ A: 0, B: 2 })` → `{ A: 1, B: 3 }`; `{}` → `{}`.
- [ ] **Step 2: Run** `npx jest src/constants` — Expected: FAIL.
- [ ] **Step 3: Implement** `coloringNumbers`. En el lienzo, si el vértice tiene número, dibuja una insignia circular (radio ≈ 0,42 × `VERTEX_RADIUS`) en la esquina superior derecha del vértice: fondo `theme.background`, borde `theme.edge`, número en `theme.text`, `fontSize` ≈ 0,5 × `VERTEX_RADIUS`. En Colorear pasa `vertexNumbers` solo con `settings.showColorNumbers`, con la misma coloración que define `vertexColors` (resultado, práctica o etapas del puente).
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: número de color en los vértices desde Ajustes`

---

### Task 5: Vibración al crear vértices y aristas

**Files:**
- Modify: `src/state/editor-reducer.ts`, `src/state/editor-context.tsx`, `package.json` (vía `npx expo install expo-haptics`)
- Create: `src/hooks/use-creation-haptics.ts`
- Test: `src/state/__tests__/editor-reducer.test.ts`

**Interfaces:**
- Produces: `EditorState.created: number` (sube en 1 cada vez que el usuario crea un vértice o una arista; mismo patrón que `fitRequest`); `useCreationHaptics(created: number): void`.

- [ ] **Step 1: Write the failing tests:** `tapEmpty` sin selección (crea vértice) → `created` +1; `tapEmpty` con selección (solo deselecciona) → igual; `tapVertex` sobre otro vértice con uno seleccionado que crea la arista → +1; con una arista repetida o al tocar el mismo vértice → igual; `toggleEdge` que agrega → +1, que quita → igual; `undo`, `redo`, `replaceDoc`, `dragMove` → igual. Ajusta las pruebas del reducer de precedencias si comparan el estado completo.
- [ ] **Step 2: Run** `npx jest src/state` — Expected: FAIL.
- [ ] **Step 3: Implement** el contador en el reducer (los estados iniciales empiezan en 0) e instala `npx expo install expo-haptics`. `useCreationHaptics` recuerda el último valor en un ref y, cuando sube y `settings.haptics` está activo, llama `Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)` (recomendado en Android, no necesita permiso) con `.catch(() => {})`. Úsalo en `EditorProvider` para los dos editores.
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: vibración breve al crear vértices y aristas`

---

### Task 6: Compartir una imagen PNG del grafo coloreado

**Files:**
- Create: `src/lib/coloring/share-card.ts`, `src/components/share-dialog.tsx` (`ShareDialog`, con la tarjeta)
- Modify: `src/components/graph-thumbnail.tsx` (colores y etiquetas opcionales), `src/components/results/results-sheet.tsx` (botón), `src/app/index.tsx`, `package.json` (vía `npx expo install react-native-view-shot expo-sharing`)
- Test: `src/lib/coloring/__tests__/share-card.test.ts`

**Interfaces:**
- Consumes: `chromaticLabel(chromatic)`, `colorClasses(graph, coloring)`, `ChromaticState`.
- Produces:
  - `SHARE_LEGEND_MAX = 8`.
  - `shareCardText({ graph, coloring, chromatic, algorithmName }): { title: string; chromatic: string; used: string; legend: { color: number; text: string }[]; more: string | null }` — `title` = `"ColorGrafos"`; `chromatic` = `"χ(G) = 3 · Exacto"` (o con "Cota superior"; con `running` → `"χ(G): calculando…"`); `used` = `"DSATUR usó 3 colores"` (singular "1 color"); `legend` = hasta 8 clases `"Color 1: A, C, E"`; `more` = `"y 4 colores más"` cuando hay más de 8 (singular "y 1 color más"), si no `null`.
  - `GraphThumbnail` acepta `vertexColors?` y `showLabels?` (etiquetas centradas con `contrastText`).
  - `ShareDialog({ visible, onClose, ... })`: vista previa de la tarjeta dentro de un `Modal` y botones "Cancelar" y "Compartir".

- [ ] **Step 1: Write the failing tests:** C₅ coloreado con 3 colores y χ exacto → `chromatic` `"χ(G) = 3 · Exacto"`, `used` `"DSATUR usó 3 colores"`, `legend` de 3 líneas en orden de color; 12 clases → 8 líneas y `more` `"y 4 colores más"`; 9 clases → `"y 1 color más"`; búsqueda en curso → `"χ(G): calculando…"`.
- [ ] **Step 2: Run** `npx jest src/lib/coloring/__tests__/share-card.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `shareCardText`, e instala `npx expo install react-native-view-shot expo-sharing`. La tarjeta es un `View` con `collapsable={false}` y fondo `theme.background` (sin transparencias): título, línea de χ, el grafo con sus colores y etiquetas (`GraphThumbnail`, ~320 dp), la línea de colores usados y la leyenda con muestra de color. "Compartir": `captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' })`, `Sharing.isAvailableAsync()` y `Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir grafo coloreado' })`; error o no disponible → aviso "No se pudo compartir la imagen." con la acción `notify`; cerrar el menú de compartir no es error. Botón con ícono `share` y `accessibilityLabel="Compartir imagen del grafo coloreado"` en la cabecera de la hoja de resultados de Colorear, junto a cerrar, deshabilitado mientras no hay coloración.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: compartir una imagen PNG del grafo coloreado`

---

### Task 7: Ícono y pantalla de bienvenida propios

**Files:**
- Create: `scripts/generate-icons.mjs` (+ `scripts/png.mjs` con el codificador), `assets/images/splash-icon-dark.png`
- Modify: `assets/images/icon.png`, `assets/images/android-icon-foreground.png`, `assets/images/android-icon-background.png`, `assets/images/android-icon-monochrome.png`, `assets/images/splash-icon.png`, `assets/images/favicon.png`, `app.json`
- Test: `scripts/__tests__/png.test.mjs` (o `.test.js` si Jest no toma `.mjs`)

**Interfaces:**
- Produces: `encodePng(width, height, rgba: Uint8Array): Buffer` (PNG RGBA de 8 bits con `zlib` de Node, sin dependencias); el generador dibuja círculos y segmentos con antialias por supermuestreo 4×4.

- [ ] **Step 1: Write the failing test:** `encodePng(2, 1, …)` empieza con la firma PNG `89 50 4E 47 0D 0A 1A 0A`, su IHDR dice ancho 2 y alto 1 con tipo de color 6, y `zlib.inflateSync` de su IDAT devuelve `1 + 2×4` bytes por fila.
- [ ] **Step 2: Run** el test — Expected: FAIL.
- [ ] **Step 3: Implement** el codificador y el generador. Diseño: una rueda W₃ (un triángulo con su centro unido a los tres vértices, χ = 4) con aristas blancas y vértices en cuatro colores de `GRAPH_COLORS` (bermellón, verde azulado, amarillo, celeste) con borde blanco, sobre `#3B5BDB` (primario del tema claro). Archivos: `icon.png` 1024 (fondo lleno), `android-icon-foreground.png` 1024 transparente con el dibujo dentro de la zona segura (radio ≤ 30 % del lado), `android-icon-background.png` 1024 de `#3B5BDB`, `android-icon-monochrome.png` 1024 en blanco sobre transparente, `splash-icon.png` y `splash-icon-dark.png` 1024 transparentes, `favicon.png` 48. En `app.json`: `adaptiveIcon.backgroundColor` `#3B5BDB`; splash `backgroundColor` `#3B5BDB`, `imageWidth` 200 y `dark: { image: ./assets/images/splash-icon-dark.png, backgroundColor: '#0E0F11' }`. Correr `node scripts/generate-icons.mjs` y mirar cada PNG.
- [ ] **Step 4: Run** `npx jest && npx expo-doctor` — Expected: PASS; doctor sin problemas nuevos.
- [ ] **Step 5: Commit** — `feat: ícono y pantalla de bienvenida de ColorGrafos`

---

### Task 8: Revisión de accesibilidad y verificación final

**Files:**
- Modify: los componentes que salgan de la revisión.

- [ ] **Step 1: Auditoría:** cada `Pressable`/`Switch` de `src/app` y `src/components` tiene `accessibilityRole`, `accessibilityLabel` (si no tiene texto) y el `accessibilityState` que corresponda (`selected`, `checked`, `disabled`, `expanded`); objetivos ≥ 48 dp (o `hitSlop`); textos con `numberOfLines` donde un nombre largo pueda romper la fila; ningún color fijo fuera de `useTheme()`/paleta (salvo el fondo de los modales). Corrige lo que falte.
- [ ] **Step 2: Revisión visual** con el arnés web temporal (no se versiona, se desmonta al final): Ajustes en claro y oscuro y el cambio de tema en vivo, números de color, vista previa de compartir con un grafo de 13 colores. Capturas en el scratchpad.
- [ ] **Step 3: Run** `npx expo-doctor` y `npx expo export --platform android` en el scratchpad — Expected: doctor sin problemas nuevos; un bundle `.hbc` sin errores.
- [ ] **Step 4: Commit** de las correcciones — `fix: revisión de accesibilidad`
