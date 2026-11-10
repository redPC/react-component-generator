// 스트리밍 응답 처리를 위한 순수 함수들. 부수효과가 없어 단위 테스트가 가능하다.
import { stripCodeFences, ensureRenderCall } from './generator';
import { toApiError } from './errors';

/**
 * 업스트림 SSE를 읽어 delta 이벤트로 중계하고, 끝나면 정규화한 코드를 done 이벤트로 보낸다.
 * 클라이언트가 응답 스트림을 취소하면 업스트림 reader도 취소해 불필요한 생성 비용을 막는다.
 */
export function relayUpstream(
  upstream: ReadableStream<Uint8Array>,
  parseChunk: (payload: string) => string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.getReader();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(formatSse(event, data)));
      };

      let full = '';
      try {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { payloads, rest } = splitSseData(buffer);
          buffer = rest;

          for (const payload of payloads) {
            const text = parseChunk(payload);
            if (text) {
              full += text;
              send('delta', { text });
            }
          }
        }

        send('done', { code: ensureRenderCall(stripCodeFences(full)) });
      } catch (err) {
        send('error', { error: toApiError(err).error });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel(reason) {
      cancelled = true;
      return reader.cancel(reason);
    },
  });
}

/** SSE 버퍼에서 완성된 이벤트의 data 페이로드만 꺼내고, 끝나지 않은 나머지는 rest로 돌려준다. */
export function splitSseData(buffer: string): { payloads: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const payloads: string[] = [];

  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (line.startsWith('data: ')) payloads.push(line.slice('data: '.length));
    }
  }

  return { payloads, rest };
}

/** 클라이언트로 보낼 SSE 이벤트 한 개를 문자열로 직렬화한다. */
export function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Anthropic 스트림 이벤트 한 개에서 텍스트 조각을 꺼낸다. 텍스트가 없으면 빈 문자열. */
export function parseAnthropicChunk(payload: string): string {
  const event = JSON.parse(payload) as {
    type?: string;
    delta?: { type?: string; text?: string };
  };

  if (event.type === 'error') {
    throw new Error('Claude API stream error');
  }

  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text ?? '';
  }

  return '';
}

/** Google 스트림 청크 한 개에서 텍스트 조각을 꺼낸다. 잘림(MAX_TOKENS)은 에러로 처리한다. */
export function parseGoogleChunk(payload: string): string {
  const chunk = JSON.parse(payload) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = chunk.candidates?.[0];

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  return candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}
