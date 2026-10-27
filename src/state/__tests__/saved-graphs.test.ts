import type { EditorDoc } from '@/state/editor-reducer';
import {
  cleanName,
  deserializeSaved,
  NAME_MAX,
  type SavedGraph,
  savedReducer,
  type SavedState,
  serializeSaved,
  uniqueName,
} from '@/state/saved-graphs';

const NOW = '2026-10-27T14:05:00.000Z';

const docOf = (...vertices: string[]): EditorDoc => ({
  graph: { directed: false, vertices, edges: [] },
  positions: Object.fromEntries(vertices.map((v, i) => [v, { x: i * 10, y: 0 }])),
});

const empty: SavedState = { items: [], lastRemoved: null };

const save = (state: SavedState, name: string, id: string, doc = docOf('A')) =>
  savedReducer(state, { type: 'save', name, module: 'coloring', doc, id, now: NOW });

const names = (state: SavedState) => state.items.map((i) => i.name);

describe('uniqueName', () => {
  const items = [{ id: '1', name: 'Tarea' }, { id: '2', name: 'Tarea (2)' }] as SavedGraph[];

  it('agrega un número entre paréntesis si el nombre ya está', () => {
    expect(uniqueName('Libre', items)).toBe('Libre');
    expect(uniqueName('Tarea', items)).toBe('Tarea (3)');
    expect(uniqueName('Tarea', items.slice(0, 1))).toBe('Tarea (2)');
  });

  it('no choca con el propio elemento', () => {
    expect(uniqueName('Tarea', items, '1')).toBe('Tarea');
  });
});

describe('cleanName', () => {
  it('recorta los espacios y rechaza vacíos o demasiado largos', () => {
    expect(cleanName('  Mi grafo  ')).toBe('Mi grafo');
    expect(cleanName('   ')).toBeNull();
    expect(cleanName('x'.repeat(NAME_MAX))).toBe('x'.repeat(40));
    expect(cleanName('x'.repeat(NAME_MAX + 1))).toBeNull();
  });
});

describe('savedReducer', () => {
  it('save agrega al principio con un nombre único', () => {
    const s = save(save(empty, 'Tarea', 'a'), 'Tarea', 'b', docOf('B'));
    expect(names(s)).toEqual(['Tarea (2)', 'Tarea']);
    expect(s.items[0]).toEqual({ id: 'b', name: 'Tarea (2)', module: 'coloring', doc: docOf('B'), savedAt: NOW });
  });

  it('rename a un nombre de otro lo numera; al suyo propio lo deja igual', () => {
    const s = save(save(empty, 'X', 'a'), 'Y', 'b');
    expect(names(savedReducer(s, { type: 'rename', id: 'b', name: 'X' }))).toEqual(['X (2)', 'X']);
    expect(savedReducer(s, { type: 'rename', id: 'a', name: 'X' }).items).toEqual(s.items);
  });

  it('duplicate inserta la copia justo después con el mismo doc', () => {
    const s = save(save(empty, 'X', 'a'), 'Y', 'b');
    const d = savedReducer(s, { type: 'duplicate', id: 'b', newId: 'c', now: NOW });
    expect(names(d)).toEqual(['Y', 'Y (copia)', 'X']);
    expect(d.items[1]).toMatchObject({ id: 'c', doc: s.items[0].doc });
    const again = savedReducer(d, { type: 'duplicate', id: 'b', newId: 'e', now: NOW });
    expect(names(again)).toEqual(['Y', 'Y (copia) (2)', 'Y (copia)', 'X']);
  });

  it('remove + undoRemove restaura en el mismo índice', () => {
    const s = save(save(save(empty, 'X', 'a'), 'Y', 'b'), 'Z', 'c');
    const removed = savedReducer(s, { type: 'remove', id: 'b' });
    expect(names(removed)).toEqual(['Z', 'X']);
    expect(savedReducer(removed, { type: 'undoRemove' })).toEqual({ items: s.items, lastRemoved: null });
  });

  it('dos remove seguidos + undoRemove restaura solo el último', () => {
    const s = save(save(save(empty, 'X', 'a'), 'Y', 'b'), 'Z', 'c');
    const twice = savedReducer(savedReducer(s, { type: 'remove', id: 'c' }), { type: 'remove', id: 'a' });
    expect(names(savedReducer(twice, { type: 'undoRemove' }))).toEqual(['Y', 'X']);
  });

  it('undoRemove sin nada que restaurar devuelve el mismo estado', () => {
    const s = save(empty, 'X', 'a');
    expect(savedReducer(s, { type: 'undoRemove' })).toBe(s);
  });
});

describe('serializeSaved / deserializeSaved', () => {
  it('omite las entradas inválidas o con doc corrupto', () => {
    const good = save(empty, 'Bueno', 'a').items[0];
    const text = JSON.stringify([
      JSON.parse(serializeSaved([good]))[0],
      { ...JSON.parse(serializeSaved([good]))[0], id: 'b', doc: '{"version":1' },
      'basura',
      { id: 'c' },
    ]);
    expect(deserializeSaved(text)).toEqual([good]);
  });

  it('sin datos o con JSON inválido devuelve una lista vacía', () => {
    expect(deserializeSaved(null)).toEqual([]);
    expect(deserializeSaved('{no es json')).toEqual([]);
    expect(deserializeSaved('{"items":[]}')).toEqual([]);
  });

  it('ida y vuelta conserva todo', () => {
    const items = save(save(empty, 'X', 'a'), 'Y', 'b', docOf('P', 'Q')).items;
    expect(deserializeSaved(serializeSaved(items))).toEqual(items);
  });
});
