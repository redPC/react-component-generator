import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

beforeEach(() => {
  localStorage.clear();
});

describe('usePersistentState', () => {
  it('저장된 값이 없으면 초기값을 사용한다', () => {
    const { result } = renderHook(() => usePersistentState('k', 'init'));
    expect(result.current[0]).toBe('init');
  });

  it('저장된 값이 있으면 초기값 대신 복원한다', () => {
    localStorage.setItem('k', JSON.stringify('saved'));
    const { result } = renderHook(() => usePersistentState('k', 'init'));
    expect(result.current[0]).toBe('saved');
  });

  it('값을 바꾸면 localStorage에 저장된다', () => {
    const { result } = renderHook(() => usePersistentState('k', 'init'));
    act(() => result.current[1]('next'));
    expect(JSON.parse(localStorage.getItem('k')!)).toBe('next');
  });

  it('revive 함수가 있으면 복원된 값을 변환한다', () => {
    localStorage.setItem('k', JSON.stringify([1, 2]));
    const { result } = renderHook(() =>
      usePersistentState<number[]>('k', [], (raw) => (raw as number[]).map((n) => n * 10)),
    );
    expect(result.current[0]).toEqual([10, 20]);
  });
});
