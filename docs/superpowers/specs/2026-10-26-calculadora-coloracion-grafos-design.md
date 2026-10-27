# ColorGrafos — Documento de diseño

- **Fecha:** 2026-10-26
- **Autor:** Steven Ricardo Quiñones (con Claude)
- **Estado:** borrador para aprobación

Convención: lo marcado como **(decisión de Steven)** lo decidió el estudiante en la conversación. Lo marcado como **(decisión de Claude)** es una elección por defecto que Steven puede cambiar. Lo que no lleva marca y está en la sección 11 queda a criterio de quien construya.

---

## 1. Intención y porqué

El profesor del curso de **Teoría de Grafos** (Ingeniería de Sistemas) pidió construir una aplicación móvil similar a la calculadora web de coloración de grafos de miniwebtool (`https://miniwebtool.com/es/calculadora-de-coloracion-de-grafos/`).

La app se va a **mostrar al profesor en el celular Android de Steven**. El éxito es que el profesor piense:

1. "Hace todo lo que hace la web, **igual o mejor**."
2. "Tiene **buen diseño**, es **fácil de usar e intuitiva**, y es **menos compleja** que la web."
3. "Conectó la app con lo que vimos en clase": módulo de **grafos de precedencia** (tabla ↔ grafo, etapas) con la tarea de 13 vértices como ejemplo principal.

La mejora principal frente a la web es que en el celular **no hay que escribir el grafo como texto**: se dibuja con el dedo. La web obliga a escribir `A-B, B-C, ...`, lo que en un teclado móvil es lento y propenso a errores.

## 2. Objetivos

### 2.1 Paridad con la web (todo lo que la web hace)

| Función de la web | En la app |
| --- | --- |
| Entrada como **lista de aristas** (`A-B`, `A B`, `A->B`; separadas por coma o salto de línea) | Sí, en la vista "Texto" |
| Entrada como **lista de adyacencia** (`A: B, C, D`) | Sí, en la vista "Texto" |
| Etiquetas con letras, dígitos o `_`; aristas duplicadas se fusionan; grafo no dirigido; lazos (`A-A`) rechazados | Sí, mismas reglas. Los duplicados se fusionan con un aviso suave en vez de en silencio **(decisión de Claude)** |
| Límite de **60 vértices y 600 aristas** | Sí, mismo límite con mensaje amable |
| 8 ejemplos: C₄, K₃, K₅, C₅, W₆, K₃,₃, ejemplo de lista de adyacencia, programación de exámenes | Sí, más ejemplos adicionales (§7.5) |
| Algoritmos: **Auto**, **DSATUR**, **Welsh-Powell**, **Greedy (orden de entrada)**, **Exacto (backtracking)** | Sí, los cinco |
| Número cromático χ(G) con etiqueta "Exacto" cuando está demostrado | Sí (con reglas más estrictas, §7.3) |
| Colores usados y vértices de cada color (desglose por color) | Sí |
| Cota inferior por la clique más grande encontrada | Sí, y se resalta la clique en el grafo |
| Detección de grafo bipartito | Sí, y si no es bipartito se muestra el **ciclo impar** que lo demuestra (mejora) |
| Componentes conexas y estadísticas de grado | Sí, visibles (la web solo las tiene en datos ocultos) |
| Grafo interactivo con nodos arrastrables | Sí |
| Animación paso a paso: reproducir, atrás, siguiente, reiniciar, ir al final, control de velocidad | Sí, con explicación en texto de cada paso (mejora) |
| Contenido educativo: definición, χ(G), cotas triviales, clique, König, Brooks, cuatro colores, Δ+1, algoritmos, aplicaciones, casos especiales (completos, ciclos, árboles, bipartitos, Petersen, ruedas), FAQ | Sí, en la pestaña "Aprende" |

**Qué de la web NO se replica a propósito** (no aporta en una app offline): anuncios, límite de 3 usos diarios, premium, embed, API HTTP, extensión de Chrome, enlaces a asistentes de IA, compartir en redes sociales y cita bibliográfica. En su lugar se puede **compartir una imagen** del grafo coloreado (§7.3).

### 2.2 Mejoras sobre la web

1. **Dibujar el grafo con gestos** (§7.2): es la mejora más visible.
2. **100 % offline, sin límites ni anuncios.**
3. **Explicación de cada paso** de la animación ("Se elige D porque ve 2 colores distintos…").
4. **Comparar algoritmos** lado a lado en el mismo grafo.
5. **Modo práctica "Colorea tú"**: el usuario colorea tocando y la app detecta conflictos y le dice si llegó a χ.
6. **Vista de matriz de adyacencia** editable (conecta con la tarea del chatbot de Zapier sobre matrices de adyacencia, sin necesitar internet).
7. **Guardar grafos** y restaurar automáticamente el trabajo en curso.
8. **Modo oscuro** y paleta apta para daltonismo, con número de color dentro del vértice como opción.
9. **Testigos visuales**: resaltar la clique (cota inferior) y el ciclo impar (no bipartito).

### 2.3 Módulo de grafos de precedencia (decisión de Steven, recomendado por Claude)

Visto en clase: formato de **tabla** y formato de **grafo**. Tarea del profesor: "Construya un grafo de precedencia de 13 vértices de un aplicativo que indique el proceso de construcción de una casa. Construir el grafo, identificar las etapas, etc. Debe ser la plataforma tecnológica, no la construcción de la casa como tal."

Interpretación acordada: los 13 vértices son las **actividades del proyecto de software** que construye esa plataforma (Apéndice A).

## 3. No-objetivos

- iOS y web: el código es Expo y podría correr ahí, pero solo se diseña y prueba para **Android**.
- Cualquier función que necesite internet: chatbot, IA, sincronización en la nube, cuentas de usuario.
- Coloración de aristas, polinomio cromático y coloración de mapas reales. Pueden mencionarse en "Aprende", pero no se calculan.
- Grafos de más de 60 vértices.
- Diagramas de precedencia tipo AOA (actividades en flechas). Se usa **AON**: actividades en los vértices, que es lo que pide la tarea ("13 vértices").

## 4. Anti-objetivos (fracaso aunque "funcione")

- **Que parezca la web metida en un celular**: formularios largos, letra pequeña, obligar a escribir texto para empezar.
- **Un resultado incorrecto frente al profesor**: por ejemplo, etiquetar "Exacto" un χ que no está demostrado, o una coloración con dos vecinos del mismo color.
- **Que la app se congele** mientras busca el número cromático exacto.
- **Que el día de la demo no abra sin internet** (por ejemplo, por depender de Expo Go).
- **Un módulo de precedencias brillante con una coloración floja**: la coloración es el núcleo y se pule primero (§10).

## 5. Restricciones

- **Plataforma:** Android, en el celular de Steven, **sin internet**. Se instala como **APK** generado con EAS Build (perfil `preview`, `buildType: "apk"`). Expo Go solo se usa durante el desarrollo.
- **Stack existente (no cambiar):** proyecto creado con `create-expo-app`:
  - Expo **SDK 58**, React Native 0.88, React 19.3, TypeScript `strict`.
  - **Expo Router** con las rutas en `src/app/`. Las pestañas usan `NativeTabs` de `expo-router/native-tabs` (en Android son **máximo 5 pestañas** y no se pueden agregar ni quitar en tiempo de ejecución).
  - React Compiler activado (`experiments.reactCompiler`).
  - `react-native-reanimated` 4 y `react-native-gesture-handler` 3 ya instalados.
  - Gestor de paquetes **npm** (`package-lock.json`). Las dependencias se agregan con `npx expo install`.
- **Reglas del repositorio (`AGENTS.md`):**
  - Consultar la documentación versionada de SDK 58 antes de usar cualquier API de Expo o React Native.
  - No crear ni editar `android/` ni `ios/` a mano.
  - Correr `npx expo lint` y `npx tsc --noEmit` antes de dar algo por terminado.
- **Idioma:** toda la interfaz y el contenido en **español**.
- **Orientación:** vertical (ya configurada en `app.json`).

## 6. Experiencia de usuario: principios

1. **Empezar a dibujar en 1 toque.** La app abre directamente en el lienzo de coloración. Si está vacío, muestra una pista: "Toca para crear un vértice" y un botón "Cargar ejemplo".
2. **El grafo siempre visible.** Los resultados aparecen en una hoja inferior deslizable sobre el lienzo, no en otra pantalla.
3. **Uso con una mano.** Las acciones principales van en la parte inferior. Los objetivos táctiles miden al menos 48 dp.
4. **Todo se puede deshacer.** Hay botones de deshacer y rehacer en el editor, y un aviso con "Deshacer" tras cada borrado.
5. **Errores en español claro y en su lugar**, por ejemplo: "Línea 3: 'A-A' es un lazo; no se permiten".
6. **Retroalimentación táctil** (vibración breve) al crear un vértice o una arista **(decisión de Claude)**.
7. **Consistencia entre módulos.** El mismo lienzo, la misma animación y los mismos controles sirven a la coloración y a las precedencias.

## 7. Diseño funcional

### 7.1 Navegación (decisión de Claude)

Cuatro pestañas nativas (`NativeTabs`):

| Pestaña | Contenido |
| --- | --- |
| **Colorear** | Editor de grafo + resultados de coloración (pantalla inicial) |
| **Precedencias** | Tabla ↔ grafo de actividades, etapas, ruta crítica |
| **Mis grafos** | Ejemplos precargados + grafos guardados |
| **Aprende** | Teoría de coloración y de precedencias, con botones "Probar" que cargan un ejemplo |

Los **Ajustes** se abren desde un ícono en la cabecera, no como pestaña. Incluyen: tema (sistema/claro/oscuro), velocidad de animación por defecto, mostrar número de color en los vértices y vibración sí/no.

Las pantallas de ejemplo de la plantilla (`index.tsx` y `explore.tsx` con "Welcome to Expo") se reemplazan.

### 7.2 Editor de grafos (compartido por los dos módulos)

Tres vistas del **mismo** grafo, siempre sincronizadas y cambiables con un selector segmentado:

#### a) Vista "Dibujo" (por defecto)

Modelo de interacción **(decisión de Claude; validar pronto en el celular real)**:

| Gesto | Acción |
| --- | --- |
| Tocar espacio vacío | Crear vértice con la siguiente etiqueta libre (A, B, …, Z, luego A1, B1, …) |
| Tocar un vértice | Seleccionarlo (resaltado) |
| Con un vértice seleccionado, tocar otro | Crear arista entre ambos (si ya existe, se selecciona) |
| Arrastrar un vértice | Moverlo |
| Tocar una arista | Seleccionarla |
| Pellizcar / arrastrar con dos dedos | Zoom y desplazamiento del lienzo |
| Barra de acciones contextual (con algo seleccionado) | Renombrar, borrar |

En el módulo de precedencias, el **primer vértice tocado es la predecesora**: tocar A y luego B crea la flecha A → B **(decisión de Claude)**.

Barra inferior: deshacer, rehacer, **Reorganizar** (layout automático), limpiar y guardar.

- **Layout automático:** circular para grafos pequeños y de fuerzas (force-directed) para el resto. En precedencias, **por capas de izquierda a derecha según la etapa**.
- En el módulo de precedencias las aristas son **flechas** (dirigidas): de la predecesora a la actividad.

#### b) Vista "Texto"

- Selector de formato: lista de aristas o lista de adyacencia.
- Validación línea por línea mientras se escribe, con vista previa del número de vértices y aristas.
- Botón "Aplicar", que reemplaza el grafo y se puede deshacer.
- Al abrir la vista, el texto se genera desde el grafo actual.
- Un **vértice aislado** se escribe como una etiqueta sola en su propia línea (por ejemplo, `F`), para no perderlo en la lista de aristas **(decisión de Claude)**.
- Las etiquetas **distinguen mayúsculas de minúsculas** (`A` ≠ `a`). El campo de texto desactiva el autocorrector y las mayúsculas automáticas del teclado **(decisión de Claude)**.

#### c) Vista "Matriz"

- Matriz de adyacencia con encabezados de fila y columna. **Tocar una celda agrega o quita la arista.**
- En coloración (no dirigido), la matriz es simétrica: tocar (i,j) también cambia (j,i).
- En precedencias (dirigido), es la matriz del dígrafo, con columnas extra de **grado de entrada** y **grado de salida**.
- Desplazamiento horizontal y vertical con encabezados fijos para grafos grandes.

### 7.3 Módulo de coloración

**Algoritmos** (selector):

| Algoritmo | Comportamiento |
| --- | --- |
| **Auto** (por defecto) | Intenta el exacto con un presupuesto de tiempo. Si no termina, usa DSATUR |
| **DSATUR** | Elige el vértice sin color con más colores distintos en sus vecinos; desempata por grado y luego por orden de entrada |
| **Welsh-Powell** | Ordena por grado descendente y colorea de forma voraz |
| **Greedy (orden de entrada)** | Colorea en el orden en que se crearon los vértices, con el menor color libre |
| **Exacto (backtracking)** | Prueba k = cota inferior, k+1, …; búsqueda en profundidad con poda y orden por grado |

**Reglas del exacto (más estrictas que la web):**

- La etiqueta **"Exacto"** solo se muestra si la búsqueda **terminó** y demostró que k−1 colores no alcanzan, o si k coincide con la cota inferior (clique).
- La búsqueda **no congela la interfaz**: corre en trozos cediendo el control, o en otro hilo, a criterio de quien construya. Muestra progreso ("Probando con 4 colores…") y un botón **Cancelar**.
- Si se cancela o se agota el tiempo, se muestra "χ(G) ≤ k (cota superior)" junto a la cota inferior, sin decir "Exacto".
- Presupuesto de tiempo por defecto: unos segundos **(decisión de Claude; ajustable en código)**.

**χ(G) no depende del algoritmo elegido (decisión de Claude):**

- Al colorear, la app **siempre** corre en segundo plano la búsqueda exacta con presupuesto de tiempo para obtener χ(G).
- El algoritmo elegido determina solo la **coloración mostrada** y su número de **colores usados**.
- Así, elegir DSATUR o Greedy no le quita la insignia "Exacto" a χ, y se ve de forma didáctica cuándo un algoritmo voraz usa más colores que χ.

**Hoja de resultados** (deslizable sobre el lienzo; los vértices se pintan con su color):

- **χ(G)** grande, con insignia "Exacto" o "Cota superior".
- **Colores usados** por el algoritmo elegido. Si es mayor que χ, se muestra un aviso: "Welsh-Powell usó 4 colores; el mínimo es 3".
- **Clases de color**: "Color 1: A, C, E" con su muestra de color. Tocar una clase resalta sus vértices.
- **Cotas:** inferior ω (clique encontrada; tocar la resalta) y superiores Δ+1 y Brooks (cuando aplica), cada una con una línea de explicación.
- **Bipartito:** sí/no. Si no, tocar resalta un **ciclo impar** que lo demuestra.
- **Componentes conexas** y **grados**: mínimo, máximo, promedio y secuencia.

**Animación paso a paso:**

- Controles: reiniciar, atrás, reproducir/pausa, siguiente, ir al final, y velocidad (deslizador).
- Cada paso resalta el vértice elegido y muestra una **explicación en texto**. Ejemplo para DSATUR: "Se elige D: ve 2 colores distintos (rojo y azul), grado 3. Recibe verde, el menor color libre".
- En DSATUR se puede ver la **tabla de saturación** del paso actual.
- En el exacto, los pasos muestran intentos y retrocesos de forma resumida (por ejemplo, "k = 2: imposible (conflicto en C) → probando k = 3").

**Comparar algoritmos:** un botón ejecuta los cinco sobre el grafo actual y muestra una tabla (algoritmo | colores usados | pasos | tiempo). Tocar una fila aplica esa coloración.

**Modo "Colorea tú"** (práctica):

- El usuario elige un color de la paleta y toca vértices para pintarlos.
- Las aristas en conflicto (mismo color en los dos extremos) se marcan en rojo al instante.
- Al terminar, la app dice si la coloración es válida y si usó χ colores o más.

**Compartir:** exportar una **imagen PNG** del grafo coloreado con χ y la leyenda, mediante el menú de compartir de Android.

**Paleta:** colores distinguibles y aptos para daltonismo. Con la opción activa, cada vértice muestra el **número de color** además del relleno.

### 7.4 Módulo de precedencias

**Modelo:** lista de actividades, cada una con **código** (A, B, …), **nombre**, **predecesoras** (cero o más códigos) y **duración** opcional (número; unidad configurable por proyecto, por defecto "semanas").

Este módulo tiene tres vistas: **Tabla**, **Grafo** y **Matriz**. La Tabla ocupa el lugar de la vista Texto del editor de coloración **(decisión de Claude)**.

**Vista Tabla** (por defecto en este módulo):

- Columnas: Código | Actividad | Predecesoras | Duración | Etapa (calculada, solo lectura).
- Agregar, editar y borrar filas. Las predecesoras se eligen tocando **chips** con los códigos existentes, sin escribir.
- Al borrar una actividad, se quita también de las predecesoras de las demás, con aviso y opción de deshacer.

**Vista Grafo:** el mismo editor de §7.2 en modo dirigido, con layout por etapas. Crear una flecha en el dibujo agrega la predecesora en la tabla, y viceversa.

**Vista Matriz:** matriz del dígrafo con grados de entrada y salida (§7.2c).

**Resultados:**

- **Validación:**
  - Si hay un **ciclo**, se resalta en rojo con el mensaje "A → B → C → A: una actividad no puede depender de sí misma, directa o indirectamente".
  - También se detectan predecesoras inexistentes y autodependencias.
  - Mientras haya errores, no se calculan etapas.
- **Etapas:** etapa 1 = actividades sin predecesoras; etapa k = 1 + la etapa máxima de sus predecesoras. Se muestran como lista de grupos y como columnas en el grafo.
- **Orden topológico:** un orden válido de ejecución.
- **Actividades iniciales y finales.**
- **Ruta crítica** (si todas las actividades tienen duración): inicio temprano, fin temprano, inicio tardío, fin tardío y **holgura** de cada actividad; **duración total** del proyecto; ruta crítica resaltada en el grafo y en la tabla. Si hay empate entre rutas críticas, se resaltan todas.
- **Animación paso a paso** de la identificación de etapas, con el algoritmo de Kahn: "Etapa 1: A no tiene predecesoras. Se retira A; ahora B queda sin predecesoras → etapa 2…". Usa el mismo reproductor que la coloración.

**Puente con la coloración:** el botón **"Ver etapas como coloración"** abre el grafo (sin direcciones) en el módulo de coloración, pintado con un color por etapa. Muestra lado a lado "Etapas: 8 colores" y "χ(G) = 3", con una explicación:

- Toda flecha une etapas distintas, así que las etapas son una coloración válida y **número de etapas ≥ χ(G)**.
- El teorema de **Gallai–Hasse–Roy–Vitaver** dice que χ(G) es el mínimo, sobre todas las orientaciones sin ciclos, del número de vértices del camino más largo.

**Ejemplo principal:** la tarea de 13 actividades (Apéndice A). También se incluye un ejemplo pequeño de 5 o 6 actividades para explicar.

### 7.5 Mis grafos

- **Ejemplos de coloración:** los 8 de la web, más Petersen (χ = 3), un árbol (χ = 2), el cubo Q₃ (χ = 2), W₅ (χ = 4) y el grafo no dirigido de la tarea (χ = 3). El ejemplo de programación de exámenes se construye con datos inventados y plausibles (materias como vértices; arista = comparten estudiantes).
- **Convención de ruedas:** Wₙ = ciclo Cₙ + un vértice central (n + 1 vértices), igual que la web. Por eso W₆ tiene 7 vértices y χ = 3, y W₅ tiene 6 vértices y χ = 4.
- **Cargar un ejemplo reemplaza** el grafo actual del módulo, y se puede deshacer. Lo mismo pasa con "Ver etapas como coloración" **(decisión de Claude)**.
- **Ejemplos de precedencias:** la tarea de 13 actividades y el ejemplo pequeño.
- **Guardados:** guardar con nombre, abrir, renombrar, duplicar y borrar (con deshacer). Cada tarjeta muestra una miniatura, el módulo y la fecha.
- **Autoguardado:** el trabajo en curso de cada módulo se restaura al volver a abrir la app.

### 7.6 Aprende

Contenido estático incluido en la app (offline), en secciones cortas y con lenguaje claro:

- **Coloración:** definición de coloración propia, χ(G), cotas (triviales, clique, Δ+1, Brooks), König (bipartitos), teorema de los cuatro colores, cómo funciona cada algoritmo, casos especiales (Kₙ, ciclos par/impar, árboles, bipartitos, ruedas, Petersen), aplicaciones (exámenes, frecuencias de radio, registros, mapas, Sudoku) y preguntas frecuentes.
- **Precedencias:** qué es un grafo de precedencia, tabla vs. grafo, etapas, orden topológico, por qué no puede haber ciclos, ruta crítica y holgura, y la conexión con la coloración.
- Cada concepto con ejemplo lleva un botón **"Probar"** que carga el ejemplo en el módulo correspondiente.

### 7.7 Identidad visual

- **Nombre visible:** "ColorGrafos" **(decisión de Claude; Steven puede cambiarlo)**.
- Ícono y pantalla de bienvenida propios, que reemplazan los de la plantilla.
- Estilo limpio con un color primario y la paleta de colores de grafo como protagonista visual.

## 8. Diseño técnico

### 8.1 Capas

```text
src/
  app/                 rutas de Expo Router (solo pantallas y _layout)
  lib/                 TypeScript puro, sin React, 100 % testeable
    graph/             modelo, parsers (aristas, adyacencia, matriz), serialización, validación
    coloring/          los 5 algoritmos → { coloración, pasos[], estadísticas }
    analysis/          clique, bipartito + ciclo impar, componentes, grados, cotas
    precedence/        validación, ciclos, etapas (Kahn), orden topológico, ruta crítica
    layout/            circular, fuerzas, por capas
    examples/          datos de los ejemplos
  components/          lienzo de grafo, reproductor de pasos, hoja de resultados, tabla, matriz…
  state/               estado del editor con deshacer/rehacer, persistencia
  content/             textos de "Aprende"
```

**Principio clave:** los algoritmos devuelven sus **pasos como datos** (lista de eventos). El reproductor de la interfaz solo recorre esa lista. Así la animación, las explicaciones y las pruebas usan la misma fuente de verdad.

### 8.2 Elecciones técnicas (decisiones de Claude)

| Necesidad | Elección | Por qué |
| --- | --- | --- |
| Dibujar el grafo | `react-native-svg` | Incluido en Expo Go, suficiente para 60 vértices y 600 aristas |
| Gestos y animación | `react-native-gesture-handler` + `react-native-reanimated` | Ya instalados |
| Persistencia | `expo-sqlite/kv-store` (JSON) | Offline, con API síncrona, recomendado por Expo |
| Vibración | `expo-haptics` | Módulo oficial |
| Compartir imagen | `react-native-view-shot` (`captureRef`) + `expo-sharing` | Documentados en SDK 58 |
| Pruebas | `jest-expo` + Jest 30 (`npx expo install jest-expo jest @types/jest --dev`) | Recomendado por Expo para SDK 58 |
| Componentes nativos Material 3 | `@expo/ui/jetpack-compose` (ya instalado) **permitido, no obligatorio** | Puede dar controles nativos de Android (deslizador, botones segmentados, hoja inferior). Quien construya decide según cómo se integre |
| Compilación | EAS Build, perfil `preview` con `"buildType": "apk"` | APK instalable sin Android Studio. Requiere cuenta gratuita de Expo (acción de Steven) |

### 8.3 Calidad y verificación

- **Pruebas unitarias obligatorias** para todo `src/lib/`, con valores conocidos:
  - χ(Kₙ) = n, χ(C₂ₖ) = 2, χ(C₂ₖ₊₁) = 3, χ(W₅) = 4, χ(W₆) = 3, χ(K₃,₃) = 2, χ(Petersen) = 3, χ(árbol) = 2, χ(tarea) = 3.
  - Toda coloración devuelta es propia (ningún par de vecinos con el mismo color).
  - Parsers: aristas duplicadas, lazos, etiquetas inválidas, límites de 60 y 600, flechas `->`.
  - Precedencias: la tarea da 8 etapas, ruta crítica A-B-C-E-G-J-K-M, 14 semanas y las holguras del Apéndice A; detección de ciclos.
- Antes de dar una tarea por terminada: `npx expo lint`, `npx tsc --noEmit` y las pruebas.
- **Prueba de aceptación final:** instalar el APK en el celular, activar el **modo avión** y recorrer el guion de demo (§9) sin errores.

## 9. Guion de demo (criterio de éxito)

En unos 5 minutos, en modo avión:

1. Abrir la app → lienzo vacío con pista. Dibujar un pentágono con el dedo (5 toques + 5 conexiones).
2. "Colorear" → χ = 3 "Exacto", con la explicación de por qué no es bipartito (ciclo impar resaltado).
3. Reproducir la animación DSATUR paso a paso con sus explicaciones.
4. Cargar K₃,₃ desde ejemplos → bipartito, χ = 2. Abrir "Comparar algoritmos".
5. Mostrar las vistas Texto y Matriz del mismo grafo.
6. Pestaña Precedencias → cargar la tarea de 13 actividades → tabla ↔ grafo → 8 etapas → animación de etapas → ruta crítica de 14 semanas.
7. "Ver etapas como coloración" → 8 etapas vs. χ = 3 y el teorema.

## 10. Prioridades (orden de construcción)

La coloración se pule primero; las extras van después.

| Prioridad | Alcance |
| --- | --- |
| **P1 — núcleo** | Limpieza de la plantilla, navegación, `lib/graph` + `lib/coloring` + `lib/analysis` con pruebas, editor Dibujo + Texto, los 5 algoritmos, hoja de resultados, animación con explicaciones, ejemplos de la web, autoguardado, primer APK probado offline |
| **P2 — precedencias** | `lib/precedence` con pruebas, Tabla ↔ Grafo, validación de ciclos, etapas, orden topológico, animación de etapas, ruta crítica, ejemplo de la tarea, puente con la coloración |
| **P3 — mejoras** | Vista Matriz (ambos módulos), comparar algoritmos, modo "Colorea tú", Mis grafos (guardar, abrir, etc.), Aprende |
| **P4 — pulido** | Compartir imagen, ajustes, ícono y bienvenida, vibración, revisión de accesibilidad, APK final |

Al terminar cada prioridad se genera un APK y se prueba en el celular, para que siempre haya una versión presentable.

## 11. Queda a criterio de quien construya

- Implementación concreta de cada algoritmo (poda del exacto, búsqueda de clique, layout de fuerzas y por capas), siempre que cumpla §7 y §8.3.
- Cómo evitar que el exacto congele la interfaz (trozos con cesión de control, hilo aparte, etc.).
- Librería o patrón de estado (reducer propio, Zustand, etc.), siempre que soporte deshacer/rehacer y se pueda probar.
- Uso o no de `@expo/ui/jetpack-compose`.
- Colores exactos de la paleta, tipografía y textos de "Aprende" (deben ser correctos y en español).
- Datos del ejemplo de programación de exámenes y del ejemplo pequeño de precedencias.
- Estructura interna de componentes.

## 12. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El modelo de gestos (tocar-tocar para conectar vs. arrastrar para mover) se siente confuso | Prototipo temprano del lienzo en P1, probado en el celular antes de construir encima |
| El exacto es lento con más de 20 vértices | Presupuesto de tiempo + cancelar + etiqueta honesta "Cota superior" |
| La matriz de 60×60 no cabe en pantalla | Desplazamiento en dos ejes con encabezados fijos y zoom |
| Steven no tiene cuenta de Expo para EAS Build | Crear la cuenta gratuita al inicio de P1; generar el primer APK temprano |

---

## Apéndice A — Tarea: grafo de precedencia de 13 actividades

**Proyecto:** desarrollo de una plataforma (app móvil + servidor) que guía y da seguimiento al proceso de construcción de una casa. Propuesto por Claude y aceptado por Steven.

| Código | Actividad | Predecesoras | Duración (sem.) | Etapa |
| :---: | --- | :---: | :---: | :---: |
| A | Levantamiento de requisitos (entrevistas con constructores y clientes) | — | 2 | 1 |
| B | Planificación del proyecto (alcance, cronograma, presupuesto) | A | 1 | 2 |
| C | Diseño de la arquitectura del software | B | 2 | 3 |
| D | Diseño de interfaz UI/UX (prototipos de pantallas) | B | 2 | 3 |
| E | Diseño de la base de datos (obras, etapas, materiales) | C | 1 | 4 |
| F | Configuración del servidor en la nube | C | 1 | 4 |
| G | Módulo de etapas de obra (cronograma y avance de la casa) | E | 3 | 5 |
| H | Módulo de presupuesto y materiales | E | 2 | 5 |
| I | Desarrollo de la interfaz de la app móvil | D | 3 | 4 |
| J | Integración de módulos con la interfaz | G, H, I | 2 | 6 |
| K | Pruebas del sistema | J, F | 2 | 7 |
| L | Manual de usuario y capacitación | J | 1 | 7 |
| M | Despliegue y entrega final | K, L | 1 | 8 |

**Resultados esperados** (sirven como casos de prueba):

- **Etapas (8):** {A} → {B} → {C, D} → {E, F, I} → {G, H} → {J} → {K, L} → {M}
- **Ruta crítica:** A → B → C → E → G → J → K → M; **duración total: 14 semanas**.

| Act. | IT | FT | IL | FL | Holgura |
| :---: | :---: | :---: | :---: | :---: | :---: |
| A | 0 | 2 | 0 | 2 | 0 |
| B | 2 | 3 | 2 | 3 | 0 |
| C | 3 | 5 | 3 | 5 | 0 |
| D | 3 | 5 | 4 | 6 | 1 |
| E | 5 | 6 | 5 | 6 | 0 |
| F | 5 | 6 | 10 | 11 | 5 |
| G | 6 | 9 | 6 | 9 | 0 |
| H | 6 | 8 | 7 | 9 | 1 |
| I | 5 | 8 | 6 | 9 | 1 |
| J | 9 | 11 | 9 | 11 | 0 |
| K | 11 | 13 | 11 | 13 | 0 |
| L | 11 | 12 | 12 | 13 | 1 |
| M | 13 | 14 | 13 | 14 | 0 |

(IT/FT = inicio/fin temprano; IL/FL = inicio/fin tardío.)

**Como grafo no dirigido (para el módulo de coloración):**

- 13 vértices y 16 aristas: A-B, B-C, B-D, C-E, C-F, D-I, E-G, E-H, G-J, H-J, I-J, F-K, J-K, J-L, K-M, L-M.
- Sin triángulos → ω = 2.
- Contiene el ciclo impar B-C-E-G-J-I-D-B (7 vértices) → no es bipartito → **χ = 3**.
- Una 3-coloración válida: 1 = {B, E, F, I, L}; 2 = {A, C, D, G, H, K}; 3 = {J, M}.
- La coloración por etapas usa 8 colores ≥ χ = 3.
