import { createAutosaver } from '../autosaver';

describe('createAutosaver', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('guarda el valor medio segundo después de programarlo', () => {
    const save = jest.fn();
    const saver = createAutosaver(save, 500);
    saver.schedule('a');
    jest.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('a');
  });

  it('con cambios seguidos guarda solo el último', () => {
    const save = jest.fn();
    const saver = createAutosaver(save, 500);
    saver.schedule('a');
    jest.advanceTimersByTime(300);
    saver.schedule('b');
    jest.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('b');
  });

  it('flush guarda lo pendiente al instante y el temporizador ya no vuelve a guardar', () => {
    const save = jest.fn();
    const saver = createAutosaver(save, 500);
    saver.schedule('a');
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('a');
    jest.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush sin nada pendiente no guarda', () => {
    const save = jest.fn();
    const saver = createAutosaver(save, 500);
    saver.flush();
    saver.schedule('a');
    jest.advanceTimersByTime(500);
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel descarta lo pendiente', () => {
    const save = jest.fn();
    const saver = createAutosaver(save, 500);
    saver.schedule('a');
    saver.cancel();
    jest.advanceTimersByTime(1000);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
  });
});
