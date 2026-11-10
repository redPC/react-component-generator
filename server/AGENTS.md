# server/AGENTS.md

## Module Context

Bun 런타임에서 도는 AI API 프록시. 프론트엔드의 `/api/*` 요청을 받아 Anthropic/Google 호출 후 정규화된 코드를 반환한다. Vite dev 서버가 `/api`를 3002 포트로 프록시한다.

## Tech Stack & Constraints

- 런타임은 Bun이다. `Bun.serve`, `process.env`를 사용한다 (`index.ts:59-62`, `138`). Node 전용 API로 바꾸지 않는다.
- 외부 HTTP 호출은 SDK 없이 `fetch`를 직접 쓴다 (`index.ts:69`, `101`). 새 제공사도 같은 방식으로 추가해 의존성을 늘리지 않는다.
- 모델 ID는 코드에 하드코딩되어 있다: Anthropic은 `index.ts:77`, Google 우선순위 목록은 `index.ts:5`. 모델을 바꿀 때는 해당 위치만 수정한다.

## Implementation Patterns

- 응답 후처리 순서는 `stripCodeFences` 후 `ensureRenderCall`이다 (`index.ts:188`). 순서를 뒤집으면 펜스 안의 `render(` 문자열 때문에 판정이 틀어질 수 있다.
- 제공사별 호출 함수는 `(prompt, apiKey) => Promise<string>` 형태를 유지하고, 라우팅은 `index.ts:183-186`에서 한다.
- 모든 `Response.json`에 `CORS_HEADERS`를 붙인다 (`index.ts:51-55`). 새 응답 경로에서 빠뜨리지 않는다.

## Testing Strategy

```bash
bun run test -- server     # server/ 테스트만 실행
```

- 테스트는 순수 함수에만 있다 (`generator.test.ts`, `fallback.test.ts`). 네트워크 호출은 테스트하지 않고 `vi.fn`으로 `attempt`를 주입하는 패턴을 따른다 (`fallback.test.ts:6`).
- `index.ts`는 import 시점에 서버가 시작되므로 테스트에서 import하지 않는다. 테스트하고 싶은 로직은 별도 모듈로 분리한다.

## Local Golden Rules

- Do: 에러 메시지에는 HTTP 상태 코드 문자열을 포함한다. 503/429 변환이 `message.includes`에 의존한다 (`index.ts:194`, `201`).
- Do: 새 에러 메시지에 키, URL, 요청 본문을 넣지 않는다. Google URL에 키가 들어 있다 (`index.ts:99`).
- Do: `withModelFallback`은 마지막 에러만 던진다 (`fallback.ts:19`). 모든 모델이 실패했을 때의 메시지가 마지막 모델의 것임을 전제로 에러 처리를 작성한다.
- Don't: 빈 모델 목록을 폴백에 넘기지 않는다. 의도적으로 에러를 던지는 분기가 있다 (`fallback.ts:7-9`).
- Don't: Anthropic 경로에만 또는 Google 경로에만 처리를 추가하고 끝내지 않는다. 현재 `MAX_TOKENS` 감지와 폴백이 Google에만 있는 비대칭 상태다 (`index.ts:123`, `134-136`).
