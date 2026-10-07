# Guideline

가이드라인은 `sections → containers → cards → display` 단일 계약으로 저작하고 표시합니다. 문서 생명주기는 [03](../03-data-lifecycle.md), 도메인 경계는 [04](../04-domain-model.md), 디자인 토큰은 [09](../09-design-system.md)가 소유합니다.

## 1. 목적

저작자가 한 문서 안에 설명·도판·사례를 조합하고 사용자가 같은 기준을 화면·검색·Agent에서 읽게 합니다. 섹션은 문서 위계, 컨테이너는 배치, 카드는 도판·상태·캡션·액션을 소유합니다.

## 2. 핵심 계약

### 2.1 저작과 표시의 경계

챕터는 분류이고 문서는 제목·slug·선택 헤더 이미지·발행 상태를 가진 독립 단위입니다. 섹션은 문서 안의 평면 목록이며 Section·Incorrect Usages는 H2, Subsection은 앞선 H2 아래의 H3입니다. 캡션은 figcaption이고 문서 헤딩을 만들지 않습니다.

### 2.2 설정의 소유권

| 소유자 | 책임 |
| --- | --- |
| 문서 | 챕터·제목·slug·headerImage·발행·섹션 순서·문서 rules |
| 섹션 | type·제목·설명·anchor·정렬·rules·다운로드·컨테이너 순서 |
| 컨테이너 | Grid/Carousel/Sticky 배치·카드 순서 |
| 카드 | ratio·도판 색상·status·download·endActions·caption |
| 디스플레이 | 선택한 표현의 콘텐츠와 입력값 |

### 2.3 사용 상태

`none`·`allowed`·`prohibited`는 저작자가 지정한 사례 상태입니다. 자동 검수 결과가 아닙니다. 생략하면 Incorrect Usages는 금지, 나머지는 없음이며 카드의 명시적인 없음이 우선합니다.

### 2.4 스타일의 소유 위치

전역 색·서체·모서리는 `theme.css`, 앱 기본 본문은 `styles.css`, 가이드라인 섹션·배치·도판·캡션은 `src/components/guideline/structure/`가 소유합니다. `sections/render.tsx`와 `display-render.tsx`는 CMS 관계를 해석해 그 표현 API에 전달합니다. 카드가 크기를 정하고 디스플레이가 그 영역을 채웁니다.

### 2.5 제거한 본문의 파기 경계

`blocks`와 구형 카드·위젯 레지스트리, deprecated 렌더 경로는 CMS와 서비스에서 제거했습니다. 구형 본문을 새로 입력하거나 저장할 수 없습니다. `contentModel`은 버전 복원을 판별하는 내부 표식으로만 남습니다. Admin과 읽기 응답에서 숨기며 신규 저장은 `sections`로 고정합니다. `legacy` 표식의 버전은 복원을 거절합니다.

접근 제거 마이그레이션 이후, 별도의 파기 마이그레이션이 구형 본문 전용 테이블·enum·관계와 legacy 버전 행을 삭제합니다. 현재 문서와 최신 초안이 모두 sections이고 버전 표식에 null이 없을 때만 실행하며, 목록 밖의 의존성이 있으면 CASCADE하지 않고 실패합니다. 현재 문서·신규 sections 버전·업로드 레코드·스토리지 파일·검수 snapshot은 보존합니다. 삭제한 콘텐츠는 down으로 재구성할 수 없으므로 되돌릴 때는 삭제 전 DB 백업을 복원해야 합니다. 기존 마이그레이션과 drizzle 스냅샷은 삭제하지 않습니다.

과거 CheckSession의 동결된 evidence는 `checks/check-source.ts`의 독립 계약과 `format-check-evidence.ts`로 계속 읽습니다. 이 읽기 호환은 구형 CMS 저작·복원 기능을 되살리지 않습니다. 콘텐츠를 코드로 되쓰는 seed는 만들지 않습니다.

### 2.6 CMS 저장 계약

```text
Document
├─ 제목·slug·챕터·게시 상태·문서 rules
└─ sections[] — 평면 목록, 순서가 문서 위계
   ├─ type: Section | Subsection | Incorrect Usages
   ├─ 제목·설명·anchor·정렬·rules·섹션 다운로드
   └─ containers[]
      ├─ type: Grid | Carousel | Sticky
      ├─ 컨테이너별 배치 설정
      └─ cards[] — 컨테이너 아이템 = 카드
         ├─ ratio·display·도판 색상
         ├─ START 상태 / CENTER 전환 / END 실행
         └─ caption: 기본 | 목록 | 명세
```

Section은 H2, Subsection은 앞선 메인 섹션에 속하는 H3입니다. CMS에서는 같은 배열에서 편집하고, 출력도 평면으로 유지합니다. 레이아웃 책임과 간격은 [09 §7](../09-design-system.md#7-공통-셸과-프레임-골격)이 소유하며 위계에 따른 여백 예외를 두지 않습니다. Incorrect Usages는 고정 제목·중앙 정렬·기존 적색 패널을 사용합니다. 첫 항목이 Subsection이거나 문서 안의 앵커가 중복되면 저장을 거부합니다.

| 대상 | 합의한 기본값과 범위 |
| --- | --- |
| 컨테이너 | 섹션에 기본 Grid 하나. 여러 컨테이너를 순서대로 추가 가능 |
| Grid | 최대 1~5열, 기본 3열. Size는 X Small / Small / Medium / Large / X Large, 기본 Medium |
| Grid Size | 목표 카드 너비 240 / 320 / 480 / 720 / 1440px. 최소 너비 240 / 240 / 320 / 320 / 320px. 공통 반응형 규칙, 좌우 12px·상하 24px 간격 |
| Carousel | 기본 일반형, 이름 선택형도 지원. 높이 Medium, 무한 반복 On, 자동 재생 Off, 재생 간격 3초 |
| Sticky | 스크롤 전환형 기본. 개별 고정형도 지원. 좁은 화면에서는 고정 해제 |
| 카드 판형 | 기본 4:3. 공통 `CARD_RATIO_OPTIONS`의 11개 비율을 사용하고 원본 비율 선택은 제외 |
| 이미지 | contain 기본, scale 80%. contain에서만 30~100% 조절, cover는 전체 영역 사용 |
| 캡션 | 기본 / 목록 / 명세 중 하나. 공통 제목·설명 선택, 목록은 제목·설명 행, 명세는 카드의 `specGroups[] → title? + items[] → label/value`. 그룹이 없으면 기존 `rows`를 제목 없는 한 그룹으로 읽음. 비어 있으면 표시하지 않음 |
| START | 상태만 표시. 일반 섹션은 없음, Incorrect Usages는 금지가 기본. 카드에서 없음·허용·금지로 재정의 |
| CENTER | 해당 디스플레이가 지원하는 전환만 표시. On/Off는 Off 기본, 일시적 조작 상태는 CMS에 저장하지 않음 |
| END | 다운로드·링크 이동·복사 등 실행 액션. 기본 없음 |
| 다운로드 | 없음 기본 / 카드 에셋 / 별도 등록. 섹션은 자기 컨테이너의 카드만 수집하며 뒤따르는 Subsection을 재귀 수집하지 않음 |
| 도판 색상 | 팔레트 색상 식별자 참조. `backgroundColor`·`foregroundColor`의 범위는 [10장의 색상 계약](../10-component-authoring.md#카드-도판-색상-계약)을 따름 |

**연결 범위**는 세 섹션 타입·Grid/Carousel/Sticky·세 캡션 타입·상태·개별/섹션 다운로드입니다. 디스플레이는 이미지, 이미지+가이드 Off/On, 레이아웃 그리드, 레이아웃 이미지 오버레이, 서체 굵기, 팔레트(스와치/로고 배경 비교), 단독 스와치, 로고 배경색 선택의 8종입니다. 이름 선택형 Carousel은 카드마다 선택 이름이 필요합니다. 서체 언어는 순서가 있는 목록이며 기본 국문·Medium, 굵기 전환을 끄면 고정 표본으로 표시합니다. 카드 배경색·전경색은 게시된 `brand-colors`를 선택합니다. 추가 END 액션은 순서가 있는 링크·복사 목록이며 다운로드 뒤에 표시합니다. 각 액션에 라벨과 링크 주소 또는 복사 내용을 입력합니다. 링크는 내부 경로·앵커·HTTP(S)만 허용합니다. CI 선택기·TypeSpecimen 편집은 후속입니다. 이미지와 별도 다운로드 파일은 기존 `application-images`·`brand-icons`·`brand-logos`를 참조합니다. 일반 첨부 파일·ZIP 업로드는 이번 범위에 없습니다.

팔레트는 `brand-color-groups.family`의 Primary·Supportive·Monotone 키로 게시된 그룹과 색상을 읽습니다. 키는 중복 등록할 수 없으며 Brand는 Primary+Supportive를 조합합니다. 기존 이름 매핑은 family가 없는 데이터의 호환 경로로만 남깁니다. 신규 그룹은 저장된 색상 순서를 따르고, 레거시 Supportive만 기존 정렬을 유지합니다. 디스플레이의 복사·색상 선택·초기화와 CMS 다운로드는 같은 END 액션 레이어에 합칩니다. 로고 배경색 선택에는 블랙·화이트 파일이 모두 필요합니다. 문서 본문은 `GuidelineDisplayFooter`와 제공된 public HD현대 로고를 사용합니다. 높이는 100dvh, 모바일 로고 너비는 80%입니다.

게시 조회·목차·초안 미리보기·검색·Agent·MCP·검수 투영·읽기 전용 콘텐츠 스냅샷은 sections만 읽습니다. 빈 배열도 구형 본문으로 되돌아가지 않습니다. 기본 Admin 편집과 저장 후 미리보기를 사용하며 Better Editor의 구형 블록 직접 선택은 제공하지 않습니다. 내부 복원 표식은 신규 저장 훅이 채우며 legacy·null·표식 없는 버전은 거절합니다.

#### 조회용 문서 위계

CMS의 `sections[]`는 평면 배열로 저장합니다. `sections/model.ts`의 `withSectionHierarchy`가 조회 시 다음 값을 계산하고, 본문 렌더러·목차·MCP·Agent 문서 읽기가 같은 규칙을 사용합니다. DB 필드나 편집 항목은 추가하지 않습니다.

| 조회 필드 | 규칙 |
| --- | --- |
| `id` | 저장된 섹션 ID. 없으면 anchor, 둘 다 없으면 배열 위치 기반 ID |
| `headingLevel` | Section·Incorrect Usages는 2, Subsection은 3 |
| `parentSectionId` | H2는 null, H3는 가장 가까운 앞선 H2의 ID |

섹션·컨테이너·카드 순서는 저장 순서를 유지합니다. Incorrect Usages도 H2 경계를 시작합니다. 첫 서브섹션의 저장은 기존 검증에서 거부하며, 검증 전 초안 조회에서는 없는 부모를 만들어 붙이지 않고 null로 표시합니다. 왼쪽 TOC는 챕터(depth 0)·문서(depth 1)·메인 섹션(depth 2)까지만 표시합니다. Subsection(depth 3)은 본문과 조회 위계에 유지하지만 TOC에서는 생략하며, 위치 추적도 표시된 메인 섹션 앵커만 사용합니다. 본문 DOM과 간격은 평면 계약을 유지합니다.

MCP 문서 응답은 `sections`만 반환하며 공개 읽기 모델의 `contentModel`은 항상 `sections`입니다. Agent 문서 읽기는 H1/H2/H3와 컨테이너·카드 경계를 텍스트에 보존합니다. 검색·검수용 기존 투영과 `referenceAssets: []` 정책은 유지합니다.

#### 공통 읽기 모델

```text
Repository → sourceDocument + paletteCatalog
                       ↓ toGuidelineReadDocument (순수 변환)
               GuidelineReadDocument
                 ├─ JSON → MCP
                 └─ formatGuidelineReadDocument → Agent 텍스트
```

CMS 저장·UI 계약은 `containers → cards → display`를 유지합니다. 조회 계약은 `sections → contentGroups → figures → visual`로 표현합니다. `contentGroups.layout`은 Grid/Carousel/Sticky의 활성 설정과 기본값을 담고, 각 Figure는 시각 자료·캡션·저작 상태·조작·실행 동작을 묶습니다. 카드 캡션은 문서 제목 단계를 만들지 않습니다.

- Repository는 게시·로케일·접근 제어와 관계 조회를 담당합니다. MCP와 Agent의 문서 관계 조회 깊이는 2이며, 필요한 팔레트도 같은 사용자·로케일의 접근 제어로 조회합니다.
- `toGuidelineReadDocument`가 위계·기본값·파일·팔레트·액션을 해석합니다. 원본을 수정하지 않고 비활성 CMS 입력을 제외하며, 읽을 수 없는 관계에 URL·색상을 추측해 넣지 않습니다. DB와 네트워크를 호출하지 않습니다.
- 기본 캡션은 제목·설명만 읽고 목록은 `rows`의 항목 제목(`label`)·설명(`value`)을 읽습니다. 명세는 카드의 `specGroups[]`를 조회 계약의 `caption.groups[]`로 연결하고, 선택 제목과 `items[]`의 속성(`label`)·값(`value`)을 보존합니다. 그룹이 등록되면 평면 `rows`는 비활성이고, 그룹이 없으면 기존 행을 제목 없는 한 그룹으로 읽습니다. Payload의 긴 버전 조회 별칭이 중첩 배열끼리 충돌하지 않도록 CMS에서는 그룹을 카드 직속에 저장합니다. 화면·MCP·Agent는 캡션 내부 그룹으로 읽습니다. 그룹 전체를 로케일별로 저장하며 그룹·항목 순서, 반복 라벨, 단위와 빈 값은 원문대로 전달합니다. 명세와 스펙의 계약 용어는 `specification`입니다. 그룹 제목은 figcaption 내부 문단이며 문서 헤딩 단계를 만들지 않습니다. 그룹형 캡션의 제목 영역과 첫 그룹 사이 및 그룹 사이 간격은 48px, 그룹 제목과 명세 행 사이 간격은 16px이며 공통 `structure/caption.module.css`가 소유합니다. 기본·목록·제목 없는 단일 명세의 기존 간격은 유지합니다.
- `usageStatus`는 저작자가 지정한 사용 상태이며 검수 결과가 아닙니다. 생략 시 Incorrect Usages는 `prohibited`, 나머지는 `none`입니다. 명시적인 `none`이 기본값보다 우선합니다.
- `controls`는 가이드 Off/On, 굵기, 배경색 선택을 `kind/label/target/defaultValue/options/effect`로 설명합니다. UI의 슬롯 배치를 바꾸지 않으며 현재 사용자 상태를 전달하지 않습니다.
- `actions`는 다운로드·유효한 링크·복사·초기화의 라벨과 대상을 담습니다. 도판의 동작과 캡션 명세는 분리합니다. 섹션 다운로드는 자기 카드의 파일만 담고 하위 섹션을 재귀 수집하지 않습니다. 이 명세는 실행 가능한 MCP 도구가 아닙니다.
- 출력기는 이미 해석된 읽기 모델만 표현합니다. 텍스트에는 H1/H2/H3·Figure·Caption·List·Specification을 표시하고 도판 설정·조작 정보는 JSON으로 보존합니다. 파일 내용은 자동으로 읽지 않습니다.
- 응답 길이는 전달 계층의 정책입니다. Agent는 기존 6,000자 제한을 유지하며 `truncated`, `totalContentLength`와 본문의 잘림 표시를 반환합니다. 공통 읽기 모델·포매터는 전체 내용을 유지합니다. MCP는 기존 문서 단위 페이지 정책을 사용합니다.

파일별 책임:

| 파일 | 책임 |
| --- | --- |
| `sections/schema.ts`·`display-schema.ts` | CMS 저장·검증 |
| `sections/model.ts` | 공통 타입·위계·파일 해석·자기 섹션 다운로드 |
| `domain/reading/read-document.ts` | `GuidelineReadDocument` 계약과 원본→문서 변환 |
| `domain/reading/read-visual.ts` | 활성 도판 입력과 지원 조작·동작 해석 |
| `domain/reading/format-document.ts` | 읽기 모델→텍스트 표현 |
| `sections/projection.ts` | 기존 검색·검수 투영 |
| `sections/render.tsx`·`display-render.tsx` | CMS→공통 표현 API 연결 |

공통 표현 컴포넌트에는 CMS 관계를 넘기지 않습니다. 기존 검색·검수 투영과 `referenceAssets: []` 정책은 유지합니다. 구조·정보 보존 테스트는 모델 이해도 개선률과 구분하며, 이해도는 별도 전후 평가로 확인합니다. 캡션 행은 배열 전체를 번역 단위로 삼습니다. 셀별 번역 테이블은 추가하지 않습니다.

검증은 `tests/int/guideline-sections-storage.int.spec.ts`에서 명시적으로 지정한 일회용 로컬 DB만 사용합니다. 저장·버전 조회·기본값·관계 해석·게시/초안 분리·편집 권한·잘못된 위계·필수 에셋·팔레트 연결을 검사합니다. 콘텐츠는 admin에서 작성하며 코드로 reference 페이지를 DB에 심지 않습니다.

## 3. 표면

- Page는 `components/guideline/pages/guideline-topic.tsx`에서 문서 헤딩 → `CmsGuidelineSections` → 푸터를 조합합니다. 구형 렌더 분기는 없습니다.
- Admin은 `sections/schema.ts`·`display-schema.ts`와 공통 `fields.ts`의 저장·검증 계약을 사용합니다.
- 검색·검수는 `sections/projection.ts`가 섹션 제목·설명·앵커·카드 캡션을 투영합니다. 카드 이미지는 자동 검수 근거가 아니며 `referenceAssets: []`를 유지합니다. 문서의 `headerImage`도 가이드라인 첫 화면 카드 썸네일이라 검수 참조 자산으로 싣지 않습니다.
- 목차는 챕터·문서·메인 섹션까지만 표시합니다. Subsection은 본문·공통 읽기 위계에만 유지합니다.

## 4. 의존

- CMS: [sections/schema.ts](../../src/features/guideline/sections/schema.ts), [display-schema.ts](../../src/features/guideline/sections/display-schema.ts), [fields.ts](../../src/features/guideline/sections/fields.ts)
- 표현: [sections/render.tsx](../../src/features/guideline/sections/render.tsx), [display-render.tsx](../../src/features/guideline/sections/display-render.tsx)
- 투영: [sections/projection.ts](../../src/features/guideline/sections/projection.ts), [checks/check-source.ts](../../src/features/guideline/checks/check-source.ts)
- 디스플레이 저작: [11](../11-widget-authoring.md), CI 수치·서체: [12](../12-ci-lockup-canon.md)

## 5. 검증과 접근

인증·데이터 접근은 [07](../07-security.md), 키보드·접근 가능한 이름은 [08](../08-accessibility-i18n.md), 스타일·컴포넌트 저작은 [09](../09-design-system.md)·[10](../10-component-authoring.md)를 따릅니다. DB 환경·마이그레이션·발행 상태 보존은 [AGENTS.md](../../AGENTS.md)가 소유합니다.

`GuidelineDocuments.test.ts`는 구형 필드 비노출·쓰기·복원 경계를, `tests/int/guideline-sections-storage.int.spec.ts`는 지정한 일회용 로컬 DB의 실제 저장·버전·복원·권한을 검사합니다. 공통 읽기 모델과 포매터는 `domain/reading` 테스트, 화면은 `sections/render.test.tsx`와 `components/guideline/structure` 테스트로 검증합니다. 검증 완료 범위와 실행 명령은 각 변경의 결과에 기록합니다.
