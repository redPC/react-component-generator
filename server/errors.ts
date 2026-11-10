// 에러를 클라이언트에 보낼 HTTP 상태와 메시지로 바꾼다.
// 상태 코드 판별은 메시지 문자열에 의존하므로, 제공사 에러에는 상태 코드를 포함해야 한다.
export function toApiError(err: unknown): { status: number; error: string } {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('503')) {
    return {
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    };
  }

  if (message.includes('429')) {
    return {
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  return { status: 500, error: message };
}
