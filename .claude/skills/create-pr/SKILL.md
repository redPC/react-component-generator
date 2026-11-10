---
name: create-pr
description: 현재 브랜치의 커밋을 분석해 프로젝트 언어(영문/한국어)에 맞는 템플릿으로 GitHub Pull Request를 생성하는 스킬. 서브 에이전트(fork)에서 실행된다. 사용자가 "PR 만들어줘", "PR 올려줘", "풀리퀘스트 생성", "PR 생성해줘", "create a PR", "open a pull request", "make a PR for this branch"처럼 현재 작업을 Pull Request로 올려 달라고 하면 스킬 이름을 말하지 않아도 반드시 이 스킬을 사용한다. 커밋만 요청하는 경우(commit 스킬), 기존 PR 리뷰나 머지 요청에는 사용하지 않는다.
context: fork
---

# create-pr

현재 브랜치의 변경을 읽고, 프로젝트 언어에 맞는 템플릿으로 PR 본문을 채워 `gh pr create`로 생성한다.
이 스킬은 서브 에이전트에서 실행되어 대화 맥락이 없으므로, 필요한 정보는 모두 git 저장소와 `gh`에서 직접 수집한다. PR 제목·본문은 리뷰어가 처음 읽는 글이라, 커밋 로그를 나열하지 말고 "무엇이 왜 바뀌었는지"가 읽히게 쓴다.

## 절차

### 1. 사전 점검

```bash
git status --short
git branch --show-current
gh auth status
gh repo view --json defaultBranchRef,isFork,parent,visibility,primaryLanguage
```

아래 중 하나라도 해당하면 PR을 만들지 않고 이유와 해결 방법을 보고한 뒤 멈춘다. 잘못된 곳에 PR이 만들어지면 리뷰어에게 알림이 가고, 닫아도 기록이 남기 때문이다.

- `gh` 로그인이 안 되어 있다.
- git 저장소가 아니거나 GitHub 원격(`origin`)이 없다.
- 현재 브랜치가 기본 브랜치(`main`/`master`)다. 기능 브랜치를 먼저 만들어야 한다고 안내한다.
- 기본 브랜치 대비 새 커밋이 없다.
- 이미 같은 브랜치의 열린 PR이 있다 (`gh pr list --head <branch> --state open`). 그 PR의 URL을 알려준다.

커밋되지 않은 변경이 있으면 PR에 포함되지 않는다. 자동으로 커밋하지 말고, 보고에 "커밋되지 않은 변경이 남아 있다"고 적는다(커밋은 `commit` 스킬의 몫이다).

### 2. 변경 분석

기본 브랜치(`<base>`)를 기준으로 이 브랜치만의 변경을 본다.

```bash
git fetch origin <base>
git log origin/<base>..HEAD --format='%h %s%n%b'
git diff origin/<base>...HEAD --stat
git diff origin/<base>...HEAD
```

- 커밋 메시지는 의도를, diff는 실제 변경을 알려준다. 둘이 어긋나면 diff를 믿는다.
- diff에 `.env`, 키·토큰으로 보이는 값이 있으면 PR을 만들지 않고 어떤 파일인지 보고한다. 공개 저장소에 올라간 비밀 값은 PR을 닫아도 회수되지 않는다.
- 변경이 서로 무관한 여러 목적으로 나뉘면 보고에 "PR을 나누는 것을 권장"이라고 적되, 요청은 수행한다.

### 3. 템플릿 언어 선택

PR을 읽을 사람이 어느 언어를 쓰는지가 기준이다. 아래 순서로 판단하고, 앞 단계에서 결론이 나면 거기서 멈춘다.

1. **저장소 자체 템플릿이 있으면 그것이 최우선이다.** `.github/PULL_REQUEST_TEMPLATE.md` 또는 `.github/PULL_REQUEST_TEMPLATE/` 아래 파일을 그대로 채운다. 이 경우 아래 references 템플릿은 쓰지 않는다. 메인테이너가 정한 형식을 따르는 것이 기여자의 기본 예의다.
2. `CLAUDE.md`/`AGENTS.md`에 PR 언어나 규칙이 있으면 따른다.
3. 최근 커밋 메시지와 기존 PR 제목의 언어를 본다 (`git log -15 --format=%s`, `gh pr list --state all -L 10`). 대부분 한글이면 한국어, 영문이면 영문이다.
4. `README.md`의 주 언어와 이슈 언어를 본다.
5. 저장소가 외부 오픈소스에 기여하는 fork이거나(`isFork`), 해외 메인테이너가 운영하는 프로젝트로 보이면 영문이다.
6. 그래도 판단이 서지 않으면 한국어를 쓰고, 보고에 어떤 언어를 왜 골랐는지 적는다. 사용자가 바꾸라고 하면 `gh pr edit`로 본문을 다시 쓴다.

선택한 템플릿을 읽는다.

- 영문: `references/template-en.md`
- 한국어: `references/template-ko.md`

### 4. PR 제목과 본문 작성

**제목**: 70자 안팎, 한 줄. 커밋 컨벤션과 같은 `feat|fix|refactor|chore` 접두사를 쓰고 선택한 언어로 요약한다. 브랜치에 커밋이 하나뿐이면 그 커밋 제목을 다듬어 쓴다.

**본문**: 템플릿의 섹션 구조를 유지하고 각 `<...>` 자리표시자를 채운다.

- 해당 없는 섹션은 비워 두지 말고 "N/A" 또는 "해당 없음"으로 적거나 섹션을 지운다. 빈 체크박스와 자리표시자가 남은 PR은 성의 없어 보이고 리뷰를 늦춘다.
- 테스트 항목은 **실제로 실행해 본 것만** 체크한다. 실행하지 않은 것을 체크하면 리뷰어가 검증된 줄 안다. 프로젝트의 테스트 명령(`package.json`, `AGENTS.md`)이 있으면 실행해서 결과를 적는다.
- 관련 이슈가 커밋이나 브랜치명에서 보이면(`#123`) `Closes #123`으로 연결한다. 추측해서 이슈 번호를 만들지 않는다.
- 이 세션의 system-reminder에 PR 본문 attribution 지침이 있으면 본문 맨 끝에 그대로 붙인다. 지침이 없으면 붙이지 않는다.

### 5. 푸시와 PR 생성

```bash
git push -u origin <branch>
gh pr create --base <base> --head <branch> --title "<제목>" --body-file <본문 파일>
```

- 본문은 임시 파일로 저장해 `--body-file`로 넘긴다. 여러 줄 마크다운을 `--body "..."`에 직접 넣으면 따옴표와 줄바꿈이 깨진다. 임시 파일은 PR 생성 후 삭제한다.
- 푸시가 거부되면(non-fast-forward 등) 강제 푸시(`--force`)하지 말고 원인을 보고한다. 다른 사람의 커밋을 덮어쓸 수 있다.
- fork에서 작업 중이면 `--repo`와 `--head <user>:<branch>`로 upstream 저장소에 PR을 연다. 어느 저장소로 보냈는지 보고에 적는다.
- 기본은 일반 PR이다. 사용자가 "draft로"라고 했을 때만 `--draft`를 붙인다.
- 머지, 리뷰어 지정, 라벨 추가는 요청이 없으면 하지 않는다.

### 6. 보고

서브 에이전트의 마지막 메시지가 사용자에게 전달되는 유일한 결과다. 아래를 간결하게 적는다.

- PR URL
- 제목과 사용한 템플릿 언어(그리고 그 근거)
- base ← head 브랜치
- 실행한 테스트와 결과
- 주의할 점: 커밋되지 않은 변경, 템플릿에서 "해당 없음"으로 둔 부분, 판단이 불확실했던 부분
