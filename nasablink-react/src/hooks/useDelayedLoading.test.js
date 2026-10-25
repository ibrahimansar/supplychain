import { act, renderHook } from '@testing-library/react';
import useDelayedLoading, { useLoadingPhase } from './useDelayedLoading';

describe('useDelayedLoading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const advance = (ms) => act(() => { jest.advanceTimersByTime(ms); });

  it('never paints a placeholder when the response beats the delay', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    advance(150);              // still inside the delay window
    expect(result.current).toBe(false);

    rerender({ loading: false });
    advance(1000);
    expect(result.current).toBe(false); // and it never appears afterwards
  });

  it('paints once the delay elapses', () => {
    const { result } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    advance(199);
    expect(result.current).toBe(false);
    advance(2);
    expect(result.current).toBe(true);
  });

  it('holds the placeholder for the minimum duration', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    advance(200);
    expect(result.current).toBe(true);

    rerender({ loading: false }); // finished 1ms after appearing
    advance(399);
    expect(result.current).toBe(true);  // still held
    advance(2);
    expect(result.current).toBe(false); // released after minDuration
  });

  it('hides immediately when the minimum has already passed', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    advance(200 + 500);
    rerender({ loading: false });
    advance(1);
    expect(result.current).toBe(false);
  });

  it('does not blink when a second load starts during the hold', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    advance(200);
    rerender({ loading: false }); // hold begins
    advance(100);
    rerender({ loading: true });  // new load lands mid-hold
    advance(1000);
    expect(result.current).toBe(true); // stayed up throughout
  });
});

describe('useLoadingPhase', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports hidden before the delay so callers reserve space instead of flashing content', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingPhase(loading, { delay: 200, minDuration: 400 }),
      { initialProps: { loading: true } },
    );

    expect(result.current).toBe('hidden');
    act(() => { jest.advanceTimersByTime(200); });
    expect(result.current).toBe('skeleton');

    rerender({ loading: false });
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current).toBe('content');
  });
});
