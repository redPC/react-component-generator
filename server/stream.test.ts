import { describe, it, expect } from 'vitest';
import {
  splitSseData,
  formatSse,
  parseAnthropicChunk,
  parseGoogleChunk,
} from './stream';

describe('splitSseData', () => {
  it('완성된 data 이벤트의 페이로드를 꺼낸다', () => {
    const { payloads, rest } = splitSseData('data: {"a":1}\n\n');

    expect(payloads).toEqual(['{"a":1}']);
    expect(rest).toBe('');
  });

  it('끝나지 않은 이벤트는 rest에 남긴다', () => {
    const { payloads, rest } = splitSseData('data: {"a":1}\n\ndata: {"b"');

    expect(payloads).toEqual(['{"a":1}']);
    expect(rest).toBe('data: {"b"');
  });

  it('event 줄은 무시하고 data 페이로드만 꺼낸다', () => {
    const { payloads } = splitSseData('event: message_start\ndata: {"x":1}\n\n');

    expect(payloads).toEqual(['{"x":1}']);
  });
});

describe('formatSse', () => {
  it('event 이름과 JSON data를 SSE 형식으로 직렬화한다', () => {
    expect(formatSse('delta', { text: 'hi' })).toBe('event: delta\ndata: {"text":"hi"}\n\n');
  });
});

describe('parseAnthropicChunk', () => {
  it('text_delta 이벤트에서 텍스트를 꺼낸다', () => {
    const payload = JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'const A' },
    });

    expect(parseAnthropicChunk(payload)).toBe('const A');
  });

  it('텍스트와 무관한 이벤트는 빈 문자열을 반환한다', () => {
    const payload = JSON.stringify({ type: 'message_start', message: {} });

    expect(parseAnthropicChunk(payload)).toBe('');
  });

  it('스트림 중 error 이벤트가 오면 에러를 던진다', () => {
    const payload = JSON.stringify({ type: 'error', error: { type: 'overloaded_error' } });

    expect(() => parseAnthropicChunk(payload)).toThrow('Claude API stream error');
  });
});

describe('parseGoogleChunk', () => {
  it('첫 후보의 parts 텍스트를 이어 붙여 반환한다', () => {
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'const ' }, { text: 'A' }] } }],
    });

    expect(parseGoogleChunk(payload)).toBe('const A');
  });

  it('후보가 없으면 빈 문자열을 반환한다', () => {
    expect(parseGoogleChunk(JSON.stringify({}))).toBe('');
  });

  it('finishReason이 MAX_TOKENS면 잘림 에러를 던진다', () => {
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'MAX_TOKENS' }],
    });

    expect(() => parseGoogleChunk(payload)).toThrow('생성된 코드가 너무 길어 잘렸습니다.');
  });
});
