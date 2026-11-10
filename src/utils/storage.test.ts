import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readStorage, writeStorage, addPromptHistory, reviveComponents } from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('readStorage', () => {
  it('저장된 값이 없으면 기본값을 반환한다', () => {
    expect(readStorage('k', 'fallback')).toBe('fallback');
  });

  it('writeStorage로 저장한 값을 그대로 읽는다', () => {
    writeStorage('k', { a: [1, 2] });
    expect(readStorage('k', null)).toEqual({ a: [1, 2] });
  });

  it('JSON이 깨져 있으면 기본값을 반환한다', () => {
    localStorage.setItem('k', '{broken');
    expect(readStorage('k', 'fallback')).toBe('fallback');
  });

  it('localStorage 접근이 예외를 던져도 기본값을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readStorage('k', 'fallback')).toBe('fallback');
    vi.restoreAllMocks();
  });
});

describe('writeStorage', () => {
  it('저장소가 가득 차 예외를 던져도 앱이 중단되지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeStorage('k', 'v')).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('addPromptHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPromptHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('최대 개수를 넘으면 가장 오래된 항목을 버린다', () => {
    expect(addPromptHistory(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });
});

describe('reviveComponents', () => {
  it('createdAt 문자열을 Date로 복원한다', () => {
    const iso = '2026-01-02T03:04:05.000Z';
    const [c] = reviveComponents([{ id: '1', prompt: 'p', code: 'c', createdAt: iso }]);
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.createdAt.toISOString()).toBe(iso);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(reviveComponents({ nope: true })).toEqual([]);
  });

  it('형식이 잘못된 항목은 걸러낸다', () => {
    const iso = '2026-01-02T03:04:05.000Z';
    const result = reviveComponents([
      { id: '1', prompt: 'p', code: 'c', createdAt: iso },
      { id: 2 },
      null,
      { id: '3', prompt: 'p', code: 'c', createdAt: 'not-a-date' },
    ]);
    expect(result.map((c) => c.id)).toEqual(['1']);
  });
});
