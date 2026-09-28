# Guideline

가이드라인의 설정과 스타일을 어느 계층에서 정의할지 판단하는 명세입니다. 신규 CMS 계약과 첫 연결 범위는 §2.6이 소유합니다. §2.1~2.5의 블록 모델은 기존 콘텐츠를 위한 호환 계약입니다. 문서 생명주기는 [03](../03-data-lifecycle.md), 도메인 경계는 [04](../04-domain-model.md), 디자인 토큰은 [09](../09-design-system.md)가 소유합니다.

## 1. 목적

저작자가 한 토픽 안에 설명·도판·사례를 조합하고, 사용자가 같은 기준을 화면과 검색에서 읽게 합니다. 설정을 추가할 때 값이 영향을 주는 범위를 먼저 정합니다. 카드 하나의 상태를 블록에 두거나, 판의 크기를 위젯이 다시 정하지 않습니다.

## 2. 핵심 계약

### 2.1 콘텐츠 계층과 화면 위계

```text
챕터 — 토픽을 묶는 분류, 독립 페이지 없음
└─ 토픽 문서 — URL, 히어로, h1
   └─ blocks[] — 순서가 있는 동급 블록 목록
      ├─ section — 앵커·목차를 가진 블록, h2
      ├─ base — 일반 블록, h2
      ├─ overview — 제목·배치·줄 높이 프리셋, h2
      └─ examples — 제목·배치·줄 높이 프리셋, h2
         └─ cards[]
            ├─ ratio — 판 비율
            ├─ mark — 개별 사례의 선택 표식
            ├─ display[0] — 정적 이미지 또는 위젯 하나
            └─ caption — 선택 제목·설명과 배치
```

트리의 `cards[]`는 네 블록 모두에 적용됩니다. **section 안에 base가 중첩되는 구조는 아닙니다.** 이름이 달라도 네 블록은 `CardBlock` 어댑터를 통해 같은 `GuidelineSection`으로 렌더합니다. 따라서 일반 블록의 제목을 자동으로 h3로 낮추지 않습니다. 카드 캡션은 `figcaption`이고, 제목도 문서 헤딩이 아닌 문단입니다.

Figma의 `Section Heading`(61:3503)은 코드의 토픽 히어로입니다. `Overview Section`(117:882)·`Incorrect Usage Section`(136:213)이라는 이름만으로 코드의 `section` 타입이나 중첩 관계를 결정하지 않습니다. 코드에서 `section`의 차이는 앵커와 목차입니다.

제목·설명은 카드 유무와 독립적으로 표시합니다. 카드가 없는 텍스트 전용 블록에는 카드 프레임을 만들지 않습니다. 제목이 있는 `section`은 카드가 없어도 앵커와 목차를 유지합니다. 제목·설명·유효한 디스플레이가 모두 없으면 블록을 숨깁니다.

격자는 `columns` 1~4열(기본 2열)로 카드 너비를 균등 배분하고 높이는 카드 비율로 계산합니다. 마지막 행은 같은 너비를 유지하며 첫 열부터 채웁니다. 모바일은 1열이며, 콘텐츠 폭에 따른 열 수 제한은 [디자인 시스템 §7](../09-design-system.md)이 소유합니다. `rowHeight`는 캐러셀에서만 노출·적용하고 그리드의 기존 값은 보존합니다.

### 2.2 저작 설정의 소유권

| 소유 계층 | 설정·책임 | 경계 |
| --- | --- | --- |
| 토픽 문서 | 챕터 관계, 제목·슬러그·히어로 이미지, 발행 상태, 블록 순서, 문서 rules | 카드의 Mark·비율을 일괄 지정하지 않음 |
| 블록 | 제목·설명, 카드 목록, `layout`, `columns`, `rowHeight`, 블록 rules | 개별 카드 상태·이미지 크롭을 소유하지 않음 |
| section 추가 속성 | `anchor`, 목차 항목 | 다른 블록의 부모가 아님 |
| 카드 | `ratio`, `mark`, 디스플레이 하나, 캡션 | 줄 높이·열 수·페이지 폭을 다시 정하지 않음 |
| 디스플레이 | 이미지·위젯의 콘텐츠와 입력값 | 카드 캡션·Mark·블록 rules를 소유하지 않음 |
| 캡션 | 선택 제목·설명, `below` 또는 `overlay` 배치 | 카드 판의 폭을 늘리지 않음 |

블록의 `assetDownload` 필드는 현재 저장되지만 렌더러가 소비하지 않습니다. 동작하는 설정으로 간주하지 않습니다(§2.5). 프리셋 블록은 별도 구조가 아니라 `registry.ts`의 고정 제목·기본 배치입니다. 숨긴 기본값과 렌더 시 강제되는 값도 구분합니다. 제목은 렌더러가 고정하지만 배치·줄 높이는 저장된 값을 읽습니다.

### 2.3 Mark 계약과 이관

| 값 | 의미 | 화면 |
| --- | --- | --- |
| `none`, 생략, `null` | 판정 표식 없음 | 아무 표식도 그리지 않음 |
| `do` | 권장 사례 | ✓와 접근 가능한 이름 Do |
| `ok` | 허용 사례 | △와 접근 가능한 이름 OK |
| `dont` | 금지 사례 | ✕와 접근 가능한 이름 Don't |

옵션은 `cards/schema.ts`, 렌더링은 `cards/mark.tsx`가 소유합니다. 새 카드의 기본값은 `none`입니다. 격자·캐러셀 모두 같은 섹션에서 서로 다른 값을 사용할 수 있습니다. Mark는 디스플레이나 캡션 배치와 독립이며 오버레이 캡션 위에도 표시됩니다. 표식의 모양·위치는 이번 이관에서 기존 스타일을 유지합니다.

Mark는 **저작자가 붙이는 사례 표식**입니다. 검수 Rule·검수 실행 결과·이미지의 정답 여부를 자동 생성하지 않습니다.

이관은 새 카드 필드 생성 → 기존 블록 값을 각 카드에 복사 → 이전 블록 필드 제거 순서입니다. `section`·`base`·`overview`·`examples`의 본문 테이블과 버전 테이블을 모두 처리합니다. 이미지 관계·캡션·순서·카드 ID·발행 상태는 바꾸지 않습니다. 카드가 없는 블록은 이관할 표시 대상이 없습니다.

역방향 이관은 한 블록의 카드들이 같은 Mark일 때만 가능합니다. 서로 다른 값을 하나로 합치면 정보가 사라지므로, 혼합 값이 있으면 롤백을 중단합니다. 운영에 적용할 때는 커밋된 마이그레이션을 먼저 실행하고 새 애플리케이션을 시작합니다. 자동 스키마 push는 공유 환경에서 사용하지 않습니다.

### 2.4 스타일의 소유 위치

| 대상 | 단일 출처 | 적용 범위 |
| --- | --- | --- |
| 색·폰트·모서리 토큰 | `src/app/(frontend)/theme.css` | 앱 전체. 개별 사례 때문에 전역 값을 바꾸지 않음 |
| 기본 본문·rem | `src/app/(frontend)/styles.css` | 앱 기본값 |
| 셸·스크롤·main | `src/components/global/section-layout.tsx` | 가이드라인 외 화면도 공유 |
| 본문 최대 폭·가로 패딩 | `src/components/shared/content-frame.tsx` | `padded`는 도판, `heading`은 블록 제목 |
| 섹션 간격 | `src/components/guideline/guideline-sections.tsx` | 섹션 목록 |
| 카드 줄 높이·격자 간격 | `src/components/guideline/sections/row-height.ts`·`grid-container.tsx`·`carousel-container.tsx` | 콘텐츠 배치 |
| 산문의 역할별 크기·굵기·행간·자간 | `src/components/guideline/typography/guideline-typography.ts` | 제목·블록 설명·캡션·스펙. 도판 내부 표본은 제외 |
| 토픽·블록 헤딩 | `src/components/guideline/typography/guideline-header.tsx` | h1·h2 의미와 텍스트 단계 |
| 블록 설명 | `src/components/guideline/typography/guideline-description.tsx` | 설명의 기본 서식 |
| 카드 프레임·Mark | `cards/component.tsx`·`cards/mark.tsx` | 비율·클리핑·표식의 위치 |
| 동적 디스플레이의 크기 | `cards/component.tsx`와 각 위젯 루트 | 카드 영역을 채움. 자체 고정 크기·내부 스크롤·전체 자동 축소 없음 |
| 하단·오버레이 캡션 | `cards/caption/component.tsx` | 크기·굵기·행간·패딩·텍스트 폭 |
| 2열 스펙 표 | `src/components/guideline/typography/spec-table-converters.tsx` | 라벨·값 목록. 다른 열 수는 기본 표 |
| 브랜드 표본 면 | `cards/displays/dynamics/surface.ts` | 테마 면과 규정에 고정된 브랜드 면 구분 |
| 위젯 판독·컨트롤 값 | `cards/displays/dynamics/readout.ts` | 캡션과 별개의 도판 내부 텍스트 |

위 표의 가이드라인 상대 경로는 `src/features/guideline/` 기준입니다. 값의 사본을 별도 토큰 파일에 만들지 않습니다. 전역 토큰 변경, 가이드라인 내 역할 변경, CMS 콘텐츠 편집은 서로 다른 작업입니다.

### 2.5 위계 조사 결과 — 2026-09-08

범위는 현재 가이드라인의 페이지·공통 렌더러·4종 블록·디스플레이 레지스트리(정적 1종, 위젯 19종)·캡션·투영·목차·토큰입니다. 아래 수치는 **조사 시점의 비교 기록**이며 새 고정 스타일 규칙이 아닙니다. 전체 CMS 콘텐츠나 모든 위젯의 모든 입력 조합을 시각 검증한 결과는 아닙니다.

| 항목 | 확인된 상태·문제 | 처리 또는 다음 결정 |
| --- | --- | --- |
| Mark 소유권 | 블록의 한 값이 모든 카드로 전달됨 | 이번 변경에서 카드로 이동, 기본 없음, 기존 본문·버전 값 보존 |
| 문서의 계층 | 문서에는 block h3·챕터 페이지·Section 전용 평문이 남아 있었음 | 실제 h1/h2·독립 챕터 페이지 없음·카드 캡션 투영으로 문서 수정 |
| 헤딩 크기 | 정리 전 토픽 60px, 블록 24px. Figma 토픽 64px(61:3509), 오버뷰·Incorrect Usage 56px(117:884·136:216) | 2차 정리에서 기존 토큰으로 토픽 60px/600/100%, 블록 48px/600/125%. Figma 수치의 일대일 복제는 아님 |
| 설명과 캡션의 위계 | 정리 전 블록 설명이 하위 캡션보다 작았음 | 블록 설명 20px/400/155%, 하단 캡션 20px/500/155%, 오버레이 16px/500/155%. 공통 역할 정의에 연결 |
| 스펙 표 | 라벨 600, 행간이 캡션 배치에서 상속돼 달랐음. 기존 조사 기록의 14px와 달리 현재 제품의 `text-sm`은 13px | 독립된 밀도 유지. 라벨 500·값 400·행간 155%로 명시, 두 캡션 배치에서 동일하게 표시 |
| 모서리 | 카드 `rounded-3xl`은 현재 48px. Figma 사례 카드는 24px(136:229), 바깥 패널은 32px(136:214) | 카드·패널 역할별 토큰 단계 선택 필요. 전역 radius를 일괄 변경하지 않음 |
| Mark 모양·위치 | 코드 32px 원·16px 문자·우상단 12px, Figma 36px 원·좌상단 24px(136:234). OK도 코드 △와 Figma ○가 다름 | 소유권 이관과 분리해 아이콘·크기·위치 스펙 결정 |
| 세로 간격 | 블록 스택 288px, 프레임 상하 32px, 블록 내부 gap 48px가 합산됨. 제목 콘텐츠 끝부터 판 시작까지는 32+48+32=112px | 섹션 패딩과 내부 gap의 기준점을 명시한 뒤 값 결정. Figma 오버뷰는 바깥 상하 120px·내부 gap 48px(117:882) |
| 가로 기준 | 제목은 전체 블록 왼쪽 패딩, 판은 최대 폭 프레임 안에 정렬. 줄 높이는 주석의 프레임 비례와 달리 실제 `vw`로 계산 | 제목 왼쪽 패딩은 기존 사용자 결정 유지. 판 높이의 기준을 viewport 또는 콘텐츠 폭 중 하나로 확정 |
| 격자의 큰 가로 카드 | 1280px 뷰포트·1015px 본문에서 `high`·16:9 판이 1365px로 렌더되는 것을 재현 | 1차 정리에서 격자 콘텐츠 폭에 맞춰 비율 유지 축소. 같은 조건에서 판 951px·높이 약 535px, 가로 넘침 없음 |
| 텍스트 전용 섹션 | 카드가 없으면 제목·설명도 숨겨져 목차와 본문이 불일치했음 | 1차 정리에서 제목·설명을 독립 표시. 제목이 있는 섹션의 앵커도 유지 |
| 에셋 다운로드 | 블록 스키마의 `assetDownload`를 현재 `CardBlock`이 소비하지 않음 | 렌더 연결 또는 설정 제거가 필요. 다른 블록 기능과 섞어 자동 구현하지 않음 |
| Incorrect Usage 구성 | 현재 프리셋에는 회색 외곽 패널·중앙 헤딩·스튜디오 Callout·고정 3열 조합이 없음 | 개별 스타일 옵션을 늘리기 전에 별도 블록 프리셋으로 표현할지 결정 |
| Figma 스타일 연결 | 조사한 토픽·오버뷰·Incorrect Usage 제목의 `textStyleId`가 비어 있음 | 공유 텍스트 스타일과 코드 역할의 대응을 정하면 노드별 값의 변동을 추적하기 쉬움 |
| 위젯 컨트롤 연결 | 명세 분리 전에는 본문 Controller 연결이 없었음 | Type Language·Type Hierarchy·Layout Grid Overlay는 카드별 스코프와 하단 컨트롤러로 연결. 나머지 위젯은 후속 이관 |
| 위젯의 옛 캡션 | `WIDGET_CAPTION` 사용 예외가 layout-grid·stem-clear-space에 남아 있음 | 카드 캡션과 도판 내부 판독 중 어느 역할인지 분류한 뒤 정리. 전역 글자 크기 치환 대상에서 제외 |

우선 결정 순서는 **콘텐츠 계층 → 제목·설명·캡션·스펙의 텍스트 역할 → 컨테이너 폭과 세로 리듬 → 판·Mark 모양 → 프리셋 구성**입니다. 구조가 확정되기 전에 폰트·패딩 값을 전역 치환하지 않습니다.

1차 정리에서는 콘텐츠 표시 조건과 격자의 넘침을 수정했습니다. 다음 단계는 토픽 제목·블록 제목·블록 설명·캡션 제목·캡션 설명·스펙 라벨/값을 역할별로 비교하는 것입니다. 캡션의 Medium·155%와 제목의 왼쪽 패딩은 확정값으로 유지합니다. 그다음 블록 사이, 제목과 설명 사이, 헤딩 영역과 카드 사이, 카드 사이, 캡션 내부의 간격을 각각 정의합니다. 판·Mark와 Incorrect Usage 프리셋은 그 기준을 소비합니다.

2차 정리에서는 `guideline-typography.ts`에 산문 역할을 모으고 헤딩·richText·캡션·스펙 표를 연결했습니다. h1/h2·문단·dt/dd의 의미는 각각의 렌더러가 유지합니다. 서체·기본 크기 토큰은 전역 CSS, 역할 매핑은 가이드라인, 배치와 간격은 각 프레임이 소유합니다. 이제 남은 순서는 세로 간격 → 판·Mark 모양 → 프리셋 구성입니다.

3차 정리에서는 19종 동적 디스플레이에 **카드가 크기를 결정하고 디스플레이가 채우는 계약**을 일괄 적용합니다. `DisplayViewport`의 전체 자동 축소를 제거하고, 자체 고정 너비·높이·최소 크기·종횡비를 카드 영역에 맞추는 배치로 바꿉니다. 로고 자체 비율과 CI 치수·서체 표본 크기는 콘텐츠 규칙으로 남깁니다. 내용이 넘칠 때 내부 스크롤이나 전체 축소로 보정하지 않고 개별 위젯의 배치를 수정합니다.

이 단계는 모든 입력·카드 비율에서 내부 배치가 완성됐다는 뜻이 아닙니다. 작은 카드의 타입 입력·긴 문단·많은 아이콘·CI 치수 배치는 후속 조정 대상입니다. 크기 관련 기존 저장 필드(`logo-display.width/height`, `clearspace-overlay.scalePercent`, `type-scramble.panelHeight`)는 admin에서 숨기고 렌더에서 무시합니다. 저장 데이터·DB 스키마는 유지하며 정적 이미지의 크롭 정책과 카드 캡션·Mark 스타일도 유지합니다.

일반 카드와 동적 카드는 공통 Card 안에서 규격 정책을 구분합니다. 이번 세 위젯은 각 디스플레이 정의의 `ratio`이 공통 저작 비율보다 우선합니다(Type Language·Type Hierarchy 5:7, Layout Grid Overlay 3:2). 그리드는 열 수로 배정한 너비, 캐러셀은 줄 높이로 크기를 계산하며 모바일에서는 한 카드가 가용 폭을 채웁니다. DB의 기존 비율 값은 보존하며, 나머지 위젯의 규격 정책은 후속 작업입니다.

### 2.6 신규 CMS 계약 — 2026-09-21

```text
Document
├─ 제목·slug·챕터·게시 상태·문서 rules
├─ contentModel: legacy | sections
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

Section은 H2, Subsection은 앞선 메인 섹션에 속하는 H3입니다. CMS에서는 같은 배열에서 편집하고, CMS·레퍼런스·플레이그라운드 모두 출력도 평면으로 유지합니다. 레이아웃 책임과 간격은 [09 §7](../09-design-system.md#7-공통-셸과-프레임-골격)이 소유하며 위계에 따른 여백 예외를 두지 않습니다. Incorrect Usages는 고정 제목·중앙 정렬·기존 적색 패널을 사용합니다. 첫 항목이 Subsection이거나 문서 안의 앵커가 중복되면 저장을 거부합니다.

| 대상 | 합의한 기본값과 범위 |
| --- | --- |
| 컨테이너 | 섹션에 기본 Grid 하나. 여러 컨테이너를 순서대로 추가 가능 |
| Grid | 최대 1~5열, 기본 3열. Size는 X Small / Small / Medium / Large / X Large, 기본 Medium |
| Grid Size | 목표 카드 너비 240 / 320 / 480 / 720 / 1440px. 최소 너비 240 / 240 / 320 / 320 / 320px. 공통 반응형 규칙, 좌우 12px·상하 24px 간격 |
| Carousel | 기본 일반형, 이름 선택형도 지원. 높이 Medium, 무한 반복 On, 자동 재생 Off, 재생 간격 3초 |
| Sticky | 스크롤 전환형 기본. 개별 고정형도 지원. 좁은 화면에서는 고정 해제 |
| 카드 판형 | 기본 4:3. 공통 `CARD_RATIO_OPTIONS`의 11개 비율을 사용하고 원본 비율 선택은 제외 |
| 이미지 | contain 기본, scale 80%. contain에서만 30~100% 조절, cover는 전체 영역 사용 |
| 캡션 | 기본 / 목록 / 명세 중 하나. 공통 제목·설명 선택, 목록은 제목·설명 행, 명세는 라벨·값 행. 비어 있으면 표시하지 않음 |
| START | 상태만 표시. 일반 섹션은 없음, Incorrect Usages는 금지가 기본. 카드에서 없음·허용·금지로 재정의 |
| CENTER | 해당 디스플레이가 지원하는 전환만 표시. On/Off는 Off 기본, 일시적 조작 상태는 CMS에 저장하지 않음 |
| END | 다운로드·링크 이동·복사 등 실행 액션. 기본 없음 |
| 다운로드 | 없음 기본 / 카드 에셋 / 별도 등록. 섹션은 자기 컨테이너의 카드만 수집하며 뒤따르는 Subsection을 재귀 수집하지 않음 |
| 도판 색상 | 팔레트 색상 식별자 참조. `backgroundColor`·`foregroundColor`의 범위는 [10장의 색상 계약](../10-component-authoring.md#카드-도판-색상-계약)을 따름 |

**연결 범위**는 세 섹션 타입·Grid/Carousel/Sticky·세 캡션 타입·상태·개별/섹션 다운로드입니다. 디스플레이는 이미지, 이미지+가이드 Off/On, 레이아웃 그리드, 레이아웃 이미지 오버레이, 서체 굵기, 팔레트(스와치/로고 배경 비교), 단독 스와치, 로고 배경색 선택의 8종입니다. 이름 선택형 Carousel은 카드마다 선택 이름이 필요합니다. 서체 언어는 순서가 있는 목록이며 기본 국문·Medium, 굵기 전환을 끄면 고정 표본으로 표시합니다. 카드 배경색·전경색은 게시된 `brand-colors`를 선택합니다. 추가 END 액션은 순서가 있는 링크·복사 목록이며 다운로드 뒤에 표시합니다. 각 액션에 라벨과 링크 주소 또는 복사 내용을 입력합니다. 링크는 내부 경로·앵커·HTTP(S)만 허용합니다. CI 선택기·TypeSpecimen 편집은 후속입니다. 이미지와 별도 다운로드 파일은 기존 `application-images`·`brand-icons`·`brand-logos`를 참조합니다. 일반 첨부 파일·ZIP 업로드는 이번 범위에 없습니다.

팔레트는 `brand-color-groups.family`의 Primary·Supportive·Monotone 키로 게시된 그룹과 색상을 읽습니다. 키는 중복 등록할 수 없으며 Brand는 Primary+Supportive를 조합합니다. 기존 이름 매핑은 family가 없는 데이터의 호환 경로로만 남깁니다. 신규 그룹은 저장된 색상 순서를 따르고, 레거시 Supportive만 기존 정렬을 유지합니다. 디스플레이의 복사·색상 선택·초기화와 CMS 다운로드는 같은 END 액션 레이어에 합칩니다. 로고 배경색 선택에는 블랙·화이트 파일이 모두 필요합니다. 신규 본문은 `GuidelineDisplayFooter`와 제공된 public HD현대 로고를 사용합니다. 높이는 100dvh, 모바일 로고 너비는 80%입니다. 기존 본문은 기존 푸터를 유지합니다.

기존 문서는 `contentModel=legacy`를 기본으로 기존 `blocks`를 읽습니다. 편집자가 `sections`를 선택하면 신규 본문만 읽으며 빈 배열이어도 기존 본문으로 되돌아가지 않습니다. 기존 테이블·콘텐츠를 삭제하거나 자동 전환하지 않습니다. 게시 조회·목차·초안 미리보기·검색·Agent·MCP·검수 투영·읽기 전용 콘텐츠 스냅샷은 모두 선택한 본문을 따릅니다. 신규 배열은 기본 Admin 편집과 저장 후 미리보기를 사용하며 Better Editor의 블록 직접 선택은 이 단계에 포함하지 않습니다.

#### 조회용 문서 위계

CMS의 `sections[]`는 평면 배열로 저장합니다. `sections/model.ts`의 `withSectionHierarchy`가 조회 시 다음 값을 계산하고, 본문 렌더러·목차·MCP·Agent 문서 읽기가 같은 규칙을 사용합니다. DB 필드나 편집 항목은 추가하지 않습니다.

| 조회 필드 | 규칙 |
| --- | --- |
| `id` | 저장된 섹션 ID. 없으면 anchor, 둘 다 없으면 배열 위치 기반 ID |
| `headingLevel` | Section·Incorrect Usages는 2, Subsection은 3 |
| `parentSectionId` | H2는 null, H3는 가장 가까운 앞선 H2의 ID |

섹션·컨테이너·카드 순서는 저장 순서를 유지합니다. Incorrect Usages도 H2 경계를 시작합니다. 첫 서브섹션의 저장은 기존 검증에서 거부하며, 검증 전 초안 조회에서는 없는 부모를 만들어 붙이지 않고 null로 표시합니다. 목차는 부모 아래에 서브섹션 목록을 중첩하지만 본문 DOM과 간격은 평면 계약을 유지합니다.

MCP 문서 응답은 `contentModel`에 해당하는 `sections` 또는 `blocks`만 반환합니다. 비활성 본문은 응답에서 생략하며 DB에서 삭제하지 않습니다. Agent 문서 읽기는 H1/H2/H3와 컨테이너·카드 경계를 텍스트에 보존합니다. 검색·검수용 기존 투영과 `referenceAssets: []` 정책은 유지합니다.

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
- 기본 캡션은 제목·설명을 구분하고 비활성 `rows`를 제외합니다. 목록은 항목 제목(`label`)·설명(`value`), 명세는 속성(`label`)·값(`value`)의 대응과 저장 순서를 보존합니다. 명세와 스펙의 계약 용어는 `specification`입니다. 단위와 빈 값은 원문대로 전달합니다.
- `usageStatus`는 저작자가 지정한 사용 상태이며 검수 결과가 아닙니다. 생략 시 Incorrect Usages는 `prohibited`, 나머지는 `none`입니다. 명시적인 `none`이 기본값보다 우선합니다.
- `controls`는 가이드 Off/On, 굵기, 배경색 선택을 `kind/label/target/defaultValue/options/effect`로 설명합니다. UI의 슬롯 배치를 바꾸지 않으며 현재 사용자 상태를 전달하지 않습니다.
- `actions`는 다운로드·유효한 링크·복사·초기화의 라벨과 대상을 담습니다. 도판의 동작과 캡션 명세는 분리합니다. 섹션 다운로드는 자기 카드의 파일만 담고 하위 섹션을 재귀 수집하지 않습니다. 이 명세는 실행 가능한 MCP 도구가 아닙니다.
- 출력기는 이미 해석된 읽기 모델만 표현합니다. 텍스트에는 H1/H2/H3·Figure·Caption·List·Specification을 표시하고 도판 설정·조작 정보는 JSON으로 보존합니다. 파일 내용은 자동으로 읽지 않습니다.
- 레거시 문서는 `contentModel=legacy`와 기존 `blocks` 필드를 유지합니다. 기존 블록 평문은 변환 단계에서 `text`로 계산합니다. JSON과 텍스트 모두 이 호환 모델을 읽으며 신규 Figure 구조로 강제 변환하지 않습니다.
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

- **Page**: 토픽 서비스 → `GuidelineTopic` → `GuidelineSections` → `renderBlock` → `CardBlock` → `GuidelineSection` → `SectionContents` → `GridContainer`/`CarouselContainer` → `GuidelineCard` → 디스플레이·캡션 순서입니다. 셸은 `main`, 토픽은 `article`, 각 블록은 h2 제목을 가진 영역을 구성합니다. 제목 없는 블록에는 헤딩이 없습니다.
- **Admin**: `registry.ts`가 네 블록 스키마를 만들고 `cards/schema.ts`가 공통 카드 필드를 제공합니다. Mark는 각 카드의 `판정 표식`, 캡션 배치는 캡션 그룹에서 편집합니다.
- **검색·AI·검수**: `blocks/projection.ts`가 제목·설명·앵커·카드 캡션을 평문으로 조립합니다. 검수 규칙의 출처는 문서와 루트 블록입니다. Mark와 카드 이미지를 검수 결과나 참조 자산으로 자동 변환하지 않습니다.
- **목차**: `section` 타입의 제목·앵커에서만 항목을 만듭니다. 제목 없는 도판과 일반 블록은 목차 항목을 만들지 않습니다. 텍스트 전용 섹션도 같은 조건으로 본문과 목차에 표시합니다.

## 4. 의존

- 스키마·기본값: [`blocks/registry.ts`](../../src/features/guideline/blocks/registry.ts), [`blocks/fields.ts`](../../src/features/guideline/blocks/fields.ts), [`cards/schema.ts`](../../src/features/guideline/cards/schema.ts)
- 표현: [`blocks/card-block.tsx`](../../src/features/guideline/blocks/card-block.tsx), [`cards/component.tsx`](../../src/features/guideline/cards/component.tsx), [`cards/caption/component.tsx`](../../src/features/guideline/cards/caption/component.tsx)
- 투영: [`blocks/projection.ts`](../../src/features/guideline/blocks/projection.ts), [`checks/collect-guideline-check-sources.ts`](../../src/features/guideline/checks/collect-guideline-check-sources.ts)
- 위젯 저작: [11](../11-widget-authoring.md), CI 도판의 수치·서체: [12](../12-ci-lockup-canon.md)
- 디자인 비교: [오버뷰](https://www.figma.com/design/4zXBMnMCPay346ohMBrMFA/HD_LBS_UI?node-id=117-882), [하단 캡션](https://www.figma.com/design/4zXBMnMCPay346ohMBrMFA/HD_LBS_UI?node-id=131-272), [Incorrect Usage](https://www.figma.com/design/4zXBMnMCPay346ohMBrMFA/HD_LBS_UI?node-id=136-213)

## 5. 크로스커팅

인증·데이터 접근은 [07](../07-security.md), 키보드·접근 가능한 이름은 [08](../08-accessibility-i18n.md), 스타일과 컴포넌트 저작은 [09](../09-design-system.md)·[10](../10-component-authoring.md)를 따릅니다. DB 환경·마이그레이션·발행 상태 보존은 [AGENTS.md](../../AGENTS.md)가 소유합니다.

카드별 Mark 조합과 기본값은 `cards/component.test.tsx`·`blocks/fields.test.ts`, 제목 의미는 `guideline-header.test.tsx`, 평문은 `blocks/projection.test.ts`, 팔레트 사용은 `visual-vocabulary.test.ts`가 검증합니다. 팔레트 검사 통과는 간격·모서리·타이포 위계나 Figma 일치까지 검증했다는 뜻이 아닙니다.

이번 조사·이관의 검증 기록(Node.js 22.23.2):

- `pnpm exec vitest run src/features/guideline` — 33개 파일, 533개 테스트 통과.
- `pnpm typecheck`, `pnpm check` — 통과.
- `npx react-doctor@latest --verbose --scope changed` — 기존과 같은 66점, 기존 진단 38건.
- `PAYLOAD_DB_PUSH=false pnpm payload migrate` / `PAYLOAD_DB_PUSH=false pnpm payload migrate:down` — 별도 `DATABASE_URL`을 지정한 임시 로컬 `mark_verify` DB에서 이관·복원·재이관 확인. 네 블록과 버전 이력의 16개 카드에 표식 복사, 캡션·순서·ID·발행 상태 보존을 확인. 혼합 Mark가 있는 버전 이력의 롤백은 의도대로 실패하고 데이터는 보존됨.
- 실제 공통 컴포넌트의 별도 브라우저 미리보기에서 1280px·390px, 격자·캐러셀의 혼합 Mark, 오버레이 위 표식 표시를 확인.

DB 쓰기는 임시 로컬 `mark_dev`·`mark_verify`에만 수행했습니다. 공유 stage·운영 DB와 CMS 콘텐츠는 변경하지 않았습니다. 전체 프로덕션 빌드와 모든 실제 콘텐츠의 화면 검증은 이번 검증 범위에 포함하지 않았습니다.

후속 1차 정리 검증(Node.js 22.23.2): `pnpm exec vitest run src/features/guideline` 535개 테스트, `pnpm typecheck`, `pnpm check` 통과. React Doctor는 기존과 같은 66점·38건입니다. 공통 렌더러 미리보기에서 390px·768px·1280px의 11개 카드 비율과 격자 폭 제한, 텍스트 전용 블록을 확인했습니다. 이 후속 변경은 DB에 쓰지 않습니다.

2차 정리 검증(Node.js 22.23.2): `pnpm exec vitest run src/features/guideline src/components/ui/typography.test.ts` 35개 파일·550개 테스트 통과. `pnpm typecheck`, `pnpm check` 통과, React Doctor는 기존 66점·38건입니다. 공통 컴포넌트 미리보기에서 1280px·390px의 실제 글자 크기·굵기·행간, 타입 견본의 긴 입력과 내부 스크롤 없음, 가로 2000px 도판의 비율 유지 축소를 확인했습니다. 전체 CMS 콘텐츠·모든 위젯 입력 조합의 화면 검증이나 프로덕션 빌드는 수행하지 않았으며 DB 쓰기도 없습니다.


3차 정리 검증(Node.js 22.23.2): `pnpm exec vitest run src/features/guideline src/components/ui/typography.test.ts` 35개 파일·549개 테스트, `pnpm typecheck`, `pnpm check` 통과. 실제 뷰 17개의 조사용 데이터 미리보기에서 360×300·720×405 카드와 390px 모바일 폭을 확인했고, 실제 Card 렌더러의 타입 견본은 644×644 영역을 그대로 채웠습니다. 내부 자동 축소와 세로 스크롤 컨테이너는 없습니다. 타입 위계·언어 비교의 긴 내용과 좁은 컬러 셀의 넘침은 후속 배치 조정 대상으로 남습니다. 나머지 위젯은 소스 계약을 확인했으며 전체 CMS 콘텐츠와 프로덕션 빌드는 검증하지 않았습니다. `npx react-doctor@latest --verbose --scope changed`는 maintainability 분석 실패로 점수가 나오지 않아 이전 점수와 비교할 수 없습니다. 이번 단계는 DB에 쓰지 않습니다.


4차 정리에서는 Type Language·Type Hierarchy·Layout Grid Overlay의 표본·명세·조작을 분리했습니다. 디스플레이에는 표본과 직접 겹치는 가이드만 남기고, 명세는 규정·현재값에서 파생한 캡션으로 표시합니다. 기존 CMS 캡션은 함께 보존하며 DB에 쓰지 않습니다. 파생 명세는 CMS 본문의 평문 투영에 자동 추가되지 않습니다.

언어 비교는 렌더 시 언어별 카드로 나누며 각각 독립적으로 조작할 수 있습니다. 카드가 기존 Controller 스코프를 열고, 실제 디스플레이 영역을 하단 Helper에 등록합니다. 토픽의 Helper Provider·Slot도 다시 연결합니다. 다른 카드로 이동했다 돌아와도 편집값이 유지되고 초기화는 해당 카드에만 적용됩니다.

레이아웃 오버레이는 이미지별 원본 크기를 좌표 기준으로 사용하고 이미지와 격자를 같은 SVG 안에서 비율 유지 배치합니다. 표시 폭·높이 입력은 제거했습니다. 카드 비율이 달라도 원본 이미지를 자르거나 늘리지 않습니다. 패딩·갭은 셀 경계 안으로 제한하며, 캡션은 설정값과 제한 정책을 구분해 표시합니다.

### PR #309 React Doctor 대응 (2026-09-08)

React Doctor 0.9.13을 PR 대상 `origin/stage`(기준 커밋 `3d6e16c80`)와 비교했습니다. 기존 67점 보고서는 자동 선택된 `origin/main` 기준이므로 이 PR의 결과로 비교하지 않습니다. 동일 버전·범위의 재검사 결과는 **84점 유지, 오류 0개, 경고 9개 → 8개**입니다. JSON schemaVersion 3, complete=true, skippedChecks 없음으로 확인했습니다. 규칙 억제나 검사 설정 변경은 하지 않았습니다.

| 진단 | 대응 및 근거 |
| --- | --- |
| `layout-grid-overlay/view.tsx`의 컴포넌트·유틸리티 혼합 | 순수 좌표 계산을 `geometry.ts`로 옮기고 뷰와 기존 경계값 테스트가 가져오도록 수정했습니다. 재검사에서 해당 경고가 사라졌습니다. |
| `TypeLanguageCaptionTitle`의 비컴포넌트 export | 오탐으로 판단합니다. JSX로 사용하는 대문자 컴포넌트이며 컨트롤러 Hook을 읽어 현재 언어 문자열을 반환합니다. 언어 변경·초기화 테스트로 갱신을 확인했습니다. 문자열을 반환한다는 이유만으로 DOM이나 Hook 계약을 바꾸지 않습니다. |
| `Card`·`CardCaption`의 복잡도 2건 | 유지보수 관찰 항목으로 남깁니다. 정적/동적 콘텐츠, 표식, 캡션 배치의 명시적 표현 분기이며 조건부 Hook이나 반복 상태 갱신은 없습니다. 점수만 낮추기 위한 컴포넌트 분할은 하지 않았습니다. |
| 배열 연쇄 순회 2건 | 성능 병목으로 확인되지 않았습니다. 카드 목록과 5개 컨트롤 명세를 처리하며, 공식 규칙 지침도 실제 프로파일 증거가 있을 때 순회 병합을 권고합니다. 현재 읽기 쉬운 순서를 유지합니다. |
| 로고·클리어스페이스의 `<img>` 3건 | 원본 업로드 URL의 로고와 격자 레이어를 같은 영역에 contain 배치하는 경로입니다. 실제 이미지 용량·전송 병목은 측정하지 않았으므로 과대 전송 문제로 확정하지 않습니다. 이미지 최적화 경로 변경은 이 구조 수정에 포함하지 않았습니다. |

검증: Node.js 22에서 `pnpm exec vitest run src/features/guideline --reporter=dot` 37개 파일·582개 테스트, `pnpm typecheck`, `pnpm check` 통과. `npx -y react-doctor@0.9.13 --json --blocking none --yes --scope changed --base origin/stage --include-untracked`로 전후를 같은 범위·전체 카테고리에서 검사해 새 진단이 없음을 확인했습니다. 이 후속 변경은 계산 코드의 파일 분리로, 시각·데이터 계약은 유지하며 DB에 쓰지 않습니다. 프로덕션 빌드는 직전 서비스 반영 검증에서 통과했으며 이번 파일 분리 후에는 재실행하지 않았습니다.

### 컴포넌트 축척 정리 (2026-09-09)

```text
GuidelineTopic
├─ GuidelineTitleDisplay
├─ GuidelineSections
│  └─ GuidelineSection
│     ├─ SectionHeadings
│     └─ SectionContents
│        └─ GridContainer 또는 CarouselContainer
│           └─ GuidelineCard
│              ├─ CardDisplay
│              ├─ CardMark
│              └─ DisplayCaption → CardCaption
└─ GuidelineFooter
```

페이지는 구성을, 섹션은 제목과 콘텐츠의 관계를, 카드는 표본·표식·캡션의 관계를 보여줍니다. CMS 데이터는 기존 블록 타입과 필드를 유지하며 `CardBlock`·`prepareCards`가 화면 모델로 연결합니다. Provider·Helper와 편집 프리뷰는 이 표현 계층을 지원하는 별도 동작입니다.

`components/globals`는 역할별로 분리했습니다. 탐색은 `src/components/guideline/navigation`, 서체·설명·명세 표는 `src/components/guideline/typography`, 이미지는 `src/components/guideline/media`, 섹션 배치는 `src/components/guideline/sections`, 조작 상태·활성 영역 관측은 `features/guideline/providers`, Context 계약은 `contexts`, 소비 훅은 `hooks`, 하단 컨트롤 표현은 `src/components/guideline/controllers`가 소유합니다. 개별 위젯의 렌더 진입점과 브랜드 규정·계산은 `cards/displays`에 유지합니다. 인덱스도 `GuidelineOnboardDisplay`·`GuidelineChapters`·빈 `GuidelineFooter` 조합으로 읽힙니다.

푸터는 본문 다음의 빈 요소로 위치만 선언합니다. 임의 높이·메뉴·저작권 문구를 추가하지 않습니다. 설명 최대 폭 767px, 그리드 영역의 중앙 배치, 기존 카드 비율·캡션 모바일 전환·서버 데이터 조회·앵커·카드별 조작 상태를 유지합니다.

`add_guideline_grid_columns` 마이그레이션은 네 블록과 버전 테이블에 열 수 필드를 추가하며 기존 행의 기본값은 2열입니다. 카드·캡션·규정·발행 상태는 변경하지 않습니다. 공유 환경에는 마이그레이션 적용 후 애플리케이션을 배포합니다.

카드의 공통 구조는 Display·Mark·Actions·Caption입니다. 디스플레이별 분류·크기·다운로드 계약은 [위젯 저작 §8](../11-widget-authoring.md#8-디스플레이-공통-인터페이스)에 정의합니다.
