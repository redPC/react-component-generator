import { describe, it, expect } from 'vitest';
import { validatePrompt, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePrompt', () => {
  it('정확히 500자인 프롬프트는 유효하다', () => {
    const result = validatePrompt('가'.repeat(MAX_PROMPT_LENGTH));

    expect(result.valid).toBe(true);
    expect(result.length).toBe(500);
    expect(result.error).toBeUndefined();
  });

  it('앞뒤 공백은 글자 수에서 제외한다', () => {
    const result = validatePrompt(`  ${'가'.repeat(MAX_PROMPT_LENGTH)}  \n`);

    expect(result.valid).toBe(true);
    expect(result.length).toBe(500);
  });

  it('500자를 넘으면 무효이고 초과 안내 메시지를 돌려준다', () => {
    const result = validatePrompt('가'.repeat(MAX_PROMPT_LENGTH + 1));

    expect(result.valid).toBe(false);
    expect(result.length).toBe(501);
    expect(result.error).toBe('프롬프트는 500자까지 입력할 수 있습니다. (현재 501자)');
  });
});
