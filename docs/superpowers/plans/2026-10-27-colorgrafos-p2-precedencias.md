# ColorGrafos P2 — Precedencias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pestaña Precedencias completa: Tabla ↔ Grafo de actividades, validación de ciclos, etapas (Kahn) con animación, orden topológico, ruta crítica, ejemplos y el puente "Ver etapas como coloración".

**Architecture:** El documento de precedencias es el mismo `EditorDoc` de coloración en modo dirigido (arista `[p, a]` = "p es predecesora de a") más dos campos opcionales: `activities` (nombre y duración por código) y `unit`. Así se reutilizan el reducer con deshacer/rehacer, el lienzo, el autoguardado y la hoja de resultados. Toda la lógica (validación, etapas, ruta crítica, layout por capas, presentación) vive en `src/lib/` como funciones puras con pruebas; la UI solo las recorre.

**Tech Stack:** Expo SDK 58, RN 0.88, React 19.3 + React Compiler, TypeScript strict, Expo Router (NativeTabs), RNGH 3.3, react-native-svg, expo-sqlite kv-store, Jest (jest-expo). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-26-calculadora-coloracion-grafos-design.md` (§7.1, §7.2, §7.4, §7.5, §8.3, §9 pasos 6–7, Apéndice A).

## Global Constraints

- Todo el texto visible en español, con tildes y signos correctos; offline; solo Android.
- Límites: 60 vértices (actividades), 600 aristas, etiquetas `[\p{L}\p{N}_]{1,12}` (`LIMITS`, `isValidLabel`).
- Objetivos táctiles ≥ 48 dp; colores solo desde `useTheme()` (claro/oscuro); `accessibilityLabel` en todo control sin texto.
- Mensaje de ciclo exacto: `A → B → C → A: una actividad no puede depender de sí misma, directa o indirectamente.`
- Etapa 1 = sin predecesoras; etapa k = 1 + máx(etapa de sus predecesoras). Con errores no se calculan etapas.
- Unidad de duración por proyecto, por defecto `semanas`.
- Ninguna dependencia nueva; `ios/` y `android/` no se tocan.
- Antes de cerrar cada tarea: `npx jest`, `npx tsc --noEmit`, `npx expo lint` en verde.
- Commits en español con las líneas de atribución de la sesión; nunca push.

## Review Focus

1. Crear en el dibujo una flecha que cierra un ciclo (A→B existe; tocar B y luego A): el ciclo se pinta en rojo, la tabla muestra "—" en Etapa, "Analizar" muestra el error y nada se cae (el reacomodo cae a `mergePositions`). → pruebas en Task 4 (reducer) y Task 6 (vista).
2. Renombrar el código de una actividad (tabla o barra de selección) conserva nombre, duración y las predecesoras que la nombraban; deshacer lo revierte en un paso. → Task 4.
3. Borrar una actividad que es predecesora de otras: se quita de ellas, aviso con deshacer, y deshacer restaura flechas, nombre y duración. → Task 4.
4. Duraciones mixtas (alguna vacía) o decimales (`2,5`): las etapas se calculan igual; la ruta crítica explica qué falta; las holguras no muestran `1e-16`. → Task 2 y Task 6.
5. Después del puente, editar el grafo de Colorear o cargar el ejemplo no dirigido de la tarea no deja pintadas las etapas viejas. → Task 8.

---

### Task 1: `lib/precedence` — modelo, validación y etapas

**Files:**
- Create: `src/lib/precedence/types.ts`, `src/lib/precedence/model.ts`, `src/lib/precedence/validate.ts`, `src/lib/precedence/stages.ts`
- Modify: `src/lib/format.ts` (agregar `joinSpanish`)
- Test: `src/lib/precedence/__tests__/validate.test.ts`, `src/lib/precedence/__tests__/stages.test.ts`, `src/lib/__tests__/format.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `DurationUnit = 'semanas' | 'días' | 'horas' | 'meses'`; `DURATION_UNITS: readonly DurationUnit[]`; `UNIT_SINGULAR: Record<DurationUnit, string>` (`semana`, `día`, `hora`, `mes`); `DEFAULT_UNIT = 'semanas'`; `ActivityInfo { name: string; duration: number | null }`; `ActivityInfoMap = Readonly<Record<VertexId, ActivityInfo>>`; `NAME_MAX_LENGTH = 80`; `MAX_DURATION = 9999`; `Activity { code: VertexId; name: string; predecessors: readonly VertexId[]; duration: number | null }`; `PrecedenceIssue = { kind: 'self-dependency'; code } | { kind: 'unknown-predecessor'; code; predecessor } | { kind: 'cycle'; cycle: readonly VertexId[] }`.
  - `model.ts`: `toActivities(g: Graph, info?: ActivityInfoMap): Activity[]` (orden de `g.vertices`; predecesoras = orígenes de las aristas que entran, en el orden de `g.vertices`; sin info → `name: ''`, `duration: null`); `graphFromActivities(acts: readonly Activity[]): { graph: Graph; info: Record<VertexId, ActivityInfo> }` (dirigido; omite predecesoras inexistentes y autodependencias).
  - `validate.ts`: `findCycle(acts): VertexId[] | null` (sentido predecesora → actividad, rotado para empezar por el miembro que aparece primero en la lista; ignora autodependencias y predecesoras inexistentes); `validateActivities(acts): PrecedenceIssue[]` (autodependencias y desconocidas en orden de lista, luego un ciclo como mucho); `issueMessage(issue): string`.
  - `stages.ts`: `StageStep { stage: number | null; vertices: readonly VertexId[]; message: string }`; `StageAnalysis { stages: VertexId[][]; stageOf: Record<VertexId, number>; order: VertexId[]; initial: VertexId[]; final: VertexId[]; steps: StageStep[] }`; `computeStages(acts): StageAnalysis` (precondición: sin issues); `longestPath(acts, stageOf): VertexId[]` (un camino con una actividad por etapa, de la etapa 1 a la última; desempate: la primera en el orden de la lista).
  - `format.ts`: `joinSpanish(items: readonly string[]): string`.

- [ ] **Step 1: Write the failing tests**

`format.test.ts` (agregar):
```ts
it('joinSpanish une con comas e "y", y usa "e" ante sonido i', () => {
  expect(joinSpanish([])).toBe('');
  expect(joinSpanish(['A'])).toBe('A');
  expect(joinSpanish(['A', 'B'])).toBe('A y B');
  expect(joinSpanish(['C', 'D', 'E'])).toBe('C, D y E');
  expect(joinSpanish(['E', 'F', 'I'])).toBe('E, F e I');
  expect(joinSpanish(['Pan', 'hielo'])).toBe('Pan y hielo');
});
```

`validate.test.ts` (helper `act(code, preds = [], duration = 1)`):
- `findCycle` en A←C, B←A, C←B (A pred de B, B de C, C de A) → `['A', 'B', 'C']`; en la tarea (Apéndice A) → `null`.
- `validateActivities([act('A', ['A'])])` → `[{ kind: 'self-dependency', code: 'A' }]`.
- `validateActivities([act('A', ['Z'])])` → `[{ kind: 'unknown-predecessor', code: 'A', predecessor: 'Z' }]`.
- Ciclo + autodependencia juntos → autodependencia primero, ciclo después.
- `issueMessage({ kind: 'cycle', cycle: ['A','B','C'] })` === `'A → B → C → A: una actividad no puede depender de sí misma, directa o indirectamente.'`
- `issueMessage` de autodependencia === `'A → A: una actividad no puede ser su propia predecesora.'`; de desconocida === `'A tiene como predecesora a Z, que no existe.'`
- `toActivities` sobre un grafo dirigido `B→C, A→C` con vértices `[A, B, C]` da `C.predecessors` `['A', 'B']`; `graphFromActivities` ida y vuelta conserva códigos, predecesoras, nombres y duraciones.

`stages.test.ts` (la tarea del Apéndice A escrita como `Activity[]` en el propio test, predecesoras `B:A, C:B, D:B, E:C, F:C, G:E, H:E, I:D, J:G,H,I, K:J,F, L:J, M:K,L`):
- `stages` === `[['A'],['B'],['C','D'],['E','F','I'],['G','H'],['J'],['K','L'],['M']]`.
- `order` === `['A','B','C','D','E','F','I','G','H','J','K','L','M']`; `initial` `['A']`; `final` `['M']`; `stageOf.J` `6`.
- `steps.length` `9`; `steps[0]` `{ stage: 1, vertices: ['A'], message: 'Etapa 1: A no tiene predecesoras.' }`; `steps[1].message` `'Se retira A; ahora B queda sin predecesoras → etapa 2.'`; `steps[3].message` `'Se retiran C y D; ahora E, F e I quedan sin predecesoras → etapa 4.'`; `steps[8]` `{ stage: null, vertices: [], message: 'Se retira M; no quedan actividades. Total: 8 etapas.' }`.
- Dos actividades sueltas: `steps[0].message` `'Etapa 1: A y B no tienen predecesoras.'`, último `'Se retiran A y B; no quedan actividades. Total: 1 etapa.'`.
- Lista vacía → `stages []`, `steps []`.
- `longestPath(tarea, stageOf)` === `['A','B','C','E','G','J','K','M']`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/precedence src/lib/__tests__/format.test.ts`
Expected: FAIL (módulos inexistentes / `joinSpanish` no exportado).

- [ ] **Step 3: Implement** los cuatro módulos y `joinSpanish` con las firmas de arriba. Ciclo: DFS iterativo o recursivo con colores (blanco/gris/negro) en el orden de la lista; al encontrar una arista hacia un gris, el ciclo es el tramo de la pila. Etapas: Kahn por niveles (grados de entrada), conservando el orden de la lista dentro de cada etapa. `joinSpanish`: "e" si el último elemento empieza por `i`, `í`, `I`, `Í` o `hi` no seguido de vocal.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/precedence src/lib/__tests__/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat: núcleo de precedencias (validación de ciclos y etapas por Kahn)`

---

### Task 2: Ruta crítica, análisis completo, puente y presentación

**Files:**
- Create: `src/lib/precedence/critical-path.ts`, `src/lib/precedence/analyze.ts`, `src/lib/precedence/bridge.ts`, `src/lib/precedence/present.ts`
- Test: `src/lib/precedence/__tests__/critical-path.test.ts`, `analyze.test.ts`, `bridge.test.ts`, `present.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Activity`, `computeStages`, `validateActivities`, `toActivities`, `longestPath`).
- Produces:
  - `critical-path.ts`: `ScheduleRow { es; ef; ls; lf; slack }` (números); `Schedule { rows: Record<VertexId, ScheduleRow>; total: number; critical: VertexId[]; criticalEdges: Edge[]; paths: VertexId[][]; pathsTruncated: boolean }`; `MAX_CRITICAL_PATHS = 20`; `missingDurations(acts): VertexId[]`; `criticalPath(acts, order): Schedule | null` (null si falta alguna duración). Valores redondeados a 1e-9 (holgura `< 1e-9` cuenta como 0 y se guarda `0`).
  - `analyze.ts`: `PrecedenceAnalysis = { valid: false; activities: Activity[]; issues: PrecedenceIssue[] } | { valid: true; activities: Activity[]; stages: StageAnalysis; schedule: Schedule | null; missing: VertexId[] }`; `analyzePrecedence(g: Graph, info?: ActivityInfoMap): PrecedenceAnalysis`.
  - `bridge.ts`: `StageBridge { key: string; coloring: Coloring; stageCount: number; longestPath: VertexId[] }`; `stageBridge(g: Graph, stages: StageAnalysis, acts): { graph: Graph; bridge: StageBridge }` (grafo no dirigido con las mismas aristas; `coloring[v] = stageOf[v] - 1`; `key = graphKey(grafo no dirigido)`); `activeBridge(bridge: StageBridge | null, g: Graph): StageBridge | null` (el puente solo vale mientras `graphKey(g) === bridge.key`).
  - `present.ts`: `PrecedenceTarget = { kind: 'stage'; stage: number } | { kind: 'critical' } | null`; `issueHighlight(issues): HighlightSpec | undefined` (ciclo: vértices + aristas `[c_i, c_{i+1}]` cerrando el ciclo, tono `warning`); `precedenceHighlight(target, analysis): HighlightSpec | undefined` (etapa: sus vértices, `focus`; crítica: `critical` + `criticalEdges`, `focus`); `stageColoringAtStep(steps, index): Coloring` (etapas identificadas hasta `index` inclusive, color = etapa − 1; `index` −1 → `{}`); `stageStepHighlight(steps, index): HighlightSpec | undefined` (vértices del paso, `focus`); `formatNumber(n): string` (coma decimal, hasta 2 decimales, sin ceros sobrantes); `formatDuration(n, unit): string` (singular solo para 1); `parseDuration(text): number | null | 'invalid'` (vacío → null; acepta coma o punto; 0 ≤ n ≤ `MAX_DURATION`); `pathLabel(path): string` (`A → B → C`).

- [ ] **Step 1: Write the failing tests**

`critical-path.test.ts` — la tarea con duraciones `A2 B1 C2 D2 E1 F1 G3 H2 I3 J2 K2 L1 M1`:
- `total` `14`; `paths` `[['A','B','C','E','G','J','K','M']]`; `critical` en orden topológico `['A','B','C','E','G','J','K','M']`.
- Tabla completa del Apéndice A, fila por fila, `{ es, ef, ls, lf, slack }`: A 0/2/0/2/0; B 2/3/2/3/0; C 3/5/3/5/0; D 3/5/4/6/1; E 5/6/5/6/0; F 5/6/10/11/5; G 6/9/6/9/0; H 6/8/7/9/1; I 5/8/6/9/1; J 9/11/9/11/0; K 11/13/11/13/0; L 11/12/12/13/1; M 13/14/13/14/0.
- `criticalEdges` contiene `['A','B']` y `['K','M']` y no contiene `['F','K']`.
- Empate (rombo A1→B2, A→C2, B→D1, C→D1): `paths` `[['A','B','D'],['A','C','D']]`; `critical` `['A','B','C','D']`.
- Decimales `A 0.1, B 0.2` en serie: `total` `0.3` exacto tras el redondeo (`toBe(0.3)`), holguras `0`.
- Falta una duración → `criticalPath` `null`; `missingDurations` `['C']`.

`analyze.test.ts`: grafo dirigido con ciclo A→B→C→A → `valid: false` con un issue `cycle`; la tarea → `valid: true`, `stages.stages.length` `8`, `schedule.total` `14`; sin info → `schedule` `null`, `missing` con los 13 códigos.

`bridge.test.ts`: para la tarea, el grafo del puente es no dirigido, tiene 16 aristas, su `graphKey` es igual al de `exampleGraph(findExample('homework'))`, `isProperColoring(graph, bridge.coloring)` es `true`, `stageCount` `8`, `longestPath` `['A','B','C','E','G','J','K','M']`; `activeBridge(b, mismoGrafo)` → `b`; tras `addEdge` → `null`; `activeBridge(null, g)` → `null`.

`present.test.ts`:
- `stageColoringAtStep(steps, 0)` `{ A: 0 }`; con `index` 3 incluye `I: 3`; último paso → 13 vértices.
- `issueHighlight([{ kind: 'cycle', cycle: ['A','B','C'] }])` → aristas `[['A','B'],['B','C'],['C','A']]`, `tone: 'warning'`.
- `formatDuration(14, 'semanas')` `'14 semanas'`; `formatDuration(1, 'meses')` `'1 mes'`; `formatDuration(2.5, 'días')` `'2,5 días'`; `formatNumber(0.30000000000000004)` `'0,3'`.
- `parseDuration('')` `null`; `parseDuration(' 2,5 ')` `2.5`; `parseDuration('-1')` `'invalid'`; `parseDuration('abc')` `'invalid'`; `parseDuration('10000')` `'invalid'`.
- `pathLabel(['A','B'])` `'A → B'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/precedence`
Expected: FAIL en los cuatro archivos nuevos.

- [ ] **Step 3: Implement.** Ruta crítica: pasada hacia adelante en `order` (es = máx ef de predecesoras), hacia atrás (lf = mín ls de sucesoras; finales: lf = total). Rutas: DFS desde las críticas sin predecesoras críticas, siguiendo `criticalEdges`, hasta finales; corta en `MAX_CRITICAL_PATHS`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/precedence`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat: ruta crítica, análisis de precedencias y puente con la coloración`

---

### Task 3: Ejemplos de precedencias y layout por capas

**Files:**
- Create: `src/lib/examples/precedence-examples.ts`, `src/lib/layout/layered.ts`
- Test: `src/lib/examples/__tests__/precedence-examples.test.ts`, `src/lib/layout/__tests__/layered.test.ts`

**Interfaces:**
- Consumes: Task 1–2.
- Produces:
  - `PrecedenceExample { id: string; name: string; description: string; unit: DurationUnit; activities: readonly Activity[] }`; `PRECEDENCE_EXAMPLES` (`homework`, `presentation`); `findPrecedenceExample(id)`.
  - `layeredLayout(g: Graph, stageOf: Readonly<Record<VertexId, number>>, box: Box): Positions` — columnas de izquierda a derecha por etapa (`x` crece con la etapa), orden vertical por baricentro con vértices ficticios para las aristas largas, y una pasada final que solo mueve en vertical a los vértices que una arista roza. Vértices sin etapa → etapa 1. Constantes exportadas `LAYER_GAP = 76`, `ROW_GAP = 72`.

Datos de los ejemplos (copia fija):
- `homework`: nombre `'Tarea: plataforma para construir una casa'`, descripción `'Las 13 actividades del proyecto de software: 8 etapas y ruta crítica de 14 semanas.'`, unidad `semanas`, actividades con los nombres, predecesoras y duraciones del Apéndice A, tal cual.
- `presentation`: nombre `'Preparar una exposición'`, descripción `'Ejemplo corto de 6 actividades para explicar etapas y holgura.'`, unidad `días`: A `Elegir el tema` (—, 1); B `Investigar el tema` (A, 3); C `Diseñar las diapositivas` (A, 2); D `Escribir el guion` (B, 2); E `Preparar la demostración` (B, C, 1); F `Ensayar la exposición` (D, E, 1).

- [ ] **Step 1: Write the failing tests**

`precedence-examples.test.ts`: la tarea da 8 etapas, total 14 y la ruta del Apéndice A (vía `analyzePrecedence(graphFromActivities(...))`); sus 13 nombres no están vacíos y `A.name` es `'Levantamiento de requisitos (entrevistas con constructores y clientes)'`; `presentation` da etapas `[['A'],['B','C'],['D','E'],['F']]`, total 7, rutas `[['A','B','D','F']]`, holgura de C `2` y de E `1`.

`layered.test.ts` (para la tarea, `presentation`, un camino de 10 y un DAG aleatorio con semilla de 40 vértices y 70 aristas hacia adelante):
- todas las actividades de una etapa comparten `x`, y `x` de la etapa k < `x` de la etapa k+1;
- `minVertexDistance(pos) >= MIN_SEPARATION - 0.01`;
- `edgeIntrusions(g, pos, EDGE_CLEARANCE)` `0` (tarea, presentation, camino);
- `edgeCrossings(g, pos)` `0` para la tarea y `presentation`;
- `fitViewport(pos, { width: 360, height: 560 }, 24).scale >= 0.5` para la tarea;
- determinista (dos llamadas iguales).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/examples/__tests__/precedence-examples.test.ts src/lib/layout/__tests__/layered.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implement** ejemplos y `layeredLayout` (centrado en la caja; 4 barridos de baricentro abajo/arriba; ficticios con el mismo `ROW_GAP`; reparación vertical hasta 20 pasadas).

- [ ] **Step 4: Run tests to verify they pass** — mismo comando; Expected: PASS.

- [ ] **Step 5: Commit** — `feat: ejemplos de precedencias y layout por etapas de izquierda a derecha`

---

### Task 4: Estado — documento de precedencias, reducer, persistencia y proveedores

**Files:**
- Modify: `src/state/editor-reducer.ts` (`EditorDoc.activities?`, `EditorDoc.unit?`; `renameSelected` y `deleteSelection` re-claves/borran en `activities`), `src/state/doc-serialization.ts` (campos nuevos + rechazar aristas duplicadas, pendiente #11 de P1), `src/state/storage.ts` (`DocKey = 'coloring' | 'precedence'`), `src/state/editor-context.tsx` (dos editores autoguardados + puente)
- Create: `src/state/precedence-reducer.ts`, `src/state/stage-bridge.tsx`
- Test: `src/state/__tests__/precedence-reducer.test.ts`, `src/state/__tests__/doc-serialization.test.ts` (agregar), `src/state/__tests__/editor-reducer.test.ts` (agregar)

**Interfaces:**
- Consumes: Task 1–3 (`ActivityInfo`, `DurationUnit`, `analyzePrecedence`, `layeredLayout`, `joinSpanish`).
- Produces:
  - `EditorDoc { graph; positions; activities?: ActivityInfoMap; unit?: DurationUnit }`.
  - `PrecedenceAction = EditorAction | { type: 'saveActivity'; original: VertexId | null; code: VertexId; name: string; duration: number | null; predecessors: readonly VertexId[] } | { type: 'removeActivity'; code: VertexId } | { type: 'setUnit'; unit: DurationUnit }`.
  - `precedenceReducer(state: EditorState, action: PrecedenceAction): EditorState`; `emptyPrecedenceDoc(): EditorDoc` (dirigido, `activities: {}`, `unit: 'semanas'`); `stageLayout(doc: EditorDoc, previous: Positions): Positions` (`layeredLayout` si el análisis es válido; si no, `mergePositions(previous, graph, WORLD_BOX)`).
  - `editor-context.tsx`: `EditorProvider` (envuelve coloración, precedencias y puente), `useColoringEditor()`, `usePrecedenceEditor(): { state: EditorState; dispatch: Dispatch<PrecedenceAction> }`.
  - `stage-bridge.tsx`: `useStageBridge(): { bridge: StageBridge | null; showBridge(b: StageBridge): void; dismissBridge(): void }`.

Reglas del reducer:
- `saveActivity`: crear (`original` null → `addVertex`) o renombrar (`renameVertex`); dejar las aristas entrantes de `code` exactamente en `predecessors` (las que existan y ≠ `code`); `activities[code] = { name: name.trim(), duration }`; posiciones con `stageLayout`; un solo commit; `fitRequest + 1`. Error de edición → `notice` de error y doc intacto.
- `removeActivity` y `deleteSelection` de un vértice: borra la actividad y su info. Aviso deshacible: `Se borró la actividad D y se quitó de las predecesoras de I.` o, sin sucesoras, `Se borró la actividad D.` `removeActivity` reacomoda con `stageLayout`; `deleteSelection` conserva las posiciones del resto.
- `clear` conserva `unit`. `setUnit` hace commit solo si cambia.
- El resto delega en `editorReducer`.

- [ ] **Step 1: Write the failing tests**

`precedence-reducer.test.ts`:
- Guardar una actividad nueva `{ original: null, code: 'A', name: ' Requisitos ', duration: 2, predecessors: [] }` sobre `emptyPrecedenceDoc()` → vértice `A`, `activities.A` `{ name: 'Requisitos', duration: 2 }`, `past.length` `1`.
- Con A y B, guardar B con `predecessors: ['A']` → arista `['A','B']`; luego `predecessors: []` → sin aristas.
- Renombrar B→X (B es predecesora de C y tiene info): aristas `['A','X']`, `['X','C']`; `activities.X` conserva nombre y duración; no queda `activities.B`; un `undo` devuelve exactamente el doc anterior.
- `removeActivity` de D en la tarea: I pierde la predecesora D, `notice.message` `'Se borró la actividad D y se quitó de las predecesoras de I.'`, `notice.undoable` `true`; `undo` restaura la arista `['D','I']` y `activities.D`.
- Seleccionar el vértice D y `deleteSelection` → mismo aviso; la posición de A no cambia.
- `tapVertex` B y luego `tapVertex` A cuando existe `A→B` → arista `['B','A']` agregada sin lanzar, y las posiciones de A y B no cambian (sin reacomodo en el dibujo).
- `saveActivity` que cierra un ciclo → commit hecho; `stageLayout` no lanza y devuelve posiciones para todos los vértices.
- `clear` → grafo vacío, `unit` conservada; `setUnit('días')` cambia `unit`.

`editor-reducer.test.ts` (agregar): en coloración (`activities` ausente) renombrar/borrar sigue sin crear `activities`.

`doc-serialization.test.ts` (agregar): ida y vuelta con `activities` y `unit`; doc viejo sin esos campos sigue cargando; `unit` desconocida → `null`; nombre de más de 80 caracteres → `null`; duración negativa → `null`; aristas duplicadas `[['A','B'],['A','B']]` → `null`; en no dirigido `[['A','B'],['B','A']]` → `null`; en dirigido `[['A','B'],['B','A']]` → válido.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/state`
Expected: FAIL (reducer inexistente; serialización ignora los campos nuevos y acepta duplicadas).

- [ ] **Step 3: Implement** con las reglas de arriba. `loadDoc('precedence')` que no sea dirigido se descarta. El proveedor de precedencias arranca con `initialEditorState(loadDoc('precedence') ?? emptyPrecedenceDoc())` y autoguarda con el mismo debounce de 500 ms.

- [ ] **Step 4: Run tests to verify they pass** — `npx jest src/state`; Expected: PASS. Luego `npx jest` completo en verde.

- [ ] **Step 5: Commit** — `feat: documento de precedencias con deshacer, autoguardado y puente`

---

### Task 5: Flechas en el lienzo y reproductor de pasos genérico

**Files:**
- Modify: `src/lib/geometry.ts` (agregar `arrowGeometry`), `src/components/graph-canvas/graph-canvas.tsx` (flechas si `graph.directed`), `src/components/results/step-player.tsx` (genérico), `src/components/results/results-panel.tsx`, `src/components/editor-toolbar.tsx` (botón principal configurable)
- Create: `src/components/results/saturation-table.tsx`
- Test: `src/lib/__tests__/geometry.test.ts` (agregar)

**Interfaces:**
- Produces:
  - `ARROW_LENGTH = 12`, `ARROW_WIDTH = 10`; `arrowGeometry(a: Point, b: Point, radius: number): { x1: number; y1: number; x2: number; y2: number; head: [Point, Point, Point] } | null` (la línea empieza en el borde del círculo de `a` y termina en la base de la punta; la punta toca el borde del círculo de `b`; `null` si los círculos se tocan).
  - `StepPlayer({ steps: readonly { message: string }[]; index; onIndexChange; resetKey: string | null; swatchColor?(i: number): string | undefined; children?: ReactNode })` — sin `key` externo: cuando cambia `resetKey` se detiene la reproducción, pero la velocidad y lo desplegado se conservan (pendiente #8 de P1).
  - `SaturationTable({ step: ColoringStep | undefined; degrees })` — el desplegable "Ver saturación" que antes vivía en `StepPlayer`.
  - `EditorToolbar` con `primary: { icon; label; accessibilityLabel; onPress; disabled }` y `onRelayout?` (sin él no se muestra "Reorganizar").

- [ ] **Step 1: Write the failing test**

```ts
describe('arrowGeometry', () => {
  it('la punta toca el borde del círculo destino', () => {
    const g = arrowGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, 22)!;
    expect(g.head[0]).toEqual({ x: 78, y: 0 });
    expect(g.x1).toBe(22);
    expect(g.x2).toBe(78 - ARROW_LENGTH);
    expect(g.head[1].x).toBeCloseTo(66);
    expect(Math.abs(g.head[1].y - g.head[2].y)).toBeCloseTo(ARROW_WIDTH);
  });
  it('círculos encimados: no hay flecha', () => {
    expect(arrowGeometry({ x: 0, y: 0 }, { x: 30, y: 0 }, 22)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/geometry.test.ts` — Expected: FAIL (`arrowGeometry` no existe).
- [ ] **Step 3: Implement** `arrowGeometry`; en el lienzo, para dirigidos dibujar `<Line>` acortada + `<Polygon>` con el mismo color (seleccionada/resaltada/normal); refactor de `StepPlayer`/`SaturationTable`/`EditorToolbar`; `ResultsPanel` y `ColorScreen` se adaptan sin cambio visible.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: todo verde.
- [ ] **Step 5: Commit** — `feat: flechas en grafos dirigidos y reproductor de pasos reutilizable`

---

### Task 6: Pantalla Precedencias — Tabla, Grafo y resultados

**Files:**
- Create: `src/app/precedence.tsx`, `src/hooks/use-precedence-view.ts`, `src/components/precedence/activity-table.tsx`, `src/components/precedence/activity-dialog.tsx`, `src/components/precedence/issues-banner.tsx`, `src/components/precedence/precedence-panel.tsx`, `src/components/precedence/schedule-table.tsx`
- Modify: `src/components/app-tabs.tsx` (pestaña `precedence`, etiqueta `Precedencias`, ícono md `account_tree`, entre Colorear y Mis grafos)
- Test: `src/lib/precedence/__tests__/present.test.ts` (agregar `toggleTarget`/`changeStep`)

**Interfaces:**
- Consumes: Task 2 (`analyzePrecedence`, `present.ts`), Task 4 (`usePrecedenceEditor`), Task 5 (`StepPlayer`, `EditorToolbar`, flechas).
- Produces:
  - `present.ts`: `PrecedenceSelection { target: PrecedenceTarget; step: { key: string; index: number } | null }`; `toggleTarget(s, target): PrecedenceSelection` (alternar; activar lleva el paso al final); `changeStep(s, step, lastStep): PrecedenceSelection` (moverse antes del final apaga el resaltado).
  - `usePrecedenceView(doc: EditorDoc)` → `{ analysis, open, openResults(), closeResults(), target, toggleTarget(t), stepIndex, changeStep(i), steps, vertexColors, highlight }`. Con issues el resaltado del ciclo (`issueHighlight`) se ve siempre, abierta o no la hoja; con la hoja abierta y análisis válido, los vértices se pintan por etapa (`stageColoringAtStep` durante la reproducción).

Comportamiento (copia fija entre comillas):
- Cabecera: `SegmentedControl` `Tabla | Grafo` (Tabla por defecto) y a la derecha `13 actividades · 16 precedencias` (`plural`).
- `IssuesBanner` (fondo de peligro suave, texto `danger`) con `issueMessage` de cada issue y la nota `Corrige esto para calcular las etapas.`
- Tabla: encabezado `Código | Actividad | Predecesoras | Duración | Etapa`; nombre vacío → `Sin nombre` en `textSecondary`; sin duración → `—`; Etapa `—` si hay errores. Las actividades de la ruta crítica llevan una barra izquierda `primary` y el código en negrita. Encima: selector de unidad con chips (`semanas`, `días`, `horas`, `meses`). Debajo: botón `Agregar actividad`. Vacía: `Todavía no hay actividades.` + `Agregar actividad` + `Cargar ejemplo` (→ `/graphs`).
- Tocar una fila abre `ActivityDialog` (título `Editar actividad` / `Nueva actividad`): campos `Código` (validado con `isValidLabel` y único; mensaje `Ya existe una actividad con ese código.`), `Actividad` (máx. 80), `Duración (semanas)` con teclado numérico (`parseDuration`; error `Escribe un número entre 0 y 9999, o déjalo vacío.`), chips `Predecesoras` con todos los demás códigos (seleccionado = relleno `primary`). Botones `Borrar` (solo al editar, color `danger`), `Cancelar`, `Guardar`. Guardar despacha `saveActivity`; Borrar despacha `removeActivity`.
- Grafo: mismo patrón que `ColorScreen` (lienzo, encuadre por `fitKey`, `SelectionBar` con renombrar/borrar, `RenameDialog`, `NoticeSnackbar`); estado vacío `Toca para crear una actividad` / `Luego toca la predecesora y después la actividad para unirlas con una flecha.` La barra: Deshacer, Rehacer, Reorganizar (`stageLayout` vía `setPositions`), Limpiar, principal `Analizar` (ícono `account-tree`, deshabilitado sin actividades). En la vista Tabla la barra no muestra Reorganizar. `Analizar` cambia a la vista Grafo y abre la hoja.
- `PrecedencePanel` dentro de `ResultsSheet`:
  - con issues: tarjeta `Errores` con los mensajes; nada más.
  - `Etapas`: `8 etapas` y una `HighlightRow` por etapa (`Etapa 1: A`, …) que alterna el resaltado.
  - `StepPlayer` con los pasos de Kahn (`swatchColor` = color de la etapa del paso).
  - `Orden topológico`: `A, B, C, …` y `Iniciales: A · Finales: M`.
  - `Ruta crítica`: con `schedule`, `Duración total: 14 semanas`, una `HighlightRow` por ruta (`pathLabel`) que alterna `{ kind: 'critical' }` y `ScheduleTable` (`Act. | IT | FT | IL | FL | Holgura`, críticas en negrita, nota `IT/FT: inicio y fin temprano · IL/FL: inicio y fin tardío`); sin ella, `Agrega la duración de todas las actividades para calcular la ruta crítica. Faltan: C y D.` (`joinSpanish`).
  - `Etapas como coloración`: texto `Las etapas también son una coloración del grafo sin direcciones. Compáralas con el número cromático.` y botón `Ver etapas como coloración` (la acción llega en Task 7; aquí queda el `onPress` como prop).

- [ ] **Step 1: Write the failing test** — en `present.test.ts`: `toggleTarget({ target: null, step: { key: 'k', index: 2 } }, { kind: 'critical' })` → `{ target: { kind: 'critical' }, step: null }`; repetirlo apaga el target; `changeStep({ target: { kind: 'stage', stage: 2 }, step: null }, { key: 'k', index: 1 }, 8)` → `target: null`; con `index` 8 lo conserva.
- [ ] **Step 2: Run** `npx jest src/lib/precedence/__tests__/present.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** las funciones y luego la pantalla y sus componentes. Con `typedRoutes` activo, arrancar Metro una vez (`npx expo start`) regenera `.expo/types` para que `'/precedence'` tipe.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: verde.
- [ ] **Step 5: Commit** — `feat: pestaña Precedencias con tabla, grafo, etapas animadas y ruta crítica`

---

### Task 7: Puente "Ver etapas como coloración" y ejemplos en Mis grafos

**Files:**
- Create: `src/components/results/stage-bridge-card.tsx`
- Modify: `src/app/precedence.tsx` (acción del puente), `src/app/index.tsx` (pintar etapas y mostrar la tarjeta), `src/hooks/use-results-view.ts` (exponer `replaying`), `src/components/results/results-panel.tsx` (tarjeta del puente arriba), `src/app/graphs.tsx` (sección `Ejemplos de precedencias`; cargar un ejemplo de coloración llama `dismissBridge()`)

**Interfaces:**
- Consumes: Task 2 (`stageBridge`, `activeBridge`), Task 4 (`useStageBridge`, `useColoringEditor`, `usePrecedenceEditor`), Task 3 (`PRECEDENCE_EXAMPLES`, `layeredLayout`).

Comportamiento:
- En Precedencias, `Ver etapas como coloración` (solo con análisis válido): `replaceDoc` en el editor de coloración con el grafo no dirigido, las posiciones actuales de precedencias y el mensaje `Se abrió el grafo de etapas en Colorear.` (deshacible); `showBridge(bridge)`; cerrar la hoja; `router.navigate('/')`.
- En Colorear, con `activeBridge(bridge, doc.graph)`: al llegar se abre la hoja una vez por puente (ajuste de estado en render, como `fitKey`); el lienzo se pinta por etapas mientras el modo de pintura sea `Por etapas` y el reproductor no esté retrocediendo.
- `StageBridgeCard` (primera tarjeta de `ResultsPanel` si hay puente activo): título `Etapas como coloración`; dos recuadros lado a lado `Etapas` / `8 colores` y `χ(G)` / `3` (o el valor de `chromaticLabel`); `SegmentedControl` `Por etapas | Óptima` que cambia la pintura del lienzo; y la explicación:
  - `Toda flecha une actividades de etapas distintas, así que pintar cada etapa de un color da una coloración válida: número de etapas ≥ χ(G).`
  - `En esta orientación el camino más largo tiene 8 actividades (A → B → C → E → G → J → K → M); por eso hay 8 etapas.`
  - `Teorema de Gallai–Hasse–Roy–Vitaver: χ(G) es el mínimo, entre todas las orientaciones sin ciclos de G, del número de vértices del camino más largo.`
- Mis grafos: subtítulo `Toca un ejemplo para abrirlo.`; secciones `Ejemplos de coloración` (lo actual) y `Ejemplos de precedencias` (tarjeta con miniatura, nombre, descripción, `13 actividades · 16 precedencias`, insignia `8 etapas`). Cargar → `replaceDoc` en precedencias con `{ graph, positions: layeredLayout(...), activities: info, unit }`, mensaje `Se cargó «…».`, `router.navigate('/precedence')`.

- [ ] **Step 1: Verify the logic is covered** — `activeBridge`/`stageBridge` ya tienen pruebas (Task 2). Agregar en `bridge.test.ts`: tras `replaceDoc` del ejemplo `homework` de coloración, `activeBridge` sigue devolviendo el puente (misma clave) — por eso `graphs.tsx` llama `dismissBridge()`; el test documenta la razón.
- [ ] **Step 2: Run** `npx jest src/lib/precedence/__tests__/bridge.test.ts` — Expected: PASS (documenta el comportamiento que obliga a `dismissBridge`).
- [ ] **Step 3: Implement** la tarjeta, la integración en `ColorScreen`, la acción en Precedencias y Mis grafos.
- [ ] **Step 4: Run** `npx jest && npx tsc --noEmit && npx expo lint` — Expected: verde.
- [ ] **Step 5: Commit** — `feat: puente de etapas a coloración y ejemplos de precedencias en Mis grafos`

---

### Task 8: Verificación de punta a punta

**Files:** ninguno nuevo (correcciones donde haga falta).

- [ ] **Step 1:** `npx jest` (todo), `npx tsc --noEmit`, `npx expo lint` — Expected: verde.
- [ ] **Step 2:** Revisión visual en Chrome con el setup web temporal (receta de P1: shim de `@expo/ui/jetpack-compose`, `metro.config.js` temporal, viewport 412×915): pasos 6 y 7 del guion — cargar la tarea, tabla con etapas, grafo con flechas por columnas, Analizar → 8 etapas, animación, ruta crítica de 14 semanas, puente → 8 colores vs χ = 3; crear un ciclo y ver el rojo; borrar D y deshacer. Capturas al scratchpad. Revertir el setup web.
- [ ] **Step 3:** `npx expo export --platform android` — Expected: compila.
- [ ] **Step 4:** Commit de las correcciones si las hubo — `fix: …`.
