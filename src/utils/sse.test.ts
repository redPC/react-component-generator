import { describe, it, expect } from 'vitest';
import { parseSseEvents, readSseStream, type SseEvent } from './sse';

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe('parseSseEvents', () => {
  it('완성된 이벤트를 event 이름과 data로 파싱한다', () => {
    const { events, rest } = parseSseEvents('event: delta\ndata: {"text":"a"}\n\n');

    expect(events).toEqual([{ event: 'delta', data: '{"text":"a"}' }]);
    expect(rest).toBe('');
  });

  it('event 줄이 없으면 message 이벤트로 취급한다', () => {
    const { events } = parseSseEvents('data: x\n\n');

    expect(events).toEqual([{ event: 'message', data: 'x' }]);
  });

  it('끝나지 않은 이벤트는 rest에 남기고 events에 넣지 않는다', () => {
    const { events, rest } = parseSseEvents('event: delta\ndata: {"te');

    expect(events).toEqual([]);
    expect(rest).toBe('event: delta\ndata: {"te');
  });
});

describe('readSseStream', () => {
  it('이벤트가 청크 경계에 걸쳐도 순서대로 전달한다', async () => {
    const encoder = new TextEncoder();
    const body = streamFromChunks([
      encoder.encode('event: delta\nda'),
      encoder.encode('ta: {"text":"a"}\n\nevent: done\ndata: {}\n\n'),
    ]);
    const received: SseEvent[] = [];

    await readSseStream(body, (event) => received.push(event));

    expect(received).toEqual([
      { event: 'delta', data: '{"text":"a"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('멀티바이트 문자가 바이트 단위로 잘려도 깨지지 않는다', async () => {
    const bytes = new TextEncoder().encode('event: delta\ndata: {"text":"가"}\n\n');
    // '가'(EA B0 80)의 첫 바이트 뒤에서 자른다
    const cut = bytes.indexOf(0xea) + 1;
    const body = streamFromChunks([bytes.slice(0, cut), bytes.slice(cut)]);
    const received: SseEvent[] = [];

    await readSseStream(body, (event) => received.push(event));

    expect(received).toEqual([{ event: 'delta', data: '{"text":"가"}' }]);
  });
});
