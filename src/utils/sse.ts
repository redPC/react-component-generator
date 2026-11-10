// 서버가 보내는 SSE 스트림을 이벤트 단위로 읽는 유틸.
export interface SseEvent {
  event: string;
  data: string;
}

/** SSE 버퍼에서 완성된 이벤트를 꺼내고, 끝나지 않은 나머지는 rest로 돌려준다. */
export function parseSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: SseEvent[] = [];

  for (const part of parts) {
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of part.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice('event: '.length);
      else if (line.startsWith('data: ')) dataLines.push(line.slice('data: '.length));
    }

    events.push({ event, data: dataLines.join('\n') });
  }

  return { events, rest };
}

/** 스트림 본문을 읽어 이벤트가 도착할 때마다 onEvent를 호출한다. 멀티바이트 문자 경계도 안전하게 처리한다. */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseEvents(buffer);
    buffer = rest;
    events.forEach(onEvent);
  }
}
