# ColorGrafos P3 — Mejoras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vista Matriz en los dos módulos, Comparar algoritmos, modo "Colorea tú", grafos guardados en Mis grafos (guardar, abrir, renombrar, duplicar, borrar con deshacer) y la pestaña Aprende con botones "Probar"; más los minors #4 y #5 de P1.

**Architecture:** Igual que P1/P2: la lógica vive en `src/lib/` y `src/state/` como funciones puras con pruebas (matriz, comparación, verificación de la práctica, colección de guardados, contenido de Aprende), y la UI solo las recorre. La matriz edita el mismo `EditorDoc` con una acción nueva `toggleEdge`, así hereda deshacer, autoguardado y, en precedencias, la validación de ciclos. Los guardados son una colección aparte con su propio reducer y su clave en `expo-sqlite/kv-store`.

**Tech Stack:** Expo SDK 58, RN 0.88, React 19.3 + React Compiler, TypeScript strict, Expo Router (NativeTabs), RNGH 3.3, Reanimated 4.7, react-native-svg, expo-sqlite kv-store, Jest (jest-expo). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-26-calculadora-coloracion-grafos-design.md` (§6, §7.1, §7.2 c, §7.3 Comparar y "Colorea tú", §7.5, §7.6, §8.1, §8.3, §10 P3, §12 matriz 60×60).

## Global Constraints

- Todo el texto visible en español, con tildes y signos correctos; offline; solo Android.
- Límites: 60 vértices, 600 aristas (`LIMITS`); las ediciones que los superan muestran `EDIT_ERROR_MESSAGES`.
- Objetivos táctiles ≥ 48 dp; colores solo desde `useTheme()` (claro/oscuro); `accessibilityLabel` en todo control sin texto.
- "Todo se puede deshacer": tocar una celda de la matriz, abrir un guardado y borrar un guardado se deshacen.
- Matriz: en no dirigido es simétrica (tocar (i,j) cambia también (j,i)); en dirigido la fila es la predecesora de la columna y hay columnas extra de grado de entrada y de salida; desplazamiento en dos ejes con encabezados fijos.
- Comparar: los cinco algoritmos en una tabla `algoritmo | colores usados | pasos | tiempo`; tocar una fila aplica esa coloración.
- "Colorea tú": elegir color, tocar vértices; aristas en conflicto en rojo al instante; al terminar, si es válida y si usó χ colores o más.
- Ninguna dependencia nueva; `ios/` y `android/` no se tocan.
- Antes de cerrar cada tarea: `npx jest`, `npx tsc --noEmit`, `npx expo lint` en verde.
- Commits en español con las líneas de atribución de la sesión; nunca push.

## Review Focus

1. Matriz con 60 vértices: se abre sin congelar la app, los encabezados de fila y columna siguen alineados al desplazar en los dos ejes, la diagonal no crea lazos y en dirigido tocar (i,j) agrega solo i → j (y si cierra un ciclo, el aviso de ciclo aparece como al dibujar). → pruebas de `toggleEdge` en Task 2; revisión visual en Task 9.
2. Abrir un guardado o un ejemplo de Aprende reemplaza el trabajo del módulo y "Deshacer" lo devuelve; un guardado corrupto en el almacenamiento se omite sin tumbar Mis grafos. → Task 6 (deserialización) y Task 7.
3. "Colorea tú" mientras el grafo cambia (deshacer, cargar ejemplo, renombrar): los colores de vértices que ya no existen se descartan; "Comprobar" con vértices sin pintar dice cuáles faltan. → Task 5.
4. "Comparar" mientras la búsqueda exacta corre: la fila Exacto dice "Calculando…" y no se aplica; cuando termina por tiempo, muestra la cota y no "Exacto". → Task 4.
5. Borrar un guardado y deshacer lo restaura en su posición; borrar dos seguidos y deshacer restaura solo el último; un nombre repetido no sobrescribe otro guardado. → Task 6.

---

### Task 1: Minors de P1 (#4 y #5)

**Files:**
- Modify: `src/lib/analysis/bounds.ts`, `src/lib/coloring/present.ts`, `src/hooks/use-coloring-analysis.ts`
- Test: `src/lib/analysis/__tests__/bounds.test.ts`, `src/lib/coloring/__tests__/present.test.ts`

**Interfaces:**
- Produces: `needsExactSearch(prev: KeyedChromatic, key: string): boolean` en `present.ts`.

- [ ] **Step 1: Write the failing tests**
  - `bounds.test.ts`: `chromaticBounds(path(3), 1, true).lower` es `2` (una búsqueda de clique cortada por tiempo puede devolver 1 vértice; con aristas la cota es al menos 2) y `lowerReason` `'clique'`.
  - `present.test.ts`: `needsExactSearch(null, 'k')` `true`; con `{ key: 'k', state: { status: 'exact', … } }` → `false`; con `timeout` del mismo key → `false`; con `cancelled` del mismo key → `true` (el usuario puede reintentar reabriendo); con `running` → `true`; con `exact` de otra key → `true`.
- [ ] **Step 2: Run** `npx jest src/lib/analysis src/lib/coloring` — Expected: FAIL (lower 1; `needsExactSearch` no existe).
- [ ] **Step 3: Implement.** `lower: Math.max(2, cliqueSize)` en la rama final de `chromaticBounds`. En `useColoringAnalysis`, el efecto no lanza la búsqueda si `!needsExactSearch(exact, key)` (leer `exact` con `useEffectEvent` para no agregarlo a las dependencias).
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `fix: cota inferior ≥ 2 con aristas y no relanzar el exacto ya resuelto`

---

### Task 2: Modelo de la matriz y acción `toggleEdge`

**Files:**
- Create: `src/lib/graph/matrix.ts`
- Modify: `src/state/editor-reducer.ts`
- Test: `src/lib/graph/__tests__/matrix.test.ts`, `src/state/__tests__/editor-reducer.test.ts`, `src/state/__tests__/precedence-reducer.test.ts`

**Interfaces:**
- Produces:
  - `AdjacencyMatrix { labels: VertexId[]; cells: boolean[][]; outDegree: number[]; inDegree: number[] }`; `adjacencyMatrix(g: Graph): AdjacencyMatrix` (orden de `g.vertices`; en no dirigido `cells` simétrica y `inDegree === outDegree` = grado).
  - `cellLabel(m: AdjacencyMatrix, i: number, j: number, directed: boolean): string` para accesibilidad: dirigido `"A → B: sí"`/`"A → B: no"`; no dirigido `"A – B: arista"`/`"A – B: sin arista"`; diagonal `"A: no se permiten lazos"`.
  - `EditorAction` gana `{ type: 'toggleEdge'; a: VertexId; b: VertexId }`: si la arista existe (dirigido: exactamente `[a, b]`; no dirigido: cualquier sentido) se quita; si no, `addEdge` (errores → `errorNotice`, sin cambiar el doc). Un paso de deshacer, `selection` a `NO_SELECTION`, sin aviso al agregar; al quitar, `undoableNotice` "Se quitó la arista A–B." (dirigido: "Se quitó A de las predecesoras de B.").

- [ ] **Step 1: Write the failing tests**
  - `matrix.test.ts`: C₄ (A-B, B-C, C-D, D-A) → `cells[0][1]` y `cells[1][0]` `true`, `cells[0][2]` `false`, diagonal `false`, grados `[2,2,2,2]`. Dirigido A→B, A→C → `outDegree` `[2,0,0]`, `inDegree` `[0,1,1]`, `cells[1][0]` `false`. `cellLabel` en los tres casos con los textos de arriba.
  - `editor-reducer.test.ts`: `toggleEdge` A,B en no dirigido sin arista → la agrega; repetirlo con B,A → la quita (un solo paso de deshacer cada vez; `undo` la restaura); `toggleEdge` A,A → doc igual y `notice` con el mensaje de `self-loop`; con 600 aristas → mensaje de `limit-edges`.
  - `precedence-reducer.test.ts`: con A→B existente, `toggleEdge` B,A agrega la flecha B→A (el doc conserva `activities`) y `analyzePrecedence` del resultado es `valid: false`; `toggleEdge` A,B quita la flecha y el aviso dice "Se quitó A de las predecesoras de B.".
- [ ] **Step 2: Run** `npx jest src/lib/graph src/state` — Expected: FAIL.
- [ ] **Step 3: Implement** `matrix.ts` (un `Map` de índice por etiqueta, O(n² + m)) y el caso `toggleEdge` en `editorReducer` (el `precedenceReducer` lo hereda por su `default`; en precedencias no se re-acomoda el dibujo).
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: matriz de adyacencia y acción para alternar aristas`

---

### Task 3: Vista Matriz en Colorear y Precedencias

**Files:**
- Create: `src/components/adjacency-matrix.tsx`
- Modify: `src/app/index.tsx`, `src/app/precedence.tsx`

**Interfaces:**
- Consumes: Task 2 (`adjacencyMatrix`, `cellLabel`, `toggleEdge`).
- Produces: `AdjacencyMatrixView({ graph, onToggle(a, b) })`.

- [ ] **Step 1:** El selector de Colorear pasa a `Dibujo | Texto | Matriz`; el de Precedencias a `Tabla | Grafo | Matriz`. En Matriz se ocultan "Reorganizar" y la hoja de resultados (como en Texto/Tabla); "Analizar"/"Colorear" cambian a Dibujo/Grafo antes de abrir la hoja (mismo patrón que Tabla → Grafo de P2).
- [ ] **Step 2: Implement** `AdjacencyMatrixView`:
  - Celdas de 48 × 48 dp; encabezados con la etiqueta (`fitLabel` si es larga).
  - Estructura (encabezados fijos sin sincronizar dos scrolls por el hilo de JS): un `Animated.ScrollView` horizontal contiene la fila de encabezado y debajo una `FlatList` vertical de filas (virtualizada: con 60 × 60 solo se montan las filas visibles, no 3 600 celdas). La fila de encabezado queda fuera de la lista, así que no se va al desplazar en vertical; la esquina y la celda de etiqueta de cada fila se trasladan con `translateX = scrollX` (`useAnimatedScrollHandler` + `useAnimatedStyle`) y `zIndex` arriba, así que la columna de etiquetas no se va al desplazar en horizontal.
  - Celda con arista: relleno `theme.primary` y "1"; sin arista: "0" en `theme.textSecondary`; diagonal: "—" y deshabilitada. Cada celda es un `Pressable` con `accessibilityRole="button"` y `accessibilityLabel={cellLabel(...)}`, así TalkBack también puede alternarla.
  - Dirigido: dos columnas extra al final de cada fila, "Ent." y "Sal.", con `inDegree`/`outDegree` (no tocables), y una línea de ayuda arriba: "Fila → columna: la fila es predecesora de la columna."
  - Grafo vacío: el mismo estado vacío del módulo ("Todavía no hay vértices.").
- [ ] **Step 3: Verify** `npx tsc --noEmit && npx expo lint && npx jest` — Expected: limpio y PASS.
- [ ] **Step 4: Commit** — `feat: vista Matriz con encabezados fijos en los dos módulos`

---

### Task 4: Comparar algoritmos

**Files:**
- Create: `src/lib/coloring/compare.ts`, `src/components/results/compare-card.tsx`
- Modify: `src/components/results/results-panel.tsx`
- Test: `src/lib/coloring/__tests__/compare.test.ts`

**Interfaces:**
- Consumes: `StructuralAnalysis.heuristics`, `ChromaticState`, `ALGORITHM_SHORT_LABELS`.
- Produces:
  - `CompareRow { id: AlgorithmId; label: string; colorsUsed: number | null; steps: number | null; time: string; note?: string; applicable: boolean }`.
  - `compareRows(heuristics, chromatic): CompareRow[]` en el orden Auto, DSATUR, Welsh-Powell, Greedy, Exacto.
  - `formatElapsed(ms: number): string` — `< 1` → `"< 1 ms"`; `< 1000` → `"12 ms"` (entero); si no `"1,2 s"`.

- [ ] **Step 1: Write the failing tests** (`compare.test.ts`, con `analyzeGraph` sobre ejemplos reales):
  - Petersen con `chromatic` exacto (`{ status: 'exact', ...exactColoringSync(g) }`): 5 filas; Exacto `colorsUsed` 3, `applicable` `true`; Auto igual a Exacto con `note` `"usó Exacto"`.
  - Con `chromatic` `{ status: 'running', k: 3 }`: Exacto `colorsUsed` `null`, `time` `"Calculando…"`, `applicable` `false`; Auto con `note` `"usa DSATUR mientras tanto"` y los números de DSATUR.
  - Con `timeout`: Exacto `colorsUsed` `null`, `note` `"se agotó el tiempo: χ ≤ {upper}"`, `applicable` `false`; Auto con `note` `"usó DSATUR"`.
  - `formatElapsed(0.3)` `"< 1 ms"`, `formatElapsed(12.4)` `"12 ms"`, `formatElapsed(1234)` `"1,2 s"`.
- [ ] **Step 2: Run** `npx jest src/lib/coloring` — Expected: FAIL.
- [ ] **Step 3: Implement** `compare.ts`; `CompareCard` es una `ResultCard` "Comparar algoritmos" plegada con un botón "Comparar los 5 algoritmos"; al abrirla muestra la tabla; la fila del algoritmo elegido va resaltada; tocar una fila `applicable` llama `view.changeAlgorithm(id)`. Va en `ResultsPanel` después de `ChromaticCard`.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS/limpio.
- [ ] **Step 5: Commit** — `feat: comparar los cinco algoritmos y aplicar uno desde la tabla`

---

### Task 5: Modo "Colorea tú"

**Files:**
- Create: `src/lib/coloring/practice.ts`, `src/components/practice-bar.tsx`
- Modify: `src/components/graph-canvas/graph-canvas.tsx`, `src/app/index.tsx`
- Test: `src/lib/coloring/__tests__/practice.test.ts`

**Interfaces:**
- Consumes: `conflictingEdges`, `ChromaticState`, `GRAPH_COLORS`.
- Produces:
  - `paintVertex(c: Coloring, v: VertexId, color: number | null): Coloring` (`null` borra).
  - `prunePractice(c: Coloring, g: Graph): Coloring` (descarta vértices que ya no están; devuelve el mismo objeto si no cambió).
  - `practiceVerdict(g: Graph, c: Coloring, chromatic: ChromaticState): { ok: boolean; message: string }`.
  - `GraphCanvasProps.onPaintVertex?: (id: VertexId) => void` — si está, tocar un vértice lo llama y nada más (no crea, no selecciona, no arrastra; zoom y desplazamiento siguen).

- [ ] **Step 1: Write the failing tests** (`practice.test.ts`), mensajes exactos:
  - Sin pintar B y D en C₄: `{ ok: false, message: 'Faltan por colorear: B y D.' }`.
  - C₄ con A y B del mismo color: `ok: false`, `'Hay 1 arista con el mismo color en sus extremos: A–B.'` (plural: `'Hay 2 aristas … : A–B y C–D.'`).
  - C₅ válido con 3 colores y χ exacto 3: `{ ok: true, message: '¡Coloración válida con 3 colores! Es óptima: χ(G) = 3.' }`.
  - C₄ válido con 3 colores y χ exacto 2: `'Coloración válida con 3 colores, pero se puede con 2 (χ(G) = 2).'`, `ok: true`.
  - χ en `timeout` (lower 3, upper 4) y 4 colores: `'Coloración válida con 4 colores. χ(G) está entre 3 y 4.'`; con 3 colores (= lower): `'¡Coloración válida con 3 colores! Es óptima: χ(G) = 3.'`.
  - χ `running`: válida con k → `'Coloración válida con k colores. Calculando χ(G)…'`.
  - `paintVertex` con `null` quita la clave; `prunePractice` tras borrar un vértice lo descarta y devuelve el mismo objeto si nada cambió.
- [ ] **Step 2: Run** `npx jest src/lib/coloring` — Expected: FAIL.
- [ ] **Step 3: Implement.**
  - En Dibujo, un botón flotante "Colorea tú" (ícono `brush`) arriba a la derecha del lienzo. Al entrar: se cierra la hoja de resultados, la barra inferior se reemplaza por `PracticeBar` (fila desplazable de muestras de `GRAPH_COLORS` con su número, una "goma" que borra, "Comprobar" y "Salir"), y la cabecera muestra "Colorea tú: elige un color y toca vértices".
  - La coloración de práctica vive en estado local de la pantalla (no en el doc ni en el historial), se pasa por `prunePractice` en cada render y se pinta con `coloringColors`; las aristas de `conflictingEdges` se resaltan con tono `warning` al instante.
  - "Comprobar" usa `useColoringAnalysis(graph, practicing)` para χ y muestra `practiceVerdict` en el aviso (`notice` local con `NoticeSnackbar`, sin deshacer).
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS/limpio.
- [ ] **Step 5: Commit** — `feat: modo Colorea tú con conflictos en rojo y veredicto contra χ`

---

### Task 6: Colección de grafos guardados

**Files:**
- Create: `src/state/saved-graphs.ts`, `src/state/saved-graphs-context.tsx`
- Modify: `src/lib/format.ts`, `src/app/_layout.tsx` (envolver con el proveedor)
- Test: `src/state/__tests__/saved-graphs.test.ts`, `src/lib/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `serializeDoc`/`deserializeDoc`, `DocKey`.
- Produces:
  - `SavedGraph { id: string; name: string; module: DocKey; doc: EditorDoc; savedAt: string }` (ISO).
  - `SavedState { items: SavedGraph[]; lastRemoved: { item: SavedGraph; index: number } | null }`.
  - `SavedAction = { type: 'save'; name; module; doc; id; now } | { type: 'rename'; id; name } | { type: 'duplicate'; id; newId; now } | { type: 'remove'; id } | { type: 'undoRemove' }` (ids y fecha entran por la acción: el reducer es puro).
  - `savedReducer(state, action): SavedState`; `uniqueName(name, items, exceptId?): string` (`"Tarea"` → `"Tarea (2)"`, `"Tarea (3)"`…); `NAME_MAX = 40`; `cleanName(text): string | null` (recorta espacios; vacío o > 40 → `null`).
  - `serializeSaved(items): string`; `deserializeSaved(text: string | null): SavedGraph[]` (omite entradas inválidas o con doc corrupto).
  - `formatSavedDate(iso: string, now: Date): string` — mismo día `"Hoy, 14:05"`; día anterior `"Ayer, 09:30"`; otro `"27 oct 2026"` (meses `ene feb mar abr may jun jul ago sept oct nov dic`; sin `Intl`, para no depender de la configuración de Hermes).
  - `SavedGraphsProvider`, `useSavedGraphs(): { items; dispatch; lastRemoved }` con autoguardado en la clave `saved:v1`.

- [ ] **Step 1: Write the failing tests**
  - `save` agrega al principio (más reciente primero) con `uniqueName`; `rename` a un nombre usado por otro → `"X (2)"`; renombrar al mismo nombre propio lo deja igual; `duplicate` inserta la copia justo después con `"X (copia)"` (también único) y doc igual; `remove` + `undoRemove` restaura en el mismo índice; dos `remove` seguidos + `undoRemove` restaura solo el último; `undoRemove` sin nada → mismo estado.
  - `deserializeSaved` con una entrada buena, una con `doc` corrupto y basura → devuelve solo la buena; `null` → `[]`; JSON inválido → `[]`.
  - `formatSavedDate` en los tres casos (fechas locales construidas con `new Date(2026, 9, 27, 14, 5)`).
  - `cleanName('  Mi grafo  ')` `'Mi grafo'`; `cleanName('   ')` `null`; 41 caracteres → `null`.
- [ ] **Step 2: Run** `npx jest src/state src/lib/__tests__/format.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** El proveedor inicializa con `deserializeSaved(Storage.getItemSync('saved:v1'))` y guarda en un efecto tras cada cambio de `items` (`try/catch` + `console.warn`, como `saveDoc`). Ids: `Date.now().toString(36) + contador`.
- [ ] **Step 4: Run** `npx jest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: colección de grafos guardados con deshacer al borrar`

---

### Task 7: Guardar desde los módulos y la sección "Guardados" de Mis grafos

**Files:**
- Create: `src/lib/examples/example-docs.ts`, `src/hooks/use-module-loader.ts`, `src/components/name-dialog.tsx`, `src/components/saved-graph-card.tsx`
- Modify: `src/components/editor-toolbar.tsx`, `src/app/index.tsx`, `src/app/precedence.tsx`, `src/app/graphs.tsx`
- Test: `src/lib/examples/__tests__/example-docs.test.ts`

**Interfaces:**
- Consumes: Task 6 (`useSavedGraphs`, `cleanName`, `formatSavedDate`), `GraphThumbnail`.
- Produces:
  - `coloringExampleDoc(ex: ColoringExample): EditorDoc`; `precedenceExampleDoc(ex: PrecedenceExample): EditorDoc` (lo que hoy arma `graphs.tsx`, movido aquí; lanza si el ejemplo de precedencias es inválido).
  - `useModuleLoader(): { open(module: DocKey, doc: EditorDoc, message: string): void }` — `replaceDoc` en el reducer del módulo, `dismissBridge()` si es coloración, y navega a `/` o `/precedence`.
  - `EditorToolbar` gana `onSave?(): void` → botón "Guardar" (ícono `save`, accesible "Guardar el grafo en Mis grafos").
  - `NameDialog({ visible, title, initial, confirmLabel, onSubmit(name), onCancel })` con `cleanName` y el error "Escribe un nombre de 1 a 40 caracteres.".

- [ ] **Step 1: Write the failing test** (`example-docs.test.ts`): para cada ejemplo de coloración, `coloringExampleDoc` tiene una posición por vértice; `precedenceExampleDoc(findPrecedenceExample('homework'))` es dirigido, tiene `activities` de 13 entradas y `unit` `'semanas'`.
- [ ] **Step 2: Run** `npx jest src/lib/examples` — Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `graphs.tsx` usa `example-docs` y `useModuleLoader`. Arriba de los ejemplos, la sección "Guardados": vacía → "Todavía no guardaste grafos. Usa «Guardar» en Colorear o Precedencias."; si no, `SavedGraphCard` por elemento con miniatura, nombre, módulo ("Coloración" o "Precedencias"), conteos y `formatSavedDate`; tocar la tarjeta abre (`open(module, doc, 'Se abrió «X».')`); un botón ⋮ (48 dp, "Más acciones para X") abre un menú modal con Renombrar, Duplicar, Borrar.
  - Borrar muestra `NoticeSnackbar` "Se borró «X»." con Deshacer (`undoRemove`).
  - "Guardar" en la barra de los dos módulos (deshabilitado con el grafo vacío) abre `NameDialog` con el nombre sugerido `"Grafo de coloración"` / `"Proyecto de precedencias"`; al confirmar despacha `save` y muestra el aviso del módulo "Se guardó «X» en Mis grafos.". Con seis botones la barra reparte el ancho: si no caben las etiquetas, `adjustsFontSizeToFit` las achica (cada botón sigue ≥ 48 dp en 360 dp de ancho).
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS/limpio.
- [ ] **Step 5: Commit** — `feat: guardar, abrir, renombrar, duplicar y borrar grafos en Mis grafos`

---

### Task 8: Pestaña Aprende

**Files:**
- Create: `src/content/learn.ts`, `src/app/learn.tsx`
- Modify: `src/components/app-tabs.tsx`
- Test: `src/content/__tests__/learn.test.ts`

**Interfaces:**
- Consumes: Task 7 (`useModuleLoader`, `coloringExampleDoc`, `precedenceExampleDoc`), `findExample`, `findPrecedenceExample`.
- Produces:
  - `LearnBlock = { kind: 'text'; text: string } | { kind: 'list'; items: string[] } | { kind: 'try'; module: DocKey; exampleId: string; label: string }`.
  - `LearnTopic { id: string; title: string; blocks: LearnBlock[] }`; `LearnSection { id: 'coloring' | 'precedence'; title: string; topics: LearnTopic[] }`; `LEARN_SECTIONS: readonly LearnSection[]`.

- [ ] **Step 1: Write the failing test** (`learn.test.ts`):
  - Hay exactamente dos secciones, "Coloración" y "Precedencias".
  - Los `id` de los temas cubren la lista de §7.6. Coloración: `coloracion-propia`, `numero-cromatico`, `cotas`, `konig`, `cuatro-colores`, `algoritmos`, `casos-especiales`, `aplicaciones`, `preguntas`. Precedencias: `que-es`, `tabla-y-grafo`, `etapas`, `orden-topologico`, `sin-ciclos`, `ruta-critica`, `conexion-coloracion`.
  - Todo bloque `try` apunta a un ejemplo que existe (`findExample` / `findPrecedenceExample` no lanzan) y su módulo coincide; hay al menos un `try` en `casos-especiales`, `konig`, `etapas` y `ruta-critica`.
  - Ningún texto contiene `TODO` ni comillas rectas `"` (se usan « »), y todo bloque `text` termina en `.`, `?` o `:`.
- [ ] **Step 2: Run** `npx jest src/content` — Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Contenido breve y correcto (revisar cada afirmación): definiciones, χ(G), cotas (ω ≤ χ ≤ Δ+1, Brooks con sus dos excepciones), König (bipartito ⇔ sin ciclos impares ⇔ χ ≤ 2), cuatro colores (planar ⇒ χ ≤ 4, Appel y Haken 1976), cómo funciona cada uno de los cinco algoritmos y su costo, casos Kₙ, Cₙ par/impar, árboles, bipartitos, ruedas (convención Wₙ = Cₙ + centro), Petersen; aplicaciones (exámenes, frecuencias, registros, mapas, Sudoku); 4–6 preguntas frecuentes. Precedencias: definición, tabla vs. grafo, etapas (regla de P2), orden topológico, por qué un ciclo lo impide, ruta crítica y holgura (IT, FT, IL, FL), y el puente con Gallai–Hasse–Roy–Vitaver.
  - `learn.tsx`: `ScrollView` con las dos secciones; cada tema es un acordeón (título 48 dp con `accessibilityState={{ expanded }}`); los bloques `try` son botones "Probar: {label}" que llaman `open(module, doc, 'Se cargó «nombre».')`.
  - `app-tabs.tsx`: cuarto disparador `learn`, etiqueta "Aprende", ícono md `school`. Regenerar los tipos de rutas arrancando Metro un momento (`CI=1 BROWSER=none timeout 45 npx expo start --port 8090`).
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: PASS/limpio.
- [ ] **Step 5: Commit** — `feat: pestaña Aprende con teoría y botones Probar`

---

### Task 9: Verificación de punta a punta

- [ ] **Step 1:** Revisión visual en Chrome con el arnés web temporal (no se versiona): Matriz de C₄, de la tarea en Precedencias (grados) y de un grafo de 60 vértices (alineación de encabezados al desplazar); Comparar sobre Petersen y aplicar Welsh-Powell; "Colorea tú" en C₅ con un conflicto y luego válido; guardar, renombrar, duplicar, borrar y deshacer en Mis grafos; abrir un guardado de precedencias; Aprende → "Probar" de una rueda y de la tarea. Modo claro y oscuro. Capturas en el scratchpad.
- [ ] **Step 2:** `npx expo export --platform android` en el scratchpad — Expected: un bundle `.hbc` sin errores.
- [ ] **Step 3:** Commit de las correcciones que salgan, cada una con su prueba si toca `src/lib` o `src/state`.
