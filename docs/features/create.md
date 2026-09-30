# Create

## 1. 목적

브랜드 가이드라인에 맞는 디자인 산출물을 만듭니다.

의도한 방향은 가이드라인을 직접 읽는 대신 [Review](review.md)를 검증 skill로 쓰고, 이미지가 필요하면 [Image](image.md)를 호출하는 것입니다. 다만 아래 표시대로 현재 구현은 **템플릿 기반 조합(PNG, canonical HTML은 인쇄용 TIFF·PDF 추가)**까지이고, 규정 주입·검증·이미지 생성은 로드맵입니다.

Template·Graphic·Image가 Runtime Manifest부터 Artifact와 Export까지 공유하는 흐름은 [Studio](studio.md)를 정본으로 삼습니다. 이 문서는 Create 기능의 사용자 흐름과 Template 제작 규칙만 설명합니다.

## 2. 핵심 계약

### 현재 구현

조합과 HTML 렌더는 클라이언트에서 일어나며 서버 렌더링·이미지 생성·영속이 없습니다. 인쇄용 TIFF와 래스터 PDF는 브라우저가 렌더한 PNG를 서버에서 변환하고, 벡터 PDF는 브라우저가 만든 Vector Scene을 서버에서 직렬화합니다. 🔴 **벡터 PDF는 파일 전체가 CMYK 하나입니다** — 도형·선·판 배경뿐 아니라 사진까지 잉크로 바꾸고, 못 바꾸는 것이 하나라도 있으면 PDF를 만들지 않습니다. 한 파일에 RGB와 CMYK가 섞이면 Illustrator가 문서 모드를 하나 골라 나머지를 변환하면서 브랜드 정본 잉크값이 통째로 깨집니다. 사진은 컨테이너(JPEG) 없이 **raw 잉크 샘플 + FlateDecode**로 싣습니다 — CMYK JPEG은 APP14 Adobe 반전 관례를 물고 와 `/Decode` 선언 하나에 색이 뒤집힙니다. 래스터 PDF는 판을 구운 이미지 한 장이라 RGB이고, 그 파일 안에도 색 공간이 하나뿐입니다.

- `TemplateGenerator`(`src/components/studio/template/`): 카테고리별 드롭다운에서 published 템플릿을 선택하고 canonical HTML의 열린 텍스트 슬롯을 편집해 미리보기를 렌더.
- `studio-export`(`src/features/studio-export/`): Runtime Artifact를 Exporter가 변환할 수 있는 형식으로 투영하고 Admin `exportPolicy`로 좁혀 `StudioConfig.output`을 만듭니다. 실제 source adapter 존재 여부도 실행 직전 다시 검증합니다.
- `export-artifact.client`(`src/features/studio-export/services/`): Studio 출신과 무관하게 Raster·Vector·Video·Original Artifact를 형식별 adapter로 변환.
- `use-export`(`src/features/studio-export/hooks/`): 세 Studio의 형식 분기·진행·오류 상태·다운로드를 공유. Canvas는 형식을 해석하지 않고 Graphic runtime source만 Provider에 등록.
- `render-template-raster-stage.client`(`src/features/template-customization/runtime/`): 검증된 HTML을 Shadow DOM의 공용 export stage로 구성.
- `element-to-png.client`(`src/features/studio-export/adapters/`): 공용 export stage를 `html-to-image`로 PNG Blob으로 렌더.
- `export-print.service`(`src/features/studio-export/services/`): 넘어온 PNG의 픽셀 크기를 `findPrintOutputBlocker`로 확인한 뒤 TIFF는 Sharp로 CMYK/ICC 변환해 생성하고, 래스터 PDF는 그 PNG를 그대로 실음(`png-to-pdf.pdf-lib`). 벡터 PDF는 `export-vector-print.service`가 Vector Scene을 pdf-lib으로 직렬화하며, 도형 색은 `brand-colors`가 가진 **브랜드 정본 CMYK**를 쓰고(정본에 없는 색만 ICC로 계산) 사진은 `image-to-cmyk-samples`가 낸 잉크 샘플을 싣는다. 다 만든 뒤 `cmyk-only`가 CMYK 아닌 색이 남았는지 출구에서 검사한다.

- 입력: 발행된 템플릿의 canonical `html` + 열린 텍스트 슬롯 값. 슬롯은 `inputFormat`/`maxLength`/`maxLines`를 강제.
- 🔴 사용자 미리보기는 `<iframe sandbox="">`(opaque origin)이라 CSS `mask-image` fetch가 CORS 모드로 나갑니다. ACAO 헤더가 없는 업로드 파일 경로(`/api/brand-logos/file/*`)가 차단되면 mask가 전체 투명 처리돼 로고가 사라집니다. 어드민은 same-origin 렌더라 재현되지 않습니다.
- 출력: 클라이언트 PNG 다운로드와 CMYK TIFF·PDF 직접 다운로드(벡터 PDF는 **CMYK**, 래스터 PDF는 RGB). 인쇄 해상도는 `72`·`150`·`300`ppi 프리셋 드롭다운에서 고르고, 운영자가 `exportPolicy.print.allowedPpi`를 지정하면 그 목록이 프리셋을 대신함(`narrowPrintPpi` — 허용 목록이 아니라 프리셋 목록). 기본값은 목록에 `300`이 있으면 `300`, 없으면 가장 낮은 값(`resolveDefaultPrintPpi`). 서버가 받는 유효 범위는 목록이 아니라 1~1200 정수(`isPrintPpi`). Payload에는 아무것도 쓰지 않음(생성 세션/출력 레코드 없음).

출력 capability는 `Runtime Artifact → 실제 Exporter 호환 형식 → Admin exportPolicy = Effective StudioConfig.output` 순서로 계산합니다. Raster는 PNG·JPEG·TIFF·PDF·정지 MP4, Vector는 SVG·PDF, Video는 MP4로 변환할 수 있습니다. Admin의 형식 목록을 비우면 실제 Exporter 호환 형식을 모두 허용하며, 호환되지 않는 형식으로 범위를 넓히면 발행 검증이 거부합니다. Controller의 현재 선택값과 버튼 배치는 이 capability와 별개입니다. Export Layer는 I/O 직전에도 Artifact, 요청값, Effective capability를 다시 확인합니다. 원본 다운로드 capability와 ZIP 묶음은 파일 형식과 분리합니다.

Controller 그룹 구조는 Runtime Manifest가 소유합니다. Admin은 배경(`backgroundPolicy`)과 레이어별 `overrides[nodeId]`로 컨트롤의 실행 범위를 좁히며, `controllerPresentation`(그룹의 접힘 가능 여부·최초 열림값)은 계산된 기본값입니다. Creator가 열고 닫은 현재 상태는 화면의 로컬 React 상태이며 DB에 저장하지 않습니다.

Template의 텍스트·이미지·벡터 레이어는 같은 Creator 정책을 사용합니다. `hidden`은 Creator 패널에서 레이어를 숨기고, `readonly`는 값을 보여주되 바꾸지 못하게 하며, `editable`은 편집을 허용합니다. Visibility는 `editable` 레이어에서만 설정할 수 있습니다. Admin은 기본 표시값과 Creator의 표시 전환 허용 여부를 각각 정합니다. Creator의 현재 표시값은 미리보기와 export가 공유하는 합성 HTML에 반영합니다.

인쇄 렌더는 캔버스 픽셀을 그대로 쓰지 않습니다. 스튜디오가 고른 배율이 `ExportRequest`의 `options.scale`이 되어 브라우저가 그 배율로 PNG를 굽고, 서버는 그 PNG를 리샘플링하지 않습니다. TIFF는 거기에 PPI 메타데이터만 기록하고, 래스터 PDF는 문서 전체 DPI 메타데이터 대신 같은 PPI로 계산한 실제 `가로 mm × 세로 mm` 페이지 크기를 씁니다. 따라서 두 형식의 인쇄 크기는 `px ÷ ppi × 25.4mm`로 정해집니다. TIFF만 투명 영역을 흰색으로 평탄화하고 Sharp 내장 기본 CMYK ICC 프로파일로 변환합니다. 래스터 PDF는 그 PNG를 변환 없이 원본 픽셀 크기 그대로 배치한 단일 페이지이며 이미지 색공간은 RGB입니다(판 전체가 이미지 한 장이라 파일에 색 공간이 하나뿐입니다). 벡터 PDF는 판을 굽지 않는 대신, 다 그린 뒤 페이지 전체를 `pixelsToPdfPoints(1, ppi)`로 되읽어 같은 물리 크기를 냅니다.

인쇄 크기 한도는 나눠서 겁니다. `maxPrintSize()`가 변 하나 `16,384`px(브라우저 캔버스 한계)와 판 전체 `67,108,864`픽셀 안에 들어가는 가장 큰 판을 돌려주고, 변환 서비스(`exportPrint`)가 실제로 올라온 PNG의 픽셀로 같은 검사를 다시 합니다. 서버로 올리는 PNG `20MB`(`MAX_PRINT_PNG_BYTES`)는 픽셀이 아니라 바이트 한도라 업로드 Route가 `413`으로 막습니다. Template 저장 hook(`prepareTemplateSave`)도 같은 `findPrintOutputBlocker`를 부르지만, 그것은 발행 시점에 `exportPolicy.allowedFormats`가 `tiff`·`pdf`를 허용할 때 저장된 판형(`width`·`height`)만 보는 별개 검사이고 PPI나 실제 출력 크기와는 무관합니다.

인쇄 변환 Route는 특정 Template에 귀속되지 않습니다. `POST /api/studio-exports/print/{format}`은 PNG·`ppi`·색 프로파일만 받고 어느 Template에서 왔는지 묻지 않으므로 published version 대조도 하지 않습니다. 대신 스튜디오가 Effective capability와 현재 설정에서 정규화한 `ExportRequest`를 `useExport.canExport()`와 실행 직전 `run()`에서 두 번 검증합니다. 이 Route는 프로세스당 동시 변환 1건, 전체 분당 30건, 클라이언트당 분당 6건으로 제한합니다. 다중 서버 배포 시 이 process-local 제한은 공유 edge/Redis limiter로 교체해야 합니다.

### 그래픽 생성 계약

`graphic-generation`은 발행된 Graphic Profile의 runtime ID로 Drop-in Runtime을 선택하고, Effective Controller와 Artifact 생성을 연결하는 Feature입니다.
`forward-straight`는 순수 model과 P5 client runtime에서 Vector·Raster Artifact를 만듭니다. `radial-fluted-glass`는 production GLSL과 WebGL client runtime에서 Raster·Video Artifact를 만듭니다. Controller와 Canvas 직접 조작은 같은 Provider 세션 값을 갱신합니다. Template 배경도 같은 Graphic Runtime을 mount하지만 다운로드 형식은 해석하지 않습니다.

- 입력 계약: `variableWeightEnabled`, `viewpoint`, `angleIntensity`, 정규화된 `origin(0~1)`
- Shader 입력 계약: `source(-1~1)`, `bloomColor`, `rayIntensity`, `rayDensity`, `speed`, `glassSize`, `glassDistortion`
- Controller 계약: Studio가 도구의 입력 계약을 공용 `toggle`·`select`·`color`·`range`·`pad` primitive로 렌더
- 출력 계약: Runtime은 `raster | vector | video` Artifact를 발행하고, 공통 Export Layer가 Effective 형식으로 변환
- 실행 계약: P5·WebGL은 Canvas와 Artifact surface를 만들고, 파일 인코딩과 다운로드는 `studio-export`가 담당
- 기록 계약: Template의 PNG export처럼 Payload, DB, 오브젝트 스토리지에 기록하지 않음

### 의도된 방향 (미구현)

- 가이드라인·rule 데이터 실시간 주입으로 규정 준수 유도(soft: 프롬프트 컨텍스트 / hard: Review checker 재검증) — 강도 미정.
- Review를 검증 skill로 연결(현재 코드 미연결).
- Image 호출로 필요한 에셋 생성(현재 미호출).
- 컴포저 저장(cells→템플릿) 및 생성 출력 영속.
- 작업 재개나 복수 출력 관리가 필요해질 때 생성 세션 영속.

## 3. 표면

| Surface | 상태 | 진입점 |
| --- | --- | --- |
| [Page](../surfaces/page.md) | 구현 | `/studio/template` → 첫 사용 가능 템플릿 → 카테고리별 드롭다운 선택 → TemplateGenerator. 발행된 canonical HTML 템플릿만 읽고 로그인 필요 |
| [Page](../surfaces/page.md) — Graphic | 구현 | Studio의 `Graphic` 메뉴 → `/studio/graphic` → Effective Controller·P5 또는 WebGL Canvas → Runtime Artifact 기반 공통 Export |
| [AI Chat](../surfaces/ai-chat.md) | 구현 | agent tool `findTemplatesForRequest` + `prepareTemplateImage`(열린 슬롯만 검증·클램프 후 첨부 PNG). 첨부의 「스튜디오에 적용」이 편집 패치를 스튜디오 세션에 얹고, 이미지 슬롯은 그 프롬프트로 생성까지 실행한다 |
| [REST](../surfaces/rest.md) | 부분 | 래스터 인쇄 `POST /api/studio-exports/print/{format}`(`format`: `pdf`·`tiff`), 벡터 인쇄 `POST /api/studio-exports/vector-print`, import 어댑터 `POST /api/templates/import-figma-html`. 모두 산출물 레코드를 저장하지 않음 |
| Slack | 계획 | — |

## 4. 의존

- 클라이언트 라이브러리: `html-to-image`(PNG 캡처).
- 서버 라이브러리: 기존 `sharp`(흰 배경 평탄화, CMYK/ICC 변환, TIFF LZW·JPEG 인코딩, PPI 메타데이터), 기존 `pdf-lib`(PNG를 mm 단일 페이지 PDF로 직렬화). 별도 인쇄 라이브러리는 추가하지 않습니다.
- 공유 클라이언트 renderer: `render-template-raster-stage.client`(`src/features/template-customization/runtime/`). `template-runtime.client`의 Raster·Vector·Video Artifact가 모두 이 stage를 거칩니다.
- Payload 컬렉션: `templates`·`template-categories`·`application-images`·`generated-images`(`template-assets`는 레거시 import staging 참조만 유지). 템플릿은 Rule 또는 Check 참조를 저장하지 않습니다. 모든 HTML 저장은 구조 파서와 허용 목록으로 실행 가능한 마크업·외부 URL을 먼저 차단하고, **발행(publish) 시** 공개 URL을 published 공식 에셋 참조와 추가 대조합니다. `generatedImageId`와 canonical URL을 함께 저장한 AI 배경 이미지는 `generated-images`의 ID·URL과 일치할 때 발행할 수 있고, 구조화 참조가 없는 `template-assets`와 raster data URI 배경은 draft에서만 허용합니다. Draft 원본(`baseHtml`)과 staging 에셋은 manager/admin만 읽을 수 있고, Admin Draft 미리보기는 script 없는 iframe으로 격리합니다. `templates`·`brand-logos`·`application-images`·`generated-images`의 공개/worker 읽기는 published 문서만, 쓰기는 manager/admin만 허용합니다. 이미지 배정 가능한 표면(클립 프레임의 외동 이미지 자식·자식 없는 이미지 fill 노드·래스터 폴백 img)은 import가 전부 이미지 캐리어로 확정하고, 이미지 배정·이동·회전·컬러 치환은 캐리어 전용입니다 — 캐리어로 마킹되지 않은 노드의 이미지 배정은 무시되고, 배정·편집의 주소는 캐리어당 가시 창 하나로 고정됩니다(캐리어를 하나만 가진 클립 프레임이면 그 프레임, 스탠드얼론 캐리어면 표면 자신 — 같은 캐리어를 두 nodeId로 주소지정할 수 없습니다). `imageTransform`·`imageColorize` override와 AI 배경 배정의 Admin 저작 UI는 2026-08-20 간소화로 제거했습니다(이미지 슬롯 정책은 허용 프로파일 목록 + 창작자 변형 허용만 남고, 프로파일 고정은 허용 목록 한 개로 수렴) — compose와 발행 검증은 기존 저장값을 계속 처리하므로 레거시 템플릿은 그대로 렌더됩니다. compose는 `imageTransform`을 캐리어 요소의 CSS `transform`으로만 적용하고(`baseHtml` 불변), 이미지 프로파일이 color-adjustment feature를 열었을 때만 `imageColorize`로 선·배경 브랜드 컬러가 바뀝니다. compose는 생성 이미지와 canonical 이미지를 같은 luminance mask 경로로 다시 칠합니다. 기본은 선만 칠하고 배경을 투명하게 두며, background를 지정하면 바닥은 선 색, overlay는 배경 색으로 구성합니다.
- Figma import(`src/features/template-import/`): frame을 normalize(판단)→에셋 해석→emit(방출) 파이프라인으로 `baseHtml`/`html`에 변환합니다. CSS로 보존 가능한 레이어는 편집 구조를 유지하고, 벡터는 SVG로 받습니다. 단일 IMAGE fill은 서브트리를 굽지 않고 fill 원본을 `background-image` + 에셋 메타데이터로 낮추고(하위 텍스트 레이어 보존), SOLID/GRADIENT 스택은 다중 배경 레이어로, 순수 회전은 CSS `transform`으로 옮깁니다. TEXT_PATH·알 수 없는 leaf node·PATTERN/VIDEO fill·겹쳐진 IMAGE fill·마스크 합성·스케일/기울임 변환·지원 밖 효과·비 CSS 블렌드만 PNG Figma render로 고정하며, 고정된 레이어는 이유·삼킨 텍스트 수를 진단으로 Admin 가져오기 경고에 노출합니다. 렌더·fill 에셋은 `application-images` draft로 저장하며, Template publish 때 최종 HTML에도 남은 Figma import 에셋만 같은 트랜잭션에서 함께 publish합니다(배경 fill 참조는 div의 `data-asset-*` + 단일 style url로 대조). Template 문서를 자동 생성하지는 않고 manager가 Admin에서 저장합니다.
- Review 미사용, Image 미호출(현재) — 위 "의도된 방향" 참조.

### 기술 Feature 경계

| Feature | 책임 | 출력 |
| --- | --- | --- |
| `template-import` | 외부 템플릿을 가져와 운영자가 편집·검증·발행 가능한 상태로 준비 | 저장 가능한 Template |
| `template-customization` | published Template의 슬롯 값을 입력하고 결과를 조합 | composed HTML |
| `studio-export` | Runtime capability와 Admin 정책을 교차 검증하고 형식별 adapter를 실행 | SVG·MP4·PNG·JPEG·TIFF·PDF |
| `graphic-generation` | Runtime Manifest와 Effective Controller 값으로 그래픽을 계산하고 Artifact 제공 | Raster·Vector·Video Artifact |

공용 Template 계약·HTML 합성·슬롯 수집·render model projection·Payload 조회는 `src/features/template-core`이 소유합니다. `template-customization`은 `studio-export`의 공개 hook과 print policy를 사용할 수 있지만, 두 기능 모두 `template-import` 내부 구현을 직접 import하지 않습니다.

## 5. 크로스커팅

- 생성 실행 경계(Agent/Worker): [05. 시스템 아키텍처](../05-system-architecture.md)
- 인가된 에셋·업로드·접근 제어: [07. 보안](../07-security.md)
- 사용자 문구·접근성: [08. 접근성과 다국어](../08-accessibility-i18n.md)
- 도메인 위치(제작 관리): [04. 도메인 모델](../04-domain-model.md) — §5의 `AssetGenerationSession`은 향후 제작 사용량 추적용 계획 모델입니다. 현재 Create에는 세션·출력 영속 요구가 없습니다.
