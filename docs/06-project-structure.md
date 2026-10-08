# 06. 프로젝트 구조와 개발 규칙

이 문서는 런타임 구성, 소스 디렉터리, 구현 위치, 개발 규칙을 정리합니다.

## 1. 프로젝트 구성 원칙

이 프로젝트는 Presentation, Service, Repository 계층을 명확히 분리합니다.
Route Handler는 HTTP 요청을 Service 호출로 연결하는 adapter 역할만 수행합니다.
Service는 하나의 Use Case를 담당하며 Input과 Output을 명시합니다.
Repository는 저장소 접근을 추상화하며 Payload CMS 또는 ORM 구현체를 감춥니다.

새 Use Case는 스캐폴딩 규칙의 최소 파일부터 시작합니다.
새 추상화와 의존성은 기존 코드, 표준 기능, 플랫폼 기능으로 해결할 수 없을 때만 추가합니다.

예시:

```text
Creator UI -> Route Handler -> PublishGuidelineService -> GuidelineRepository -> Payload Local API
```

이 흐름에서 Creator UI와 Route Handler는 `Payload Local API`를 직접 알면 안 됩니다.

## 2. 폴더 및 패키지 구조

이 프로젝트는 현재 하나의 Next.js 애플리케이션 안에 Payload CMS와 Creator UI를 함께 둡니다.
`apps`와 `packages`는 배포 단위나 공유 패키지가 실제로 생길 때만 추가합니다.

| 단위 | 현재 위치 | 역할 |
| --- | --- | --- |
| App | `src` | Next.js, Payload CMS, Creator UI를 포함하는 현재 실행 단위입니다. |
| App Router | `src/app` | page, layout, route handler를 둡니다. |
| Collections | `src/collections` | Payload collection schema, access, hook 진입점을 둡니다. |
| Guideline Sections | `src/features/guideline/sections` | 섹션·컨테이너·카드 CMS 스키마와 투영·표현 어댑터를 둡니다. |
| Globals | `src/globals` | Payload global schema를 둡니다. |
| Modules | `src/modules` | 기능 자체가 아닌 UI 비종속 공통 계약을 둡니다. |
| Services | `src/features/*/services`, `src/modules/*/services`, `src/services` | Service는 사용처 수와 관계없이 소유 기능이나 모듈 안에 둡니다. 소유 경계가 없는 cross-domain orchestration만 `src/services`에 둡니다. |
| Repositories | `src/features/*/repositories`, `src/modules/*/repositories`, `src/repositories` | Repository는 여러 기능이 사용해도 데이터의 소유 기능이나 모듈 안에 둡니다. 소유 경계가 없는 저장소만 `src/repositories`에 둡니다. |
| Tests | `tests` | e2e, integration, helper를 둡니다. |
| Docs | `docs` | 제품, 도메인, 아키텍처, 개발 규칙 문서를 둡니다. |
| Future apps | `apps/*` | 배포 단위가 둘 이상으로 나뉠 때만 추가합니다. |
| Future packages | `packages/*` | 여러 app이 공유하는 코드가 생길 때만 추가합니다. |

예시:

```text
현재: src/app, src/features, src/modules
나중: apps/web, apps/admin, packages/domain
```

`apps`와 `packages`는 분리할 배포 단위나 공유 코드가 생길 때까지 만들지 않습니다.

### 리소스 폴더 구조

| 리소스 | 위치 | 규칙 |
| --- | --- | --- |
| 정적 파일 | `public` | 직접 공개해도 되는 이미지, 아이콘, 정적 파일만 둡니다. |
| 공식 에셋 | Payload upload collection | 권한, 상태, 메타데이터가 필요한 파일은 Payload에서 관리합니다. |
| 사용자 업로드 | Payload upload collection 또는 object storage | 파일 검증과 권한 확인을 거친 뒤 저장합니다. |
| 환경 변수 | `.env` | secret은 코드와 클라이언트 번들에 넣지 않습니다. |
| 메시지 | 기능별 컴포넌트/서비스 또는 i18n 모듈 | 사용자 노출 메시지와 내부 로그 메시지를 분리합니다. |
| 테스트 리소스 | `tests` | 테스트 fixture와 helper를 테스트 디렉터리 안에 둡니다. |

### 프론트엔드 폴더 구조

프론트엔드는 Payload Admin과 Creator UI를 분리합니다.

| 영역 | 위치 | 규칙 |
| --- | --- | --- |
| Payload Admin | `src/app/(payload)` | Payload가 요구하는 admin route와 API route를 둡니다. |
| Creator UI | `src/app/(frontend)` | 내부 현장 작업자가 사용하는 화면을 둡니다. |
| Route Handler | `src/app/**/route.ts` | HTTP 요청 검증과 Service 호출만 담당합니다. |
| ShadCN UI | `src/components/ui` | registry 기반 컴포넌트 원형을 둡니다. |
| 표현 컴포넌트 | `src/components/<surface>` | Home, Studio, Payload Admin처럼 실제 화면 표면을 기준으로 둡니다. |
| 전역 공유 컴포넌트 | `src/components/shared`, `src/components/global` | 둘 이상의 화면 표면이 공유하는 UI와 공용 탐색 UI는 `shared`, app shell은 `global`에 둡니다. |
| 화면 상태와 비즈니스 로직 | `src/features/*` | domain, hook, service, repository, util, type을 기능 안에 둡니다. 일반 React 컴포넌트는 두지 않습니다. |

의존 방향은 `app → components → features`입니다. 일반 가이드라인 화면은 `src/components/guideline`에 둡니다. `src/features/guideline/sections`의 렌더 어댑터만 CMS 데이터에서 표현 컴포넌트를 연결합니다. 스키마·정의·투영·계약과 상태·서비스·저장소 계층은 표현 컴포넌트나 렌더 레지스트리를 import하지 않습니다. Payload config가 읽는 `sections/schema.ts`·`display-schema.ts`에는 React·이미지 import를 넣지 않습니다. React 연결은 `render.tsx`·`display-render.tsx`로 분리합니다.

## 3. 전체 소스코드 폴더 구조

현재 저장소에는 `src/app`, `src/collections`와 구조 확인용 `my-*` 목 파일이 들어간 주요 계층 폴더가 존재합니다.
아래 구조는 실제 기능을 구현할 때 `my-*` 목 파일을 도메인 이름으로 교체해 맞출 목표 구조입니다.

```text
src/
  app/
    (frontend)/
      layout.tsx
      page.tsx
    (payload)/
      admin/
      api/
    api/
      <resource>/
        route.ts
  collections/
    *.ts
  globals/
    *.ts
  services/
    *.service.ts
  repositories/
    *.repository.ts
    *.payload.repository.ts
    *.drizzle.repository.ts
  components/
    admin/
    global/
    home/
    guideline/
      pages/
      controllers/
      navigation/
      sections/
      typography/
      media/
      playground/
    shared/
      navigation/
      controller/             # 컨트롤러 킷 — layout·controls·compose·read·asset·internal
      controller-renderer/    # Definition → 킷 투영
    studio/
      panel/                  # 패널 런타임(ControlPanel·슬롯·위젯 계약)
      shared/
        widgets/              # 도메인 무지·여러 스튜디오 공용 묶음 위젯
        studio-output.tsx     # Output 카드 공용 부품(Root·Format·Print·Video·Actions·Messages)
      <studio>/
        widgets/              # 스튜디오 전용 위젯 + registry
        output/               # 스튜디오 Output 카드 조립 + 고유 행
    ui/
  features/
    graphic-generation/
      domain/
      graphic-runtimes/
        <runtime-id>/
          definition.ts
          model.ts
          runtime.client.ts
        catalog/
          manifest.generated.ts
          model.generated.ts
          runtime.generated.client.ts
      hooks/
      repositories/
      runtime/
      services/
    image-generation/
      domain/
      hooks/
      repositories/
      runtime/
      services/
    template-customization/
      domain/
      hooks/
      runtime/
      services/
    template-import/
      repositories/
      services/
      utils/
    studio-export/
      adapters/
      hooks/
      services/
    <feature>/
      sections/
        schema.ts
        display-schema.ts
        fields.ts
        model.ts
        projection.ts
        render.tsx
        display-render.tsx
      cards/
        displays/
          dynamics/
            <display>/
      domain/
        contract/
      contexts/
      providers/
      hooks/
      repositories/
      services/
      utils/
      types.ts
  modules/
    agents/
      *.agent.ts
    studio-controller/
    template/
      domain/
      repositories/
      runtime/
      services/
  lib/
    auth.ts
    errors.ts
  hooks/
    use-*.ts
  types/
    *.ts
tests/
  e2e/
  int/
  helpers/
docs/
scripts/
```

- `page.tsx`와 `layout.tsx`는 라우팅과 화면 조합만 담당합니다.
- `route.ts`는 HTTP adapter로만 동작합니다.
- Collection hook은 Service를 호출하고, 업무 규칙을 직접 길게 작성하지 않습니다.
- Payload Local API, ORM, CMS SDK import는 `*.payload.repository.ts`, `*.drizzle.repository.ts` 구현 파일에만 허용합니다. Service는 기능 전용 read 조회라도 이 규칙을 따릅니다. 예외는 인증 operation(`payload.auth`·`payload.login`) 하나이며, `lib/request-auth.ts`·`proxy.ts`·`/api/auth/login` 라우트가 직접 부릅니다 — 저장소가 아니라 인증 경계이기 때문입니다.
- Service와 Repository는 사용처 수와 관계없이 그것을 소유하는 `src/features/<feature>` 또는 `src/modules/<module>` 안에 둡니다. 다른 기능은 소유 경계의 공개 계약을 소비합니다. 소유 경계가 없는 cross-domain orchestration이나 저장소만 `src/services`, `src/repositories`에 둡니다.

#### 경계 규칙

경계는 `src/features/<feature>`와 `src/modules/<module>` 하나하나입니다. `src/architecture.test.ts`가 아래 셋을 소스 전체에 대조하며, 기존 위반은 그 파일의 허용목록에 적혀 있고 고치면 지웁니다(래칫). 규칙을 바꾸려면 이 문서를 먼저 고칩니다.

- **R1 — 경계 밖에서 import할 수 있는 것은 그 경계의 `services/`·`domain/`과 경계 루트의 파일뿐입니다.** `repositories/`·`runtime/`·`utils/`·`hooks/`·`providers/`·`contexts/`·`adapters/`·`checks/` 등은 경계 안에서만 씁니다. 같은 이유로 서버 코드(`.tsx`·`.client.ts`·`'use client'`·브라우저 폴더가 아닌 파일)는 `.client`를 import하지 않습니다 — 양쪽이 쓸 타입·순수 함수는 `domain/`에 둡니다. 화면(`components`·`app`)과 `collections`는 저장소를 import하지 않고, `lib`는 경계를 import하지 않습니다. `import type`은 런타임 결합이 없어 검사하지 않습니다.
- **R2 — Payload 런타임(`getPayload`·`payload.*`·`req.payload.*`)은 `*.repository.ts`에서만 부릅니다.** 위 인증 예외만 있습니다.
- **R3 — 컬렉션 하나는 경계 하나가 소유합니다.** 다른 경계는 소유자의 읽기 서비스를 부릅니다. 저장소가 둘 이상이던 컬렉션의 소유자는 아래와 같이 확정했습니다(2026-10-08). 표에 없는 컬렉션은 저장소가 한 경계에만 있으면 됩니다. `src/repositories`는 경계가 아니므로 소유자로 세지 않습니다 — 여러 컬렉션에 **같은 동작**을 거는 cross-domain 저장소(예: 스튜디오 프로파일 4종의 미리보기 갱신)만 두고, 한 컬렉션의 도메인 조회는 소유 경계의 repository에 둡니다.

| 컬렉션 | 소유자 | 비고 |
| --- | --- | --- |
| `brand-colors` | `features/guideline` | 발행 색 목록 읽기 서비스 하나를 열고 소비자가 자기 모양으로 좁힙니다 |
| `guideline-documents` | `features/guideline` | `domain/reading`이 이미 MCP·Agent 공통 읽기 모델을 소유합니다 |
| `templates` | `features/template-core` | |
| `rules` | `features/quality-rule` | |
| `agent-skills` | `features/agent-chat` | 에이전트 실행 단위(`*.agent.ts`)와 스킬 저장소가 같은 경계에 있습니다 |
| `users` | `features/auth` | 계정 문서. 기능별 설정 필드(`tokenLimits`·Figma 토큰)는 auth의 `user-settings.service`로만 읽고 씁니다 — ai-usage·template-import는 그 서비스를 부릅니다 |
- 일반 React 컴포넌트는 `src/components/<surface>`에 둡니다. 컴포넌트가 기능 hook이나 client service를 사용할 수 있지만, 기능 로직이 표현 컴포넌트를 import하면 안 됩니다.
- 둘 이상의 화면 표면이 쓰는 컴포넌트만 `src/components/shared`로 승격합니다. 한 표면 안의 여러 화면이 공유하면 `<surface>/shared`에 둡니다.
- Repository Interface 파일(`*.repository.ts`)은 구현체가 2개 이상 필요해지는 시점에 만듭니다. 단일 구현 단계에서는 Service가 구현 파일을 직접 import합니다.
- 기능 전용 read service의 Payload 접근도 같은 기능의 `src/features/*/repositories`에 둡니다.
- 기능 안의 순수 도메인 계산 계층(예: `review/checkers`)과 정적 시나리오 데이터(예: `review/scenarios`)는 승인된 기능 하위 폴더 확장입니다. 새 하위 폴더는 표준 폴더(`components`, `contexts`, `hooks`, `providers`, `repositories`, `services`, `utils`)로 표현할 수 없을 때만 추가합니다.
- Feature 디렉터리는 `template-core`, `graphic-generation`, `image-generation`, `template-customization`, `template-import`처럼 `<object>-<capability>`로 이름 짓습니다. 여러 기능이 소비하는 Template 도메인 정본은 `src/features/template-core`, UI 비종속 Controller 계약은 `src/modules/studio-controller`, 공통 출력 실행은 `src/features/studio-export`가 소유합니다. 각 기능의 직렬화 계약과 순수 계산은 `domain`, Context 값 계약은 `contexts`, 화면 세션은 `providers`, Context 소비는 `hooks`, 실행 adapter는 `runtime`, 조회 유즈케이스는 `services`, Payload 접근은 `repositories`에 둡니다. Provider와 소비 훅은 서로 import하지 않고 같은 Context 계약에 의존합니다. Studio 표현 컴포넌트와 라우트는 화면 표면 이름이므로 `src/components/studio`, `/studio`를 유지합니다.
- 가이드라인은 `sections/schema.ts`·`display-schema.ts`의 단일 저장 계약을 사용합니다. 스키마·투영은 Node에서 읽을 수 있어야 하며 표현 연결은 `sections/render.tsx`·`display-render.tsx`가 소유합니다.
- 신규 가이드라인 CMS 본문은 `features/guideline/sections`가 같은 경계를 따릅니다. `schema.ts`·`display-schema.ts`는 저장 필드, `model.ts`는 공통 위계·파일 해석, `projection.ts`는 검색·검수 투영, `render.tsx`·`display-render.tsx`는 공통 표현 API 연결입니다. schema/model은 React 렌더러를 import하지 않습니다. 기존 blocks는 호환 경로로 유지합니다([기능 계약 §2.6](features/guideline.md#26-신규-cms-계약--2026-09-21)).
- 가이드라인의 MCP·Agent 공통 읽기 모델은 `features/guideline/domain/reading`이 소유합니다. `read-document.ts`는 원본→읽기 문서 변환과 레거시 호환 분기, `read-visual.ts`는 활성 도판·조작·동작 해석, `format-document.ts`는 읽기 모델→텍스트 표현을 담당합니다. 이 계층은 DB·네트워크를 호출하지 않으며, 응답 길이와 페이지 처리는 각 서비스에 둡니다.
- Agent는 별도 사용자 역할이 아니라 `src/features/agent-chat`의 실행 단위(`*.agent.ts`, 경계 루트)입니다. 2026-10-08까지 `src/modules/agents`였으나 feature 6개를 import하는 모듈은 아래층이 아니라 agent-chat의 엔진이라 합쳤습니다.
- 실제 폴더 구조를 개선할 때는 `src/features`, `src/modules`, `src/components`, `src/lib`, `src/services`, `src/repositories`, `src/types`를 이 순서로 추가합니다.

예시:

```text
src/app/api/guidelines/[id]/publish/route.ts
src/features/guideline/services/publish-guideline.service.ts
src/features/guideline/repositories/guideline.payload.repository.ts
```

## 4. 구현 위치

| 구현 대상 | 위치 | 규칙 |
| --- | --- | --- |
| Payload collection | `src/collections` | 데이터 구조, access, hook 진입점 |
| 가이드라인 CMS 계약 | `src/features/guideline/sections` | 저장 스키마·검색/Check 투영·표현 어댑터 |
| Creator 화면 | `src/app/(frontend)`, `src/components` | 화면 이동, route 조합, 표현 컴포넌트 |
| Creator 화면 상태 | `src/features/*/contexts`, `src/features/*/providers`, `src/features/*/hooks`, `src/features/*/utils` | Context 값 계약은 context, 화면 세션 상태는 Provider, 소비 API는 hook, 나머지는 view model·비즈니스 계산 |
| Admin 화면 | `src/app/(payload)`, Payload Admin 기본 UI | Manager의 CMS 작업 |
| Route Handler | `src/app/**/route.ts` | request parsing, 권한 확인, Service 호출, response 변환 |
| Service | `src/features/*/services`, `src/modules/*/services`, 소유 경계가 없을 때 `src/services` | Use Case 실행, Input / Output 계약, 상태 전이 판단, 기능 전용 published 조회 |
| Repository Interface | `src/features/*/repositories/*.repository.ts`, `src/modules/*/repositories/*.repository.ts`, 소유 경계가 없을 때 `src/repositories` | Service가 필요한 저장소 계약 (구현체 2개 이상일 때) |
| Repository Implementation | `src/features/*/repositories/*.payload.repository.ts`, `src/modules/*/repositories/*.payload.repository.ts`, 소유 경계가 없을 때 `src/repositories` | Payload Local API, Drizzle ORM, CMS SDK 호출 |
| Agent | `src/features/agent-chat/*.agent.ts` | 검색, Answer, Recommendation 생성 |
| 공통 유틸 | `src/lib` | 에러, 인증 helper처럼 실제 공유되는 코드 |

예시:

| 해야 할 일 | 위치 |
| --- | --- |
| 발행 요청을 HTTP로 받기 | `src/app/api/guidelines/[id]/publish/route.ts` |
| 발행 상태 전이 판단 | `src/features/guideline/services/publish-guideline.service.ts` |
| Payload에 published 상태 저장 | `src/features/guideline/repositories/guideline.payload.repository.ts` |
| Creator 화면 상태 관리 | `src/features/guideline/*` |

## 5. 스캐폴딩 규칙

스캐폴딩은 새 Use Case를 만들 때 필요한 최소 파일만 생성합니다.
생성된 파일은 바로 비즈니스 로직을 작성할 수 있는 상태여야 합니다.

### 가이드라인 섹션·디스플레이 연결

가이드라인 본문은 `sections → containers → cards → display`만 사용합니다. 구형 blocks·카드·디스플레이 registry는 등록하지 않습니다. 디스플레이 입력은 `sections/display-schema.ts`, 공통 카드·섹션 입력은 `sections/schema.ts`에 정의하고 검증합니다.

| 파일·위치 | 책임 |
| --- | --- |
| `sections/fields.ts` | Rule 관계와 안정적인 URL 앵커 |
| `sections/schema.ts`·`display-schema.ts` | CMS 필드·기본값·검증 |
| `sections/model.ts` | CMS 타입·파일·색·위계·다운로드 해석 |
| `sections/projection.ts` | 검색·검수용 저작 텍스트·근거 |
| `sections/render.tsx`·`display-render.tsx` | CMS 관계 → 공통 표현 API |
| `domain/reading` | 공통 읽기 모델·시각 자료 해석·Agent 텍스트 |
| `components/guideline/structure` | 섹션·컨테이너·카드·캡션·도판·조작의 표현 |
| `cards/displays/dynamics` | 실제 소비자가 쓰는 브랜드 규정·표본·계산 |

스키마와 순수 해석은 표현 컴포넌트를 import하지 않습니다. 디스플레이 추가 순서는 [11](11-widget-authoring.md)을 따릅니다. 문서 단위 Check snapshot은 `checks/`가 소유하고, 과거 동결 evidence 계약은 `checks/check-source.ts`에서 독립적으로 보존합니다.

`contentModel`은 숨긴 버전 복원 판별 표식으로만 유지하며 새로운 저장은 sections로 고정합니다. 구형 본문 전용 테이블과 legacy 버전은 별도의 파기 마이그레이션으로 삭제하며 신규 버전·업로드 자산은 보존합니다. 기존 마이그레이션과 drizzle 스냅샷은 삭제하지 않습니다.

### 가이드라인 화면과 상태 경계

일반 가이드라인 페이지·탐색·헤더·푸터는 `src/components/guideline`에 둡니다. CMS 어댑터는 `sections/`, 공통 표현과 카드별 일시적 조작 상태는 `components/guideline/structure/`가 소유합니다. `services`·`repositories`·`checks`는 표현 컴포넌트를 import하지 않습니다. 구형 Floating Helper와 컨트롤러 registry를 다시 만들지 않습니다.

### Graphic runtime 등록

기존 `p5`·`shader` 엔진에 Graphic을 추가할 때는 `src/features/graphic-generation/graphic-runtimes/<runtime-id>` 폴더 하나를 만들고 아래 세 파일을 기본 export로 제공합니다.

| 파일 | 최소 계약 |
| --- | --- |
| `definition.ts` | `defineGraphicRuntime()`으로 서버 안전 `GraphicRuntimeManifest`를 정의하며 `id`는 폴더명과 일치시킵니다. |
| `model.ts` | Manifest를 import하지 않는 순수 `GraphicModelAdapter`를 제공합니다. |
| `runtime.client.ts` | P5/WebGL을 실제 실행하는 브라우저 전용 `GraphicRuntimeAdapter`를 제공합니다. |

`pnpm generate:graphic-runtime-catalogs`는 세 경계를 별도 정적 import로 만들어 `graphic-runtimes/catalog/*.generated.*`를 갱신합니다. 생성 파일은 커밋하되 직접 수정하지 않습니다. `pnpm check:graphic-runtime-catalogs`는 계약 파일 누락, 폴더명과 Manifest id 불일치, 오래된 생성 파일을 CI에서 거부합니다. 기존 엔진의 새 자산은 Provider·Sidebar·Canvas·중앙 Catalog를 수정하지 않습니다.

### Use Case 스캐폴딩

| 파일 | 역할 |
| --- | --- |
| `src/features/guideline/services/publish-guideline.service.ts` | Use Case Service, Input, Output |
| `src/features/guideline/repositories/guideline.payload.repository.ts` | Payload 기반 Repository Implementation |
| `src/app/api/guidelines/[id]/publish/route.ts` | HTTP 요청을 Service로 연결하는 Route Handler |
| `src/features/guideline/services/publish-guideline.service.test.ts` | Service 단위 검증 |

Repository Interface(`guideline.repository.ts`)는 두 번째 구현체가 필요해질 때 추가합니다.
여러 기능이 같은 Service나 Repository를 쓰더라도 소유 도메인이 명확하면 그 기능 안에 유지합니다.

### 생성하지 않는 것

- Facade
- DTO mapper
- DI container
- factory
- barrel export
- `index.ts`
- 아직 쓰지 않는 interface

예시:

```text
Use Case: PublishGuideline
Service: src/features/guideline/services/publish-guideline.service.ts
Route: src/app/api/guidelines/[id]/publish/route.ts
Repository Implementation: src/features/guideline/repositories/guideline.payload.repository.ts
```

## 6. Route 구현 규칙

Client Route는 화면 이동과 URL 상태만 관리합니다.

- Creator UI의 canonical page 경로와 legacy redirect 매핑은 `src/lib/routes.ts`가 소유합니다.
- 화면 이동, URL 파라미터, navigation, redirect, 화면 진입 제어만 담당합니다.
- 비즈니스 로직, 데이터 저장, Payload CMS 접근, Repository 호출을 하지 않습니다.
- Service를 직접 호출하지 않습니다.

Server Route Handler는 HTTP 요청을 Service 호출로 연결하는 adapter입니다.

- request를 parsing하고 Service Input model을 만듭니다.
- 인증과 권한을 확인합니다.
- Service 함수를 호출합니다.
- Service Output을 HTTP response로 변환합니다.
- 비즈니스 로직, Repository 직접 호출, Payload CMS 직접 호출, Entity 생성과 수정을 하지 않습니다.

```ts
export async function POST(req: Request) {
  const input: PublishGuidelineInput = await req.json()
  const output = await publishGuideline(input)

  return Response.json(output)
}
```

하지 않는 예시:

```ts
export async function POST(req: Request) {
  const payload = await getPayload()
  await payload.update({ collection: 'guidelines', id: '1', data: { status: 'published' } })

  return Response.json({ ok: true })
}
```

Route Handler에서 Payload CMS를 직접 호출하면 Service와 Repository 경계가 깨집니다.

## 7. Service 구현 규칙

Use Case Service는 하나의 Use Case만 담당합니다.
Service는 exported 함수로 작성하고, 함수 이름은 Use Case를 동사로 표현합니다.
class와 `execute` 진입점은 만들지 않습니다. 함수 시그니처가 Input / Output 계약입니다.

- 외부 입력 경계의 Use Case는 명시적 Input 타입을 정의합니다.
- 하나의 Service 파일은 하나의 Use Case를 공개하는 것이 기본입니다. 같은 데이터 경계의 read 조회 함수나 같은 Use Case의 보조 진입점(검증, 포매팅)만 한 파일에 함께 둡니다.
- Service는 Route Handler와 UI에 의존하지 않고, HTTP Response를 만들지 않습니다. 스트리밍 응답을 포함한 Response 생성은 Route Handler가 소유합니다.
- Service는 Repository 구현 파일을 직접 import해 저장소를 사용합니다. Repository Interface는 구현체가 2개 이상일 때만 둡니다.
- Service는 ORM query builder, Payload query shape, CMS SDK 호출 방식을 알면 안 됩니다.
- 생성된 `@/payload-types` 타입은 read model로 type-only import할 수 있습니다. 런타임 Payload 접근은 repository에만 둡니다.

```ts
export interface PublishGuidelineInput {
  guidelineId: string
}

export interface PublishGuidelineOutput {
  guidelineId: string
  version: number
}

export async function publishGuideline(input: PublishGuidelineInput): Promise<PublishGuidelineOutput> {
  const version = await publishGuidelineVersion(input.guidelineId)

  return {
    guidelineId: input.guidelineId,
    version,
  }
}
```

하지 않는 예시:

```ts
export async function publishGuideline(input: PublishGuidelineInput): Promise<PublishGuidelineOutput> {
  const payload = await getPayload()
  // Service는 Payload query shape을 알면 안 됩니다. Repository 함수를 호출합니다.
}
```

## 8. Repository 구현 규칙

Repository는 저장소 접근만 담당합니다.
비즈니스 로직과 상태 전이 판단은 Service에 둡니다.

- Repository Interface는 Service가 필요한 데이터 접근 계약만 정의하고, 구현체가 2개 이상 필요해질 때 도입합니다. 단일 구현 단계에서는 Service가 구현 파일을 직접 import합니다.
- Repository도 exported 함수로 작성합니다. class는 만들지 않습니다.
- Repository Implementation만 Drizzle ORM, Payload Local API, CMS SDK를 import할 수 있습니다.
- Repository는 데이터 접근 오류를 그대로 화면까지 전달하지 않습니다.
- Repository 함수 이름은 저장소 기술이 아니라 도메인 동작 기준으로 정합니다.

```ts
// guideline.payload.repository.ts
export async function publishGuidelineVersion(guidelineId: string): Promise<number> {
  // Payload Local API 호출은 구현 파일 안에 둡니다.
  return 1
}
```

Drizzle 기반 구현 예시:

```ts
// guideline.drizzle.repository.ts
export async function publishGuidelineVersion(guidelineId: string): Promise<number> {
  // Drizzle query는 구현 파일 안에 둡니다.
  return 1
}
```

## 9. BFF API 문서 작성 전략

BFF API 문서는 프론트엔드와 Route Handler 사이의 계약을 기록합니다.
Payload collection, Payload REST / GraphQL API, Service 내부 함수, Repository 내부 query는 BFF API 문서 범위에 포함하지 않습니다.

문서 자동화는 다음 순서로 적용합니다.

1. BFF Route Handler마다 request / response schema를 작성합니다.
2. schema에서 OpenAPI spec을 생성합니다.
3. OpenAPI spec에서 프론트엔드 API client를 생성합니다.
4. CI에서 생성된 OpenAPI spec 변경 diff를 검사합니다.
5. 필요하면 생성된 OpenAPI spec을 `/api/docs` 같은 내부 문서 경로에 노출합니다.

schema는 `src/app/**/route.ts`의 request / response DTO를 기준으로 작성합니다.
Route Handler는 HTTP 요청 검증, Service 호출, 안전한 응답 변환만 담당하고, 문서용 schema에 도메인 규칙을 중복 작성하지 않습니다.

OpenAPI spec은 사람이 직접 수정하지 않습니다.
spec을 바꿔야 할 때는 해당 BFF schema를 수정한 뒤 생성 스크립트로 다시 만듭니다.

프론트엔드 API client는 생성된 OpenAPI spec을 기준으로 만들고, 손으로 작성한 fetch wrapper가 BFF 계약과 따로 진화하지 않게 합니다.
문서 UI는 계약 관리의 원천이 아니므로 OpenAPI spec과 client 생성이 안정된 뒤 연결합니다.

예시:

```ts
export interface PublishGuidelineRequest {
  guidelineId: string
}

export interface PublishGuidelineResponse {
  guidelineId: string
  version: number
}
```

이 request / response 모델은 Route Handler의 HTTP 계약이고, Repository query 모델이 아닙니다.

## 10. 파일 명칭 규칙

| 개발 소스 | 설명 |
| --- | --- |
| `page.tsx` | Next.js route page 파일입니다. |
| `layout.tsx` | Next.js route layout 파일입니다. |
| `route.ts` | Next.js Route Handler 파일입니다. |
| `*.tsx` | React component 파일입니다. |
| `use-*.ts` | React custom hook 파일입니다. JSX를 반환하면 `use-*.tsx`를 허용합니다. |
| `*.service.ts` | Use Case service 함수 파일입니다. |
| `*.client.ts` | 브라우저 I/O를 소유하는 파일입니다. Route Handler·Payload REST fetch를 소유하는 client service는 소유 기능의 `services`에, 캔버스·DOM 변환·다운로드 같은 브라우저 실행 adapter는 `runtime`·`adapters`에 둡니다. 서버 코드는 이 파일을 import하지 않습니다(경계 규칙 R1). |
| `*.repository.ts` | Service가 참조하는 repository interface 파일입니다. |
| `*.payload.repository.ts` | Payload Local API 또는 CMS SDK 기반 repository 구현 파일입니다. |
| `*.drizzle.repository.ts` | Drizzle ORM 기반 repository 구현 파일입니다. |
| `*.<tech>.repository.ts` | 그 외 외부 시스템 기반 repository 구현 파일입니다. 예: `figma.rest.repository.ts`, `image-decoder.sharp.repository.ts` |
| `*.agent.ts` | Agent 실행 단위 파일입니다. |
| `*.test.ts` | 단위 테스트 파일입니다. |
| `*.spec.ts` | e2e 또는 통합 테스트 파일입니다. |

예시:

```text
publish-guideline.service.ts
guideline.repository.ts
guideline.payload.repository.ts
guideline.drizzle.repository.ts
guideline-publish.spec.ts
```

## 11. 명명 규칙

### 클래스 명칭

| 대상 | 규칙 | 예 |
| --- | --- | --- |
| React Component | `PascalCase` | `GuidelineCard` |
| custom hook | `use` + 동작 또는 상태 | `useTemplateExport` |
| Facade | 필요한 경우에만 `PascalCase` + `Facade` | `GuidelineFacade` |
| Service (Use Case) | Use Case를 표현하는 동사 시작 함수 | `publishGuideline` |
| Repository | 도메인 동작 기준 함수 | `findPublishedGuideline` |
| Util | 기능 이름 중심 | `formatDate`, `normalizeSlug` |
| Error | 도메인 + `Error` | `AccessDeniedError` |

Facade는 기본 구조로 두지 않습니다.
여러 Service와 Repository를 한 화면 전용 API로 묶어야 할 때만 추가합니다.

### 함수 명칭

- 함수는 `camelCase`로 작성합니다.
- 함수 이름은 동사로 시작합니다.
- Use Case Service의 외부 진입점도 동사 시작 함수 명명 규칙을 따릅니다. `Service` 접미사는 붙이지 않습니다.
- 조회는 `get`, `find`, `list`를 구분해서 사용합니다.
- 생성, 수정, 삭제는 `create`, `update`, `delete`를 사용합니다.
- boolean 반환 함수는 `is`, `has`, `can`, `should`로 시작합니다.
- 이벤트 핸들러는 `handle`로 시작합니다.

| 작업 | 규칙 | 예 |
| --- | --- | --- |
| 단건 조회 | `get` + 대상 | `getGuideline` |
| 조건 조회 | `find` + 대상 | `findPublishedRule` |
| 목록 조회 | `list` + 대상 | `listApplicationTypes` |
| 생성 | `create` + 대상 | `createCheckSession` |
| 수정 | `update` + 대상 | `updateGuidelineTopic` |
| 삭제 | `delete` + 대상 | `deleteDraftRule` |
| 권한 확인 | `can` + 동작 | `canPublishGuideline` |
| 상태 확인 | `is` + 상태 | `isPublished` |

좋은 예시:

```ts
const publishedGuideline = await guidelineRepository.findPublishedGuideline(guidelineId)
const canPublish = await permissionService.canPublishGuideline(userId, guidelineId)
```

피하는 예시:

```ts
const data = await guidelineRepository.getData(id)
const flag = await permissionService.check(userId, id)
```

이름만 보고 대상, 조건, 반환 의미를 알 수 있어야 합니다.

## 12. 코딩 스타일

- 구현은 Ponytail 기준으로 최소 변경을 우선합니다.
- 입력 모델은 Route Handler, Server Action, Payload hook, Service처럼 외부 입력이나 유즈케이스 경계에 둡니다.
- 인터페이스는 Repository, Agent Adapter, Storage Adapter처럼 외부 시스템 경계나 구현체가 둘 이상 필요한 곳에만 둡니다.
- 한 파일 안에서만 쓰는 helper, formatter, component handler에는 별도 입력 모델이나 인터페이스를 만들지 않습니다.
- 새 추상화나 의존성은 기존 코드, 표준 기능, 플랫폼 기능으로 해결할 수 없을 때만 추가합니다.

### 별도 모델을 만들지 않는 경우

```ts
function formatTitle(title: string) {
  return title.trim()
}
```

작게 유지하는 예시:

```ts
function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replaceAll(' ', '-')
}
```

한 파일 안에서만 쓰는 변환에는 별도 class나 interface를 만들지 않습니다.

## 13. 주석 처리 규칙

### 문서화 주석

- exported service 함수나 class에는 호출 경계와 외부 I/O 소유 계층을 설명하는 짧은 주석을 작성합니다.
- Repository, Agent 함수는 입력과 결과만으로 의도를 알기 어려운 경우에만 문서화 주석을 작성합니다.
- 모든 파일과 모든 함수에 주석을 강제하지 않습니다.
- 보안, 권한, 데이터 보존처럼 실수 비용이 큰 규칙은 주석으로 의도를 남깁니다.

```ts
/**
 * 발행된 기준만 조회한다.
 * Agent 답변과 Creator UI는 draft 기준을 사용하면 안 된다.
 */
```

문서화 주석 예시:

```ts
/**
 * live 상태의 Official Version만 조회한다.
 * draft나 archived 기준은 Creator와 Agent에게 제공하지 않는다.
 * Payload 조회는 guideline-version repository가 소유한다.
 */
export async function findLiveGuidelineVersion(
  input: FindLiveGuidelineVersionInput,
): Promise<FindLiveGuidelineVersionOutput> {
  // ...
}
```

### 함수 주석

- 함수 이름과 타입으로 설명되는 내용은 주석으로 반복하지 않습니다.
- 여러 단계의 검증이나 상태 전이가 있는 경우에만 짧게 설명합니다.
- 주석은 구현 방법보다 이유를 설명합니다.

함수 주석 예시:

```ts
function assertPublishable(status: VersionStatus) {
  // archived는 감사 대상이므로 다시 live로 되돌리지 않는다.
  if (status === 'archived') {
    throw new InvalidVersionStatusError()
  }
}
```

### 변수 주석

- 변수 주석은 기본적으로 작성하지 않습니다.
- 단위, 시간 기준, 외부 시스템 키처럼 이름만으로 오해할 수 있는 값에만 작성합니다.

```ts
const sessionTtlMinutes = 10 // 관리자 세션 만료 기준
```

변수 주석 예시:

```ts
const checkSnapshotRetentionDays = 90 // 검수 재현을 위해 보관하는 기간
```

## 14. Log 정책

- `console.log`는 임시 디버깅에만 사용하고 커밋하지 않습니다.
- 서버 로그는 런타임 logger 또는 검증된 공통 logger를 통해 남깁니다.
- 로그 레벨은 `debug`, `info`, `warn`, `error`로 구분합니다.
- 운영 환경에서는 `debug` 로그를 기본 비활성화합니다.
- 로그 한 줄에는 발생 위치, 작업 식별자, 안전한 메시지를 포함합니다.
- secret, token, password, 개인정보, 업로드 원본 파일 경로는 로그에 남기지 않습니다.

| 레벨 | 사용 기준 |
| --- | --- |
| `debug` | 개발 중 흐름 확인. 운영 기본 비활성화 |
| `info` | 정상적인 주요 업무 이벤트 |
| `warn` | 실패는 아니지만 조치가 필요한 상태 |
| `error` | 요청 실패, 작업 실패, 복구가 필요한 오류 |

예시:

```ts
payload.logger.info('guideline.publish.completed', {
  guidelineId,
  version,
})
```

피하는 예시:

```ts
console.log(user.email, accessToken, rawUploadPath)
```

## 15. Exception 처리

- 사용자에게는 일반화된 오류 메시지를 보여줍니다.
- 상세 오류, stack trace, 내부 경로는 서버 로그에만 남깁니다.
- Repository는 데이터 접근 오류를 그대로 화면까지 전달하지 않습니다.
- Service는 업무상 실패를 도메인 오류나 메시지 코드로 변환합니다.
- Route Handler와 Server Action은 오류를 HTTP status와 안전한 응답 형식으로 변환합니다.
- Payload hook에서 예외가 발생하면 저장 흐름을 중단할지, 후속 작업만 실패 처리할지 명확히 나눕니다.
- Agent 실패는 정책 변경 실패로 처리하지 않습니다. 답변 생성 실패와 기준 데이터 변경은 분리합니다.

예시:

```ts
const requestSchema = z.object({ guidelineId: z.number().int().positive() })

export async function POST(req: Request) {
  // 본문은 신뢰 경계 밖이다 — 타입 단언(`as`·타입 주석)이 아니라 스키마로 읽는다(docs/07).
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ message: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { payload, user } = await authenticateRequest()
  if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    return Response.json(await publishGuideline({ ...parsed.data, user }))
  } catch (error) {
    if (error instanceof GuidelineNotPublishableError) {
      return Response.json({ message: error.message }, { status: 409 })
    }
    payload.logger.error({ err: error }, 'guideline.publish.failed')
    return Response.json({ message: '게시하지 못했습니다.' }, { status: 500 })
  }
}
```

Service는 업무상 실패를 명확한 오류로 던지고, Route Handler가 HTTP 응답으로 바꿉니다. 아는 도메인 오류만 상태 코드로 옮기고, 나머지는 서버 로그에 남긴 뒤 일반화된 메시지로 답합니다. JSON 본문은 위의 한 줄(`schema.safeParse(await req.json().catch(() => null))`), FormData는 `await req.formData().catch(() => null)` 뒤 필드별 검사가 이 리포의 공통 형태입니다.

## 16. 스키마 변경과 마이그레이션 워크플로

Payload collection, field, index, relationship처럼 DB 스키마에 영향을 주는 변경은 소스 변경과 마이그레이션을 항상 함께 커밋합니다.
로컬 `PAYLOAD_DB_PUSH`는 개발 편의용이며 팀 배포 기준이 아닙니다. 스키마 변경은 마이그레이션으로만 전파합니다.

### 절차

1. `src/collections`(또는 `globals`, `blocks`)에서 스키마를 수정합니다.
2. `pnpm migrate:create <이름>`을 실행합니다. Postgres 어댑터는 현재 config와 최신 스냅샷을 비교해 증분 마이그레이션을 생성합니다.
3. 아래 생성물과 소스 변경을 하나의 커밋에 담습니다.

| 파일 | 내용 |
| --- | --- |
| `migrations/<timestamp>_<이름>.ts` | up / down SQL |
| `migrations/<timestamp>_<이름>.json` | 스키마 스냅샷. 다음 `migrate:create`의 diff 기준입니다. |
| `migrations/index.ts` | 자동 갱신되는 마이그레이션 목록 |
| `src/payload-types.ts` | 자동 재생성되는 타입. `pnpm generate:types`로도 갱신합니다. |
| 수정한 collection 소스 | 스키마 변경 원본 |

4. 빈 DB에서 `pnpm migrate`가 baseline부터 끝까지 통과하는지 확인합니다. CI `migrate` 잡이 동일하게 검증합니다.

### 규칙

- 마이그레이션 없는 스키마 변경 PR은 불완전합니다. 소스와 마이그레이션을 분리 커밋하지 않습니다.
- `.json` 스냅샷을 삭제하지 않습니다. 스냅샷이 없으면 `migrate:create`가 증분 대신 전체 스키마를 재생성합니다.
- 깨는 변경(컬럼 삭제, 리네임, NOT NULL 추가)은 expand → migrate/backfill → contract 세 단계로 나눕니다. nullable 필드 추가는 expand 한 단계로 끝납니다.
- 새 스키마가 요구하는 seed / fixture 변경은 같은 커밋에 포함합니다.
- `migrate:down`은 롤백 수단으로 신뢰하지 않습니다. 운영 DB 롤백은 백업으로 합니다.

### 기준선 압축

마이그레이션 체인을 새 기준선으로 압축할 때는 기존 데이터를 migration이나 seed로 복사하지 않습니다. 공유 DB의 데이터는 그대로 두고 스키마 기준점과 `payload_migrations` 기록만 바꿉니다.

1. 모든 공유 DB에 기존 pending migration을 먼저 적용합니다.
2. 공유 DB를 백업하고, 백업을 격리된 로컬 DB에 복원해 테이블 행 수와 sequence를 비교합니다.
3. 기존 `.ts`·`.json`과 보조 파일은 `migrations/archive/<전환일>/`로 옮깁니다. **전환 직후의 안전망이므로 영구 보관이 아닙니다** — 다음 기준선까지 살아 있을 이유가 없고, 실행 경로가 사라진 뒤에도 남기면 typecheck 대상으로 남아 삭제된 스키마 이름에 매달립니다(2026-08-10에 이 이유로 아카이브 전체를 삭제했습니다). 되돌릴 근거는 git 이력에 있습니다. 폴더 안에 다른 데서 참조하는 보조 데이터가 있으면 그것만 실제 소유 위치로 옮깁니다.
4. top-level `migrations/`에는 현재 config에서 생성한 전체 스키마 migration, 같은 이름의 `.json`, `index.ts`만 둡니다.
5. 기존 DB를 인수하는 기준선은 최신 handoff migration과 핵심 테이블을 확인해야 합니다. 조건을 만족하면 스키마 DDL을 실행하지 않고 기존 `payload_migrations` 행만 지웁니다. Payload runner가 같은 트랜잭션에서 새 기준선 기록을 추가합니다.
6. 조건이 맞지 않는 기존 DB에서는 기준선 migration을 중단합니다. 누락된 handoff migration을 적용한 뒤 다시 실행합니다.

빈 DB에서는 `pnpm migrate`, `pnpm migrate:status`, `pnpm build`를 실행합니다. 기존 데이터 복제본에서는 기준선 전환 뒤 `payload_migrations`를 제외한 모든 테이블의 내용과 sequence가 원본과 같은지 확인합니다. 라이브 사용자·세션·운영 로그는 Git에 커밋하지 않습니다. 새 환경에 고정 데이터가 꼭 필요할 때만 별도 canonical fixture를 추가합니다.

### pull 이후

스키마 관련 변경을 받은 뒤에는 로컬 DB 오류를 디버깅하기 전에 먼저 마이그레이션을 적용합니다.

```sh
pnpm install
pnpm migrate
pnpm dev
```
