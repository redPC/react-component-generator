import { describe, it, expect, vi } from 'vitest';
import {
  splitSseData,
  formatSse,
  parseAnthropicChunk,
  parseGoogleChunk,
  relayUpstream,
} from './stream';

function upstreamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }

  return out;
}

const deltaEvent = (text: string) =>
  `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`;

describe('relayUpstream', () => {
  it('델타를 delta 이벤트로 보내고, 끝나면 정규화된 코드를 done 이벤트로 보낸다', async () => {
    const out = await readAll(
      relayUpstream(upstreamFrom([deltaEvent('const Button = () => null;')]), parseAnthropicChunk),
    );

    expect(out).toContain('event: delta');
    expect(out).toContain('event: done');
    expect(out).toContain('render(<Button />);');
  });

  it('파서가 던지면 error 이벤트를 보내고 스트림을 닫는다', async () => {
    const parse = () => {
      throw new Error('upstream boom');
    };

    const out = await readAll(relayUpstream(upstreamFrom(['data: {}\n\n']), parse));

    expect(out).toContain('event: error');
    expect(out).toContain('upstream boom');
    expect(out).not.toContain('event: done');
  });

  it('출력 스트림이 취소되면 업스트림 reader도 취소한다', async () => {
    const onCancel = vi.fn();
    const pending = new ReadableStream<Uint8Array>({ cancel: onCancel });
    const out = relayUpstream(pending, parseAnthropicChunk);

    await out.cancel();

    expect(onCancel).toHaveBeenCalled();
  });
});

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
