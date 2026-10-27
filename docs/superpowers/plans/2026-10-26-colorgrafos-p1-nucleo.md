# ColorGrafos P1 (núcleo de coloración) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la prioridad P1 del diseño. El resultado es un APK de Android, sin internet, donde se dibuja o escribe un grafo, se colorea con los 5 algoritmos y se ven χ(G), cotas, estructura y la animación paso a paso, con los ejemplos de la web.

**Architecture:**
- Toda la lógica (modelo, parsers, análisis, algoritmos, layout, geometría y estado del editor) es TypeScript puro en `src/lib/` y `src/state/`, con TDD en Jest.
- Los algoritmos devuelven sus **pasos como datos**. El reproductor y las explicaciones solo recorren esa lista.
- La interfaz está en Expo Router con `NativeTabs`:
  - El lienzo es SVG (`react-native-svg`) con gestos de Gesture Handler 3 (API de hooks).
  - El estado del editor vive en un reducer con deshacer/rehacer, compartido entre pestañas por un Context.

**Tech Stack:** Expo SDK 58, React Native 0.88, React 19.3 (React Compiler activo), TypeScript strict, Expo Router (`expo-router/native-tabs`), react-native-gesture-handler 3.3, react-native-reanimated 4.7, react-native-svg, expo-sqlite (`expo-sqlite/kv-store`), @expo/ui (Slider de Jetpack Compose), @expo/vector-icons, jest-expo + Jest 30, EAS Build.

**Spec:** `docs/superpowers/specs/2026-10-26-calculadora-coloracion-grafos-design.md` (secciones §7.1–§7.3, §7.5 ejemplos, §8 y §10 fila P1).

## Global Constraints

- Plataforma objetivo: **Android**, sin internet. La app se instala como **APK** (EAS Build, perfil `preview`, `"buildType": "apk"`). Expo Go solo se usa en desarrollo.
- Dependencias: siempre con `npx expo install <paquete>`. El proyecto usa **npm** (`package-lock.json`), no bun.
- Antes de usar cualquier API de Expo o React Native, consultar la doc versionada: `https://docs.expo.dev/versions/v58.0.0/`. Para Gesture Handler 3: `https://docs.swmansion.com/react-native-gesture-handler/`.
- No crear ni editar `android/` ni `ios/`. En `src/app/` solo van rutas; el resto va fuera de `src/app/`.
- `NativeTabs` viene de `expo-router/native-tabs`. Máximo 5 pestañas, definidas de forma estática.
- Toda la interfaz y todos los mensajes van **en español**. Los identificadores de código van en inglés, como en la plantilla.
- Límites: **60 vértices, 600 aristas**. Etiquetas: letras Unicode, dígitos o `_`, de 1 a 12 caracteres (`/^[\p{L}\p{N}_]{1,12}$/u`). No se permiten lazos. Las aristas duplicadas se fusionan con aviso.
- "Exacto" se muestra **solo** si está demostrado. La búsqueda exacta nunca bloquea la interfaz y siempre se puede cancelar.
- Antes de cerrar cada tarea: `npx jest`, `npx tsc --noEmit` y `npx expo lint` deben pasar.
- Commits en español con estilo convencional (`feat:`, `test:`, `chore:`), terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Refinamientos del diseño hechos en este plan (decisiones de Claude):**

1. **Encadenar conexiones.** Tras crear una arista, la selección pasa al vértice tocado. Así se dibuja un pentágono tocando A, B, C, D, E, A. Si la arista ya existía, solo se mueve la selección. El §7.2a decía "se selecciona [la arista]".
2. **Etiquetas Unicode.** Se aceptan letras Unicode (`Física`), lo que amplía las reglas de la web.
3. **Pestañas por etapa.** En P1 hay 2 pestañas: **Colorear** y **Mis grafos** (solo ejemplos). Precedencias llega en P2 y Aprende en P3, cada una con su propio plan.

## Review Focus

1. **Editar o reemplazar el grafo mientras corre la búsqueda exacta.** Nunca debe mostrarse el χ del grafo anterior. Prueba en Tarea 5 (cancelación a mitad de búsqueda); además, el hook de la Tarea 12 descarta resultados con otro `graphKey`.
2. **Grafo vacío, de un vértice o sin aristas.** χ = 0 / 1 / 1, sin fallos, y el botón "Colorear" deshabilitado con 0 vértices. Pruebas en las Tareas 3, 4 y 5.
3. **Grafos desconexos**, como C₄ ∪ C₅. Brooks se calcula por componente, y el ciclo impar se busca en cualquier componente. Prueba en Tarea 3.
4. **Texto pegado "sucio".** CRLF, comas al final, líneas vacías, espacios extra, acentos y flechas `→` deben interpretarse bien. Prueba en Tarea 2.
5. **Autoguardado corrupto o de otra versión.** La app arranca con un grafo vacío y sin fallos. Prueba en Tarea 7.

---

## File Structure

```text
src/
  lib/
    graph/types.ts              tipos base, límites
    graph/graph.ts              operaciones inmutables sobre Graph
    graph/text.ts               parseGraphText / graphToText
    examples/coloring-examples.ts  13 ejemplos (texto + χ esperado)
    analysis/degrees.ts         degreeStats
    analysis/components.ts      connectedComponents
    analysis/bipartite.ts       checkBipartite (+ ciclo impar)
    analysis/clique.ts          findMaximumClique
    analysis/bounds.ts          chromaticBounds
    coloring/types.ts           Coloring, ColoringStep, ColoringResult, AlgorithmId, etiquetas
    coloring/validate.ts        conflictingEdges, isProperColoring, colorClasses
    coloring/replay.ts          coloringAtStep
    coloring/greedy.ts | welsh-powell.ts | dsatur.ts
    coloring/exact.ts           exactBounds, exactSearch (generador), exactColoringSync
    coloring/run-exact.ts       runExact (presupuesto, cancelación, cesión de control)
    coloring/present.ts         selectDisplayedResult, chromaticLabel, colorsUsedWarning
    layout/layouts.ts           circle/force/auto layout, fromNormalized, fitViewport, mergePositions
    geometry.ts                 Viewport, conversiones, hit testing, constantes de tamaño
  state/
    editor-reducer.ts           EditorState + editorReducer (deshacer/rehacer)
    doc-serialization.ts        serializeDoc / deserializeDoc
    storage.ts                  loadDoc / saveDoc (kv-store)
    editor-context.tsx          EditorProvider + useColoringEditor (autoguardado)
  constants/theme.ts            (modificar) tokens de color
  constants/palette.ts          paleta de colores del grafo
  hooks/use-coloring-analysis.ts
  components/
    graph-canvas/graph-canvas.tsx   SVG + gestos
    graph-thumbnail.tsx
    editor-toolbar.tsx | selection-bar.tsx | notice-snackbar.tsx | rename-dialog.tsx
    segmented-control.tsx | graph-text-editor.tsx
    results/results-sheet.tsx | algorithm-picker.tsx | chromatic-card.tsx
    results/color-classes.tsx | bounds-card.tsx | structure-card.tsx | step-player.tsx
  app/
    _layout.tsx                 (modificar) raíz
    index.tsx                   (reemplazar) pantalla Colorear
    graphs.tsx                  (crear) pantalla Mis grafos
eas.json                        (crear)
```

Las pruebas viven junto al código, en `__tests__/` (por ejemplo `src/lib/graph/__tests__/graph.test.ts`), **nunca** dentro de `src/app/`.

---

### Task 1: Configurar Jest y modelo de grafo

**Files:**
- Modify: `package.json` (dependencias de desarrollo, script `test`, bloque `jest`), `tsconfig.json` (`compilerOptions.types`)
- Create: `src/lib/graph/types.ts`, `src/lib/graph/graph.ts`
- Test: `src/lib/graph/__tests__/graph.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type VertexId = string;                       // la etiqueta ES el id
  export type Edge = readonly [VertexId, VertexId];
  export interface Graph { readonly directed: boolean; readonly vertices: readonly VertexId[]; readonly edges: readonly Edge[] }
  export interface Point { x: number; y: number }
  export type Positions = Readonly<Record<VertexId, Point>>;
  export type EditError = 'invalid-label' | 'duplicate-vertex' | 'unknown-vertex' | 'self-loop' | 'limit-vertices' | 'limit-edges';
  export type EditResult = { ok: true; graph: Graph } | { ok: false; error: EditError };
  export const LIMITS = { maxVertices: 60, maxEdges: 600, maxLabelLength: 12 } as const;
  ```
- Produces (`graph.ts`): `emptyGraph(directed?: boolean): Graph`, `isValidLabel(label: string): boolean`, `addVertex(g, label): EditResult`, `removeVertex(g, id): Graph`, `addEdge(g, a, b): EditResult`, `removeEdge(g, a, b): Graph`, `hasEdge(g, a, b): boolean`, `renameVertex(g, from, to): EditResult`, `undirectedAdjacency(g): Map<VertexId, Set<VertexId>>`, `nextLabel(existing: readonly VertexId[]): VertexId`, `graphKey(g): string`

- [ ] **Step 1: Instalar y configurar Jest**

Run: `npx expo install jest-expo jest @types/jest -- --dev`

En `package.json`, agregar `"test": "jest"` a `scripts` y este bloque:
```json
"jest": {
  "preset": "jest-expo",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" }
}
```
En `tsconfig.json`, agregar `"types": ["jest"]` dentro de `compilerOptions`.

- [ ] **Step 2: Escribir las pruebas que fallan**

```ts
// src/lib/graph/__tests__/graph.test.ts
import { LIMITS } from '../types';
import { addEdge, addVertex, emptyGraph, graphKey, hasEdge, isValidLabel, nextLabel,
  removeEdge, removeVertex, renameVertex, undirectedAdjacency } from '../graph';

const ok = (r: ReturnType<typeof addVertex>) => { if (!r.ok) throw new Error(r.error); return r.graph; };
const tri = () => ok(addEdge(ok(addEdge(ok(addEdge(
  ['A', 'B', 'C'].reduce((g, v) => ok(addVertex(g, v)), emptyGraph()), 'A', 'B')), 'B', 'C')), 'C', 'A'));

describe('graph', () => {
  it('valida etiquetas', () => {
    expect(isValidLabel('A')).toBe(true);
    expect(isValidLabel('Física')).toBe(true);
    expect(isValidLabel('x_1')).toBe(true);
    expect(isValidLabel('')).toBe(false);
    expect(isValidLabel('A-B')).toBe(false);
    expect(isValidLabel('ABCDEFGHIJKLM')).toBe(false); // 13 caracteres
  });
  it('agrega vértices y rechaza duplicados e inválidos', () => {
    const g = ok(addVertex(emptyGraph(), 'A'));
    expect(g.vertices).toEqual(['A']);
    expect(addVertex(g, 'A')).toEqual({ ok: false, error: 'duplicate-vertex' });
    expect(addVertex(g, 'A$')).toEqual({ ok: false, error: 'invalid-label' });
  });
  it('respeta el límite de 60 vértices', () => {
    let g = emptyGraph();
    for (let i = 0; i < LIMITS.maxVertices; i++) g = ok(addVertex(g, `v${i}`));
    expect(addVertex(g, 'extra')).toEqual({ ok: false, error: 'limit-vertices' });
  });
  it('aristas no dirigidas: sin lazos, duplicados idempotentes en ambos sentidos', () => {
    const g = tri();
    expect(g.edges).toHaveLength(3);
    expect(hasEdge(g, 'B', 'A')).toBe(true);
    expect(addEdge(g, 'A', 'A')).toEqual({ ok: false, error: 'self-loop' });
    expect(addEdge(g, 'Z', 'A')).toEqual({ ok: false, error: 'unknown-vertex' });
    expect(ok(addEdge(g, 'B', 'A')).edges).toHaveLength(3);
  });
  it('aristas dirigidas: A→B y B→A son distintas', () => {
    let g = ['A', 'B'].reduce((acc, v) => ok(addVertex(acc, v)), emptyGraph(true));
    g = ok(addEdge(ok(addEdge(g, 'A', 'B')), 'B', 'A'));
    expect(g.edges).toEqual([['A', 'B'], ['B', 'A']]);
    expect(hasEdge(g, 'A', 'B')).toBe(true);
  });
  it('borra vértices con sus aristas y borra aristas en cualquier orden', () => {
    expect(removeVertex(tri(), 'A').edges).toEqual([['B', 'C']]);
    expect(removeEdge(tri(), 'B', 'A').edges).toHaveLength(2);
  });
  it('renombra actualizando aristas; rechaza nombre existente', () => {
    const g = ok(renameVertex(tri(), 'A', 'X'));
    expect(g.vertices).toEqual(['X', 'B', 'C']);
    expect(hasEdge(g, 'X', 'B')).toBe(true);
    expect(renameVertex(tri(), 'A', 'B')).toEqual({ ok: false, error: 'duplicate-vertex' });
  });
  it('adyacencia no dirigida', () => {
    expect([...undirectedAdjacency(tri()).get('A')!].sort()).toEqual(['B', 'C']);
  });
  it('nextLabel: A..Z, luego A1..Z1, A2…', () => {
    expect(nextLabel([])).toBe('A');
    expect(nextLabel(['A', 'B'])).toBe('C');
    expect(nextLabel(['A', 'C'])).toBe('B');
    const az = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    expect(nextLabel(az)).toBe('A1');
    expect(nextLabel([...az, 'A1'])).toBe('B1');
  });
  it('graphKey es canónico (no depende del orden)', () => {
    const g1 = tri();
    const g2 = ok(addEdge(ok(addEdge(ok(addEdge(
      ['C', 'B', 'A'].reduce((g, v) => ok(addVertex(g, v)), emptyGraph()), 'B', 'C')), 'A', 'C')), 'B', 'A'));
    expect(graphKey(g1)).toBe(graphKey(g2));
    expect(graphKey(g1)).not.toBe(graphKey(removeEdge(g1, 'A', 'B')));
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `npx jest src/lib/graph`
Expected: FAIL con "Cannot find module '../types'"

- [ ] **Step 4: Implementar `types.ts` y `graph.ts`**

Todas las funciones son puras y devuelven objetos nuevos. Las aristas no dirigidas se guardan tal como se insertaron y se comparan sin importar el orden de los extremos. `addEdge` devuelve `{ ok: true, graph: g }` (el mismo objeto) si la arista ya existe, y `limit-edges` al llegar a 600. `graphKey` = `directed` + vértices ordenados + aristas normalizadas y ordenadas, todo unido en un string.

- [ ] **Step 5: Verificar que pasan**

Run: `npx jest src/lib/graph && npx tsc --noEmit`
Expected: PASS, sin errores de tipos

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/lib/graph
git commit -m "feat: modelo de grafo inmutable y configuración de Jest"
```

---

### Task 2: Parser y serializador de texto

**Files:**
- Create: `src/lib/graph/text.ts`
- Test: `src/lib/graph/__tests__/text.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Graph`, `addVertex`, `addEdge`, `emptyGraph`, `graphKey`, `LIMITS`, `isValidLabel`)
- Produces:
  ```ts
  export type TextFormat = 'edges' | 'adjacency';
  export interface ParseIssue { line: number; message: string }   // line 1-based; 0 = global
  export interface ParseResult { graph: Graph | null; errors: ParseIssue[]; warnings: ParseIssue[] }
  export function parseGraphText(text: string, format: TextFormat, directed: boolean): ParseResult;
  export function graphToText(g: Graph, format: TextFormat): string;
  ```

**Gramática:**
- **Lista de aristas:** las líneas se separan con `\r?\n` y cada línea se divide por `,`. Cada token sin espacios sobrantes (los vacíos se ignoran) se divide con `/\s*(?:->|→|-)\s*|\s+/u`:
  - 1 parte = vértice aislado.
  - 2 partes = arista.
  - Otro caso = error.
- **Lista de adyacencia:** cada línea es `X: A, B C` (vecinos separados por coma o espacio) o `X:` (vértice aislado). Si falta `:`, es error.
- Los vértices quedan en el orden de su primera aparición. Si hay errores, `graph = null`.
- En formato de adyacencia no dirigido, que una arista aparezca en ambos sentidos (`A: B` y `B: A`) es lo normal y **no** genera aviso. El aviso de duplicado solo sale si una misma línea repite un vecino (`A: B, B`).

**Mensajes exactos:**

| Caso | Mensaje |
| --- | --- |
| Lazo | `Línea ${n}: '${a}-${a}' es un lazo; no se permiten.` |
| Etiqueta inválida | `Línea ${n}: '${label}' no es una etiqueta válida (usa letras, dígitos o _, máximo 12 caracteres).` |
| Token ilegible | `Línea ${n}: no se entiende '${token}'.` |
| Falta `:` | `Línea ${n}: falta ':' después del vértice (ejemplo: A: B, C).` |
| Límite de vértices (line 0) | `El grafo tiene ${n} vértices; el máximo es 60.` |
| Límite de aristas (line 0) | `El grafo tiene ${m} aristas; el máximo es 600.` |
| Aviso de duplicado | `Línea ${n}: la arista ${a}-${b} está repetida; se fusionó.` |

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/graph/__tests__/text.test.ts
import { graphKey } from '../graph';
import { graphToText, parseGraphText } from '../text';

describe('parseGraphText', () => {
  it('lista de aristas con separadores variados', () => {
    const r = parseGraphText('A-B, B C\nC->D\nD→A', 'edges', false);
    expect(r.errors).toEqual([]);
    expect(r.graph!.vertices).toEqual(['A', 'B', 'C', 'D']);
    expect(r.graph!.edges).toHaveLength(4);
  });
  it('texto sucio: CRLF, comas finales, líneas vacías, espacios, acentos', () => {
    const r = parseGraphText('  Física - Química ,\r\n\r\nQuímica-Cálculo,,\r\n', 'edges', false);
    expect(r.errors).toEqual([]);
    expect(r.graph!.vertices).toEqual(['Física', 'Química', 'Cálculo']);
    expect(r.graph!.edges).toHaveLength(2);
  });
  it('vértice aislado como etiqueta sola', () => {
    expect(parseGraphText('A-B\nF', 'edges', false).graph!.vertices).toEqual(['A', 'B', 'F']);
  });
  it('lazo, etiqueta inválida y token ilegible', () => {
    const r = parseGraphText('A-B\nB-C\nA-A\nA$-B\nA-B-C', 'edges', false);
    expect(r.graph).toBeNull();
    expect(r.errors).toEqual([
      { line: 3, message: "Línea 3: 'A-A' es un lazo; no se permiten." },
      { line: 4, message: "Línea 4: 'A$' no es una etiqueta válida (usa letras, dígitos o _, máximo 12 caracteres)." },
      { line: 5, message: "Línea 5: no se entiende 'A-B-C'." },
    ]);
  });
  it('duplicados se fusionan con aviso', () => {
    const r = parseGraphText('A-B\nB-A', 'edges', false);
    expect(r.graph!.edges).toHaveLength(1);
    expect(r.warnings).toEqual([{ line: 2, message: 'Línea 2: la arista B-A está repetida; se fusionó.' }]);
  });
  it('límite de 60 vértices', () => {
    const text = Array.from({ length: 61 }, (_, i) => `v${i}`).join('\n');
    expect(parseGraphText(text, 'edges', false).errors).toEqual(
      [{ line: 0, message: 'El grafo tiene 61 vértices; el máximo es 60.' }]);
  });
  it('lista de adyacencia (la simetría no genera avisos)', () => {
    const r = parseGraphText('A: B, C\nB: A D\nC:\nD: B', 'adjacency', false);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.graph!.vertices).toEqual(['A', 'B', 'C', 'D']);
    expect(r.graph!.edges).toHaveLength(3);
  });
  it('adyacencia sin dos puntos', () => {
    expect(parseGraphText('A B C', 'adjacency', false).errors[0].message)
      .toBe("Línea 1: falta ':' después del vértice (ejemplo: A: B, C).");
  });
  it('en modo dirigido A->B y B->A son dos aristas', () => {
    expect(parseGraphText('A->B\nB->A', 'edges', true).graph!.edges).toHaveLength(2);
  });
});

describe('graphToText', () => {
  it('ida y vuelta conserva el grafo en ambos formatos', () => {
    const g = parseGraphText('A-B\nB-C\nC-A\nF', 'edges', false).graph!;
    for (const f of ['edges', 'adjacency'] as const) {
      expect(graphKey(parseGraphText(graphToText(g, f), f, false).graph!)).toBe(graphKey(g));
    }
  });
  it('formato de aristas: una por línea; dirigido usa ->', () => {
    expect(graphToText(parseGraphText('A-B', 'edges', false).graph!, 'edges')).toBe('A-B');
    expect(graphToText(parseGraphText('A->B', 'edges', true).graph!, 'edges')).toBe('A->B');
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/lib/graph/__tests__/text.test.ts`
Expected: FAIL con "Cannot find module '../text'"

- [ ] **Step 3: Implementar `parseGraphText` y `graphToText` en `src/lib/graph/text.ts`**

Formatos de salida de `graphToText`:
- **Aristas:** una arista por línea (`A-B` o `A->B`) en el orden del grafo, seguida de una línea por cada vértice aislado.
- **Adyacencia:** una línea por vértice, en orden: `A: B, C`, o `A:` si no tiene vecinos. En grafos no dirigidos se listan todos los vecinos; en dirigidos, solo los sucesores.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/lib/graph`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph
git commit -m "feat: parser y serializador de listas de aristas y adyacencia"
```

---

### Task 3: Ejemplos y análisis estructural

**Files:**
- Create: `src/lib/examples/coloring-examples.ts`, `src/lib/analysis/degrees.ts`, `components.ts`, `bipartite.ts`, `clique.ts`, `bounds.ts`
- Test: `src/lib/examples/__tests__/coloring-examples.test.ts`, `src/lib/analysis/__tests__/analysis.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2
- Produces:
  ```ts
  // examples/coloring-examples.ts
  export interface ColoringExample { id: string; name: string; description: string; format: TextFormat; text: string;
    chromaticNumber: number; layout?: Positions /* normalizado a [0,1]×[0,1]; opcional */ }
  export const COLORING_EXAMPLES: readonly ColoringExample[];
  export function exampleGraph(ex: ColoringExample): Graph;            // lanza Error si el texto no parsea
  export function findExample(id: string): ColoringExample;            // lanza Error si no existe
  // analysis/*
  export interface DegreeStats { byVertex: Readonly<Record<VertexId, number>>; min: number; max: number; average: number; sequence: number[] }
  export function degreeStats(g: Graph): DegreeStats;                  // vacío → 0, 0, 0, []
  export function connectedComponents(g: Graph): VertexId[][];
  export type BipartiteResult = { bipartite: true; parts: [VertexId[], VertexId[]] } | { bipartite: false; oddCycle: VertexId[] };
  export function checkBipartite(g: Graph): BipartiteResult;
  export function findMaximumClique(g: Graph, budgetMs?: number): { clique: VertexId[]; exact: boolean };  // default 500
  export interface Bounds { lower: number; lowerReason: 'empty' | 'edgeless' | 'clique' | 'odd-cycle'; deltaPlusOne: number; brooks: number }
  export function chromaticBounds(g: Graph, cliqueSize: number, bipartite: boolean): Bounds;
  ```

**Datos de los ejemplos** (fijados por el diseño; `format: 'edges'` salvo donde se indica):

| id | name | text | χ |
| --- | --- | --- | :---: |
| `c4` | Ciclo C₄ | `A-B, B-C, C-D, D-A` | 2 |
| `k3` | Triángulo K₃ | `A-B, B-C, C-A` | 3 |
| `k5` | Completo K₅ | las 10 aristas entre A..E | 5 |
| `c5` | Pentágono C₅ | `A-B, B-C, C-D, D-E, E-A` | 3 |
| `w6` | Rueda W₆ | `O-A, O-B, O-C, O-D, O-E, O-F, A-B, B-C, C-D, D-E, E-F, F-A` | 3 |
| `k33` | Bipartito completo K₃,₃ | `A-X, A-Y, A-Z, B-X, B-Y, B-Z, C-X, C-Y, C-Z` | 2 |
| `adjacency-sample` (format `adjacency`) | Ejemplo con lista de adyacencia | `A: B, C` / `B: A, D, E` / `C: A, F` / `D: B` / `E: B, F` / `F: C, E` (una por línea) | 3 |
| `exams` | Horario de exámenes | `Cálculo-Física, Cálculo-Álgebra, Cálculo-Programación, Física-Química, Física-Álgebra, Álgebra-Estadística, Programación-Estadística, Programación-Inglés, Química-Inglés, Estadística-Inglés` | 3 |
| `petersen` | Grafo de Petersen | `A-B, B-C, C-D, D-E, E-A, A-F, B-G, C-H, D-I, E-J, F-H, H-J, J-G, G-I, I-F` | 3 |
| `tree` | Árbol | `A-B, A-C, B-D, B-E, C-F, C-G` | 2 |
| `q3` | Cubo Q₃ | `A-B, B-C, C-D, D-A, E-F, F-G, G-H, H-E, A-E, B-F, C-G, D-H` | 2 |
| `w5` | Rueda W₅ | `O-A, O-B, O-C, O-D, O-E, A-B, B-C, C-D, D-E, E-A` | 4 |
| `homework` | Tarea: plataforma para construir una casa | `A-B, B-C, B-D, C-E, C-F, D-I, E-G, E-H, G-J, H-J, I-J, F-K, J-K, J-L, K-M, L-M` | 3 |

Cada `description` es una frase corta en español. Por ejemplo, para `exams`: "Materias como vértices; una arista indica que comparten estudiantes. Cada color es una franja horaria". Para ruedas, Petersen, K₃,₃ y Q₃ se puede dar `layout` normalizado para que se vean como en los libros; es opcional.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/examples/__tests__/coloring-examples.test.ts
import { COLORING_EXAMPLES, exampleGraph, findExample } from '../coloring-examples';

it('los 13 ejemplos parsean y tienen ids únicos', () => {
  expect(COLORING_EXAMPLES).toHaveLength(13);
  expect(new Set(COLORING_EXAMPLES.map((e) => e.id)).size).toBe(13);
  for (const ex of COLORING_EXAMPLES) expect(exampleGraph(ex).vertices.length).toBeGreaterThan(0);
});
it('tamaños conocidos', () => {
  const size = (id: string) => { const g = exampleGraph(findExample(id)); return [g.vertices.length, g.edges.length]; };
  expect(size('petersen')).toEqual([10, 15]);
  expect(size('homework')).toEqual([13, 16]);
  expect(size('exams')).toEqual([7, 10]);
  expect(size('w6')).toEqual([7, 12]);
  expect(size('k5')).toEqual([5, 10]);
});
```

```ts
// src/lib/analysis/__tests__/analysis.test.ts
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import { chromaticBounds } from '../bounds';
import { checkBipartite } from '../bipartite';
import { findMaximumClique } from '../clique';
import { connectedComponents } from '../components';
import { degreeStats } from '../degrees';

const ex = (id: string) => exampleGraph(findExample(id));
const c4c5 = parseGraphText('A-B, B-C, C-D, D-A, P-Q, Q-R, R-S, S-T, T-P', 'edges', false).graph!;
const isOddCycleOf = (g: ReturnType<typeof ex>, cyc: string[]) =>
  cyc.length % 2 === 1 && cyc.every((v, i) => g.edges.some(([a, b]) => {
    const w = cyc[(i + 1) % cyc.length]; return (a === v && b === w) || (a === w && b === v); }));

describe('degreeStats', () => {
  it('tarea', () => {
    const d = degreeStats(ex('homework'));
    expect([d.min, d.max]).toEqual([1, 5]);
    expect(d.average).toBeCloseTo(32 / 13);
    expect(d.sequence).toEqual([5, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1]);
    expect(d.byVertex.J).toBe(5);
  });
  it('grafo vacío', () => expect(degreeStats(emptyGraph())).toMatchObject({ min: 0, max: 0, average: 0, sequence: [] }));
});

describe('connectedComponents', () => {
  it('C₄ ∪ C₅ tiene 2 componentes', () => expect(connectedComponents(c4c5).map((c) => c.length).sort()).toEqual([4, 5]));
  it('vértices aislados son componentes', () =>
    expect(connectedComponents(parseGraphText('A\nB\nC', 'edges', false).graph!)).toHaveLength(3));
});

describe('checkBipartite', () => {
  it('K₃,₃ es bipartito', () => {
    const r = checkBipartite(ex('k33'));
    expect(r.bipartite).toBe(true);
    if (r.bipartite) expect(r.parts.map((p) => p.length).sort()).toEqual([3, 3]);
  });
  it.each(['c5', 'petersen', 'homework'])('%s no es bipartito y da un ciclo impar válido', (id) => {
    const r = checkBipartite(ex(id));
    expect(r.bipartite).toBe(false);
    if (!r.bipartite) expect(isOddCycleOf(ex(id), r.oddCycle)).toBe(true);
  });
  it('desconexo C₄ ∪ C₅: el ciclo impar está en la componente C₅', () => {
    const r = checkBipartite(c4c5);
    expect(r.bipartite).toBe(false);
    if (!r.bipartite) { expect(isOddCycleOf(c4c5, r.oddCycle)).toBe(true); expect(r.oddCycle.every((v) => 'PQRST'.includes(v))).toBe(true); }
  });
});

describe('findMaximumClique', () => {
  it.each([['k5', 5], ['petersen', 2], ['w5', 3], ['homework', 2], ['exams', 3], ['k33', 2]])('%s → ω = %i', (id, w) => {
    const r = findMaximumClique(ex(id as string));
    expect(r.clique).toHaveLength(w as number);
    expect(r.exact).toBe(true);
  });
  it('vacío → []', () => expect(findMaximumClique(emptyGraph()).clique).toEqual([]));
});

describe('chromaticBounds', () => {
  it('Petersen', () => expect(chromaticBounds(ex('petersen'), 2, false))
    .toEqual({ lower: 3, lowerReason: 'odd-cycle', deltaPlusOne: 4, brooks: 3 }));
  it('K₅ (completo: Brooks no mejora)', () => expect(chromaticBounds(ex('k5'), 5, false))
    .toEqual({ lower: 5, lowerReason: 'clique', deltaPlusOne: 5, brooks: 5 }));
  it('C₄ ∪ C₅: Brooks por componente', () => expect(chromaticBounds(c4c5, 2, false))
    .toEqual({ lower: 3, lowerReason: 'odd-cycle', deltaPlusOne: 3, brooks: 3 }));
  it('vacío y sin aristas', () => {
    expect(chromaticBounds(emptyGraph(), 0, true)).toEqual({ lower: 0, lowerReason: 'empty', deltaPlusOne: 0, brooks: 0 });
    expect(chromaticBounds(parseGraphText('A\nB', 'edges', false).graph!, 1, true))
      .toEqual({ lower: 1, lowerReason: 'edgeless', deltaPlusOne: 1, brooks: 1 });
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/lib/examples src/lib/analysis`
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar los ejemplos y los cinco módulos de análisis**

- **`checkBipartite`:** BFS por componente, coloreando con 2 colores y guardando el padre de cada vértice. Al encontrar una arista u–v con el mismo color, el ciclo es el camino de u al ancestro común más el camino de v al mismo ancestro.
- **`findMaximumClique`:** Bron–Kerbosch con pivote. Devuelve `exact: false` con la mejor clique encontrada si se agota `budgetMs`.
- **`chromaticBounds`:**
  - `lower`: n = 0 → 0 (`empty`); m = 0 → 1 (`edgeless`); si no es bipartito y ω < 3 → 3 (`odd-cycle`); en otro caso, ω (`clique`).
  - `deltaPlusOne` = Δ + 1 (0 si el grafo está vacío).
  - `brooks` = el máximo, entre componentes, de Δ_c, o de Δ_c + 1 si la componente es completa o un ciclo impar.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/examples src/lib/analysis
git commit -m "feat: ejemplos de coloración y análisis estructural (grados, componentes, bipartito, clique, cotas)"
```

---

### Task 4: Algoritmos voraces con pasos explicados

**Files:**
- Create: `src/lib/coloring/types.ts`, `validate.ts`, `replay.ts`, `greedy.ts`, `welsh-powell.ts`, `dsatur.ts`
- Test: `src/lib/coloring/__tests__/heuristics.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`undirectedAdjacency`, `degreeStats`, ejemplos)
- Produces:
  ```ts
  // types.ts
  export type Coloring = Readonly<Record<VertexId, number>>;          // índice de color desde 0
  export type AlgorithmId = 'auto' | 'dsatur' | 'welsh-powell' | 'greedy' | 'exact';
  export type ConcreteAlgorithm = Exclude<AlgorithmId, 'auto'>;
  export interface ColoringStep { kind: 'assign' | 'unassign' | 'info'; vertex?: VertexId; color?: number; message: string;
    saturation?: Readonly<Record<VertexId, number>> }                 // solo DSATUR: saturación de los no coloreados ANTES de elegir
  export interface ColoringResult { algorithm: ConcreteAlgorithm; coloring: Coloring; colorsUsed: number;
    steps: readonly ColoringStep[]; stepsTruncated: boolean; elapsedMs: number }
  export const ALGORITHM_LABELS: Record<AlgorithmId, string>;        // 'Auto','DSATUR','Welsh-Powell','Greedy (orden de entrada)','Exacto (backtracking)'
  export const ALGORITHM_SHORT_LABELS: Record<ConcreteAlgorithm, string>; // 'DSATUR','Welsh-Powell','Greedy','Exacto'
  // validate.ts
  export function conflictingEdges(g: Graph, c: Coloring): Edge[];
  export function isProperColoring(g: Graph, c: Coloring): boolean;   // todos coloreados y sin conflictos
  export function colorClasses(g: Graph, c: Coloring): VertexId[][];  // índice = color; vértices en orden del grafo
  // replay.ts
  export function coloringAtStep(steps: readonly ColoringStep[], index: number): Coloring;  // aplica steps[0..index]; -1 → {}
  // greedy.ts / welsh-powell.ts / dsatur.ts
  export function greedyColoring(g: Graph): ColoringResult;
  export function welshPowellColoring(g: Graph): ColoringResult;
  export function dsaturColoring(g: Graph): ColoringResult;
  ```

**Mensajes exactos** (los colores se numeran desde 1 en los textos):

- **Greedy:**
  - `${v} (siguiente en orden de entrada): sus vecinos ya coloreados usan ${lista}. Recibe el color ${c}.`
  - Sin vecinos coloreados: `${v} (siguiente en orden de entrada): no tiene vecinos coloreados. Recibe el color ${c}.`
  - `lista` = colores ascendentes separados por `, `.
- **Welsh-Powell** (barre la lista ordenada una vez por color):
  - Paso inicial `info`: `Orden por grado descendente: B(2), C(2), A(1), D(1).`
  - Al empezar cada color: `info` `Color ${c}: se recorre la lista ordenada.`
  - Al asignar: `${v} (grado ${d}) no es vecino de ningún vértice con color ${c}. Recibe el color ${c}.`
  - Al saltar: `info` con `vertex` = `${v} es vecino de ${u} (color ${c}); se salta.`
  - Desempate de grado: orden de entrada.
- **DSATUR:**
  - `Se elige ${v}: ve ${s} ${s === 1 ? 'color distinto' : 'colores distintos'} y tiene grado ${d}. Recibe el color ${c}, el menor libre.`
  - Criterio: mayor saturación, luego mayor grado y luego orden de entrada.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/coloring/__tests__/heuristics.test.ts
import { COLORING_EXAMPLES, exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { degreeStats } from '@/lib/analysis/degrees';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import { dsaturColoring } from '../dsatur';
import { greedyColoring } from '../greedy';
import { coloringAtStep } from '../replay';
import { colorClasses, conflictingEdges, isProperColoring } from '../validate';
import { welshPowellColoring } from '../welsh-powell';

const ex = (id: string) => exampleGraph(findExample(id));
// Orden de entrada A, D, B, C sobre el camino A-B-C-D: greedy cae en la trampa.
const trap = parseGraphText('A\nD\nA-B\nB-C\nC-D', 'edges', false).graph!;
const algos = { greedy: greedyColoring, 'welsh-powell': welshPowellColoring, dsatur: dsaturColoring };

describe.each(Object.entries(algos))('%s', (_name, run) => {
  it.each(COLORING_EXAMPLES.map((e) => e.id))('coloración propia y χ ≤ colores ≤ Δ+1 en %s', (id) => {
    const r = run(ex(id));
    expect(isProperColoring(ex(id), r.coloring)).toBe(true);
    expect(r.colorsUsed).toBeGreaterThanOrEqual(findExample(id).chromaticNumber);
    expect(r.colorsUsed).toBeLessThanOrEqual(degreeStats(ex(id)).max + 1);
  });
  it('replay del último paso reproduce la coloración final', () => {
    const r = run(ex('petersen'));
    expect(coloringAtStep(r.steps, r.steps.length - 1)).toEqual(r.coloring);
  });
  it('grafo vacío → 0 colores; sin aristas → 1', () => {
    expect(run(emptyGraph()).colorsUsed).toBe(0);
    expect(run(parseGraphText('A\nB\nC', 'edges', false).graph!).colorsUsed).toBe(1);
  });
});

it('DSATUR es óptimo en bipartitos, ciclos, ruedas y completos', () => {
  for (const id of ['c4', 'k3', 'k5', 'c5', 'w6', 'k33', 'tree', 'q3', 'w5'])
    expect(dsaturColoring(ex(id)).colorsUsed).toBe(findExample(id).chromaticNumber);
});
it('Greedy depende del orden: la trampa usa 3; Welsh-Powell usa 2', () => {
  expect(greedyColoring(trap).colorsUsed).toBe(3);
  expect(welshPowellColoring(trap).colorsUsed).toBe(2);
});
it('mensajes de Greedy', () => {
  const s = greedyColoring(trap).steps;
  expect(s[0].message).toBe('A (siguiente en orden de entrada): no tiene vecinos coloreados. Recibe el color 1.');
  expect(s[3].message).toBe('C (siguiente en orden de entrada): sus vecinos ya coloreados usan 1, 2. Recibe el color 3.');
});
it('mensajes de Welsh-Powell', () => {
  const m = welshPowellColoring(trap).steps.map((x) => x.message);
  expect(m[0]).toBe('Orden por grado descendente: B(2), C(2), A(1), D(1).');
  expect(m).toContain('Color 1: se recorre la lista ordenada.');
  expect(m).toContain('B (grado 2) no es vecino de ningún vértice con color 1. Recibe el color 1.');
  expect(m).toContain('C es vecino de B (color 1); se salta.');
});
it('mensajes y saturación de DSATUR', () => {
  const s = dsaturColoring(ex('k3')).steps;
  expect(s[0].message).toBe('Se elige A: ve 0 colores distintos y tiene grado 2. Recibe el color 1, el menor libre.');
  expect(s[1].message).toBe('Se elige B: ve 1 color distinto y tiene grado 2. Recibe el color 2, el menor libre.');
  expect(s[1].saturation).toEqual({ B: 1, C: 1 });
});
it('validación', () => {
  const g = ex('k3');
  expect(conflictingEdges(g, { A: 0, B: 0, C: 1 })).toEqual([['A', 'B']]);
  expect(isProperColoring(g, { A: 0, B: 1 })).toBe(false);
  expect(colorClasses(g, { A: 0, B: 1, C: 0 })).toEqual([['A', 'C'], ['B']]);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/lib/coloring`
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar los seis archivos**

`elapsedMs` se mide con `Date.now()`. `stepsTruncated` siempre es `false` en los algoritmos voraces.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/coloring
git commit -m "feat: Greedy, Welsh-Powell y DSATUR con pasos explicados"
```

---

### Task 5: Coloración exacta sin bloquear la interfaz

**Files:**
- Create: `src/lib/coloring/exact.ts`, `src/lib/coloring/run-exact.ts`, `src/lib/coloring/present.ts`
- Test: `src/lib/coloring/__tests__/exact.test.ts`, `src/lib/coloring/__tests__/present.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4 (`findMaximumClique`, `checkBipartite`, `chromaticBounds`, `dsaturColoring`, tipos de coloración)
- Produces:
  ```ts
  // exact.ts
  export interface ExactProgress { k: number; nodesExplored: number }
  export interface ExactSolution { chromaticNumber: number; result: ColoringResult }   // result.algorithm === 'exact'
  export function exactBounds(g: Graph): { lower: number; upper: number; dsatur: ColoringResult };
  export function* exactSearch(g: Graph, opts?: { maxRecordedSteps?: number; nodesPerChunk?: number }):
    Generator<ExactProgress, ExactSolution, void>;                   // defaults: 400 pasos, 2000 nodos por trozo
  export function exactColoringSync(g: Graph): ExactSolution;         // drena el generador
  // run-exact.ts
  export const DEFAULT_EXACT_BUDGET_MS = 3000;
  export type ExactOutcome =
    | { status: 'exact'; chromaticNumber: number; result: ColoringResult }
    | { status: 'timeout' | 'cancelled'; lower: number; upper: number; result: ColoringResult };  // result = DSATUR
  export function runExact(g: Graph, opts: { budgetMs: number; isCancelled?: () => boolean;
    onProgress?: (p: ExactProgress) => void; nodesPerChunk?: number }): Promise<ExactOutcome>;
  // present.ts
  export type ChromaticState = { status: 'running'; k: number | null } | ExactOutcome;
  export function selectDisplayedResult(algorithm: AlgorithmId,
    heuristics: Record<'dsatur' | 'greedy' | 'welsh-powell', ColoringResult>, chromatic: ChromaticState): ColoringResult;
  export function chromaticLabel(chromatic: ChromaticState): { value: string; badge: 'Exacto' | 'Cota superior' | 'Calculando…'; detail: string | null };
  export function colorsUsedWarning(result: ColoringResult, chromatic: ChromaticState): string | null;
  ```

**Algoritmo de `exactSearch`** (las pruebas no determinan la poda):
```text
{lower, upper, dsatur} = exactBounds(g)    // lower = chromaticBounds(...).lower; upper = dsatur.colorsUsed
si lower == upper → devolver la coloración DSATUR como 'exact', con un paso info:
   "La cota inferior coincide con la coloración DSATUR: χ(G) = ${k}."
para k = lower .. upper-1:
   paso info "Probando con ${k} colores…"
   DFS: elegir el siguiente vértice por saturación máxima (desempate: grado y luego orden de entrada);
        probar colores 0..min(k-1, maxColorUsado+1) (rompe simetrías); podar si un vértice queda sin color posible.
        Cada nodesPerChunk nodos → yield { k, nodesExplored }.
        Registrar pasos assign/unassign solo del intento de este k, hasta maxRecordedSteps (luego stepsTruncated = true).
   si se coloreó → paso info "Con ${k} colores alcanza: χ(G) = ${k}." → devolver
   si no → descartar los pasos assign/unassign de este k y agregar el info "k = ${k}: imposible (se exploraron ${n} asignaciones)."
devolver la coloración DSATUR con χ = upper y el info "Con ${upper - 1} colores no alcanza: χ(G) = ${upper}."
```
Mensajes de los pasos: assign `${v} recibe el color ${c}.` / unassign `Retroceso: ${v} pierde su color.`

**`runExact`:**
1. Calcula `exactBounds`. Si lower == upper, resuelve `exact` sin buscar.
2. Antes de cada `next()` del generador revisa, en este orden, `isCancelled()` → `cancelled` y `Date.now() - inicio >= budgetMs` → `timeout`.
3. Entre trozos cede el control con `await new Promise((r) => setTimeout(r, 0))`.

**Textos de `present.ts`:**

| Estado | `value` | `badge` | `detail` |
| --- | --- | --- | --- |
| running | `'…'` | `'Calculando…'` | `` `Probando con ${k} colores…` `` o `'Preparando…'` si k es null |
| exact | `` `${χ}` `` | `'Exacto'` | `null` |
| timeout / cancelled | `` `≤ ${upper}` `` | `'Cota superior'` | `` `χ(G) ≤ ${upper} (cota superior). Cota inferior: ${lower}.` `` |

- **`colorsUsedWarning`:** `` `${ALGORITHM_SHORT_LABELS[alg]} usó ${used} colores; el mínimo es ${χ}.` ``, solo si el estado es `exact` y `used > χ`.
- **`selectDisplayedResult`:**
  - `dsatur`, `greedy` y `welsh-powell` muestran su propio resultado.
  - `exact` y `auto` muestran `chromatic.result` si el estado no es `running`; mientras corre, muestran `heuristics.dsatur`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/coloring/__tests__/exact.test.ts
import { COLORING_EXAMPLES, exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import { exactColoringSync, exactSearch } from '../exact';
import { runExact } from '../run-exact';
import { isProperColoring } from '../validate';

const ex = (id: string) => exampleGraph(findExample(id));

it.each(COLORING_EXAMPLES.map((e) => e.id))('χ exacto de %s coincide con el esperado', (id) => {
  const s = exactColoringSync(ex(id));
  expect(s.chromaticNumber).toBe(findExample(id).chromaticNumber);
  expect(s.result.colorsUsed).toBe(s.chromaticNumber);
  expect(s.result.algorithm).toBe('exact');
  expect(isProperColoring(ex(id), s.result.coloring)).toBe(true);
});
it('vacío → 0; sin aristas → 1; trampa de greedy → 2', () => {
  expect(exactColoringSync(emptyGraph()).chromaticNumber).toBe(0);
  expect(exactColoringSync(parseGraphText('A\nB\nC', 'edges', false).graph!).chromaticNumber).toBe(1);
  expect(exactColoringSync(parseGraphText('A\nD\nA-B\nB-C\nC-D', 'edges', false).graph!).chromaticNumber).toBe(2);
});
it('W₅ registra el intento fallido con k = 3', () => {
  const msgs = exactColoringSync(ex('w5')).result.steps.map((s) => s.message);
  expect(msgs).toContain('Probando con 3 colores…');
  expect(msgs.some((m) => m.startsWith('k = 3: imposible'))).toBe(true);
});
it('el generador cede progreso por trozos', () => {
  const it = exactSearch(ex('w5'), { nodesPerChunk: 1 });
  const first = it.next();
  expect(first.done).toBe(false);
  expect(first.value).toMatchObject({ k: 3 });
});
describe('runExact', () => {
  it('resuelve exacto con presupuesto suficiente', async () => {
    await expect(runExact(ex('petersen'), { budgetMs: 3000 })).resolves.toMatchObject({ status: 'exact', chromaticNumber: 3 });
  });
  it('presupuesto 0 en un grafo que exige búsqueda → timeout con cotas', async () => {
    await expect(runExact(ex('w5'), { budgetMs: 0 })).resolves.toMatchObject({ status: 'timeout', lower: 3, upper: 4 });
  });
  it('se cancela a mitad de la búsqueda', async () => {
    let calls = 0;
    const out = await runExact(ex('w5'), { budgetMs: 3000, nodesPerChunk: 1, isCancelled: () => calls++ >= 1 });
    expect(out).toMatchObject({ status: 'cancelled', lower: 3, upper: 4 });
    expect(out.result.algorithm).toBe('dsatur');
  });
});
```

```ts
// src/lib/coloring/__tests__/present.test.ts
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { dsaturColoring } from '../dsatur';
import { exactColoringSync } from '../exact';
import { greedyColoring } from '../greedy';
import { chromaticLabel, colorsUsedWarning, selectDisplayedResult } from '../present';
import { welshPowellColoring } from '../welsh-powell';

const g = exampleGraph(findExample('w5'));
const h = { dsatur: dsaturColoring(g), greedy: greedyColoring(g), 'welsh-powell': welshPowellColoring(g) };
const exact = { status: 'exact' as const, ...exactColoringSync(g) };

it('etiquetas de χ', () => {
  expect(chromaticLabel({ status: 'running', k: 4 })).toEqual({ value: '…', badge: 'Calculando…', detail: 'Probando con 4 colores…' });
  expect(chromaticLabel(exact)).toEqual({ value: '4', badge: 'Exacto', detail: null });
  expect(chromaticLabel({ status: 'timeout', lower: 3, upper: 4, result: h.dsatur }))
    .toEqual({ value: '≤ 4', badge: 'Cota superior', detail: 'χ(G) ≤ 4 (cota superior). Cota inferior: 3.' });
});
it('resultado mostrado según algoritmo', () => {
  expect(selectDisplayedResult('greedy', h, exact)).toBe(h.greedy);
  expect(selectDisplayedResult('auto', h, { status: 'running', k: 3 })).toBe(h.dsatur);
  expect(selectDisplayedResult('exact', h, exact)).toBe(exact.result);
});
it('aviso cuando un algoritmo usa más colores que χ', () => {
  const wp = { ...h['welsh-powell'], colorsUsed: 5 };
  expect(colorsUsedWarning(wp, exact)).toBe('Welsh-Powell usó 5 colores; el mínimo es 4.');
  expect(colorsUsedWarning(h.dsatur, exact)).toBeNull();
  expect(colorsUsedWarning(wp, { status: 'running', k: 3 })).toBeNull();
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/lib/coloring/__tests__/exact.test.ts src/lib/coloring/__tests__/present.test.ts`
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar `exact.ts`, `run-exact.ts` y `present.ts`** según lo descrito arriba.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/coloring
git commit -m "feat: coloración exacta por backtracking con presupuesto, cancelación y presentación de χ"
```

---

### Task 6: Layout y geometría del lienzo

**Files:**
- Create: `src/lib/layout/layouts.ts`, `src/lib/geometry.ts`
- Test: `src/lib/layout/__tests__/layouts.test.ts`, `src/lib/__tests__/geometry.test.ts`

**Interfaces:**
- Consumes: Task 1 (tipos), Task 3 (ejemplos, para pruebas)
- Produces:
  ```ts
  // geometry.ts
  export interface Viewport { scale: number; tx: number; ty: number }   // pantalla = mundo * scale + t
  export interface Box { width: number; height: number; padding: number }
  export const IDENTITY_VIEWPORT: Viewport;                           // { scale: 1, tx: 0, ty: 0 }
  export const VERTEX_RADIUS = 22, VERTEX_HIT_RADIUS = 30, EDGE_HIT_TOLERANCE = 14, MIN_SCALE = 0.3, MAX_SCALE = 3;
  export const WORLD_BOX: Box;                                        // { width: 360, height: 520, padding: 40 }
  export function screenToWorld(p: Point, vp: Viewport): Point;
  export function worldToScreen(p: Point, vp: Viewport): Point;
  export function distanceToSegment(p: Point, a: Point, b: Point): number;
  export function hitTestVertex(p: Point, positions: Positions, vertices: readonly VertexId[], radius?: number): VertexId | null;
  export function hitTestEdge(p: Point, g: Graph, positions: Positions, tolerance?: number): Edge | null;
  export function clampScale(scale: number): number;
  // layout/layouts.ts
  export function circleLayout(vertices: readonly VertexId[], box: Box): Positions;
  export function forceLayout(g: Graph, box: Box, opts?: { iterations?: number }): Positions;  // determinista
  export function autoLayout(g: Graph, box: Box): Positions;          // n ≤ 8 o sin aristas → círculo; si no → fuerzas
  export function fromNormalized(norm: Positions, box: Box): Positions;
  export function fitViewport(positions: Positions, view: { width: number; height: number }, padding: number): Viewport;
  export function mergePositions(old: Positions, g: Graph, box: Box): Positions;  // conserva los existentes; los nuevos salen de autoLayout
  ```

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/__tests__/geometry.test.ts
import { parseGraphText } from '@/lib/graph/text';
import { clampScale, distanceToSegment, hitTestEdge, hitTestVertex, screenToWorld, worldToScreen } from '../geometry';

const g = parseGraphText('A-B', 'edges', false).graph!;
const pos = { A: { x: 0, y: 0 }, B: { x: 100, y: 0 } };

it('conversión pantalla↔mundo es inversa', () => {
  const vp = { scale: 2, tx: 10, ty: -5 };
  expect(screenToWorld(worldToScreen({ x: 3, y: 4 }, vp), vp)).toEqual({ x: 3, y: 4 });
});
it('hit test de vértice: el más cercano dentro del radio', () => {
  expect(hitTestVertex({ x: 5, y: 5 }, pos, g.vertices)).toBe('A');
  expect(hitTestVertex({ x: 50, y: 50 }, pos, g.vertices)).toBeNull();
});
it('hit test de arista', () => {
  expect(hitTestEdge({ x: 50, y: 6 }, g, pos)).toEqual(['A', 'B']);
  expect(hitTestEdge({ x: 50, y: 40 }, g, pos)).toBeNull();
  expect(distanceToSegment({ x: 50, y: 3 }, pos.A, pos.B)).toBeCloseTo(3);
});
it('zoom limitado', () => { expect(clampScale(10)).toBe(3); expect(clampScale(0.1)).toBe(0.3); });
```

```ts
// src/lib/layout/__tests__/layouts.test.ts
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { VERTEX_RADIUS, WORLD_BOX, worldToScreen } from '@/lib/geometry';
import { parseGraphText } from '@/lib/graph/text';
import { circleLayout, fitViewport, forceLayout, mergePositions } from '../layouts';

const inside = (p: { x: number; y: number }) =>
  p.x >= WORLD_BOX.padding && p.x <= WORLD_BOX.width - WORLD_BOX.padding &&
  p.y >= WORLD_BOX.padding && p.y <= WORLD_BOX.height - WORLD_BOX.padding;
const minDist = (ps: { x: number; y: number }[]) =>
  Math.min(...ps.flatMap((a, i) => ps.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));

it('círculo: todos dentro de la caja', () => {
  expect(Object.values(circleLayout(['A', 'B', 'C', 'D'], WORLD_BOX)).every(inside)).toBe(true);
});
it.each(['homework', 'petersen'])('fuerzas en %s: determinista, dentro de la caja y sin solaparse', (id) => {
  const g = exampleGraph(findExample(id));
  const p = forceLayout(g, WORLD_BOX);
  expect(forceLayout(g, WORLD_BOX)).toEqual(p);
  expect(Object.values(p).every(inside)).toBe(true);
  expect(minDist(Object.values(p))).toBeGreaterThanOrEqual(2 * VERTEX_RADIUS);
});
it('fitViewport deja todo visible', () => {
  const p = circleLayout(['A', 'B', 'C'], WORLD_BOX);
  const vp = fitViewport(p, { width: 400, height: 300 }, 20);
  for (const q of Object.values(p).map((x) => worldToScreen(x, vp))) {
    expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(400);
    expect(q.y).toBeGreaterThanOrEqual(0); expect(q.y).toBeLessThanOrEqual(300);
  }
});
it('mergePositions conserva las posiciones existentes y ubica las nuevas', () => {
  const g = parseGraphText('A-B, B-C', 'edges', false).graph!;
  const merged = mergePositions({ A: { x: 1, y: 2 } }, g, WORLD_BOX);
  expect(merged.A).toEqual({ x: 1, y: 2 });
  expect(Object.keys(merged).sort()).toEqual(['A', 'B', 'C']);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/lib/layout src/lib/__tests__/geometry.test.ts`
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar `geometry.ts` y `layouts.ts`**

- **`forceLayout`:** Fruchterman–Reingold partiendo de `circleLayout`, sin aleatoriedad (determinista), 300 iteraciones por defecto. Al final, recortar las posiciones al área útil de la caja.
- **`fitViewport`:** escala con `clampScale` y centra el rectángulo que envuelve los vértices, ampliado en `VERTEX_RADIUS`.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout src/lib/geometry.ts src/lib/__tests__
git commit -m "feat: layouts (círculo, fuerzas), viewport y hit testing"
```

---

### Task 7: Estado del editor con deshacer/rehacer y serialización

**Files:**
- Create: `src/state/editor-reducer.ts`, `src/state/doc-serialization.ts`
- Test: `src/state/__tests__/editor-reducer.test.ts`, `src/state/__tests__/doc-serialization.test.ts`

**Interfaces:**
- Consumes: Task 1 (`addVertex`, `addEdge`, `removeVertex`, `removeEdge`, `renameVertex`, `nextLabel`, `isValidLabel`, `emptyGraph`)
- Produces:
  ```ts
  // editor-reducer.ts
  export interface EditorDoc { graph: Graph; positions: Positions }
  export type Selection = { kind: 'none' } | { kind: 'vertex'; id: VertexId } | { kind: 'edge'; edge: Edge };
  export interface Notice { kind: 'error' | 'info'; message: string; undoable?: boolean }
  export interface EditorState { doc: EditorDoc; past: EditorDoc[]; future: EditorDoc[]; selection: Selection;
    notice: Notice | null; fitRequest: number }                       // fitRequest sube con replaceDoc y setPositions
  export type EditorAction =
    | { type: 'tapEmpty'; point: Point } | { type: 'tapVertex'; id: VertexId } | { type: 'tapEdge'; edge: Edge }
    | { type: 'dragStart' } | { type: 'dragMove'; id: VertexId; point: Point }
    | { type: 'deleteSelection' } | { type: 'renameSelected'; to: string }
    | { type: 'replaceDoc'; doc: EditorDoc; message?: string } | { type: 'setPositions'; positions: Positions }
    | { type: 'clear' } | { type: 'undo' } | { type: 'redo' } | { type: 'dismissNotice' };
  export const HISTORY_LIMIT = 100;
  export const EDIT_ERROR_MESSAGES: Record<EditError, string>;
  export function emptyDoc(directed?: boolean): EditorDoc;
  export function initialEditorState(doc?: EditorDoc | null, directed?: boolean): EditorState;
  export function editorReducer(state: EditorState, action: EditorAction): EditorState;
  // doc-serialization.ts
  export function serializeDoc(doc: EditorDoc): string;               // JSON con { version: 1, ... }
  export function deserializeDoc(text: string | null): EditorDoc | null;  // null si es inválido o de otra versión
  ```

**Mensajes `EDIT_ERROR_MESSAGES`:**

| Error | Mensaje |
| --- | --- |
| `limit-vertices` | `Llegaste al máximo de 60 vértices.` |
| `limit-edges` | `Llegaste al máximo de 600 aristas.` |
| `invalid-label` | `Etiqueta no válida: usa letras, dígitos o _ (máximo 12).` |
| `duplicate-vertex` | `Ya existe un vértice con ese nombre.` |
| `self-loop` | `No se permiten lazos (una arista de un vértice a sí mismo).` |
| `unknown-vertex` | `Ese vértice no existe.` |

**Avisos de borrado** (`kind: 'info'`, `undoable: true`): `Se borró el vértice ${id}.`, `Se borró la arista ${a}-${b}.`, `Se limpió el grafo.`. En `replaceDoc`, si llega `message`, se usa como aviso `undoable`.

**Semántica de las acciones:**
- **`tapEmpty`:** sin selección, crea el vértice `nextLabel` en `point`. Con selección, solo deselecciona.
- **`tapVertex`:**
  - Sin selección, o con una arista seleccionada → selecciona el vértice.
  - Si el vértice ya estaba seleccionado → lo deselecciona.
  - Si hay otro vértice X seleccionado → `addEdge(X, id)` (en dirigido, X→id) y la selección pasa a `id` (encadenar).
- **`dragStart`:** guarda el documento actual en `past` (una sola entrada por arrastre).
- **`dragMove`:** mueve el vértice sin tocar el historial.
- **Toda acción que cambia el documento:** limpia `future` y deja `past` en un máximo de `HISTORY_LIMIT` entradas.
- **`undo`/`redo`:** limpian la selección.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/state/__tests__/editor-reducer.test.ts
import { addVertex, emptyGraph } from '@/lib/graph/graph';
import { editorReducer, HISTORY_LIMIT, initialEditorState, type EditorAction, type EditorState } from '../editor-reducer';

const run = (s: EditorState, ...as: EditorAction[]) => as.reduce(editorReducer, s);
const P = (x: number, y = 0) => ({ x, y });
const abc = () => run(initialEditorState(), { type: 'tapEmpty', point: P(0) }, { type: 'tapEmpty', point: P(100) }, { type: 'tapEmpty', point: P(200) });

it('tocar vacío crea A, B, C en su posición', () => {
  const s = abc();
  expect(s.doc.graph.vertices).toEqual(['A', 'B', 'C']);
  expect(s.doc.positions.B).toEqual(P(100));
  expect(s.past).toHaveLength(3);
});
it('encadenar: A, B, C crea A-B y B-C y deja C seleccionado', () => {
  const s = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'B' }, { type: 'tapVertex', id: 'C' });
  expect(s.doc.graph.edges).toEqual([['A', 'B'], ['B', 'C']]);
  expect(s.selection).toEqual({ kind: 'vertex', id: 'C' });
});
it('tocar el vértice seleccionado lo deselecciona; tocar vacío con selección solo deselecciona', () => {
  expect(run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'A' }).selection).toEqual({ kind: 'none' });
  const s = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapEmpty', point: P(300) });
  expect(s.doc.graph.vertices).toHaveLength(3);
  expect(s.selection).toEqual({ kind: 'none' });
});
it('límite de 60 vértices produce aviso de error', () => {
  let g = emptyGraph(); const positions: Record<string, { x: number; y: number }> = {};
  for (let i = 0; i < 60; i++) { const r = addVertex(g, `v${i}`); if (r.ok) g = r.graph; positions[`v${i}`] = P(i); }
  const s = run(initialEditorState({ graph: g, positions }), { type: 'tapEmpty', point: P(999) });
  expect(s.doc.graph.vertices).toHaveLength(60);
  expect(s.notice).toEqual({ kind: 'error', message: 'Llegaste al máximo de 60 vértices.' });
});
it('borrar vértice quita aristas y posición; deshacer lo restaura', () => {
  const linked = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'B' }, { type: 'tapEmpty', point: P(0) });
  const del = run(linked, { type: 'tapVertex', id: 'A' }, { type: 'deleteSelection' });
  expect(del.doc.graph.edges).toEqual([]);
  expect(del.doc.positions.A).toBeUndefined();
  expect(del.notice).toEqual({ kind: 'info', message: 'Se borró el vértice A.', undoable: true });
  expect(run(del, { type: 'undo' }).doc).toEqual(linked.doc);
});
it('un arrastre completo se deshace en un solo paso', () => {
  const s = run(abc(), { type: 'dragStart' }, { type: 'dragMove', id: 'A', point: P(5, 5) }, { type: 'dragMove', id: 'A', point: P(9, 9) });
  expect(s.doc.positions.A).toEqual(P(9, 9));
  expect(run(s, { type: 'undo' }).doc.positions.A).toEqual(P(0));
});
it('rehacer y una nueva edición borra el futuro', () => {
  const u = run(abc(), { type: 'undo' });
  expect(run(u, { type: 'redo' }).doc.graph.vertices).toEqual(['A', 'B', 'C']);
  expect(run(u, { type: 'tapEmpty', point: P(7) }).future).toEqual([]);
});
it('renombrar: éxito actualiza posiciones; duplicado da aviso', () => {
  const ok = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'renameSelected', to: 'Inicio' });
  expect(ok.doc.graph.vertices[0]).toBe('Inicio');
  expect(ok.doc.positions.Inicio).toEqual(P(0));
  const dup = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'renameSelected', to: 'B' });
  expect(dup.notice).toEqual({ kind: 'error', message: 'Ya existe un vértice con ese nombre.' });
});
it('replaceDoc se puede deshacer y pide encuadre', () => {
  const s0 = abc();
  const s = run(s0, { type: 'replaceDoc', doc: { graph: emptyGraph(), positions: {} }, message: 'Se cargó «K₃».' });
  expect(s.fitRequest).toBe(s0.fitRequest + 1);
  expect(s.notice).toEqual({ kind: 'info', message: 'Se cargó «K₃».', undoable: true });
  expect(run(s, { type: 'undo' }).doc).toEqual(s0.doc);
});
it('el historial se limita a 100', () => {
  let s = initialEditorState();
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) s = run(s, { type: 'tapEmpty', point: P(i) }, { type: 'dragStart' });
  expect(s.past.length).toBe(HISTORY_LIMIT);
});
it('en modo dirigido A luego B crea A→B', () => {
  const s = run(initialEditorState(null, true), { type: 'tapEmpty', point: P(0) }, { type: 'tapEmpty', point: P(1) },
    { type: 'tapVertex', id: 'B' }, { type: 'tapVertex', id: 'A' });
  expect(s.doc.graph.edges).toEqual([['B', 'A']]);
});
```

```ts
// src/state/__tests__/doc-serialization.test.ts
import { parseGraphText } from '@/lib/graph/text';
import { deserializeDoc, serializeDoc } from '../doc-serialization';

const doc = { graph: parseGraphText('A-B', 'edges', false).graph!, positions: { A: { x: 1, y: 2 }, B: { x: 3, y: 4 } } };

it('ida y vuelta', () => expect(deserializeDoc(serializeDoc(doc))).toEqual(doc));
it.each([
  ['null', null], ['basura', '{no es json'], ['otra versión', JSON.stringify({ ...JSON.parse(serializeDoc(doc)), version: 2 })],
  ['arista a vértice inexistente', serializeDoc({ ...doc, graph: { ...doc.graph, edges: [['A', 'Z']] } })],
  ['falta posición', serializeDoc({ ...doc, positions: { A: { x: 1, y: 2 } } })],
])('%s → null', (_n, text) => expect(deserializeDoc(text as string | null)).toBeNull());
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/state`
Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar `editor-reducer.ts` y `doc-serialization.ts`**

`deserializeDoc` revisa la versión, que las etiquetas sean válidas y únicas, que cada arista apunte a vértices existentes y que todas las posiciones sean números finitos. Nunca lanza errores.

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state
git commit -m "feat: reducer del editor con deshacer/rehacer y serialización del documento"
```

---

### Task 8: Estructura de la app (pestañas, tema, persistencia)

**Files:**
- Delete: `src/app/explore.tsx`, `src/components/app-tabs.web.tsx`, `src/components/web-badge.tsx`, `src/components/hint-row.tsx`, `src/components/external-link.tsx`, `src/components/animated-icon.tsx`, `src/components/animated-icon.web.tsx`, `src/components/animated-icon.module.css`, `src/components/ui/collapsible.tsx`, `assets/images/tabIcons/`
- Modify: `src/app/_layout.tsx`, `src/components/app-tabs.tsx`, `src/constants/theme.ts`, `app.json`
- Replace: `src/app/index.tsx` (pantalla Colorear provisional)
- Create: `src/app/graphs.tsx` (provisional), `src/constants/palette.ts`, `src/state/storage.ts`, `src/state/editor-context.tsx`
- Test: `src/constants/__tests__/palette.test.ts`

**Interfaces:**
- Consumes: Task 7 (`editorReducer`, `initialEditorState`, `serializeDoc`, `deserializeDoc`)
- Produces:
  ```ts
  // constants/palette.ts
  export const GRAPH_COLORS: readonly string[];                       // 12 colores aptos para daltonismo
  export function graphColor(index: number): string;                  // >= 12 → HSL por ángulo áureo
  export function contrastText(hex: string): '#000000' | '#FFFFFF';
  // constants/theme.ts: agregar a Colors.light y Colors.dark → primary, onPrimary, border, danger, warning, success, canvas, edge
  // state/storage.ts
  export type DocKey = 'coloring';
  export function loadDoc(key: DocKey): EditorDoc | null;
  export function saveDoc(key: DocKey, doc: EditorDoc): void;
  // state/editor-context.tsx
  export function EditorProvider(props: { children: React.ReactNode }): React.JSX.Element;
  export function useColoringEditor(): { state: EditorState; dispatch: React.Dispatch<EditorAction> };
  ```

- [ ] **Step 1: Escribir la prueba de la paleta que falla**

```ts
// src/constants/__tests__/palette.test.ts
import { contrastText, GRAPH_COLORS, graphColor } from '../palette';

it('60 colores distintos', () => expect(new Set(Array.from({ length: 60 }, (_, i) => graphColor(i))).size).toBe(60));
it('los primeros salen de la paleta base', () => expect(graphColor(0)).toBe(GRAPH_COLORS[0]));
it('texto con contraste', () => { expect(contrastText('#FFFFFF')).toBe('#000000'); expect(contrastText('#000000')).toBe('#FFFFFF'); });
```

- [ ] **Step 2: Verificar que falla**

Run: `npx jest src/constants`
Expected: FAIL con "Cannot find module '../palette'"

- [ ] **Step 3: Implementar `palette.ts` y ampliar `theme.ts`**

La paleta base debe combinar los 8 colores de Okabe-Ito con 4 extras distinguibles.

- [ ] **Step 4: Instalar dependencias**

Run: `npx expo install expo-sqlite react-native-svg @expo/vector-icons`

- [ ] **Step 5: Implementar `storage.ts` y `editor-context.tsx`**

- **`storage.ts`:** usa `Storage.getItemSync` / `Storage.setItemSync` de `expo-sqlite/kv-store`, con la clave `` `doc:${key}` `` y los datos pasados por `serializeDoc` / `deserializeDoc`.
- **`EditorProvider`:**
  - `useReducer(editorReducer, undefined, () => initialEditorState(loadDoc('coloring')))`.
  - Guarda `state.doc` con un retraso (debounce) de 500 ms cada vez que cambia.

- [ ] **Step 6: Reestructurar la raíz y las pestañas**

- **`_layout.tsx`:**
  - Envuelve todo en `<GestureHandlerRootView style={{ flex: 1 }}>` → `ThemeProvider` → `EditorProvider` → `AppTabs`.
  - Quita `AnimatedSplashOverlay` y `SplashScreen.preventAutoHideAsync()`.
- **`app-tabs.tsx`:**
  - Trigger `index`: label "Colorear", `md="palette"`.
  - Trigger `graphs`: label "Mis grafos", `md="folder_open"`.
- **`index.tsx` y `graphs.tsx`:** de momento muestran solo su título con `ThemedText`.
- **`app.json`:** `"name": "ColorGrafos"` y `android.package: "com.stevenrq.colorgrafos"`.

- [ ] **Step 7: Verificar que todo compila y empaqueta**

Run: `npx jest && npx tsc --noEmit && npx expo lint && npx expo export --platform android --output-dir .expo/export-check`
Expected: pruebas en PASS, sin errores de tipos ni de lint, y el export termina con "Exported". Borrar `.expo/export-check` al terminar.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: estructura de ColorGrafos (pestañas, tema, paleta, autoguardado) y limpieza de la plantilla"
```

---

### Task 9: Lienzo de dibujo con gestos

**Files:**
- Create: `src/components/graph-canvas/graph-canvas.tsx`, `src/components/editor-toolbar.tsx`, `src/components/selection-bar.tsx`, `src/components/notice-snackbar.tsx`, `src/components/rename-dialog.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: Tasks 6–8 (`geometry`, `layouts`, `useColoringEditor`, `graphColor`, theme)
- Produces:
  ```ts
  export interface CanvasHighlight { vertices?: readonly VertexId[]; edges?: readonly Edge[]; tone: 'focus' | 'warning' }
  export interface GraphCanvasProps {
    doc: EditorDoc; selection: Selection; dispatch: (a: EditorAction) => void;
    editable: boolean;                                    // false: solo zoom y desplazamiento
    viewport: Viewport; onViewportChange: (vp: Viewport) => void;
    onLayout?: (size: { width: number; height: number }) => void;
    vertexColors?: Readonly<Record<VertexId, string>>; highlight?: CanvasHighlight;
  }
  export function GraphCanvas(props: GraphCanvasProps): React.JSX.Element;
  export function EditorToolbar(props: { canUndo: boolean; canRedo: boolean; canColor: boolean; onUndo(): void; onRedo(): void;
    onRelayout(): void; onClear(): void; onColor(): void }): React.JSX.Element;
  export function SelectionBar(props: { selection: Selection; onRename(): void; onDelete(): void }): React.JSX.Element | null;
  export function NoticeSnackbar(props: { notice: Notice | null; onUndo(): void; onDismiss(): void }): React.JSX.Element | null;
  export function RenameDialog(props: { visible: boolean; initial: string; onSubmit(to: string): void; onCancel(): void }): React.JSX.Element;
  ```

**Comportamiento fijado:**
- **Dibujo:** `Svg` → `G` con `transform` del viewport. Primero las aristas (`Line`) y encima los vértices (`Circle r={VERTEX_RADIUS}` + `Text` centrado con la etiqueta, color `contrastText` del relleno).
  - Vértice seleccionado: anillo `primary` de 4 px.
  - Arista seleccionada: trazo `primary` de 5 px.
  - Resaltado `focus`: anillo `primary` punteado.
  - Resaltado `warning`: vértices y aristas en `danger`.
- **Gestos** (hooks de RNGH 3, todos con `runOnJS: true`):
  - `useTapGesture`: hit test de vértice (`VERTEX_HIT_RADIUS`), luego de arista, y si no hay nada, `tapEmpty`. Los puntos se convierten con `screenToWorld`.
  - `usePanGesture({ maxPointers: 1, minDistance: 8 })`: si empieza sobre un vértice y `editable`, despacha `dragStart` + `dragMove`; si no, desplaza el viewport.
  - `usePinchGesture`: zoom alrededor del punto focal, con `clampScale`.
  - Pinch es simultáneo con pan; pan y tap son excluyentes. Usar `useSimultaneousGestures` y `useExclusiveGestures` según la doc de RNGH 3.
- **Estado vacío** (0 vértices): texto centrado "Toca para crear un vértice" y botón "Cargar ejemplo" → `router.navigate('/graphs')`.
- **Barra inferior** (`EditorToolbar`): Deshacer, Rehacer, Reorganizar, Limpiar y el botón primario "Colorear", que está deshabilitado con 0 vértices.
  - Íconos de `@expo/vector-icons/MaterialIcons` con texto debajo y `accessibilityLabel` en español.
  - Objetivos táctiles de al menos 48 dp.
- **Reorganizar:** `setPositions(autoLayout(graph, WORLD_BOX))`.
- **Encuadre:** cuando cambia `state.fitRequest`, la pantalla aplica `fitViewport(positions, tamañoDelLienzo, 24)`.
- **Barra de selección:** aparece sobre la barra inferior. Con un vértice muestra "Renombrar" y "Borrar"; con una arista, solo "Borrar".
- **Aviso:** se cierra solo a los 4 s y muestra el botón "Deshacer" si es `undoable`.
- **Renombrar:** `Modal` con `TextInput` (`autoCapitalize="none"`, `autoCorrect={false}`) y botones "Cancelar" / "Guardar".

- [ ] **Step 1: Implementar los cinco componentes y montarlos en `src/app/index.tsx`.** El viewport es estado local de la pantalla.

- [ ] **Step 2: Verificar**

Run: `npx jest && npx tsc --noEmit && npx expo lint && npx expo export --platform android --output-dir .expo/export-check`
Expected: todo en PASS y el export termina con "Exported". Borrar `.expo/export-check`.

- [ ] **Step 3: PUNTO DE CONTROL CON STEVEN (prototipo de gestos)**

Steven corre `npx expo start`, abre la app en Expo Go en su celular y prueba:
1. Crear 5 vértices.
2. Conectar el pentágono tocando A, B, C, D, E, A.
3. Arrastrar un vértice.
4. Hacer zoom con dos dedos.
5. Deshacer y rehacer.
6. Renombrar un vértice.
7. Borrar un vértice y recuperarlo con "Deshacer".

Expected: Steven confirma que los gestos se sienten naturales. Si algo confunde, se ajusta el modelo de interacción **antes** de seguir (diseño §12).

- [ ] **Step 4: Commit**

```bash
git add src/components src/app/index.tsx
git commit -m "feat: lienzo de dibujo con gestos, barra de herramientas, selección y avisos con deshacer"
```

---

### Task 10: Vista Texto sincronizada

**Files:**
- Create: `src/components/segmented-control.tsx`, `src/components/graph-text-editor.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: Task 2 (`parseGraphText`, `graphToText`, `TextFormat`), Task 1 (`graphKey`), Task 6 (`mergePositions`, `WORLD_BOX`)
- Produces:
  ```ts
  export function SegmentedControl<T extends string>(props: { options: readonly { value: T; label: string }[];
    value: T; onChange(v: T): void }): React.JSX.Element;
  export function GraphTextEditor(props: { graph: Graph; directed: boolean; onApply(graph: Graph): void }): React.JSX.Element;
  ```

**Comportamiento fijado:**
- Arriba de la pantalla Colorear hay un `SegmentedControl` con las opciones "Dibujo" | "Texto".
- **`GraphTextEditor`:**
  - Selector de formato "Lista de aristas" | "Lista de adyacencia".
  - `TextInput` multilínea con fuente monoespaciada, `autoCapitalize="none"` y `autoCorrect={false}`. El texto inicial es `graphToText(graph, formato)`.
  - Análisis en vivo con un retraso de 250 ms. Muestra los errores en `danger` (`Línea N: …`), los avisos en `warning` y un resumen: `${n} vértices · ${m} aristas`.
  - El botón "Aplicar" se habilita solo si `graph !== null` y su `graphKey` es distinto del actual.
  - Al cambiar de formato, el texto se regenera desde el grafo analizado si es válido, o si no desde el grafo aplicado.
- **Al aplicar:** `dispatch({ type: 'replaceDoc', doc: { graph, positions: mergePositions(doc.positions, graph, WORLD_BOX) }, message: 'Se aplicó el texto.' })`.

- [ ] **Step 1: Implementar los dos componentes y la conmutación Dibujo/Texto en `index.tsx`**

- [ ] **Step 2: Verificar**

Run: `npx jest && npx tsc --noEmit && npx expo lint`
Expected: PASS. Prueba manual en Expo Go: escribir `A-B, B-C, C-A`, aplicar, volver a Dibujo y ver el triángulo. Escribir `A-A` muestra "Línea 1: 'A-A' es un lazo; no se permiten." y deja "Aplicar" deshabilitado.

- [ ] **Step 3: Commit**

```bash
git add src/components src/app/index.tsx
git commit -m "feat: vista Texto con validación en vivo sincronizada con el dibujo"
```

---

### Task 11: Mis grafos — ejemplos

**Files:**
- Create: `src/components/graph-thumbnail.tsx`
- Replace: `src/app/graphs.tsx`

**Interfaces:**
- Consumes: Task 3 (`COLORING_EXAMPLES`, `exampleGraph`), Task 6 (`autoLayout`, `fromNormalized`, `fitViewport`, `WORLD_BOX`), Task 8 (`useColoringEditor`)
- Produces: `export function GraphThumbnail(props: { graph: Graph; positions: Positions; size: number }): React.JSX.Element` (SVG sin interacción)

**Comportamiento fijado:**
- Sección "Ejemplos" con una tarjeta por ejemplo, en el orden de `COLORING_EXAMPLES`. Cada tarjeta muestra:
  - Miniatura de 64 px.
  - Nombre.
  - Descripción (2 líneas como máximo).
  - `${n} vértices · ${m} aristas`.
  - Insignia `χ = ${chromaticNumber}`.
- **Al tocar una tarjeta:**
  - Calcula `positions = ex.layout ? fromNormalized(ex.layout, WORLD_BOX) : autoLayout(graph, WORLD_BOX)`.
  - Despacha `replaceDoc` con `message: \`Se cargó «${ex.name}».\``.
  - Navega con `router.navigate('/')`.

- [ ] **Step 1: Implementar `GraphThumbnail` y la pantalla**

- [ ] **Step 2: Verificar**

Run: `npx jest && npx tsc --noEmit && npx expo lint`
Expected: PASS. Prueba manual: cargar "Grafo de Petersen" debe llevar a Colorear con los 10 vértices encuadrados; "Deshacer" en el aviso restaura el grafo anterior.

- [ ] **Step 3: Commit**

```bash
git add src/components/graph-thumbnail.tsx src/app/graphs.tsx
git commit -m "feat: pestaña Mis grafos con los ejemplos de la web y extras"
```

---

### Task 12: Análisis en segundo plano y hoja de resultados

**Files:**
- Create: `src/hooks/use-coloring-analysis.ts`, `src/components/results/results-sheet.tsx`, `algorithm-picker.tsx`, `chromatic-card.tsx`, `color-classes.tsx`, `bounds-card.tsx`, `structure-card.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: Tasks 3–5 (análisis, algoritmos, `runExact`, `DEFAULT_EXACT_BUDGET_MS`, `present.ts`), Task 9 (`CanvasHighlight`, props de `GraphCanvas`)
- Produces:
  ```ts
  export interface ColoringAnalysis {
    key: string;                                          // graphKey del grafo analizado
    heuristics: Record<'dsatur' | 'greedy' | 'welsh-powell', ColoringResult>;
    chromatic: ChromaticState;
    degrees: DegreeStats; components: VertexId[][]; bipartite: BipartiteResult;
    clique: { clique: VertexId[]; exact: boolean }; bounds: Bounds;
  }
  export function useColoringAnalysis(graph: Graph, enabled: boolean): { analysis: ColoringAnalysis | null; cancelExact(): void };
  export function ResultsSheet(props: { visible: boolean; onClose(): void; children: React.ReactNode }): React.JSX.Element | null;
  export function AlgorithmPicker(props: { value: AlgorithmId; onChange(a: AlgorithmId): void }): React.JSX.Element;
  ```

**Comportamiento fijado:**
- **`useColoringAnalysis`:**
  - Con `enabled` y al menos 1 vértice, calcula de forma síncrona las partes estructurales y las tres heurísticas.
  - Lanza `runExact(graph, { budgetMs: DEFAULT_EXACT_BUDGET_MS, onProgress })`, con un indicador de cancelación propio del efecto. El efecto depende **solo** de `graphKey(graph)` y `enabled`, así que cambiar de algoritmo no relanza la búsqueda.
  - Al cambiar la clave, desactivarse o desmontarse, cancela la búsqueda en curso.
  - Ignora cualquier resultado cuyo `key` no coincida con el grafo actual.
- **Pantalla Colorear:**
  - "Colorear" abre la hoja, pone el lienzo en `editable=false` y pinta `vertexColors` con `graphColor` según `selectDisplayedResult(...)`.
  - Cerrar la hoja (botón ✕) vuelve al modo edición y quita los colores.
  - El algoritmo elegido es estado local de la pantalla, con `auto` por defecto.
- **`ResultsSheet`** (hecha a mano con Reanimated y `usePanGesture` solo en el asa):
  - Dos posiciones: `peek` (40 % del alto) y `expanded` (85 %).
  - El contenido va en un `ScrollView`.
- **Contenido de la hoja, en orden:**
  1. **`AlgorithmPicker`:** chips con `ALGORITHM_LABELS`.
  2. **`ChromaticCard`:**
     - "χ(G)" con el `value` en grande y la insignia `badge`. Si hay `detail`, se muestra debajo.
     - Mientras corre, aparece el botón "Cancelar" (`cancelExact`).
     - Debajo: `Colores usados (${ALGORITHM_SHORT_LABELS[alg]}): ${n}` y, si existe, `colorsUsedWarning` en `warning`.
  3. **`ColorClasses`:** filas `Color ${i + 1}: A, C, E` con su muestra de color. Al tocar una fila se resaltan sus vértices (`focus`).
  4. **`BoundsCard`:**
     - `Cota inferior: el grafo contiene una clique de ${ω} vértices, y todos necesitan colores distintos.` Al tocarla se resalta la clique (`focus`).
     - `Cota superior Δ+1 = ${Δ+1}: un algoritmo voraz nunca necesita más de Δ+1 colores.`
     - `Brooks: si un grafo conexo no es completo ni un ciclo impar, χ ≤ Δ. Aquí da χ ≤ ${brooks}.`
  5. **`StructureCard`:**
     - Bipartito: `Es bipartito: sus vértices se dividen en dos grupos sin aristas internas, así que χ ≤ 2 (König).`
     - No bipartito: `No es bipartito: contiene un ciclo impar de ${len} vértices (toca para verlo), así que χ ≥ 3.` Al tocarlo se resalta el ciclo (`warning`).
     - `Componentes conexas: ${k}` y `Grados: mínimo ${min}, máximo ${max}, promedio ${avg con 2 decimales}` con la secuencia de grados.

- [ ] **Step 1: Implementar el hook, la hoja y las cinco tarjetas, e integrarlos en `index.tsx`**

- [ ] **Step 2: Verificar**

Run: `npx jest && npx tsc --noEmit && npx expo lint`
Expected: PASS. Prueba manual:
- C₅ dibujado → χ = 3 "Exacto"; "No es bipartito… 5 vértices" resalta el ciclo.
- K₃,₃ → bipartito, χ = 2.
- Con W₅ y Welsh-Powell, si usa más de 4 colores aparece el aviso.
- Cambiar de algoritmo nunca quita la insignia "Exacto".

- [ ] **Step 3: Commit**

```bash
git add src/hooks src/components/results src/app/index.tsx
git commit -m "feat: hoja de resultados con χ exacto en segundo plano, cotas, estructura y clases de color"
```

---

### Task 13: Reproductor paso a paso

**Files:**
- Create: `src/components/results/step-player.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: Task 4 (`ColoringStep`, `coloringAtStep`), Task 12 (hoja y resultado mostrado)
- Produces: `export function StepPlayer(props: { steps: readonly ColoringStep[]; truncated: boolean; index: number; onIndexChange(i: number): void; algorithm: ConcreteAlgorithm }): React.JSX.Element`

**Comportamiento fijado:**
- Se ubica en la hoja, entre `ChromaticCard` y `ColorClasses`.
- El `index` vive en la pantalla. Empieza en `steps.length - 1` (coloración final) y se reinicia al cambiar el resultado mostrado.
- **Controles** (íconos MaterialIcons con `accessibilityLabel`): "Reiniciar" (→ −1), "Atrás", "Reproducir"/"Pausa", "Siguiente" y "Ir al final".
- **Reproducción:** avanza cada `900 / velocidad` ms y se detiene en el último paso.
- **Velocidad:** `Slider` de `@expo/ui/jetpack-compose` dentro de `Host`, de 0.25× a 4×, con 1× por defecto y la etiqueta `${v}×`. Consultar los props en la página de Slider de la doc de `@expo/ui/jetpack-compose` v58.
- **Textos:**
  - `Paso ${index + 1} de ${steps.length}`, seguido de `steps[index].message`.
  - Con índice −1: `Pulsa reproducir para ver el algoritmo paso a paso.`
  - Si `truncated`: `Se omitieron pasos intermedios del backtracking.`
- **Saturación** (solo DSATUR): sección plegable "Ver saturación" con una tabla Vértice | Saturación | Grado, tomada de `steps[index].saturation`.
- **Lienzo:**
  - Mientras `index < steps.length - 1`: `vertexColors` = `coloringAtStep(steps, index)` (los vértices sin color usan el color neutro del tema), y el vértice del paso actual se resalta con `focus`.

- [ ] **Step 1: Implementar `StepPlayer` e integrarlo**

- [ ] **Step 2: Verificar**

Run: `npx jest && npx tsc --noEmit && npx expo lint`
Expected: PASS. Prueba manual con Petersen y DSATUR: "Reiniciar" y luego "Reproducir" colorea vértice por vértice con su explicación; "Ver saturación" muestra la tabla; el deslizador cambia la velocidad.

- [ ] **Step 3: Commit**

```bash
git add src/components/results/step-player.tsx src/app/index.tsx
git commit -m "feat: reproductor paso a paso con explicaciones, velocidad y tabla de saturación"
```

---

### Task 14: APK instalable y prueba sin internet

**Files:**
- Create: `eas.json`
- Modify: `app.json` (EAS agrega `extra.eas.projectId`), `README.md`

- [ ] **Step 1: Crear `eas.json`**

```json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } }
  }
}
```

- [ ] **Step 2: Reescribir `README.md` en español**

Contenido: qué es ColorGrafos, cómo correrla (`npm install`, `npx expo start`), cómo ejecutar las pruebas (`npx jest`) y cómo generar el APK (paso 3).

- [ ] **Step 3: ACCIÓN DE STEVEN — cuenta de Expo y compilación**

1. Crear una cuenta gratuita en `https://expo.dev/signup`.
2. En la sesión de Claude Code, ejecutar `! npx eas-cli@latest login`.
3. Ejecutar `npx eas-cli@latest build -p android --profile preview`. Aceptar vincular el proyecto y generar el keystore.

Expected: EAS entrega un enlace o QR del APK, y `app.json` queda con `extra.eas.projectId`.

- [ ] **Step 4: PRUEBA DE ACEPTACIÓN P1 (Steven, en el celular)**

Instalar el APK (permitir "fuentes desconocidas"), activar el **modo avión** y recorrer:
1. Abrir → pista "Toca para crear un vértice" → dibujar un pentágono.
2. "Colorear" → χ = 3 "Exacto" → tocar el ciclo impar resaltado.
3. DSATUR → Reiniciar → Reproducir, con sus explicaciones.
4. Mis grafos → K₃,₃ → bipartito, χ = 2.
5. Vista Texto del mismo grafo.
6. Cerrar la app por completo y volver a abrirla: el grafo sigue ahí (autoguardado).

Expected: los 6 puntos funcionan sin internet y sin errores.

- [ ] **Step 5: Commit**

```bash
git add eas.json app.json README.md
git commit -m "chore: perfil EAS para APK de Android y README en español"
```

---

## Siguientes planes (se escriben al terminar cada etapa)

- **P2 — Precedencias** (diseño §7.4):
  - `lib/precedence` (validación, ciclos, etapas por Kahn, orden topológico, ruta crítica) con los valores del Apéndice A como pruebas.
  - Flechas en el lienzo.
  - Pestaña Precedencias con Tabla ↔ Grafo, animación de etapas, ejemplo de la tarea y botón "Ver etapas como coloración".
- **P3 — Mejoras:** vista Matriz en ambos módulos, comparar algoritmos, modo "Colorea tú", grafos guardados en Mis grafos y pestaña Aprende.
- **P4 — Pulido:** compartir imagen, ajustes, vibración, ícono y pantalla de bienvenida, revisión de accesibilidad y APK final con el guion de demo completo (§9).
