# Agents

**세션을 시작하면 이 파일 → 아래 `Docs To Check`의 해당 문서 순으로 읽는다.** 그 밖의 진입점은 없다.

도메인 절차는 `.agents/skills/`가 소유한다(payload·shadcn·ai-sdk·react-doctor·graphify·toss-technical-writing). 각 스킬의 `SKILL.md`가 자기 `reference/`로 안내하므로 여기서 내부 구조를 다시 설명하지 않는다.

## Mandatory Agent Rules

- **코드 변경 전 Ponytail 스킬을 부른다.** 최소 변경 원칙은 그 스킬이 소유한다 — 여기에 베껴 두면 스킬 버전이 올라갈 때 조용히 어긋난다.
- During planning and always before implementation, identify and design the relevant boundaries and contracts, then check the codebase for similar patterns before proceeding.
- Run all tests and builds with Node.js 22.
- **외부 라이브러리·SDK·API 문서가 필요하면 기억으로 답하지 않는다.** 조회 순서: ① `.agents/skills/<lib>/reference/`(payload·shadcn·ai-sdk가 실물 문서를 갖고 있다) → ② Context7 MCP(`resolve-library-id` → `query-docs`) → ③ 공식 사이트. 🔴 **셋 다 없으면 그 사실을 사용자에게 말하고 멈춘다.** 추론으로 메우지 않는다.
- 프로젝트 자체 문서(`docs/`)·비즈니스 로직 디버깅·리뷰·외부 문서가 필요 없는 리팩터에는 Context7을 쓰지 않는다.

## Docs To Check

**무엇을 고치기 전에 그것을 소유한 문서를 읽는다.** 각 문서가 무엇을 담는지는 `docs/README.md`가 소유하므로 여기서는 **읽는 방아쇠만** 적는다.

| 무엇을 바꾸기 전에 | 읽을 것 |
| --- | --- |
| 제품 방향·유스케이스·데이터 수명·도메인 경계 | `docs/01`~`04` (`docs/README.md`가 안내) |
| 요청 흐름 · Version/Snapshot/Event/Log · 렌더링 캐시 무효화 | `docs/05-system-architecture.md` |
| 파일 배치·네이밍·주석·로깅·예외 | `docs/06-project-structure.md` |
| 인증·권한·업로드·로깅 안전·Agent 컨텍스트 한계 | `docs/07-security.md` |
| 사용자에게 보이는 문구·키보드 접근·i18n | `docs/08-accessibility-i18n.md` |
| **프런트엔드 시각 표면 아무것이든** | `docs/09-design-system.md` |
| **새 UI 컴포넌트** | `docs/10-component-authoring.md` |
| **가이드라인 위젯** | `docs/11-widget-authoring.md` |
| **CI 락업의 수치·서체** | `docs/12-ci-lockup-canon.md` |

문서끼리 충돌하면 더 새롭거나 더 구체적인 쪽을 따른다. **이 파일과 `docs/`가 충돌하면 `docs/`가 이긴다** — 이 파일은 라우팅과 팀 규약만 갖고 도메인 세부는 갖지 않는다. 코드가 의도적으로 문서를 벗어나면 같은 변경에서 그 문서를 고친다(사용자가 소스만 요청한 경우는 예외).

## Scratch / Temp Files

- Put every intermediate work artifact — planning/handoff notes, analysis dumps, one-off diagnose or migration-style scripts, throwaway SQL — under the repo-root `.scratch/` bin (`.gitignore`d). Do not scatter them across the repo root, `scripts/`, or `docs/`.
- 🔴 `.scratch/`는 커밋되지 않으므로 **다른 기여자의 클론에는 없다.** 계약·규약을 그 안에 두지 말 것 — 계약은 `docs/`와 이 파일이 갖는다.
- `.scratch/` is outside tsconfig/biome, so it never touches typecheck or CI. Run one-off scripts with their path, e.g. `pnpm payload run .scratch/scripts/<name>.ts`.
- Exceptions stay in their real homes: committed seed scripts in `scripts/` (see Content Provisioning), real docs in `docs/`. `.scratch/` is only for disposable personal work-in-progress.

## Project Context

This product, Living Brand System (LBS), turns brand guidelines into structured operational standards.
It manages guideline content, rules, brand resources, templates, plugins, work records, quality sessions, and usage event logs so brand standards can be used during production work and checked against outputs.

Keep implementation aligned with the docs instead of duplicating domain rules here. Before changing a flow, model, record, permission, or user-facing behavior, read the relevant doc and preserve the documented ownership boundaries.

Do not promote evolving domain details into this file unless they are stable rules for all future agents.

## Operating Principles

### 1. Think Before Coding

Do not assume or hide confusion. Surface tradeoffs before acting.

- State assumptions explicitly. If uncertain, ask rather than guess.
- Present multiple interpretations when ambiguity exists.
- Push back when a simpler approach exists.

### 2. Surgical Changes

Touch only what is required. Clean up only your own mess.

- Do not improve adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- If unrelated dead code appears, mention it instead of deleting it.
- Remove imports, variables, and functions that your change made unused.
- Do not remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 3. Goal-Driven Execution

Define success criteria and loop until verified.

- Turn imperative tasks into verifiable goals.
- For bug fixes, write or identify a check that reproduces the bug, then make it pass.
- For validation work, check invalid inputs and make the expected behavior pass.
- For refactors, verify behavior before and after.
- For multi-step tasks, state a brief plan with a verification step for each item.

Strong success criteria let agents work independently. Weak criteria like "make it work" require clarification.

## Branch Rules

- Layers: the ideal is `develop` / `stage` / `main`, but this repo does not run a `develop` branch yet. In practice:
  - `main`: the effective production target — the deployable, production-ready state, though nothing is deployed yet.
  - `stage`: the gateway to `main` — verify checks here, then merge to `main`. (🔴 두 브랜치가 같은 상태인지를 여기 적지 말 것 — 규칙 파일에 둔 상태 서술은 곧 낡는다. `git log origin/main..origin/stage`로 확인한다.)
  - all other branches: feature development, filling the role a `develop` branch would; `develop` itself is unused here.
- Flow: merge normal work branches into `stage`, then promote verified `stage` to `main`.
- Base: branch from `stage` for normal product work. Branch from `main` only for urgent production fixes.
- Requirement: create or switch to a purpose branch before changing source code, product behavior, refactors, tests, tooling, dependencies, or non-trivial docs.
- 🔴 Worktree는 만들지 않는다 — GitHub Desktop이 worktree를 publish하지 못한다. 메인 작업 트리에서 일반 브랜치로 작업한다.
- Protected branches: do not commit directly to `main` or `stage`; use them only as merge targets or promotion branches.
- Exception: trivial local-only edits may stay unbranched only when the user explicitly asks not to create a branch.
- Format: use `<type>/<short-kebab-purpose>` — 타입은 아래 Commit Rules의 7개와 같다.
- Scope: keep documentation-only changes separate from source code changes when practical.

## Commit Rules

- Format: use Conventional Commits with a Korean summary: `<type>: <한국어 요약>`.
- Types:
  - `docs:` for documentation changes.
  - `feat:` for user-facing product behavior.
  - `fix:` for bug fixes.
  - `test:` for test-only changes.
  - `refactor:` for behavior-preserving code changes.
  - `style:` for formatting and lint-only changes.
  - `chore:` for tooling, dependency, or maintenance changes.
- Scope: keep each commit focused on one purpose.
- Hygiene: do not include unrelated dirty worktree changes in a commit.
- Language: write commit messages in Korean unless an external tool requires English.

### 커밋 단위 — 리포 정합성 최소선

**커밋 = 그 커밋만 체크아웃해도 리포가 일관된 최소 덩어리.** 코드와 그 코드가 만든 산출물(생성 파일·drizzle 스냅샷·마이그레이션)이 어긋나면 **같은 커밋에 넣는다.**

🔴 그 밖의 커밋 단위·메시지 문체는 팀 규약이 아니다 — 기여자마다 자기 스타일을 쓴다. 개인 규칙은 각자의 에이전트 설정이 갖는다.

## Pull Request Rules

- Normal work PRs target `stage`.
- Promotion PRs target `main` from `stage`.
- Use `chore: stage를 main으로 승격` for stage-to-main promotion PRs.
- Open a draft PR when CI, migration verification, or reviewer-ready cleanup is still pending.
- Keep one branch focused on one PR or work item. Do not reuse an old branch for unrelated follow-up work.
- Language: write pull request descriptions in Korean unless the user asks otherwise.
- Verification: list the exact commands run, not generic labels.
- Caveats: mention known warnings, intentionally skipped cleanup, or remaining review points briefly.

🔴 **본문 서식·분량·절 이름은 팀 규약이 아니다** — 기여자마다 자기 스타일을 쓴다. 여기에 필수 섹션 목록을 다시 만들지 말 것.

## Database Schema Collaboration

When changing Payload collections, fields, indexes, relationships, or other database-backed model behavior:

### Required Default Workflow

1. During local schema development, use a disposable, isolated local Postgres database with `PAYLOAD_DB_PUSH=true`. Let Payload push each in-progress schema change; do not create or run migrations for every local iteration.
2. When the schema change is finished, generate the handoff migration on one designated machine with `pnpm migrate:create <name>`. Do this after all schema-changing branches are merged and before requesting PR review, merging, or updating any shared database. An unfinished draft PR may temporarily omit the migration, but it must remain draft.
3. Commit the schema source, generated migration `.ts`, matching drizzle snapshot `.json`, and `migrations/index.ts` together.
4. Do not run the generated migration against the same local database already updated by push. Verify it against a fresh database with `PAYLOAD_DB_PUSH=false`.
5. Keep stage, production, and every shared or durable database on `PAYLOAD_DB_PUSH=false`; apply only committed migrations with `pnpm payload migrate` before starting the application. (CI의 `test` 잡은 의도적으로 `push=true`다 — 빈 CI postgres에 부팅 시 스키마를 만들기 위한 테스트 전용 설정이고, `build`·`migrate` 잡만 `false`다. stage 적용은 사람이 아니라 `deploy-migrations.yml`이 `migrations/**` push에 자동 실행한다.)

- Commit the matching migration files with every finished schema change before review, merge, or shared-environment use.
- Commit the drizzle schema snapshot (`.json`) that `migrate:create` emits next to the `.ts`, and never delete snapshots; without them `migrate:create` regenerates the entire schema instead of an incremental diff.
- Do not rely on local automatic schema changes as the team handoff mechanism.
- On migration-driven databases, run pending migrations after pulling schema-related changes and before debugging local database errors.
- Do not manually patch a local database to match pulled code unless documenting a one-off recovery step.
- Breaking schema changes must be split into safe steps: expand, migrate/backfill, then contract.
- PRs that change schema without migrations are incomplete.
- Seed or fixture changes required by the new schema must be committed with the same change.

### Content Provisioning (data, not schema)

**콘텐츠의 정본은 DB다.** 가이드라인 문서·블록은 admin에서 고치면 그게 반영이고, 코드가 콘텐츠를 되돌려 쓰지 않는다. 옮겨야 할 것은 세 가지고 경로가 각각 다르다.

| | 누가 옮기나 | 확인 방법 |
|---|---|---|
| 스키마 | 마이그레이션(배포가 적용) | 배포 로그 · `migrate:status` |
| 레퍼런스 데이터 (`rules`·`brand-colors`처럼 코드가 요구하는 고정 데이터) | `scripts/`의 idempotent seed를 사람이 실행 | 실행 결과 |
| 콘텐츠 (문서·블록) | 🔴 **아무도 옮기지 않는다 — admin에서 직접 만든다** | 배포된 화면 |

- 콘텐츠를 코드로 되돌려 쓰는 seed를 **다시 만들지 말 것.** 2026-08-05에 삭제했다. 이유: 그 파이프라인의 목적("빈 DB에 콘텐츠 재현")이 애초에 성립하지 않았다 — 참조하는 업로드 170종 중 리포 보유가 27종이라 빈 DB에서는 어차피 못 만든다. 대신 양방향 덮어쓰기 위험·가드·모호성 처리를 전부 떠안고 있었다.
- 레퍼런스 데이터 seed는 계속 쓴다(예: `seed-hd-brand-colors.ts`, `seed-agent-skills.ts`). 재실행 안전해야 하고(존재하면 건너뜀 또는 목표 상태로 수렴), 스키마가 필요하면 대상 DB에 마이그레이션을 먼저 적용한다.
- 🔴 **essenherb 데이터를 심는 seed를 다시 만들지 말 것.** 아이콘 40·검수 시나리오 7·이미지 프로파일 1을 되살리던 스크립트는 2026-08-10에 삭제했다. 공유 DB의 `brand_icons`가 0행이라, 그 seed를 돌리는 것은 지우는 게 아니라 stage에 새로 만드는 사고다.
- 🔴 **DB에 데이터를 쓰는 작업을 했으면 "어느 환경에 넣었고 어디엔 아직 안 넣었나"를 반드시 명시한다.** 데이터는 배포를 따라가지 않으므로 화면·PR·git 어디에도 안 나타난다. 이 명시가 유일한 기록이다.
- 실수로 덮었으면 Payload 버전 이력으로 복구한다: `_guideline_docs_v`에서 해당 시각의 버전 id를 찾아 `payload.restoreVersion({ collection, id })`. 환경 단위 복구는 Supabase PITR.
- 🔴 **문서의 부모를 바꾸거나 상태를 건드리는 update에는 `_status`를 명시한다.** autosave 초안 버전이 있는 문서는 update가 그 최신 버전 위에 얹혀 `_status=draft`를 따라 쓴다 → 게시 문서가 초안이 되어 사이트에서 사라진다(2026-08-05 실제 사고 2건).

#### 스냅샷 (읽기 전용, 한 방향)

`pnpm content:snapshot`(`scripts/export-guideline-content.ts`)이 `DATABASE_URL` 대상 DB의 게시 문서를 `scripts/data/guideline-content.json`으로 덮어쓴다. **DB → 코드 한 방향뿐이고 되돌려 쓰는 경로는 없다.**

- 목적은 복구가 아니라 **콘텐츠가 Postgres 한 곳에만 존재하지 않게 하고, 무엇이 언제 바뀌었는지 git으로 읽히게 하는 것**이다. 복구 수단은 PITR과 버전 이력이다.
- 관계는 사람이 읽을 수 있는 키로 적는다 — 업로드는 `{file: filename}`, `brand-colors`는 `{color: hex}`, `rules`는 `{rule: key}`. 원시 id는 환경마다 달라 스냅샷을 무의미하게 만든다.
- 부분 export는 없다(파일을 통째로 덮으므로 slug 인자를 거부한다). **엉뚱한 DB에 대고 돌렸는지는 `git diff`가 알려준다** — 문서가 대량으로 사라져 보이면 커밋하지 않는다.

### Local Machine Database Rules

- Treat every personal local Postgres database that uses `PAYLOAD_DB_PUSH=true` as disposable.
- Give each physical machine its own `DATABASE_URL`. Never point a desktop and laptop at the same push-enabled database.
- Branch Rules는 worktree를 금지한다. 그래도 쓰게 된다면 각 worktree에 자기 DB를 주고, DB를 공유하는 worktree는 `push=false`로 두고 Payload 스키마를 바꾸지 않는다(폴백 안전장치).
- Keep each machine's `DATABASE_URL` and `PAYLOAD_DB_PUSH` in its untracked `.env.local`; never commit them.
- Use `PAYLOAD_DB_PUSH=true` only for isolated local development. Keep CI, stage, production, and any database with important shared data on `push=false`.
- After Payload has pushed schema changes to a local database, do not run `payload migrate` against that database. Recreate the database when committed migrations must be applied or verified.
- Git synchronizes source and migration files, not local CMS content. Transfer local data separately and in one direction if two machines must start with the same content.

Initialize a new or rebuilt local database from committed migrations before switching it to push mode:

```bash
pnpm install
PAYLOAD_DB_PUSH=false pnpm payload migrate
# Set PAYLOAD_DB_PUSH=true in this machine's .env.local.
pnpm dev
```

From then on, let Payload update that disposable database and do not mix in migration execution.

### Device Handoff Rules

- Use a work branch as the source handoff between a desktop and laptop. Commit and push before leaving one machine; fetch and pull before starting on the other.
- Do not edit the same branch on both machines concurrently. Use separate branches when concurrent work is unavoidable, then merge the source changes before creating migrations.
- A private handoff branch used only by one developer across personal machines may temporarily omit a migration while schema work is unfinished. Both machines must use separate disposable databases with `push=true`.
- Before requesting PR review, merging to `stage`, or updating a shared database, choose one machine to generate the final migration after all schema-changing branches are merged.
- Never generate competing migrations for the same unfinished schema change on both machines.

Normal device handoff flow:

```bash
# Leaving the current machine
git status
git push <remote> <work-branch>

# Starting on the other machine
git fetch <remote>
git switch <work-branch>
git pull --ff-only
pnpm install
pnpm dev
```

Finalize schema work on one machine only:

```bash
pnpm migrate:create <name>
pnpm check
pnpm typecheck
```

Review and commit the generated `.ts`, matching `.json` snapshot, and `migrations/index.ts` with the schema source. Do not run that migration against a local database already updated by push; verify it against a fresh database with `push=false`. Shared and durable environments must apply the committed migration with `pnpm payload migrate` before starting the application.
