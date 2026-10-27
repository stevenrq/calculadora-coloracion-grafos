import { PLAYBACK_SPEEDS, saturationRows, speedLabel, stepIntervalMs } from '../replay';

describe('saturationRows', () => {
  it('ordena como DSATUR: mayor saturación, luego mayor grado, luego orden de entrada', () => {
    const rows = saturationRows({ A: 1, B: 2, C: 1, D: 1 }, { A: 2, B: 1, C: 3, D: 2 });
    expect(rows.map((r) => r.vertex)).toEqual(['B', 'C', 'A', 'D']);
    expect(rows[0]).toEqual({ vertex: 'B', saturation: 2, degree: 1 });
  });

  it('un vértice sin grado conocido cuenta como grado 0', () => {
    expect(saturationRows({ X: 0 }, {})).toEqual([{ vertex: 'X', saturation: 0, degree: 0 }]);
  });
});

describe('velocidad de reproducción', () => {
  it('va de 0,25× a 4× con 1× en el medio', () => {
    expect(PLAYBACK_SPEEDS).toEqual([0.25, 0.5, 1, 2, 4]);
    expect(PLAYBACK_SPEEDS[2]).toBe(1);
  });

  it('avanza cada 900 / velocidad ms', () => {
    expect(stepIntervalMs(1)).toBe(900);
    expect(stepIntervalMs(4)).toBe(225);
    expect(stepIntervalMs(0.25)).toBe(3600);
  });

  it('etiqueta con coma decimal', () => {
    expect(speedLabel(0.25)).toBe('0,25×');
    expect(speedLabel(2)).toBe('2×');
  });
});
