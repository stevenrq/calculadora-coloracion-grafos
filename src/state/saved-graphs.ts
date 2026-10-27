import { deserializeDoc, serializeDoc } from './doc-serialization';
import type { EditorDoc } from './editor-reducer';
import type { DocKey } from './storage';

export const NAME_MAX = 40;

export interface SavedGraph {
  id: string;
  name: string;
  module: DocKey;
  doc: EditorDoc;
  /** Fecha ISO de cuando se guardó. */
  savedAt: string;
}

export interface SavedState {
  /** El más reciente primero. */
  items: SavedGraph[];
  /** Lo último que se borró, para "Deshacer" (solo uno). */
  lastRemoved: { item: SavedGraph; index: number } | null;
}

/** Los ids y la fecha llegan en la acción: el reducer es puro. */
export type SavedAction =
  | { type: 'save'; name: string; module: DocKey; doc: EditorDoc; id: string; now: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'duplicate'; id: string; newId: string; now: string }
  | { type: 'remove'; id: string }
  | { type: 'undoRemove' };

/** `name`, o `name (2)`, `name (3)`… si otro elemento (distinto de `exceptId`) ya lo usa. */
export function uniqueName(name: string, items: readonly Pick<SavedGraph, 'id' | 'name'>[], exceptId?: string): string {
  const taken = new Set(items.filter((i) => i.id !== exceptId).map((i) => i.name));
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name} (${n})`)) n++;
  return `${name} (${n})`;
}

/** Nombre escrito por la persona sin espacios sobrantes, o `null` si queda vacío o pasa de `NAME_MAX`. */
export function cleanName(text: string): string | null {
  const name = text.trim();
  return name.length === 0 || name.length > NAME_MAX ? null : name;
}

export function savedReducer(state: SavedState, action: SavedAction): SavedState {
  const { items } = state;
  switch (action.type) {
    case 'save': {
      const { name, module, doc, id, now } = action;
      const item: SavedGraph = { id, name: uniqueName(name, items), module, doc, savedAt: now };
      return { ...state, items: [item, ...items] };
    }
    case 'rename': {
      const current = items.find((i) => i.id === action.id);
      if (!current) return state;
      const name = uniqueName(action.name, items, action.id);
      if (name === current.name) return state;
      return { ...state, items: items.map((i) => (i === current ? { ...i, name } : i)) };
    }
    case 'duplicate': {
      const index = items.findIndex((i) => i.id === action.id);
      if (index < 0) return state;
      const original = items[index];
      const copy: SavedGraph = {
        ...original,
        id: action.newId,
        name: uniqueName(`${original.name} (copia)`, items),
        savedAt: action.now,
      };
      return { ...state, items: [...items.slice(0, index + 1), copy, ...items.slice(index + 1)] };
    }
    case 'remove': {
      const index = items.findIndex((i) => i.id === action.id);
      if (index < 0) return state;
      return { items: items.filter((_, i) => i !== index), lastRemoved: { item: items[index], index } };
    }
    case 'undoRemove': {
      if (!state.lastRemoved) return state;
      const { item, index } = state.lastRemoved;
      // Si mientras tanto se guardó otro con el mismo nombre, el restaurado se numera.
      const restored = { ...item, name: uniqueName(item.name, items, item.id) };
      const at = Math.min(index, items.length);
      return { items: [...items.slice(0, at), restored, ...items.slice(at)], lastRemoved: null };
    }
  }
}

let idCounter = 0;
/** Id único en este dispositivo: momento actual en base 36 más un contador. */
export function newSavedId(): string {
  idCounter++;
  return `${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function serializeSaved(items: readonly SavedGraph[]): string {
  return JSON.stringify(
    items.map(({ id, name, module, doc, savedAt }) => ({ id, name, module, savedAt, doc: serializeDoc(doc) })),
  );
}

const MODULES: readonly DocKey[] = ['coloring', 'precedence'];

/** Lista guardada; omite las entradas inválidas o con el doc corrupto. Nunca lanza. */
export function deserializeSaved(text: string | null): SavedGraph[] {
  if (text === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const items: SavedGraph[] = [];
  const ids = new Set<string>();
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, name, module, savedAt, doc } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || id.length === 0 || ids.has(id)) continue;
    // Sin tope de largo: las copias ("… (copia) (2)") pueden pasar de NAME_MAX y no deben perderse.
    if (typeof name !== 'string' || name.trim().length === 0) continue;
    if (!MODULES.includes(module as DocKey)) continue;
    if (typeof savedAt !== 'string' || Number.isNaN(Date.parse(savedAt))) continue;
    const parsed = typeof doc === 'string' ? deserializeDoc(doc) : null;
    // Un grafo de precedencias es siempre dirigido, y uno de coloración nunca.
    if (!parsed || parsed.graph.directed !== (module === 'precedence')) continue;
    ids.add(id);
    items.push({ id, name, module: module as DocKey, savedAt, doc: parsed });
  }
  return items;
}
