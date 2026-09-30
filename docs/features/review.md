# Review

## 1. 목적

임의의 디자인(이미지)이 브랜드 가이드라인에 부합하는지 판정합니다. 단일 합/불이 아니라 **rule(항목)별 상태 + 충족도**를 돌려주며, 결정론적으로 판정 가능한 항목은 즉시, 판단이 필요한 항목은 AI로 뒤이어 채웁니다.

브랜드 규정 지능이 사는 곳이며, 다른 기능이 "규정 부합"을 확인해야 할 때 재사용하는 단위입니다.

## 2. 핵심 계약

재사용 단위는 유스케이스 서비스 **`startCheckSession`**입니다. 검수 도메인을 소유하는 `asset-check` 안(`src/features/asset-check/services/start-check-session.service.ts`)에 두고, 다른 표면은 그 공개 계약을 소비합니다(`docs/06` §3).

- 입력: 이미지 바이트(Buffer), CheckScenario Key(Check 실행 범위 선택), 콘텐츠 플래그(logo/typography/illustration/photography), 호출 출처(`review-page`/`chat`/`mcp-call`), 사용자
- 출력: `{ checkSessionId, results(checkKey→CheckResult), pendingCheckKeys }`
- `CheckResult`의 판정은 `rawResult.status`(`pass`/`ok`/`needs_review`/`fail`)와 `fulfillment`(충족도 %)로 표현됩니다.
- Heuristic 판정의 기준 집계는 `rawResult.summary`(`total`/`satisfied`/`failed`/`uncertain`)로 전달합니다. Review UI와 Agent는 이 값을 각 채널의 표시 문구로 변환하며, 기존 저장 결과는 `message`를 fallback으로 사용합니다.
- 2단계 계약: 결정론적 Check는 즉시 채워지고, AI(heuristic) Check는 `pendingCheckKeys`로 반환된 뒤 **`completeCheckSessionAiCheck`**로 완성합니다. 후속 요청은 같은 소유자의 세션이며 시작 시점과 같은 이미지 바이트일 때만 허용합니다.
- 기준 조회 단위: `getRuntimeChecks(checkKeys?)`(실행), `getCheckRuleset()`(페이지 뷰모델).
- 기준 소스: published `guideline-documents`의 문서 및 Block이 참조하는 `rules` 관계(독립 `rules` 컬렉션의 공유 정의). 실행 시 `source.documentId`와 참조하는 문서 또는 Block의 타입별 구조화 evidence를 만들고, 같은 Rule이 여러 위치에 배치되면 근거와 참조 자산을 하나의 실행 Check로 병합하며, heuristicCriteria·heuristicPrompt·역할이 포함된 referenceAssets·RuleChecker 계약과 함께 `CheckSession.rulesetSnapshot`에 고정합니다. Block 식별자와 문서 제목은 evidence 계약에 복사하지 않습니다.

### 기능 소유권과 식별자

| 기능 | 책임 | 주요 객체 |
| --- | --- | --- |
| `quality-rule` | 문서와 독립된 검수 기준, Checker 계약, 시나리오 정의와 발행 생명주기 | `Rule`, `RuleChecker`, `CheckScenario` |
| `guideline` | Rule을 문서·Block에 배치하고 evidence와 reference asset을 만든다 | Rule placement, evidence |
| `asset-check` | 발행 Rule을 런타임 Check로 해석해 실행하고 세션·결과를 저장한다 | `RuntimeCheck`, `CheckSession`, `CheckResult` |

Rule 식별자는 전역 고유 `Rule.key`이며 CheckScenario는 이 key 목록만 참조합니다. `RuleChecker`는 저장 모델 이름이고 실행·표시 계약에서는 `Checker`를 사용하며, `Checker.key`와 구현 키를 혼용하지 않습니다.

### 결정론적 실행 계약

결정론적 검수는 아래 순서를 따릅니다.

```text
환경 입력
→ Adapter가 공통 Observation 생성
→ 필요한 경우 Extractor가 관측 대상 식별
→ Checker가 측정값 생성
→ Evaluator가 Check 기준과 비교
→ CheckResult 생성
```

| 구성 요소 | 소유하는 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| Adapter | 이미지·PDF·Figma 입력을 공통 Observation으로 변환 | 대상 추정, 기준 적용, 판정 |
| Extractor | Observation에서 색상 쌍·주요 색상·로고 영역처럼 측정 대상을 식별 | 기준 적용, `pass`/`fail` 판정 |
| Checker | 입력 Observation에서 이름과 단위가 고정된 측정값을 계산 | 브랜드·문서 기준, 사용자 메시지, 최종 판정 |
| Check | 기준값, 적용 범위, 문서 근거, 사용자 메시지를 소유 | 측정 알고리즘 |
| Evaluator | 측정값과 Check 기준을 비교해 상태와 충족도를 계산 | 이미지 디코딩, 대상 추출 |

Checker의 출력은 판정이 아니라 측정 성공 여부입니다.

```ts
type MeasurementResult =
	| {
			state: 'measured'
			measurements: Record<string, number | string | boolean>
			facts?: Record<string, number | string | boolean | string[]>
	  }
	| {
			state: 'not_measurable'
			reasonCode: string
			facts?: Record<string, number | string | boolean | string[]>
	  }
```

Check의 결정론적 설정은 측정 방식에 필요한 매개변수와 통과 기준을 구분합니다.

```ts
interface DeterministicCheckOptions {
	parameters?: Record<string, unknown>
	criteria: Array<{
		measurement: string
		operator: 'gte' | 'lte' | 'eq' | 'in' | 'within'
		expected: number | string | boolean | number[] | string[]
		tolerance?: number
	}>
}
```

- `parameters`는 색상 양자화 단위나 투명도 처리처럼 측정 방법에 영향을 줍니다.
- `criteria`는 최소 대비율이나 최대 허용 비율처럼 최종 판정에만 영향을 줍니다.
- Checker가 지원하는 입력, parameters, measurements는 구현 키로 고정합니다. 호환되지 않는 계약 변경은 기존 키를 수정하지 않고 새 구현 키로 등록합니다.
- 실행 시 사용한 options와 Checker 실행 계약은 기존 `CheckSession.rulesetSnapshot`에 함께 저장합니다.
- Admin은 Checker가 지원하지 않는 measurement·operator·expected 조합을 저장 전에 거부합니다. 기존 snapshot의 설정이 유효하지 않으면 실행하지 않고 `needs_review`와 `invalid_criteria`를 남깁니다.

### Observation과 추출 실패

첫 공통 Observation은 기존 `PixelGrid`가 담당하던 Raster 데이터입니다. Adapter는 원본을 sRGB RGBA 픽셀과 실제 너비·높이로 정규화하고, 픽셀 배열은 실행 중에만 유지합니다. CheckSession에는 원본 픽셀을 저장하지 않고 측정값과 작은 facts만 저장합니다.

Extractor는 필요한 경우에만 둡니다. Raster만으로 측정 가능한 밝기·캔버스 크기는 직접 Checker로 전달하고, 대비·팔레트·로고 기하는 각각 색상 쌍·주요 색상·로고 영역 Observation을 먼저 만듭니다. 같은 실행에서 동일한 Observation은 한 번만 추출해 재사용합니다.

초기 구현에서는 Observation 종류마다 fallback Extractor를 하나만 등록합니다. Adapter가 Figma 노드 경계처럼 더 정확한 Observation을 제공하면 그 값을 우선 사용합니다. 실제로 같은 Observation을 만드는 추출 방식이 둘 이상 필요해질 때까지 Check에 Extractor 선택 필드를 추가하지 않습니다.

```text
not_extractable
→ not_measurable
→ needs_review
```

입력이나 관측 대상이 없다는 이유로 브랜드 규정 위반을 뜻하는 `fail`을 반환하지 않습니다.

### Evaluator 상태 규칙

- 모든 criteria를 만족하면 `pass`입니다.
- 하나 이상의 측정된 criteria를 위반하면 `fail`입니다.
- 지원하지 않거나 손상된 입력은 Adapter 단계에서 요청 오류로 종료하며 CheckResult를 만들지 않습니다.
- 정상 입력에서 대상 추출 실패 또는 필수 측정값 누락이 발생하면 `needs_review`입니다.
- Deterministic 실행은 의미가 불명확한 `ok`를 생성하지 않습니다.
- 각 criteria 비교에는 `measurement`, `operator`, `expected`, `actual`, `satisfied`를 남깁니다.
- `fulfillment`는 평가한 criteria 중 충족한 항목의 비율입니다. 평가한 criteria가 없으면 `null`입니다.

### 첫 적용 범위

첫 구현은 Contrast Checker 한 경로로 제한합니다.

```text
Raster Observation
→ Color Pair Extractor
→ Contrast Checker: contrastRatio 측정
→ Evaluator: contrastRatio >= Check 기준값
→ CheckResult
```

색상 쌍을 찾지 못하면 `needs_review`로 끝냅니다. 이 경로가 검증되기 전에는 범용 Extractor DAG, 새 의존성, 전체 Checker 일괄 변환을 도입하지 않습니다.

## 3. 객체 모델 전환 방향

현재 Review는 `CheckSession` 레코드와 여러 순수 함수로 검수 흐름을 구현합니다. 계산 자체는 단순하지만, 세션 상태 전이와 결과 병합 규칙은 유스케이스 서비스가 직접 관리합니다. 검수 단계와 재실행 조건이 늘어날 때 이 규칙이 여러 호출 경로로 흩어지지 않도록 `CheckSession`을 Aggregate 객체로 전환했습니다(`src/features/asset-check/domain/check-session.ts`).

### 현재 구현 관계

검수 기준은 발행된 Guideline 문서가 참조하는 Rule에서 읽고, `CheckScenario.checkKeys`(Rule key 목록)로 실행 범위를 선택합니다. 실행 시점의 Rule과 Checker 계약은 `rulesetSnapshot`에 복사합니다.

```text
GuidelineDocument
└─ rules[] ─(참조)→ Rule (독립 컬렉션, 전역 고유 key)
   Block
   └─ rules[] ─(참조)→ Rule
      Rule
      ├─ key
      ├─ options / heuristicCriteria / messages
      └─ checkerRef → RuleChecker
   (evidence / referenceAssets는 참조하는 문서·블록 위치에서 생성)

CheckScenario
└─ checkKeys[] → Rule.key

CheckSessionRecord
├─ source / status
├─ targetType / imageName
├─ inputSha256 / inputMediaType / inputByteLength
├─ rulesetSnapshot[]
│  └─ RuntimeCheck
│     ├─ key / source.documentId
│     ├─ checker
│     ├─ options / heuristicCriteria / heuristicPrompt
│     └─ evidence / referenceAssets / messages
├─ results[checkKey]
│  └─ CheckResult
│     ├─ rule
│     ├─ checker
│     ├─ rawResult
│     │  └─ summary? (total / satisfied / failed / uncertain)
│     └─ message? (기존 결과·문구 override 호환)
├─ aiUsage / errorMessage
├─ agentChatSessionRef / createdByRef
└─ completedAt
```

`startCheckSession`은 입력 바이트의 SHA-256·형식·크기를 고정한 뒤 세션 생성, 즉시 검수, AI 검수, 결과 병합, 완료 또는 실패 상태 저장을 순서대로 수행합니다. `completeCheckSessionAiCheck`는 `id + createdBy`로 세션을 찾고 입력 지문을 먼저 대조한 뒤, 저장된 ruleset snapshot과 결과를 사용해 AI 결과를 병합합니다.

현재 `CheckTarget`, `CheckRun`, `CheckBasis`, `CheckDecision`은 독립된 런타임 객체가 아닙니다. `CheckTarget`은 `targetType`과 `imageName`, 입력 지문으로 평탄화되어 있고, `CheckBasis`는 `rulesetSnapshot`만 구현되어 있습니다. 업로드 원본 바이트는 세션에 저장하지 않으며, `GuidelineVersionRef`와 `BrandAssetVersionRef`는 아직 저장하지 않습니다. `CheckRun`과 `CheckDecision`의 동작은 서비스 함수와 Aggregate에 들어 있고, `pendingCheckKeys`는 두 요청 사이에 복원할 수 있도록 `CheckSession`에 저장합니다.

### 구현할 객체 모델

첫 전환에서는 `CheckSession`만 Aggregate 객체로 만들고 상태 전이와 결과 병합을 소유하게 합니다. Repository는 Aggregate와 Payload 레코드 사이를 변환합니다. 두 요청에 걸친 AI 검수에서도 상태를 복원할 수 있도록 `pendingCheckKeys`도 세션 상태로 저장합니다.

```text
CheckSession                         ← Aggregate Root
├─ id / source / status
├─ target
│  └─ CheckTarget
├─ ruleset
│  └─ CheckRulesetSnapshot
│     └─ checks[checkKey]
├─ results[checkKey]
│  └─ CheckResult
├─ pendingCheckKeys[]
├─ aiUsage / error
├─ applyImmediateResults()
├─ applyAiResults()
├─ complete()
└─ fail()
```

이 객체는 다음 불변식을 지킵니다.

- `running` 상태에서만 결과를 추가하거나 실패로 전환할 수 있습니다.
- 즉시 검수 결과를 적용할 때 기존 결과와 `pendingCheckKeys`를 함께 갱신합니다.
- AI 결과를 적용하면 해당 pending Check를 제거하고, 남은 Check가 없을 때만 완료합니다.
- 완료되거나 실패한 세션은 다시 변경하지 않습니다.
- 후속 AI 검수는 세션 시작 시점의 입력 지문과 일치하는 이미지에만 적용합니다.
- Repository만 Aggregate를 Payload 저장 데이터로 변환합니다.

Checker, Extractor, Evaluator와 색상·기하 계산은 상태가 없는 계산이므로 순수 함수로 유지합니다. 재검수 이력, 여러 실행, 실행별 감사가 필요해지면 그때 `CheckSession.runs[]` 아래에 `CheckRun`, `CheckBasis`, `CheckDecision`을 분리합니다.

```text
CheckSession
└─ runs[]
   └─ CheckRun
      ├─ basis
      │  └─ CheckBasis
      │     ├─ guidelineVersionRef
      │     ├─ brandAssetVersionRef
      │     └─ rulesetSnapshot
      ├─ agentRunRef
      └─ decision
         └─ CheckDecision
            ├─ outcome
            └─ results[checkKey]
               └─ CheckResult
                  └─ recommendations[]
```

### 변경 효과

- **상태 전이 집중**: `running → completed/failed` 조건과 결과 병합 규칙을 `CheckSession` 한곳에서 관리합니다.
- **잘못된 변경 차단**: 완료된 세션에 결과를 추가하는 것처럼 유효하지 않은 동작을 객체 경계에서 거부합니다.
- **호출 경로 통일**: Page, AI Chat, MCP가 같은 Aggregate 동작을 사용하고 각 호출자가 완료 조건을 다시 구현하지 않습니다.
- **코드와 문서의 일치**: 문서에서 Aggregate로 정의한 `CheckSession`이 실제 코드에서도 검수 생명주기를 소유합니다.
- **테스트 단순화**: DB, Payload, AI 호출 없이 즉시 결과 적용, AI 결과 병합, 완료와 실패 전이를 검사할 수 있습니다.
- **확장 위치 명확화**: 재시도, 재검수, 여러 `CheckRun`, 감사 이력이 필요할 때 `CheckSession` 아래에 추가할 위치가 분명합니다.

대신 Aggregate와 Payload 레코드 사이의 변환 코드가 생깁니다. 이 비용을 제한하기 위해 첫 전환에서는 `CheckSession`만 객체화하고, 상태가 없는 Checker 계산과 아직 필요하지 않은 하위 엔티티는 추가하지 않습니다.

## 4. 표면

| Surface | 상태 | 진입점 |
| --- | --- | --- |
| [Page](../surfaces/page.md) | 구현 | Studio의 `/studio/review` — 이미지 업로드 → 선택한 CheckScenario의 항목별 결과 테이블. Template·Image·Graphic·Review는 공통 Studio 사이드바를 사용합니다. 클라이언트가 `/api/check` → `/api/check/{checkSessionId}/ai` 순으로 호출 |
| [REST](../surfaces/rest.md) | 구현 | `POST /api/check`(FormData, 20MB 제한, origin·인증 게이트), `POST /api/check/{checkSessionId}/ai` |
| [AI Chat](../surfaces/ai-chat.md) | 구현 | agent tool `runCheck`(+`listCheckScenarios`)이 `startCheckSession`을 호출 |
| MCP | 구현 | `runAssetCheck`가 PNG/JPEG/WebP data URI의 결정론적 검수를 실행하고 내부 AI와 같은 관찰 프롬프트·문서 근거·레퍼런스 이미지·검사 이미지를 연결된 AI에 반환합니다. `submitAssetCheckObservations`가 관측값을 저장된 룰셋과 대조해 서버에서 최종 판정·저장합니다. 레퍼런스를 불러오지 못한 Check는 `needs_review`로 처리하고, 동시 제출은 먼저 완료된 결과를 유지합니다. |

## 5. 의존

- AI 프로바이더: Page·AI Chat은 Anthropic(Vercel AI SDK `generateText`+`Output.object`)을 사용합니다. MCP는 LBS의 AI 키를 쓰지 않고 연결된 클라이언트 AI에 검수 대상 이미지, 구조화 Evidence, HeuristicPrompt, RuleChecker 프롬프트, 레퍼런스 이미지를 반환합니다. 기대값과 연산자는 반환하지 않습니다. 두 경로 모두 모델은 공통 관찰 작업을 사용해 기준별 관찰값만 반환하며(관찰형은 `present`/`absent`, 수치형은 숫자, 공통으로 `uncertain`/`not_applicable`) 최종 `pass`/`fail`/`needs_review`는 검수 Service의 Evaluator가 결정합니다.
- 이미지 디코딩: `sharp`(128px 픽셀 그리드 추출).
- 결정론적 checker: palette-compliance / color-combination / spot-color / background-tone / clear-space / relative-size / canvas-format. RuleChecker의 `checkerKey`로 registry를 조회하며, 미등록 checker는 `implemented:false`로 표시.
- Payload 컬렉션: `guideline-documents`(Check 기준), `brand-colors`(팔레트) 읽기. 세션은 `check-sessions`에 영속(CheckRulesetSnapshot을 함께 저장해 AI 후속 단계가 재사용).

## 6. 크로스커팅

- 인증·업로드 제한: [07. 보안](../07-security.md)
- 결과 문구·접근성: [08. 접근성과 다국어](../08-accessibility-i18n.md)
- 도메인 위치(품질 검수): [04. 도메인 모델](../04-domain-model.md)
- 세션 데이터 생명주기: [03. 데이터 생명주기](../03-data-lifecycle.md)
