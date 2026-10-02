# 11. 디스플레이 저작

가이드라인 CMS는 `sections → containers → cards → display` 단일 저작 계약을 사용합니다. 구형 Payload 블록·위젯 레지스트리와 `definition.ts` 등록 방식은 제거했습니다. 새 표현은 기존 구조 컴포넌트와 섹션 어댑터를 확장합니다. 섹션·카드 기본값과 읽기 모델은 [Guideline](features/guideline.md), 시각 토큰은 [09](09-design-system.md), 표현 API 저작은 [10](10-component-authoring.md)가 소유합니다.

## 1. 추가 순서

1. 기존 표현과 계산을 먼저 확인합니다. 같은 데이터에 다른 도판을 그리는 경우 기존 컴포넌트를 재사용합니다.
2. 저장해야 하는 입력만 `src/features/guideline/sections/display-schema.ts`에 추가합니다. `display.type` 옵션과 해당 타입에서 보이는 필드·필수값 검증을 함께 정의합니다.
3. `src/components/guideline/structure/`의 표현 컴포넌트에 해석된 props를 전달하도록 `sections/display-render.tsx`를 연결합니다.
4. `domain/reading/read-visual.ts`에서 활성 입력·지원 조작·실행 동작을 읽기 모델로 해석합니다. 검색·검수에 필요한 저작 텍스트는 `sections/projection.ts`에서 처리합니다.
5. 실제 사용되는 표현 API의 컴포넌트 테스트를 추가하거나 확장하고, CMS로 렌더한 실제 가이드라인 페이지에서 좁은 폭·키보드·초기화·필수 관계 누락을 확인합니다.
6. 스키마가 바뀌면 타입 생성과 마이그레이션을 [AGENTS.md](../AGENTS.md)의 절차로 검증합니다. 콘텐츠 seed는 만들지 않습니다.

별도 디스플레이 등록 생성기나 저장·렌더 레지스트리는 추가하지 않습니다. 타입이 필요한 곳에는 현재 생성된 `GuidelineDocument`에서 유도한 `CmsCard['display']`를 사용합니다. 제거한 구형 Widget 생성 타입을 재사용하지 않습니다.

## 2. 파일 책임

| 파일·위치 | 책임 |
| --- | --- |
| `sections/schema.ts` | 섹션·컨테이너·카드·캡션·다운로드·액션 저장과 검증 |
| `sections/display-schema.ts` | 디스플레이 유형·선택한 유형의 입력·필수 관계 검증 |
| `sections/fields.ts` | 문서·섹션 Rule 관계와 안정적인 앵커 |
| `sections/model.ts` | CMS 타입·파일·색·다운로드 해석 |
| `sections/render.tsx` | CMS 섹션·카드 → 공통 표현 API |
| `sections/display-render.tsx` | 선택한 도판 입력 → 표현 컴포넌트 |
| `domain/reading/read-visual.ts` | 읽기 모델의 시각 자료·조작·실행 동작 |
| `components/guideline/structure/` | CMS 관계를 받지 않는 표현 컴포넌트와 카드 조작 |
| `cards/displays/dynamics/` | 현재 소비자가 쓰는 브랜드 규정·표본·계산·매니페스트 |

위 상대 경로는 `src/features/guideline/` 기준이며 `components/`는 `src/` 기준입니다. Payload config가 읽는 스키마·상수에는 React·이미지·브라우저 API를 import하지 않습니다. 계산은 순수 모듈에 두고 표현에서 소비합니다. 새 폴더·파일은 실제 책임이 생길 때만 만듭니다.

## 3. 현재 디스플레이

| display.type | 입력·표현 |
| --- | --- |
| `image` | 이미지·대체 텍스트·contain/cover·contain scale |
| `guide` | 이미지·가이드 이미지·선택 디머·Off/On |
| `layout-grid` | 표본·마진·가로/세로 거터 |
| `layout-overlay` | 원본 크기가 있는 래스터 이미지·레이아웃 가이드 |
| `type-weight` | 순서가 있는 언어·기본 굵기·굵기 조절 허용 |
| `palette` | 팔레트·스와치 또는 로고 배경 비교·선택 로고 관계 |
| `swatch` | 게시 브랜드 색상 |
| `logo-background` | 팔레트·Black/White 로고·배경 불투명도 |

선택하지 않은 유형의 숨은 입력은 파일 수집과 읽기 모델에 섞지 않습니다. 관계가 populate되지 않았거나 읽을 수 없으면 URL·색상·로고를 추측하지 않습니다. 필수 관계의 누락은 저장 경계에서 거절하고 렌더 경계에서는 유효한 표현만 만듭니다.

## 4. 섹션·카드·도판 경계

섹션은 제목·설명·앵커·규칙·컨테이너를 소유하고, 컨테이너는 배치를 소유합니다. 카드는 비율·사용 상태·도판 색상·다운로드·액션·캡션을 소유합니다. 디스플레이는 판 안의 콘텐츠와 지원하는 조작을 소유합니다.

도판 밖의 설명·명세는 카드 캡션이나 섹션 설명에 둡니다. 캡션은 figcaption이며 캡션·명세 그룹 제목은 문서 헤딩을 만들지 않습니다. 그룹형 명세는 `specGroups → items`를 사용하고 그룹이 없을 때만 기존 평면 `caption.rows`를 읽습니다.

START에는 상태, CENTER에는 해당 도판이 지원하는 전환, END에는 다운로드·링크·복사·초기화를 둡니다. 현재 사용자 조작 상태는 카드 인스턴스가 소유하며 CMS에 되쓰지 않습니다. 다른 카드의 상태를 바꾸거나 공통 Provider에 모든 상태를 넣지 않습니다. 조작값과 저작 규정값을 구분합니다.

카드·섹션 다운로드는 `none/assets/registered`로 선택합니다. 섹션의 assets는 자기 컨테이너의 카드 파일만 모으며 뒤따르는 Subsection을 재귀 수집하지 않습니다. 파일 저장은 `lib/object-url.ts`를 재사용합니다. 기존 CI SVG 내보내기 계산은 실제 소비자가 있는 범위에서만 유지하며 제거한 registry·카드 액션 경로를 복구하지 않습니다.

## 5. 크기·스타일·접근성

카드가 비율과 실제 크기를 정하고 도판은 주어진 영역을 채웁니다. 자체 고정 너비·높이·최소 크기·전체 자동 축소·내부 스크롤로 배치 오류를 덮지 않습니다. 로고 원본 비율·브랜드 치수·서체 표본 크기는 콘텐츠 규칙으로 유지합니다. 컨테이너 기준 단위가 필요하면 `containerType: 'size'`와 `cqw/cqh/cqmax`를 사용합니다.

규정 수치는 단일 상수를 공유하고 CMS 검증·조작 범위가 같은 규정을 읽도록 합니다. 브랜드 규정은 출처를 주석에 남깁니다. 색상은 [09](09-design-system.md)의 닫힌 토큰 규칙과 카드 도판 색상 계약을 따릅니다. 테마 면과 규정상 고정 브랜드 면을 구분하고 현재 공유 `dynamics/surface.ts` 어휘를 재사용합니다.

버튼·전환에는 접근 가능한 이름과 키보드 동작을 제공합니다. Slider의 이름은 손잡이에 연결하는 `aria-label/aria-labelledby/aria-valuetext`로 전달합니다. 실제 컨트롤이 필요하면 `components/shared/controller/`나 기존 앱 프리미티브를 먼저 재사용합니다. 제거한 Floating Helper·컨트롤러 레지스트리는 추가하지 않습니다.

## 6. 검색·검수·이력

`sections/projection.ts`는 섹션 제목·설명·앵커와 저작 캡션·액션 텍스트를 검색·검수용으로 투영합니다. 카드 이미지는 자동 검수 참조 자산이 아니며 `referenceAssets: []`를 유지합니다. 위젯별 이미지 투영으로 이 정책을 바꾸지 않습니다.

동결된 CheckSession의 과거 evidence는 `checks/check-source.ts`·`format-check-evidence.ts`의 읽기 계약으로 보존합니다. 과거 본문 전용 테이블과 legacy 버전은 별도의 파기 마이그레이션으로 삭제하며 신규 버전·업로드 자산은 보존합니다. `contentModel`은 숨긴 복원 판별 표식이고 legacy·null·표식 없는 버전은 복원할 수 없습니다. 기존 마이그레이션·drizzle 스냅샷을 삭제하지 않습니다.

## 7. 검증

개발용 mockup 라우트는 없습니다. 공통 표현 API는 컴포넌트 테스트로, 서비스 연결은 `sections/render.tsx`·`display-render.tsx`가 CMS로 렌더한 실제 가이드라인 페이지에서 검증합니다.

카드 비율·Grid/Carousel/Sticky·좁은 화면·긴 캡션·키보드·초기화·누락 관계를 필요한 범위에서 검사합니다. `tests/int/guideline-sections-storage.int.spec.ts`는 명시한 일회용 로컬 DB에서 저장·버전·복원·권한을 검사합니다. Node.js 22로 테스트·타입검사·빌드를 실행합니다.
