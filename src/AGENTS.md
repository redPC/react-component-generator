# src/AGENTS.md

## Module Context

React 19 SPA. `App.tsx`가 설정과 입력을 조합하고, `useComponentGenerator` 훅이 `/api/generate` 호출과 결과 목록을 관리하며, 생성된 코드는 `LivePreview`가 react-live로 렌더링한다.

## Tech Stack & Constraints

- 스타일은 일반 CSS 두 파일이다: 리셋과 바탕 `index.css`, 컴포넌트 스타일 `App.css`. CSS-in-JS, Tailwind를 도입하지 않는다.
- 폰트는 Galmuri(`index.html`의 CDN)다. 변수는 `App.css:14-15`의 `--font-ui`, `--font-code`이며 CDN 실패 시 시스템 폰트로 대체된다. 새 글꼴을 컴포넌트에 직접 지정하지 않고 이 변수를 쓴다.
- API 호출은 상대 경로 `/api/...`만 쓴다 (`hooks/useComponentGenerator.ts:23`, `App.tsx`의 `/api/config`). 호스트나 포트를 하드코딩하지 않는다. 개발 중에는 Vite 프록시가 처리한다.

## Implementation Patterns

- 모든 패널은 같은 창 구조를 쓴다: `.window` > `.title-bar`(`.title-box` + `.title-text`) > 본문 (`App.tsx:68-73`, `78-83`, `146`). 새 패널도 이 구조를 따른다.
- 색, 베벨, 그림자는 `App.css`의 `:root` 변수(`--bevel-raised`, `--bevel-pressed`, `--bevel-sunken`, `--shadow-hard`)로 만든다. 값을 컴포넌트 CSS에 복사하지 않는다.
- 버튼 종류를 추가하면 `App.css`의 공통 버튼 선택자 묶음(`.btn-*`)에 클래스를 추가해 베벨과 눌림 상태를 상속한다.
- 모서리는 직각이다. `border-radius`를 추가하지 않는다 (`App.css`에서 `border-radius: 0`으로 통일).

## Testing Strategy

```bash
bun run test -- src        # src/ 테스트만 실행
```

- 현재 테스트는 `components/PromptInput.test.tsx` 하나다. Testing Library의 `getByRole(..., { name })`으로 버튼을 찾는다.
- `App.tsx`와 `useComponentGenerator.ts`에는 테스트가 없다. 이 둘을 수정할 때는 `bun run build`와 브라우저 확인을 함께 한다.

## Local Golden Rules

- Don't: 생성 버튼 문구 "컴포넌트 생성"과 로딩 문구 "생성 중..."을 바꾸지 않는다. 테스트가 이 문자열로 버튼을 찾는다 (`PromptInput.test.tsx:9`, `18`, `27`). 바꾸면 테스트를 함께 수정한다.
- Don't: `PromptInput`을 `.prompt-form`, `.btn-generate`, `.prompt-textarea` 구조에서 벗어나게 바꾸지 않는다. 레이아웃과 반응형 규칙이 이 클래스에 묶여 있다.
- Do: 애니메이션을 추가하면 `index.css:41`의 `prefers-reduced-motion` 전역 규칙이 적용되는지 확인한다. 이 규칙이 모든 애니메이션 지속시간을 무력화한다.
- Do: 탭 같은 상호작용 요소에 `role`과 `aria-selected`를 유지한다 (`components/ComponentCard.tsx`의 `role="tablist"`, `role="tab"`).
- Do: `Provider` 타입은 `types/index.ts:1`이 원본이지만 서버에도 중복 선언이 있다 (`server/index.ts:57`). 제공사를 추가하면 `App.tsx`의 `PROVIDER_CONFIG`와 서버 선언을 함께 수정한다.
