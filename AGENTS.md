# AGENTS.md

## Operational Commands

패키지 매니저와 서버 런타임은 bun 고정이다 (`bun.lock`, `package.json` scripts의 `bun run server`). npm/yarn/pnpm으로 설치하지 않는다.

```bash
bun install              # 의존성 설치
bun run dev              # API 서버(3002) + Vite(5173) 동시 실행
bun run server           # API 서버만 실행 (bun --watch)
bun run test             # vitest run (src/ 와 server/ 테스트 모두 포함)
bun run lint             # eslint .
bun run build            # tsc -b && vite build
```

- 테스트는 `vite.config.ts:20`의 include 규칙에 따라 `src/**/*.test.{ts,tsx}`, `server/**/*.test.ts`만 수집된다. 새 테스트는 이 패턴에 맞춘다.
- 변경 후 최소 `bun run lint`, `bun run test`, `bun run build`를 통과시킨다.

## Golden Rules

### Immutable

- API 키 값을 클라이언트로 내려보내지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다 (`server/index.ts:147-156`). 키 값 반환, 로그 출력, 응답 에러 메시지 포함은 금지다.
- Google 호출은 키를 URL 쿼리(`?key=`)에 싣는다 (`server/index.ts:99`). 이 URL, 요청 객체, 응답 본문을 에러 메시지에 넣지 않는다. 에러는 `Gemini API error: ${status}`처럼 상태 코드만 담는다 (`server/index.ts:112`). 에러 메시지가 그대로 클라이언트에 전달된다 (`server/index.ts:208-211`).
- `.env`는 커밋하지 않는다 (`.gitignore`). `.env.example`에는 빈 값만 둔다. 실제 키를 넣지 않는다.
- 생성된 코드는 브라우저에서 react-live로 실행된다 (`src/components/LivePreview.tsx`). 이 경로를 서버 사이드 실행이나 `eval`성 처리로 옮기지 않는다.

### 비대칭 (Asymmetry)

- 모델 폴백(`withModelFallback`)과 `MAX_TOKENS` 잘림 감지는 Google 경로에만 있다 (`server/index.ts:5`, `123`, `134-136`). Anthropic 경로(`server/index.ts:68-96`)에는 둘 다 없다. 생성 로직을 수정할 때 두 경로 중 어느 쪽에 적용할지 의도적으로 결정하고, 한쪽만 고쳤다면 그 이유를 커밋 본문에 남긴다.

### 이중 방어 (Double Defense)

- 코드펜스와 `render()` 호출은 프롬프트와 후처리 양쪽에서 막는다. 시스템 프롬프트가 "펜스 금지", "render 호출"을 지시하고 (`server/index.ts:12`, `16`), 서버가 `stripCodeFences`, `ensureRenderCall`로 보정한다 (`server/index.ts:188`). 한쪽을 제거하면 모델 응답 변동 시 미리보기가 빈 화면이 된다. 둘 다 유지한다.

### 하드 제약 (Hard Constraint)

- react-live `noInline` 모드는 `render(...)` 호출이 없으면 아무것도 그리지 않는다 (`server/generator.ts:12-14`, `src/components/LivePreview.tsx:14`).
- 시스템 프롬프트의 "import 금지, TypeScript 문법 금지, 인라인 스타일만" 규칙은 react-live 실행 환경 제약에서 나온다 (`server/index.ts:10-11`, `20`). 프롬프트를 편집해도 이 세 가지는 지운다고 해결되지 않고 미리보기가 깨진다.
- 서버 포트 3002는 두 곳에 있다: `server/index.ts:139`, `vite.config.ts:11`. 하나를 바꾸면 다른 하나도 바꾼다.
- 서버의 503/429 응답 매핑은 에러 메시지에 상태 코드 문자열이 들어 있는지로 판단한다 (`server/index.ts:194`, `201`). 새 제공사를 추가할 때 에러 메시지에 상태 코드를 포함시켜야 한다.

### 테스트 경계 (Test Boundary)

- 단위 테스트가 있는 곳은 부수효과 없는 순수 모듈뿐이다: `server/generator.ts`, `server/fallback.ts`, `src/components/PromptInput.tsx`. `server/index.ts`(Bun.serve 부수효과), `src/hooks/useComponentGenerator.ts`, `src/App.tsx`에는 테스트가 없다.
- 서버에 새 로직을 추가할 때는 `index.ts`가 아니라 순수 함수로 `generator.ts`/`fallback.ts` 같은 별도 모듈에 두고 테스트를 함께 추가한다 (`server/generator.ts:1-2` 주석의 설계 의도).

### 중복 정의 (수동 동기화)

- `Provider` 타입이 서버(`server/index.ts:57`)와 클라이언트(`src/types/index.ts:1`)에 각각 선언되어 있다. 제공사를 추가하면 두 곳과 `src/App.tsx`의 `PROVIDER_CONFIG`를 모두 수정한다.

## Project Context

프롬프트를 입력하면 AI가 React 컴포넌트를 생성하고 미리보기와 코드를 보여주는 도구.

Stack: React 19, TypeScript, Vite, Bun(API 프록시), react-live, Vitest + Testing Library.

## Standards & References

- 설치, 실행, 기능 소개는 `README.md`를 따른다.
- 커밋 메시지: `feat|fix|refactor|chore: 한국어 요약` (`.claude/skills/commit/SKILL.md`). push는 사용자가 요청할 때만 한다.
- UI 문구와 에러 메시지는 한국어로 쓴다.

## Maintenance Policy

이 문서의 규칙과 코드가 어긋난 것을 발견하면 작업을 멈추지 말고 끝에서 AGENTS.md 수정을 제안한다. 라인 번호 근거가 이동했으면 해당 항목을 갱신한다.

## Context Map

- **[서버 코드 수정 (Bun API, AI 호출, 폴백)](./server/AGENTS.md)** — `server/` 아래 파일을 만들거나 고칠 때.
- **[프론트엔드 수정 (React UI, 레트로 테마 CSS)](./src/AGENTS.md)** — `src/` 아래 컴포넌트, 스타일, 훅을 고칠 때.
