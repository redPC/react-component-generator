// 업스트림 fetch를 감싼다. 네트워크 오류 메시지에는 URL(Google은 ?key= 포함)이 섞일 수 있으므로
// 원래 에러를 버리고 제공사 라벨만 담은 에러로 바꾼다. AGENTS.md의 "URL을 에러 메시지에 넣지 않는다" 규칙.
export async function fetchUpstream(
  label: string,
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  try {
    return await fetchImpl(url, init);
  } catch {
    throw new Error(`${label} API network error`);
  }
}
