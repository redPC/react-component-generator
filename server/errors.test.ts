import { describe, it, expect } from 'vitest';
import { toApiError } from './errors';

describe('toApiError', () => {
  it('메시지에 503이 포함되면 과부하 안내와 503 상태를 반환한다', () => {
    expect(toApiError(new Error('Claude API error: 503'))).toEqual({
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('메시지에 429가 포함되면 요청 과다 안내와 429 상태를 반환한다', () => {
    expect(toApiError(new Error('Gemini API error: 429'))).toEqual({
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('그 밖의 에러는 500과 원래 메시지를 반환한다', () => {
    expect(toApiError(new Error('Claude API stream error'))).toEqual({
      status: 500,
      error: 'Claude API stream error',
    });
  });

  it('Error가 아닌 값은 Unknown error로 처리한다', () => {
    expect(toApiError('boom')).toEqual({ status: 500, error: 'Unknown error' });
  });
});
