// 스트리밍 응답 처리를 위한 순수 함수들. 부수효과가 없어 단위 테스트가 가능하다.

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
