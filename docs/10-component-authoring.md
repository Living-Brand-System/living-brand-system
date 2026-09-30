# 10. 컴포넌트 저작 규칙

이 문서는 Creator UI와 guideline 화면, 그리고 프로젝트가 직접 추가한 Payload Admin 확장 화면에 새 React 컴포넌트를 추가할 때 지켜야 할 저작 계약을 정리합니다(Admin에서 달라지는 항목만 §8이 따로 정의합니다). 이 계약은 `src/components/ui` 프리미티브 전용이 아니라 **화면 컴포넌트를 포함한 모든 표현 컴포넌트**에 적용됩니다. 컴포넌트는 반복해서 늘어나고, 매번 조금씩 다르게 만들면 드리프트가 쌓입니다. 여기서는 "매번 같은 계약"을 강제해 발명과 드리프트를 막습니다. 파운데이션(토큰 지도·닫힌 토큰 규칙·프레임 골격)은 `docs/09-design-system.md`가 소유하며 이 문서는 그 위에서 컴포넌트 저작만 다룹니다. 배치·네이밍·계층 경계는 `docs/06-project-structure.md`, 접근성 기준은 `docs/08-accessibility-i18n.md`, 토큰 값은 CSS 원천(`src/app/(frontend)/theme.css`·`typeset.css`)이 소유합니다. 이 문서는 그 원천을 링크만 하고 값을 다시 쓰지 않습니다.

## 1. 목적

컴포넌트는 이 저장소에서 가장 자주 추가되는 산출물이면서, 슬롭(slop) 위험이 가장 큰 지점입니다. 같은 헤딩을 새로 만들고, 같은 색을 생 hex로 다시 칠하고, `cn`을 또 구현하는 식의 중복이 컴포넌트마다 다른 모양으로 재발합니다. 이 문서의 목적은 그 재발을 규칙 하나로 차단하는 것입니다.

- 값·토큰(oklch, radius, hex 등)은 CSS 원천(`src/app/(frontend)/theme.css`·`typeset.css`)만 소유합니다. 그 토큰 지도와 닫힌 토큰 규칙은 `docs/09-design-system.md` §3~4가 소유합니다. 이 문서에 값을 복제하지 않습니다.
- 파일 배치, `use client` 경계, 네이밍은 `docs/06-project-structure.md`가 소유합니다. 여기서는 링크하고 최소한만 재서술합니다.
- 이 문서가 소유하는 것은 "컴포넌트를 만들 때 매번 따르는 계약"뿐입니다: 재사용 사다리, 템플릿, 스타일 Do/Don't, 브랜드 무관, 접근성 최소선, 자기 검증입니다.

## 2. 시작 전 재사용 사다리

코드를 쓰기 전에 Ponytail 사다리를 먼저 내려갑니다. 첫 번째로 걸리는 칸에서 멈춥니다.

1. **이 컴포넌트가 존재할 필요가 있나?** 투기적 필요면 만들지 않습니다. (YAGNI)
2. **이미 저장소에 있나?** `src/components/ui`의 프리미티브를 먼저 grep합니다. 몇 파일 옆에 있는 것을 다시 구현하는 것이 가장 흔한 슬롭입니다.
3. **조합으로 되나?** 기존 프리미티브를 조합합니다.
4. **그래도 없으면** 최소 코드로 새로 만듭니다. 🔴 이때 **스타일의 근거는 Carbon입니다** — 빈 마크업에 스타일을 처음 쓰는 순간이 준거법이 발동하는 자리이고, "추론했을 때 가장 괜찮아 보이는 것"은 금지입니다(그것이 슬롭의 정의입니다). Carbon에서 같은 컴포넌트를 **Context7로 조회해** 따르고, 기억으로 값을 부르지 않습니다. 절차와 예외는 `docs/09` §9.

기존 코드를 먼저 찾는 grep 예시:

```bash
# ui 프리미티브 목록부터 확인
ls src/components/ui

# 만들려는 것과 비슷한 이름을 저장소 전체에서 찾기
grep -rl "Badge\|Card\|Typography" src/components src/features
```

자주 쓰는 재사용 매핑입니다. 왼쪽을 새로 만들지 말고 오른쪽을 씁니다.

| 하려는 일 | 재사용할 것 |
| --- | --- |
| 헤딩·본문 텍스트 | `Typography` (`src/components/ui/typography.tsx`) |
| 제목·설명·도움말 조합 | `ContentHeading` (`src/components/shared/content-heading.tsx`) |
| 입력 label·control·도움말 조합 | `FieldGroup` + `Field` + `FieldLabel`/`FieldDescription` |
| 아이콘 | `@carbon/icons-react` |
| className 병합 | `@/lib/utils`의 `cn` |
| 색 파생(전경색·RGB) | `@/lib/color` (`hexToRgb`, `getContrastingForeground`) |
| 콘텐츠 최대 폭 | 일반 표면·레거시는 `ContentFrame`. 신규 가이드라인은 Section·컨테이너의 [09 §7 계약](09-design-system.md#7-공통-셸과-프레임-골격) |
| 카드 크기·섹션 간격 | 신규는 `GuidelineSection`과 Grid·Carousel·Sticky. 레거시는 `GuidelineSections`와 기존 컨테이너 |

shadcn 4.12의 공식 아이콘 목록에는 Carbon이 없어 `components.json`은 `radix-mira`가 지원하는 `hugeicons` 값을 유지합니다. 이 값은 생성기 호환용일 뿐 저장소의 아이콘 정책이 아닙니다. shadcn 컴포넌트를 추가한 같은 변경에서 생성된 아이콘을 `@carbon/icons-react`로 바꾸고, `@hugeicons/*` import가 0건인지 확인한 뒤 커밋합니다. `iconLibrary`를 임의의 `carbon` 문자열로 바꾸면 레지스트리의 `IconPlaceholder`가 변환되지 않으므로 금지합니다.

## 3. 새 컴포넌트 템플릿

새로 만들어야 한다면 저장소의 실제 파일을 복제해서 시작합니다. 발명하지 않습니다. 형태에 따라 두 원형 중 하나를 고릅니다.

### variant형 컴포넌트

시각적 변형이 여러 개면 `class-variance-authority`의 `cva`를 씁니다. 원형은 `src/components/ui/badge.tsx`입니다. `cva` + `VariantProps` + `defaultVariants` + named export 패턴입니다.

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center …', {
	variants: {
		variant: {
			outline: 'border-foreground bg-transparent text-foreground …',
			tint: 'border-primary/40 bg-primary/10 text-foreground …',
			muted: 'bg-muted text-muted-foreground …',
			highlight: 'bg-highlight text-highlight-foreground …',
			success: 'bg-success/15 text-success …',
			info: 'bg-info/15 text-info …',
			warning: 'bg-warning/15 text-warning …',
			destructive: 'bg-destructive/15 text-destructive …',
		},
		shape: {
			sharp: 'rounded-none',
			rounded: 'rounded-sm',
			pill: 'rounded-full …',
		},
	},
	defaultVariants: { variant: 'muted', shape: 'pill' },
})

function Badge({ className, variant = 'muted', shape = 'pill', asChild = false, ...props }:
	React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'span'
	return <Comp data-slot="badge" data-variant={variant} data-shape={shape}
		className={cn(badgeVariants({ variant, shape }), className)} {...props} />
}

export { Badge, badgeVariants }
```

`badge.tsx`에서 그대로 가져오는 계약: 색은 `variant`, 모서리는 `shape`로 분리하고 각 정의와 기본값은 `cva`에 둡니다. 판정 상태는 `success`/`info`/`warning`/`destructive` variant를 사용하고 화면에서 색 클래스를 직접 조립하지 않습니다. 루트에 `data-slot`을 붙이고 상태는 `data-variant`와 `data-shape`로 노출합니다. 아이콘에는 위치에 따라 `data-icon="inline-start" | "inline-end"`, 아이콘 전용 Badge에는 `data-icon="only"`와 Badge의 `aria-label`을 함께 씁니다. 다형 렌더링은 `asChild` + `radix-ui`의 `Slot`으로 하고, 별도 `as` prop을 새로 만들지 않습니다.

`button.tsx`도 같은 `variant`(`outline`/`tint`/`muted`/`highlight`)와 `shape`(`sharp`/`rounded`/`pill`) 축을 공유하며, 크기만 `size`로 따로 분리합니다. `ghost`/`destructive`/`link`는 기능성 예외로 유지합니다. `muted`는 낮은 강조도의 활성 버튼이고, 비활성 상태는 별도 variant가 아니라 네이티브 `disabled` 속성으로 표현합니다.

### 크기 분기형 컴포넌트

같은 모양에서 밀도(spacing)만 달라지면 `data-*` 속성 + CSS 변수로 분기합니다. 원형은 `src/components/ui/card.tsx`입니다. Tailwind variant 클래스를 여러 벌 만들지 않고, `data-[size=sm]`로 CSS 변수 하나만 바꿉니다.

```tsx
function Card({ className, size = 'default', ...props }:
	React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
	return (
		<div data-slot="card" data-size={size}
			className={cn(
				'flex flex-col gap-(--card-spacing) py-(--card-spacing) [--card-spacing:--spacing(4)] data-[size=sm]:[--card-spacing:--spacing(3)]',
				className,
			)}
			{...props} />
	)
}
```

`card.tsx`의 계약: 크기별로 클래스를 곱하지 않고 `--card-spacing` 하나를 `data-[size=sm]`에서 재정의합니다.

### 두 원형 공통 규칙

| 항목 | 규칙 | 원천 |
| --- | --- | --- |
| className 병합 | `@/lib/utils`의 `cn`만 사용. 문자열 결합·템플릿 리터럴 금지 | `utils.ts`: `twMerge(clsx(inputs))` |
| 루트 식별 | 루트 요소에 `data-slot="<name>"` — **화면 컴포넌트 포함**(프리미티브 전용이 아님, §3.5) | `badge.tsx`, `card.tsx`, `studio-workspace.tsx` |
| 다형 렌더링 | `asChild` + `radix-ui` `Slot`, 별도 `as` prop 금지 | `badge.tsx` |
| 아이콘 | `@carbon/icons-react` | repo 컨벤션(저장소 24개 파일 채택) |
| 이미지 | `next/image` 기본. 생성 이미지·데이터 URL 미리보기처럼 최적화가 성립하지 않는 곳만 생 `<img>` + biome-ignore 사유 주석 | `agent-chat-generated-images.tsx` |
| 파일명 | kebab-case (`cards/displays/dynamics/type-specimen/component.tsx`) | `docs/06` §10 |
| export | PascalCase named export, `default` export 금지 | `badge.tsx`, `card.tsx`, `typography.tsx` |
| 타입 import | `import type … from 'react'` | `card.tsx`, `typography.tsx` |
| `use client` | 자기 코드에 상태·이벤트·브라우저 API가 있거나, client 전용 의존성(radix 프리미티브, `motion`, `next-themes`)을 직접 감쌀 때만. 둘 다 아닌 순수 조합엔 금지 | `docs/06` |

`Typography`는 cva·`data-slot`·named export 계약을 따르는 참고 구현입니다. `cva('', { variants: { family, size, tone, weight } })`에 `data-slot="typography"`, `data-size`를 붙이고 named export만 합니다. 단, 다형 렌더링은 `asChild`가 아니라 `as` prop으로 처리합니다 — HTML 요소(`h1`~`p`/`span`)만 교체하고 컴포넌트 합성이 필요 없는 경우의 기존 예외이며, 새 컴포넌트는 위 표대로 `asChild` + `Slot`을 씁니다.

### 화면 컴포넌트 계약 (§3.5)

studio·global·home 같은 표면의 화면 컴포넌트도 위 계약을 그대로 따릅니다. 원형 예시가 전부 `ui/*`라고 해서 "프리미티브 전용"으로 읽지 않습니다.

- **`data-slot`**: 모든 표현 컴포넌트의 루트에 붙입니다. 테스트가 DOM을 잡는 공식 훅이고(`studio-workspace.tsx`의 슬롯을 `template-generator.test.tsx`가 검증하는 것이 원형), 내부 클래스 구조가 바뀌어도 셀렉터가 살아남습니다.
- **props 형태**: DOM 요소를 감싸는 컴포넌트는 `React.ComponentProps<'...'>` 확장이 기본입니다. 도메인 데이터를 받는 화면 컴포넌트는 인라인 익명 객체 타입 대신 **명명된 Props 타입**을 선언합니다. 외부 스타일 조정을 허용하려면 `className`을 받아 `cn`으로 병합합니다 — 받지 않는 컴포넌트에 `cn`은 필요 없지만, 받는 순간 문자열 결합이 아니라 `cn`입니다.
- **상태 소유**: 서버 데이터 fetch와 그 loading/error 3종 세트를 컴포넌트 `useState`로 복제하지 않습니다. HTTP I/O는 소유 기능의 `*.client.ts`가(`docs/06` §10), Context 값 계약은 `src/features/*/contexts`, 화면 세션 상태는 `src/features/*/providers`, 소비 API는 `src/features/*/hooks`의 `use-*` 훅이 소유합니다. 원형은 Studio Context + Provider + `use-*-studio` — Provider와 소비 훅은 서로 import하지 않고 같은 Context 계약에 의존하며, 나머지 컴포넌트는 props 또는 훅으로 값을 받는 표현 계층으로 남습니다. `src/components` 안에 도메인 상태 `createContext`를 만들지 않습니다.
- **variant 수단 단일화**: 시각 variant(색·모양·상태별 스타일)는 언제나 `cva`입니다. 완전 클래스 룩업 테이블은 §4의 동적 클래스 대책, 즉 **레이아웃 매핑**(`grid-cols` 등 구조 분기)에만 씁니다 — 상태→색 매핑을 `.ts` 룩업 테이블이나 클래스 문자열을 반환하는 헬퍼 함수로 풀면 cva 자리를 우회한 것입니다.
- **motion**: 애니메이션 라이브러리는 `motion/react` 하나만, `LazyMotion` + `motion/react-m` 조합(`side-nav.tsx` 원형)으로 씁니다. 모션 감소는 그 모션을 소유한 컴포넌트 안에서 `useReducedMotion()`으로 처리하고, `shouldReduceMotion`을 props로 내려보내지 않습니다.

### 컨트롤러 컨트롤 계약 (§3.6)

공용 `ControllerBar`는 배치 방식과 텍스트 입력 유무에 관계없이 바깥 모서리를 `rounded-xl`(24px)로 통일합니다. 내부 패딩 `p-3`(12px)와 입력 필드 `rounded-lg`(12px)가 동심 관계를 이룹니다.

`ControllerControlRenderer`의 여러 줄 텍스트 입력은 본문 3줄 높이(`rows=3`, `field-sizing: fixed`)로 고정합니다. 긴 값은 내부 세로 스크롤로 읽고 스크롤바만 숨깁니다. 입력값과 키보드 편집은 제한하지 않습니다. 일반 `Textarea`와 직접 사용하는 `Controller.Textarea`의 크기 정책은 별도로 유지합니다.

스튜디오 컨트롤러의 개별 컨트롤은 아래 계약을 따릅니다. 디자인 정본은 Figma HD_LBS_UI의 **Controller API**(node `4:5578`), 구현 원형은 `src/components/shared/controller/`의 **Controller 컴파운드 킷**입니다(Studio와 가이드라인이 함께 쓰므로 `components/shared/`에 있습니다). 패널은 `Root` → `Header`·`Content`·`Footer`, 본문은 `Group` → 개별 컨트롤로 조합합니다. `Group`은 제목과 접힘 상태를 직접 소유합니다. 기존 `Panel`은 `Root`·`Content`·`Footer`를 묶은 호환 래퍼입니다.

Runtime Manifest부터 Effective Config, Provider, Artifact, Export까지 이어지는 전체 데이터 흐름은 [Studio](features/studio.md)를 정본으로 삼습니다. 이 절은 Controller의 표현과 상호작용 계약만 설명합니다.

세 Studio는 Admin 제한 전의 원본 실행 계약을 `StudioRuntimeManifest`로 발행합니다. Runtime Manifest는 생성 가능한 Artifact와 Controller Definition만 알며 파일 형식은 알지 않습니다.

```ts
type StudioRuntimeManifest = {
	artifacts: {
		raster?: {}
		vector?: {}
		video?: { fps: readonly (24 | 30 | 60)[]; maxWidth: number; maxHeight: number; maxDurationSeconds: number }
		original?: {}
	}
	controller: { groups: readonly ControllerGroupDefinition[] }
}

type StudioControllerConfig = StudioRuntimeManifest & {
	studio: 'template' | 'image' | 'graphic'
	id: string | number
	version: 1
	name: string
}
```

Runtime Manifest는 정적 하드코딩을 의미하지 않습니다. Graphic은 plugin 등록값, Image는 Generation Model capability, Template은 `html`·`nodeConfigs`에서 결정적으로 Manifest를 얻습니다. Template Manifest는 실제 DOM node·ref를 담지 않는 직렬화 가능한 문서 구조 투영입니다. 같은 입력은 항상 같은 Manifest를 내야 합니다.

Template·Image·Graphic Config는 이 Manifest 구조를 그대로 쓰고, 실행에 필요한 도메인 descriptor·control id binding·Effective `output`을 확장합니다. `Runtime Manifest + Admin feature/controller restrictions + Exporter 호환성/출력 제한 → Effective StudioConfig`의 적용은 순수하고 멱등적이어야 합니다. Studio Provider는 공통화하지 않습니다. 각 Provider가 자기 도메인의 세션과 실행 결과를 소유합니다.

`output.formats`는 `Runtime Artifact 사양 → 실제 Exporter 호환성 → Admin exportPolicy` 순서로 파생합니다. 공통 변환은 Raster→PNG/JPEG/TIFF/PDF/MP4, Vector→SVG/PDF, Video→MP4입니다. 실제 Video Artifact가 있으면 시간 기반 producer를 쓰고, Raster→MP4는 정지 프레임 영상입니다. Admin은 형식뿐 아니라 FPS·크기·길이 상한도 좁힐 수만 있습니다. 인쇄 해상도만 예외입니다 — `exportPolicy.print.allowedPpi`는 범위를 좁히지 않고 드롭다운 프리셋 목록을 대신하며, 유효성은 `acceptsPrintPpi()`가 `isPrintPpi()` 범위(1~1200 정수)로 판정합니다. 저장된 `exportPolicy`와 Effective Config의 `output`은 서로 다른 계약입니다.

형식 선택은 Controller Definition에 중복하지 않습니다. 세 Studio의 Export hook은 Artifact 선택과 batch/ZIP 같은 전달 정책만 조정하고, 모든 형식 분기와 인코딩은 공통 `executeArtifactExport()`가 소유합니다. `Controller.Footer`는 그 결과인 export view model만 표시합니다. 공통 `useExport.canExport(request)`가 Effective capability·Artifact 가용성·도메인 실행 조건을 함께 판정하고, `run()`은 실행 시 같은 판정을 다시 적용합니다. `ExportRequest`는 먼저 `raster | vector | video | original` Artifact로 분기합니다. Image 원본은 파일 형식이 아니므로 `OriginalArtifact`, `output.original` boolean, format 없는 Original 요청으로 표현합니다. Runtime·Provider·Canvas는 출력 형식을 해석하지 않습니다.

직렬화 가능한 데이터 어휘의 정본은 `src/modules/studio-controller/controller-definition.ts`의 `ControllerControlDefinition`입니다. Definition에는 `kind`·`defaultValue`·선택지·레인지 같은 정적 정의만 싣습니다. 현재 값은 session values에, `error`·런타임 availability·대상 기하는 runtime bindings에 둡니다. `ControllerRenderer`는 `groups`와 이 두 런타임 입력을 결합해 `Group`과 primitive만 그립니다. 별도 배치가 필요한 footer·Template slot은 `ControllerControlRenderer`로 같은 단일 control 투영을 재사용합니다. 공통 `StudioSidebar`가 `Controller.Root`와 고정 `Header`·스크롤 `Content`·고정 `Footer` 배치를, Domain Sidebar가 내부 복합 UI와 브라우저 트리거를 소유합니다. 창작자 화면은 **패널 두 자리**입니다 — 왼쪽은 색 조합·큰 형태처럼 창작자가 실제로 다루는 축, 오른쪽은 세기·속도 같은 잔 축이고, 어느 쪽에도 서지 않은 컨트롤은 manager가 Payload에서만 조정합니다. 어느 컨트롤이 어느 자리인지는 표현이 아니라 Runtime Manifest의 `controller.left`·`controller.right` 선언이 정하며, 근거와 규칙은 `controller-definition.ts`가 갖습니다(`StudioWorkspace`의 `leftPanel`은 그 선언이 있는 Studio만 채웁니다). ReactNode·콜백·DOM 참조·formatter 함수는 Definition에 넣지 않습니다.

각 Studio Config는 렌더링·실행 전의 **Canonical IR**입니다. Payload·published 원본은 도메인 projection과 strict validation을 한 번 거쳐 Config가 되고, Template 같은 host는 원본에 없는 기능을 추가하지 않고 options·availability·features를 좁힌 **Effective IR**만 만듭니다. Projection과 제한 정책은 같은 입력에 반복 적용해도 결과가 달라지지 않는 순수 함수여야 하며, Renderer는 IR이나 session values를 변경하지 않습니다. Config 정규화의 멱등성과 생성 모델·시간 기반 그래픽의 출력 재현성은 별도 계약입니다.

```tsx
<Controller.Group title="Position">...</Controller.Group>
<Controller.Group title="Transform" defaultOpen disabled={locked}>
	...
</Controller.Group>
```

`GroupHeader`와 `Section`은 공개 API에 두지 않습니다. `Group`이 제목·구분선·Chevron·접힘 상태를 내부에서 그립니다. `ControllerRenderer`는 첫 그룹의 상단 구분선만 제거합니다. 잠긴 동안에는 강제로 닫지만 사용자의 이전 열림 상태는 보존해, 잠금이 풀리면 원래 상태로 복귀합니다. 레이아웃 공개 API는 `Root`·`Header`·`Content`·`Group`·`Footer`입니다.

Controller 사용 구조는 다섯 책임으로 나눕니다.

| 책임 | 소유 범위 | 경계 |
| --- | --- | --- |
| Definition | Runtime Manifest가 기본값·선택지·범위·정적 availability를 소유 | 현재 값과 실행 상태를 저장하지 않음 |
| State / Context | Studio Provider가 session values·runtime bindings·정책·액션을 소유 | Studio별 Provider를 하나로 합치지 않음 |
| Rendering | `ControllerRenderer`가 `groups`를 `Group`과 primitive로 투영 | `Content`나 도메인 UI를 소유하지 않음 |
| Layout / Composition | `StudioSidebar`가 공통 패널 배치를, Domain Sidebar가 복합 UI를 구성 | 컨트롤 값을 재정의하지 않음 |
| Control / Interaction | `Row`·`Range`·`Pad` 등 프리미티브가 사용자 입력을 `onChange`로 변환 | 도메인 값을 직접 변경하거나 I/O를 수행하지 않음 |

별도 `ControllerProvider`는 두지 않습니다. 편집 계약과 세션 값은 화면의 Studio Provider가 소유하고, Controller 컴파운드는 표현 레이아웃만 소유합니다. 여러 Controller Root 사이에서 공유할 표현 상태가 실제로 생길 때만 Provider를 추가합니다.

세 Studio의 Admin UI는 Runtime Manifest를 읽기 전용으로 보여주되, Image는 Profile이 선택한 feature로 좁힌 Controller projection을 보여줍니다. Image·Graphic Admin은 `{ controlId, availability, defaultValue, maxLength, optionValues, min, max }`만 sparse JSON `controllerRestrictions`로 저장하고 `kind`·label·placeholder·display·aspectRatio·group title·collapsible·defaultOpen을 입력하지 않습니다. Template Admin은 `controllerRestrictions`를 쓰지 않고 배경(`backgroundPolicy`)·레이어별 `overrides[nodeId]`·출력(`exportPolicy`)만 저장하며, `controllerPresentation`은 계산된 기본값입니다. Draft는 작성 중인 불완전 상태를 허용하지만 publish는 공통 parser로 unknown field·중복 id·kind별 기본값과 제약을 엄격하게 검증합니다. 세 Studio는 legacy Controller/Policy 저장을 읽지 않고 Effective `config.controller.groups`만 소비합니다.

어드민은 화면 패널을 구성하지 않고 기본값·선택지·범위·availability만 `controllerRestrictions`로 저작합니다(Template은 예외 — 위 문단 참고). Image Runtime Manifest의 control 종류·그룹·표현·stable ID와 전체 supported feature는 Generation Model capability가 소유하고, Image Profile은 feature를 선택합니다. Restrictions를 여러 번 적용해도 같은 Effective Definition이 나와야 합니다. `enabled`로의 잠금 해제, select 선택지 추가, range 확장, 알 수 없는 ID는 발행 시 거부합니다. Graphic의 서버 안전 Manifest Catalog는 직렬화 가능한 Runtime Manifest만 소유하고, Artifact 생성 runtime과 파일 변환 adapter는 각각 runtime/client와 studio-export 모듈이 소유합니다. `Visibility`는 Controller 계약에 두지 않습니다. 현재 렌더러는 Effective Definition에 들어 있는 control을 모두 표시합니다.

Graphic Canvas는 `type`만 보고 공용 `P5Canvas`·`WebGLCanvas`를 선택합니다. Graphic별 직렬화 Manifest는 서버 Catalog에, 순수 SVG·binding adapter는 model Catalog에, 브라우저 P5/WebGL mount·Controller 값 변환은 client Runtime Catalog에 분리합니다. Graphic Canvas와 Template Background는 같은 Runtime adapter를 각자 화면 컨테이너에 mount하며, 파일 출력 형식으로 Template 노출 여부를 제한하지 않습니다. 세 Catalog는 같은 stable runtime ID로만 연결하며, client runtime 함수를 Config에 싣지 않습니다. Worker와 Template은 코드 Catalog 등록 여부가 아니라 published Graphic Profile에서 파생된 Effective Config만 목록으로 받습니다. 따라서 새 그래픽을 코드에 등록해도 Admin이 publish하기 전에는 노출되지 않습니다.

기존 `p5`·`shader` 엔진에 Graphic을 추가할 때는 `src/features/graphic-generation/graphic-runtimes/<id>` 아래 `definition.ts`·`model.ts`·`runtime.client.ts`를 기본 export로 추가하고 `pnpm generate:graphic-runtime-catalogs`를 실행합니다. `definition.ts`는 단일 authoring API `defineGraphicRuntime()`으로 Manifest를 정의하고, `model.ts`는 순수 계산, `runtime.client.ts`는 실제 P5/WebGL 실행을 소유합니다. 생성된 세 Catalog가 stable runtime ID로 자동 연결하므로 Provider·Sidebar·Canvas·중앙 Catalog를 수정하지 않습니다. 새로운 엔진 종류가 생길 때만 공용 Canvas host와 `GraphicStudioConfig.type`을 확장합니다.

킷 배선 규칙: `Controller.Row`/`Controller.Field`가 `{ controlId, disabled }` 표현 컨텍스트를 내리고, 안의 킷 컨트롤(`Select`·`Input`·`Textarea`·`Segmented`·`ColorRow` 스와치)이 라벨 연결 id와 disabled를 자동으로 이어받습니다 — 소비자는 htmlFor를 배선하지 않습니다. 이 컨텍스트에 도메인 값을 넣지 않습니다(§3.5 — 도메인 Provider는 features의 훅으로).

컨트롤 슬롯의 공통 상태는 조작 가능 여부와 현재 표현 상태를 섞지 않고 두 타입으로 정의합니다.

```ts
type ControllerAvailability = 'enabled' | 'readonly' | 'disabled'
type ControllerInteraction = 'idle' | 'hover' | 'focused' | 'error'
```

`ControllerAvailability`는 서로 배타적입니다. `enabled`는 조작 가능, `readonly`는 값을 정상 대비로 읽을 수 있지만 변경 불가, `disabled`는 조작·포커스가 모두 불가한 상태입니다. `ControllerInteraction`은 `enabled`일 때만 적용합니다. `idle`은 기본, `hover`는 포인터 진입, `focused`는 포커스 진입, `error`는 검증 실패가 표시된 상태입니다. 시각 상태가 겹치면 `disabled` → `readonly` → `error` → `focused` → `hover` → `idle` 순으로 우선합니다.

`hover`와 `focused`는 세션 데이터나 Context에 저장하지 않고 각각 CSS `:hover`와 `:focus-visible`/`:focus-within`으로 표현합니다. `error`만 검증 결과에서 명시적으로 전달합니다. 선택(`selected`), 펼침(`open`), 값 없음(`empty`)은 컨트롤별 값 상태이므로 이 두 공통 타입에 합치지 않습니다.

공통(`ControlBase`) — 모든 컨트롤이 공유하는 정의 상태:

- Definition의 `label`은 직렬화 가능한 `string`입니다. React primitive의 `label`은 아이콘 노드를 받을 수 있지만 접근 가능한 이름(sr-only 텍스트)을 반드시 동반합니다.
- `readonly` — 값은 유효하며 읽혀야 하는 상태. 정상 대비를 유지하고 컨트롤·chevron 없이 값만 보입니다 — `Controller.Row`의 `readonly`(라벨이 span이 되고 자동 배선이 꺼짐) + 값 텍스트 구성으로 표현합니다. opacity로 흐리지 않습니다.
- `disabled` — 조정 자체가 불가한 상태(어드민 고정 등). 행 전체 흐림(opacity-50 관례) + 포인터·포커스 차단(안의 킷 컨트롤은 컨텍스트로 함께 비활성). readonly와 절대 혼용하지 않습니다.

리프 컨트롤 8종 — 값 형태와 제약은 종류(kind)가 소유합니다:

| kind | value | 종류별 제약·부속 | 킷 대응 |
| --- | --- | --- | --- |
| text | `string \| null` | `maxLength`(카운터 `n/max`로 표시), `multiline` | `Controller.Row`+`Controller.Input` / `Controller.Field`+`Controller.Textarea` |
| toggle | `boolean` | — | `Controller.Segmented` (On/Off) |
| select | `string \| null` | `options[]`(선택지별 `colors[]`), `variant`(`list` 기본 / `segmented`) | `Controller.Row`+`Controller.Select`, `segmented`면 `Controller.Segmented`, 선택지가 전부 색이면 `Controller.ColorChips` |
| color | `#rrggbb \| null` | — | `Controller.ColorRow` |
| range | `number` | `min`/`max`/`step`, 표기 포맷 | `Controller.Range` (채움 폭=값) |
| pad | `{ x, y }` (-1~1) | `aspectRatio`(Wide/Portrait/Square) | `Controller.Pad` |
| orbit | `{ azimuthDeg, elevationDeg }` | 스냅 스텝 | `Controller.CameraControl` + 오빗 프리뷰 |
| asset | 자산 참조 `\| null` | 소스(브랜드 이미지 등) | `Controller.AssetCard`(카드 + 열기 버튼), 패널은 `Controller.Browser` |

`select`의 `variant`는 **표현이 아니라 선택지 성격**을 말합니다. 기본 `list`는 드롭다운이라 누르기 전까지 무엇이 있는지 보이지 않고, `segmented`는 선택지를 한 줄에 펴 놓습니다 — 정본이 **세트로** 제시해 몇 가지인지가 곧 정보인 축에만 씁니다(CI 락업의 「꼴」이 첫 소비자). 선택지가 많으면 폭을 먹으므로 목록형이 기본입니다.

선택지 자체가 **색 조합**인 축은 새 kind나 새 variant를 만들지 않고 `options[].colors`(#rrggbb 목록)에 그 색을 싣습니다 — `variant`는 선택지의 **성격**이고 `colors`는 선택지의 **내용**이라 표현은 렌더러가 정합니다. 전 선택지가 `colors`를 가지면 `variant`를 덮고 `Controller.ColorChips`(라벨 아래 3열 칩 그리드)로 그립니다. 하나라도 없으면 `variant`가 정한 표현(`segmented`면 세그먼트, 아니면 목록)으로 떨어집니다(Key Visual Pattern의 컬러웨이가 첫 소비자, hex가 `style`로 흐르는 근거는 `docs/09` §4의 색-데이터 예외).

현재 공용 `ControllerControlDefinition`은 데이터만으로 바로 그릴 수 있는 `text`·`toggle`·`select`·`color`·`range`·`pad`를 제공합니다. `orbit`은 도메인 프리뷰 슬롯이 필요하고 `asset`은 대응 primitive가 아직 없어 화면 컴포지션에 남깁니다. 두 종류는 실제 공용 renderer가 생길 때 Definition에 합류합니다.

읽기·탐색 파츠 6종 — 값을 조작하지 않고 결과를 보여주거나 위치를 옮기는 자리입니다. 검수 화면이 첫 소비자이고(디자인 `56:2` "Review Usecase"), 리프 컨트롤과 달리 직렬화 Definition의 어휘가 아니라 **컴포지션 파츠**입니다.

| 파츠 | 무엇 | 디자인 |
| --- | --- | --- |
| `Controller.Status` | 행·섹션 끝의 상태 타일(36px). 정적 표시이며 버튼이 아닙니다 — 이름은 필수 `label`이 sr-only로 갖습니다 | `59:2885` |
| `Controller.ListRow` | 두 줄 목록 행(48px). `onClick`이 없으면 `div`로 렌더해 눌러도 아무 일 없는 버튼을 만들지 않습니다 | `59:2757` |
| `Controller.Group`의 `trailing` | 제목 행 오른끝 표시. 🔴 접히는 그룹에는 줄 수 없습니다 — 그 자리는 chevron이 씁니다 | `56:2087` |
| `Controller.Card` | 접힌 판정 하나. 채움(`bg-muted`) + 배지 | `56:3` |
| `Controller.Item` | 펼친 판정 항목. 구분선 + 색 글자 | `56:2087` |
| `Controller.Pagination` | 바 안의 위치 이동 `‹ n / N ›`. 숫자는 `aria-hidden`이고 위치는 sr-only 한 문장이 말합니다 | `56:2471` |

🔴 **`Card`와 `Item`의 시각을 통일하지 마십시오.** 같은 내용을 다른 밀도로 보여주는 짝이고, 채움(카드)과 구분선(항목)의 차이가 "접힌 것"과 "펼친 것"을 가르는 유일한 단서입니다. 상태도 카드는 배지, 항목은 색 글자입니다 — 항목이 쌓이는 자리에서 배지를 반복하면 목록이 배지 벽이 됩니다.

🔴 `Status`의 `muted`와 `ListRow`·`Card`의 hover는 `bg-muted`가 아니라 `foreground/5` **겹침**입니다. 이 파츠들이 앉는 면이 이미 `bg-muted`라 같은 토큰을 쓰면 보이지 않습니다(`ROW_ACTION`·`ROW_SELECT_TRIGGER`와 같은 규칙).

경계 규칙:

- **`isEmpty`는 파생 상태입니다.** `value === null`에서 계산하고, 별도 진실로 두지 않습니다. 비어 있으면 원본 값을 사칭하지 않고 `—`로 보입니다(`Controller.ColorRow`의 `isEmpty` 원형).
- **`error`·`busy`는 정의가 아니라 런타임 상태입니다.** `error`와 런타임 availability는 runtime binding으로 Renderer에 전달하고, `busy`는 소유 컴포넌트가 "생성 중…" 비활성으로 처리합니다. 런타임 binding은 Published `readonly`·`disabled`를 다시 활성화할 수 없습니다.
- **편집 검증과 실행 검증을 나눕니다.** Provider는 `acceptsControllerDraftValue`로 입력 kind·범위·availability를 검사하되 길이를 초과한 text는 오류 표시를 위해 보존합니다. 외부 I/O 직전에는 `acceptsControllerExecutionValue`로 길이까지 검사하고, `readonly`·`disabled` control에는 발행 기본값만 허용합니다.
- **Definition 컴포지션은 단일 단계 `groups[] → controls[]`까지만 제공합니다.** 조건 노출·탭 분기·액션은 실제 생산자가 생기기 전까지 `visibleWhen` 류의 DSL로 추측하지 않습니다. **예외는 "브라우저 열기" 하나입니다** — 자산 카드는 값을 고르는 패널 없이는 성립하지 않아 액션이 컨트롤의 일부입니다. 이 액션만 킷이 갖고(`Controller.Browser`가 여는 상태를 소유), 나머지 액션·조건 노출은 계속 보류합니다.
- **트리거는 자기 브라우저 안에서만 존재합니다.** 여는 버튼은 `Controller.Browser.Trigger`로 그 브라우저의 컴파운드 안에만 살고, 무엇을 여는지 모르는 범용 `Controller.Trigger`는 만들지 않습니다 — 그런 트리거는 브라우저 밖에서도 타입이 통과해 검증되지 않는 계약이 됩니다. 짝은 구조로 강제됩니다: `Trigger`·`Panel`은 `Browser.Root`의 Dialog 컨텍스트가 없으면 렌더에서 죽습니다.
- **`Controller.Field`의 `action`은 컴포지션 슬롯입니다.** 라벨 행 오른끝에 버튼 하나(복사 등)를 놓는 ReactNode 자리이며, 직렬화 Definition의 어휘가 아닙니다 — 위의 "액션은 보류" 규칙은 Definition에 그대로 유효합니다. 카운터 자리를 대신 쓰지 않습니다: 카운터는 `n/max` 표시부라 조작 요소가 들어가면 계약이 거짓말이 됩니다. 그 자리에 넣는 표준 버튼은 `Controller.Action`입니다 — Row/Field 면 위에서는 색을 바꾸지 않고 `foreground/5`로 **겹칩니다**(ghost 기본 hover인 `bg-muted`는 면과 같은 색이라 묻힙니다). 같은 겹침 규칙을 `ROW_SELECT_TRIGGER`가 이미 쓰고 있어, 단계를 바꿀 때는 두 상수를 함께 옮깁니다. 원형은 MCP 화면의 명령 복사 버튼(`mcp-key-issuer.tsx`, 디자인 64:1283)입니다.
- **자산 브라우저의 목록은 패널이 열릴 때 가져옵니다.** 페이지는 시작 계약 하나만 싣고, 교체 후보 전체는 Provider가 `useLazyResource`로 들고 있다가 패널 본문(picker)이 마운트될 때 `*.client.ts`로 한 번 가져옵니다 — radix가 닫힌 패널 콘텐츠를 언마운트하므로 mount가 곧 "열림"입니다. 비었을 때의 세 사연(로딩·실패·후보 없음)은 `browseEmptyMessage`가 `Controller.AssetCard`의 `empty` 자리에 씁니다. 재시도 버튼은 두지 않습니다 — 닫았다 열면 다시 가져옵니다.
- **네임스페이스 객체(`Controller`)는 client 소비 전용입니다.** RSC에서 점 접근이 필요하면 개별 named export(`ControllerRow` 등)를 씁니다.

아키텍처 층과 원칙 — 컨트롤러는 다섯 층으로 쌓입니다: **디자인 SSOT**(Figma Controller API) → **Published Definition** → **Renderer·킷**(`ControllerRenderer` + `controller/`) → **Domain Sidebar** → **상태·서비스**(Studio Provider가 값을 소유하고 `*.client.ts`가 I/O를 소유). 층을 지키는 원칙:

- **킷은 도메인 무지.** `controller/` 파츠는 프롬프트·transform 같은 도메인 값을 모릅니다. 도메인이 붙는 컨트롤(TransformPad 소비 등)은 화면 폴더에 삽니다.
- **값 계약은 소비 서비스가 단일 소유.** transform 범위(`IMAGE_EDIT_TRANSFORM_LIMITS`)는 compose 서비스가 정의하고 어드민·스튜디오 UI가 함께 소비합니다 — UI 층에 범위 상수를 복제하지 않습니다.
- **기하는 대상에서 파생.** 패드 종횡비=대상 박스 비율, 배경 패드=캔버스 비율처럼 크기·비율은 조작 대상에서 계산합니다. 화면 상수 하드코딩 금지(헤더 높이 토큰 사례).
- **미배선 컨트롤은 disabled로 스테이징.** UI-first로 먼저 그리되, 아직 기능이 없는 컨트롤은 잠금(disabled)으로 정직하게 표시합니다 — 조작 가능해 보이는데 무반응인 거짓 컨트롤을 만들지 않습니다.
- **사이드바와 캔버스는 서로 모릅니다.** 화면의 편집 세션 상태는 features의 Provider가 단일 소유하고, `use-*-studio` 훅은 그 Context를 소비합니다. 사이드바(컨트롤러)와 작업 공간(캔버스)은 이 훅으로만 소통하며 서로 import하거나 props를 건네지 않습니다. 상태는 병렬 Record로 찢지 않고 단위 객체(슬롯 하나 = 상태 객체 하나)로 흐릅니다.
- **무엇을 그릴지는 편집 계약이 말합니다.** 공통 컨트롤 정의는 각 `StudioConfig.controller.groups`에서 소비하고, Template slot 같은 도메인 binding과 descriptor는 각 Config의 확장에서 소비합니다. Sidebar는 원시 Payload 필드나 nodeConfigs를 다시 해석하지 않습니다. 계약에는 Definition만 싣고 세션 값은 싣지 않습니다. 그래픽의 `type: 'p5' | 'shader'`는 runtime 선택에만 사용하며 Controller Definition과 현재 값을 결정하지 않습니다.
- **Template은 Image Config를 참조합니다.** Template Image Slot은 Image Config나 Image Provider를 복제·중첩하지 않습니다. Published Image Config를 참조하고 슬롯 문맥에서 options를 좁혀 씁니다. 슬롯 ratio override도 원본 Image Config가 허용한 options 안에서만 선택합니다.
- **Template 배경은 Graphic Config도 참조합니다.** Template은 Graphic Config나 Graphic Provider를 복제·중첩하지 않고, 선택한 Config의 Controller Definition과 세션 값을 Graphic 도메인의 Preview adapter에 전달해 P5·WebGL을 그대로 재생합니다. Template Runtime은 합성 결과를 Raster Artifact로 발행하고, PNG/JPEG/TIFF/PDF/정지 프레임 MP4 변환은 공통 Export Layer가 맡습니다. runtime binding과 Controller Renderer는 같은 Config를 소비하므로 그래픽별 입력 해석은 Template에 두지 않습니다.
- **Image Profile이 이미지 기능을 소유합니다.** `ImageStudioConfig.image.features`는 `color-adjustment`·`camera-control` 같은 capability와 semantic control id 참조만 싣고, 실제 값·기본값·availability는 `controller.groups`가 계속 소유합니다. Image Studio와 Template은 같은 `ImageProfileFeatureRenderer`를 소비합니다. Template의 기존 `imageColorize`는 capability가 아니라, 선택한 Profile이 해당 feature를 지원할 때만 적용되는 값 override로만 투영합니다.
- **확장 디스패처는 도메인별로 둡니다.** 공통 `ControllerRenderer`의 primitive switch는 닫힌 데이터 어휘이고, Image feature와 Graphic runtime은 각각 자기 도메인의 단일 exhaustive dispatcher가 해석합니다. 기존 feature·runtime을 조합한 새 Profile·Config는 데이터 추가만으로 소비되며, 새로운 feature·graphic 구현만 해당 dispatcher에 한 번 등록합니다. Studio별 variant prop이나 `visibleWhen` DSL로 공용 Renderer를 늘리지 않습니다.
- **실행 정책은 서비스가 다시 강제합니다.** Route·Agent·MCP는 같은 도메인 서비스를 호출합니다. 서비스는 Published Config를 기준으로 options·최대 길이·readonly와 camera capability를 검증합니다. Sidebar의 비활성 표현만 신뢰 경계로 사용하지 않습니다.
- **계약이 화면 수명 중 교체되면 어드민 층만 갈아끼웁니다.** 이미지 스튜디오처럼 사용자가 프로파일(계약 원천)을 바꿀 수 있는 화면은, 프로파일이 정의한 것만 새 계약을 따르고 사용자가 만든 것은 남깁니다 — 프롬프트·생성 결과·선택은 유지하고, 계약이 정의한 선택은 새 선택지에 없을 때만 시작값으로 되돌립니다(원형: `use-image-studio`의 `selectProfile`). 비용이 든 산출물을 계약 교체가 조용히 버리지 않습니다. 단 **선택지가 없는 프로파일 고유 값(색 조정처럼 자유 입력)은 언제나 새 계약의 기본값으로 되돌립니다** — 유지할 근거(새 레인지에 그 값이 있다는 사실)가 없고, 앞 프로파일의 색이 남으면 다른 프로파일의 기본값을 사칭합니다.
- **잠금은 availability와 선택지에서 결정합니다.** Admin이 명시한 `readonly`·`disabled`를 Published Definition으로 유지하고, 유효한 선택지가 하나일 때도 읽기 전용으로 파생합니다. 동일한 의미의 별도 lock boolean은 두지 않습니다.

## 4. 스타일 계약 Do/Don't

className과 style에는 시맨틱 토큰만 씁니다(닫힌 토큰 규칙 전문은 `docs/09-design-system.md` §4). 생 색·생 팔레트 클래스·동적 클래스는 금지입니다. 아래 ❌ 행 중 file:line이 붙은 것은 저장소에 실제로 남아 있는 위반이고, file:line이 없는 행(예: `@hugeicons/*`)은 정책 참조입니다. 새 코드는 ✅를 따릅니다.

글자 크기는 `docs/09` §6의 고정 유틸리티 단계만 사용합니다. `clamp()`·`vw`·반응형 `text-*`·임의 글자 크기는 추가하지 않습니다. 크기 variant는 패딩과 높이를 바꿀 수 있지만, 일반 컨트롤은 `text-sm`/`size-4`, 큰 컨트롤은 `text-base`/`size-5` 조합을 유지합니다.

아래 「❌를 본 자리」는 **박제된 실측 예시**입니다 — 실제 위반을 보여 주려고 남기며, 고쳐진 뒤에도 예시로서의 값은 남습니다. 🔴 그러므로 **현재 위반 목록으로 읽지 마십시오.** 지금 남은 위반은 `docs/09` §4의 grep으로 세십시오.

| ✅ Do | ❌ Don't | ❌를 본 자리 |
| --- | --- | --- |
| `border-border` | `border border-neutral-200` | 옛 `blocks/callout`(2026-09-04 삭제) |
| `bg-muted` / `bg-fill-muted` | `bg-neutral-50 … dark:bg-neutral-950` | `cards/displays/dynamics/type-specimen/component.tsx` — ✅ 2026-08-12에 `THEME_PANEL`로 고침 |
| 조건부 완전 클래스 룩업 | `` `grid gap-4 md:grid-cols-${variant}` `` | 옛 `blocks/content-columns`(2026-09-04 삭제) |
| 심볼 + 텍스트로 상태 구분 | 색만으로 판정 구분 | 옛 `blocks/callout`의 kind별 badge(삭제됨) |
| 상태 토큰 `bg-success/15 text-success` | 유채 팔레트 `bg-emerald-500/15 text-emerald-700 …` | `studio/review/result/check-status.ts` — ✅ 고쳐짐(이제 Badge variant 키만 갖는다) |
| `Typography` 재사용 | `font-body text-sm font-normal` 수기 반복 | studio 10개 파일 25회 실측 |
| `@carbon/icons-react` | `@hugeicons/*` | repo 컨벤션(정책) |

### 생 색·생 팔레트 금지

className·style 리터럴에 생 hex(`#a1b2c3`), 생 Tailwind 팔레트, `oklch()`를 직접 쓰지 않습니다. 팔레트 금지는 무채색(`neutral`/`gray`/`zinc`/`slate`/`stone`)만이 아니라 **유채색 전체**(`emerald`/`sky`/`amber`/`orange` 등)입니다. `border-border`, `bg-muted`, `text-foreground` 같은 시맨틱 토큰만 쓰고, 성공/정보/경고/실패 같은 판정·상태 표시는 상태 토큰(`success`/`info`/`warning`/`destructive`, `docs/09` §4)을 씁니다 — 상태 토큰으로 표현이 안 되면 팔레트로 우회하지 말고 `docs/09`와 `theme.css`에 토큰을 추가합니다. 예외는 §5의 색 데이터 컴포넌트가 props/CMS로 받는 hex뿐입니다(스타일이 아니라 데이터).

탐지 grep:

```bash
# 생 팔레트 클래스 (무채 + 유채 전체)
grep -rnE '(bg|text|border|ring|fill|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|neutral|gray|zinc|slate|stone)-[0-9]' src

# className/style 안의 생 hex
grep -rnE 'className=.*#[0-9a-fA-F]{6}' src

# oklch 리터럴(토큰 정의 파일 밖)
grep -rn 'oklch(' src --include='*.tsx'
```

### 동적 Tailwind 클래스 금지

`grid-cols-${n}`처럼 문자열 보간으로 클래스를 만들면 Tailwind가 빌드 타임에 그 클래스를 인식하지 못해 스타일이 유실됩니다. 옛 `blocks/content-columns`가 이 위반이었습니다(다른 파일의 리터럴 덕에 우연히 동작하고 있었고, 블록 자체가 2026-09-04에 삭제됐습니다). 조건부로 완전한 클래스를 룩업합니다.

```tsx
// ❌ 옛 blocks/content-columns (삭제됨)
GRID_CLASS = `grid gap-4 md:grid-cols-${variant}`

// ✅ 완전 클래스 룩업
const GRID_BY_COLUMNS = {
	1: 'flex flex-col gap-10',
	2: 'grid gap-4 md:grid-cols-2',
	3: 'grid gap-4 md:grid-cols-3',
} as const
```

탐지 grep:

```bash
grep -rnE '(grid-cols|col-span|gap|w|h|text)-\$\{' src
```

### 레거시 폭·표면색·세로 리듬은 프레임이 소유

이 절은 기존 blocks 경로에 적용합니다. 신규 sections 경로의 레이아웃 책임과 수치는 [09 §7](09-design-system.md#7-공통-셸과-프레임-골격)이 소유합니다.

- 개별 블록·컴포넌트가 자기 `max-width`를 갖지 않습니다. 콘텐츠 최대 폭은 `ContentFrame`에만 있습니다(`content-frame.tsx:22`의 `max-w-[1540px]`). 예외는 프리미티브의 **내재 콘텐츠 폭**뿐입니다 — `dialog`의 `max-w-sm`, `tooltip`의 `max-w-xs`, `bubble`의 `max-w-[80%]`처럼 오버레이·말풍선이 자기 판형을 갖는 것은 페이지 폭 소유가 아닙니다. 금지 대상은 화면·블록 컴포넌트가 페이지 폭을 스스로 좁히는 것(`<Card className="max-w-2xl">` 등)입니다.
- 표면 배경색은 컴포넌트 안에 칠하지 않습니다. 가이드라인 섹션·leaf는 배경 설정을 갖지 않습니다(2026-09-04에 걷음). 브랜드 면(흰 판·검은 판)은 위젯이 `cards/displays/dynamics/surface.ts`의 선언으로 그립니다(`docs/11` §8).
- 섹션 간격은 `GuidelineSections`, 제목과 콘텐츠 간격은 `GuidelineSection`, 가로 여백은 `ContentFrame`이 소유합니다(`docs/09` §7). 위젯이 이 여백을 중복해서 잡지 않습니다.

## 5. 브랜드 무관

색·폰트·로고는 props로 주입받습니다. 코드에 브랜드를 하드코딩하지 않습니다. 하드코딩은 개발용 default 값(HD현대 팔레트)으로만 허용합니다.

- 컴포넌트가 받는 색은 hex string props입니다. RGB·전경색 같은 파생값은 저장하지 않고 런타임에 `@/lib/color`로 파생합니다: `hexToRgb`로 0–255 RGB를, `getContrastingForeground`로 배경 대비가 더 높은 흑/백 전경색을 얻습니다.
- 원형은 `src/features/guideline/cards/displays/dynamics/hd-color-palette/view.tsx`입니다. Swatch는 `{ id, name, hex, cmyk?, pantone? }` 형태로 받고, RGB·전경색은 hex에서 파생하며, 값은 전부 `brand-colors`에서 옵니다 — 하드코딩된 기본 팔레트가 없습니다.

```tsx
import { getContrastingForeground, hexToRgb } from '@/lib/color'

type Swatch = { id: string; name: string; hex: string; pantone?: string }

// 기본값(default)만 HD현대 샘플. 실제 값은 props/CMS로 주입.
const MAIN: Swatch[] = [
	{ id: 'heritage-green', name: 'HD HERITAGE GREEN', hex: '#00AF41' },
]
```

기존에 남아 있는 생 팔레트 클래스(위젯 일부)는 POC를 위한 **의도적 부채**이며 이 규칙과 별개입니다. 새 컴포넌트가 그 부채를 늘리지 않습니다.

## 6. 접근성

접근성은 `docs/08-accessibility-i18n.md`가 소유합니다. 컴포넌트 레벨에서 생략하면 안 되는 최소선만 여기 둡니다.

- **키보드 조작**: 커스텀 인터랙션 요소는 `role`과 `aria-*`, 화살표 키 이동을 갖춥니다. 슬라이더면 `role="slider"` + `aria-valuenow`처럼 역할에 맞는 속성을 붙입니다.
- **focus 가시성**: `focus-visible:ring` 계열로 포커스를 시각적으로 드러냅니다. `badge.tsx`의 `focus-visible:ring-[3px] focus-visible:ring-ring/50`이 참고입니다.
- **색만으로 상태 구분 금지**: 판정·상태는 심볼 + 텍스트를 함께 씁니다. 검수 결과 배지처럼 kind별 심볼과 라벨을 같이 노출합니다.
- **label 연결**: 입력 요소는 `label`/`aria-label`/`aria-labelledby`로 접근 가능한 이름을 갖습니다. `cards/displays/dynamics/type-specimen/component.tsx`의 textarea는 `aria-label="타입 견본 입력"`을 답니다.
- **실패 상태 텍스트 설명**: 검수 실패·저장 실패 같은 조치가 필요한 상태는 텍스트로 원인과 다음 행동을 설명합니다(`docs/08` §2).

## 7. 자기 검증

비자명한 로직에는 실행 가능한 검증을 하나 남깁니다. 분기, 루프, 파서, 클립보드 조작, 색 계산이 여기 해당합니다. 검증은 컴포넌트 옆에 `*.test.ts`로 co-locate하고 vitest로 실행합니다. 프레임워크·픽스처는 추가하지 않고, 로직이 깨지면 실패하는 가장 작은 것 하나면 됩니다.

- 참고: `src/components/ui/typography.test.ts`, `src/lib/color.test.ts`(`hexToRgb('#fff')` → `{ r: 255, g: 255, b: 255 }`, `getContrastingForeground('#FFFFFF')` → `'#000000'`).
- 자명한 one-liner(단순 wrapper, 순수 조합)에는 테스트를 만들지 않습니다. YAGNI는 테스트에도 적용됩니다.

## 8. Payload Admin 표면 예외

`src/components/admin`은 Payload Admin 런타임 위에서 돌므로 아래 항목만 계약과 다릅니다. 여기 명시되지 않은 나머지(재사용 사다리, 시맨틱 토큰, `cn`, named export, kebab-case, carbon 아이콘, 자기 검증)는 그대로 적용합니다. 원형은 `src/components/admin/templates/`(shadcn 재구축 그룹)입니다.

- **`use client`**: Payload form 컨텍스트(`useField`/`useForm`/`useFormFields`)에 접속하는 필드 컴포넌트는 무조건 client입니다. "조건부" 규칙의 예외가 아니라 client 의존성 기준을 충족하는 경우입니다. RSC로 남길 수 있는 것은 폼 밖 조회 화면(`DashboardSummary` 등)뿐입니다.
- **`@payloadcms/ui` 유지 목록**: 동작을 소유한 컴포넌트는 shadcn으로 갈아끼우지 않습니다 — `RelationshipField`(관계 검색·페이지네이션), `PublishButton`(저장 파이프라인), `Gutter`(admin 폭), `Popup`(admin 포털·z-index), `toast`. 그 밖의 표현은 `src/components/ui` 프리미티브를 씁니다(`template-layer-editors.tsx` 원형).
- **토큰 원천**: admin의 라이트/다크는 Payload가 `--theme-*`로 소유하고, `src/app/(payload)/admin-tailwind.css`의 `@theme inline`이 시맨틱 토큰을 `--theme-*`에 재매핑합니다. 따라서 admin 컴포넌트도 `bg-muted`/`border-border` 같은 **시맨틱 토큰 클래스를 그대로** 씁니다. 새 코드가 `--theme-elevation-*`를 인라인으로 직접 참조하지 않습니다.
- **`data-slot` 미부여**: admin 컴포넌트 루트에는 자체 `data-slot`을 붙이지 않습니다. `custom.scss`가 `[data-slot=…]` 셀렉터를 프리미티브 외부 스타일링 훅으로 쓰고 있어, 화면 컴포넌트까지 부여하면 SCSS 축소 방향과 상충합니다.
- **프레임 계약 미적용**: 폭·표면색은 Payload 레이아웃이 소유하므로 `ContentFrame`을 쓰지 않습니다.
- **cva·`asChild` 해당 없음**: admin 에디터는 시각 variant가 없는 일회성 화면이라 적용 대상이 없습니다. 억지로 만들지 않습니다.
- **기하 계산 inline style 허용**: iframe scale, 오버레이 핸들 좌표, depth 인덴트, CSS mask처럼 런타임 계산값은 inline `style`이 정당합니다. 색·간격 상수는 여기 넣지 않습니다.
- **dialkit**: 레이아웃 수치 튜닝 노브는 `useDialKit` + `admin-dialkit-provider`로 admin에만 둡니다. Creator UI에 들이지 않습니다.

## 9. 복붙용 체크리스트

PR을 올리기 전 자기 점검용입니다.

- [ ] 사다리를 내려갔다. `ls src/components/ui`로 기존 프리미티브를 먼저 확인했고, 조합으로 안 될 때만 새로 만들었다.
- [ ] variant형은 `badge.tsx`(cva), 크기 분기형은 `card.tsx`(data-size + CSS 변수) 원형을 복제했다.
- [ ] 루트에 `data-slot`을 붙였고(화면 컴포넌트 포함, admin 표면 제외 — §8), className 병합은 `@/lib/utils`의 `cn`만 썼다. 문자열 결합이 없다.
- [ ] 도메인 데이터를 받는 화면 컴포넌트는 명명된 Props 타입이고, DOM 래퍼는 `React.ComponentProps` 확장이다.
- [ ] PascalCase named export만 있다. `default` export가 없다.
- [ ] 다형 렌더링은 `asChild` + `radix-ui` `Slot`이다. 새 `as` prop이 없다.
- [ ] §4의 팔레트 탐지 grep(무채 + 유채 전체) 결과가 이 컴포넌트에서 0이다. 판정·상태 색은 상태 토큰(`success`/`info`/`warning`/`destructive`)이다.
- [ ] `grep -rE 'className=.*#[0-9a-fA-F]{6}'`에 걸리는 생 hex가 없다(색 데이터 props는 예외).
- [ ] `grep -rE '(grid-cols|col-span|gap)-\$\{'`에 걸리는 동적 클래스가 없다. 조건부 완전 클래스로 바꿨다.
- [ ] 자기 `max-width`가 없다(가이드라인 하단 캡션은 `docs/09` §7의 예외). 폭은 `ContentFrame`이 소유하고, 배경 설정은 갖지 않는다.
- [ ] 아이콘은 `@carbon/icons-react`다. `@hugeicons`가 없다.
- [ ] 색·폰트·로고를 props로 받는다. 하드코딩은 개발용 default 값뿐이다.
- [ ] 색·전경색은 저장하지 않고 `@/lib/color`로 런타임 파생한다.
- [ ] 상태를 색만으로 구분하지 않는다. 심볼 + 텍스트를 함께 쓴다.
- [ ] 글자 크기는 `docs/09` §6의 고정 유틸리티 단계만 사용한다.
- [ ] focus-visible ring, 키보드 조작, label 연결이 있다.
- [ ] 순수 조합 컴포넌트에 `use client`를 붙이지 않았다.
- [ ] fetch·loading·error를 컴포넌트 `useState`로 복제하지 않았다 — HTTP I/O는 `*.client.ts`, 화면 상태 묶음은 feature 훅이 소유한다. `src/components` 안에 도메인 Context를 만들지 않았다.
- [ ] 시각 variant는 cva다. 상태→색 룩업 테이블이나 클래스 반환 헬퍼 함수가 없다.
- [ ] motion은 `motion/react`의 `LazyMotion` + `m`이고, `shouldReduceMotion`을 props로 내리지 않았다.
- [ ] 비자명 로직에 co-located `*.test.ts` 하나가 있다. one-liner엔 없다.

## 가이드라인 문서 구조 API (2026-09-23)

신규 표현 API는 `src/components/guideline/structure/`가 소유하며 CMS sections·레퍼런스·`/guideline/mockup`이 공유합니다. 기존 표현은 `deprecated/` 경로에 남습니다. 간격·폭의 책임과 반응형 수치는 [09 §7](09-design-system.md#7-공통-셸과-프레임-골격)이 소유합니다.

- `GuidelineDisplayHeading`: 필수 `title`(문서의 유일한 h1), 선택 `subtitle`. 중앙 정렬, `min-height: 100dvh`.
- `GuidelineSection`: `id`, `hierarchy: main | sub`, `children`. 섹션 경계·앵커와 공통 여백을 소유합니다. `hierarchy`는 헤딩 위계이며 레이아웃 간격을 바꾸지 않습니다.
- `GuidelineSectionHeading`: 필수 `id`·`hierarchy`·`title`, 선택 `description`·`align`·`download`. Main은 h2, Sub는 h3입니다. ID는 소유 섹션의 `${id}-heading`이며 섹션의 `aria-labelledby`와 연결합니다. 제목과 설명은 일반 텍스트이며 설명만 줄바꿈을 지원합니다. 설명이 없으면 영역과 간격을 없앱니다.
- Start는 텍스트와 다운로드를 `space-between`으로 양끝 배치하고 모바일에서는 버튼을 아래 왼쪽에 놓습니다. Center는 제목·설명·다운로드를 세로 중앙 배치합니다. 정렬은 계층과 독립적입니다.
- `GuidelineDisplayFooter`: public 로고의 `src`·`alt`·원본 크기를 `logo`로 받습니다. 비율 유지, 중앙 정렬, `min-height: 100dvh`. 목업은 `public/brand/hd/ko-horizontal-default-blk@2x.png`를 사용합니다.
- 평면 목록의 `hierarchy`는 항목이 소유합니다. 서브섹션은 직전 메인에 의미상 소속하며 첫 항목은 Sub일 수 없습니다. CMS·레퍼런스·플레이그라운드 모두 출력도 평면으로 유지합니다. CMS의 필수 제목·앵커 중복·고아 Sub 검증은 `sections/schema.ts`가 소유합니다.
- 다운로드는 섹션에 명시적으로 등록한 에셋만 ZIP으로 묶습니다. 카드나 서브섹션을 재귀 탐색하지 않습니다. 목록이 비면 버튼을 숨기고, 진행 중 중복 실행을 막으며 실패 시 재시도합니다.

목업은 공개 파일을 명시한 개발용 데이터로 계약을 검증합니다. CMS 저장·검증·관계 해석은 `features/guideline/sections/`가 담당하며, 재귀 스키마를 사용하지 않습니다. 레거시 blocks는 별도 경로로 유지합니다.

### Card와 Grid 정규화 (2026-09-14)

`structure/grid.tsx`가 새 Card·Display·Caption·Grid를 소유합니다. Container Item은 Card와 동일하며 추가 래퍼 계층이 없습니다. 이 목업에는 기존 높이 기반 배치와 ContentFrame 최대폭 규칙 대신 아래 합의가 적용됩니다.

- `GuidelineGridContainer`: `displayWidth` 240·320·480·720·1440, `ratio` 1:1·4:3·16:9·2:3·3:4, `columns` 1~5. 기본은 480·1:1·3열입니다. 크기와 비율은 그룹 내 Card에 공통 적용합니다.
- 목표 너비×열 수+간격으로 최대폭을 정하며 Section 가용 폭 안에서 중앙 배치합니다. 목표 너비가 부족하면 열을 줄이고, 1열에서도 부족할 때만 Card를 줄입니다. 빈 열은 유지하고 마지막 행은 첫 열부터 채웁니다. 모바일 전용 열 수는 없습니다.
- `GuidelineCard`는 figure이며 직접 Grid의 자식입니다. `GuidelineCardDisplay`는 비율을 유지하며 Caption을 포함하지 않습니다. Caption은 figcaption, 최대폭 480px이며 내용에 따라 높이가 늘어납니다.
- 이미지 맞춤은 `contain` 기본, 스케일 80% 기본(30~100%). `cover`에서는 스케일 조작을 제공하지 않고 100%로 고정합니다. 두 방식 모두 중앙 정렬하며 Display 밖은 자릅니다. 스케일은 콘텐츠에만 적용합니다.
- 가로 간격 12px·세로 간격 24px은 `structure/grid.module.css`가 소유합니다. 최대폭 계산에는 가로 간격을 적용합니다. 페이지 프레임은 Section이 담당하며 Grid에 좌우 패딩을 중복 적용하지 않습니다.
- `/guideline/mockup#grid-playground`에서 크기·비율·열 수·항목 수·fit·scale을 조작합니다. 사용자 제공 `guideline_assets/web` 중 여섯 파일을 공개 목업 경로 `public/guideline/reference/grid`에 복사했습니다. CMS와 DB에는 기록하지 않습니다.

### Card Action (2026-09-15)

- `structure/card-actions.tsx`의 `GuidelineCardActions`를 Display의 children으로 조합합니다. 이미지 스케일은 액션에 영향을 주지 않습니다.
- `start`는 상태 아이콘 배지(허용·금지 등)만, `end`는 실행 액션(버튼·링크·복사·색상 선택) 또는 액션 그룹만, `center`는 토글 또는 Breadcrumb을 받습니다. 각 위치의 허용 타입을 API에서 제한합니다. 각 자리는 선택 사항이며 모두 비면 영역을 만들지 않습니다.
- 아이콘 버튼·링크·배지는 36px이며 아이콘은 24px 중앙 정렬 래퍼 안에서 컴포넌트의 size로 크기를 지정합니다(최대 24px). SVG 도형·viewBox 보정은 하지 않습니다. 토글은 단일 선택이며 높이 44px, 내부 항목 높이 36px입니다. 선택값·콜백은 소비처가 소유하고 선택 해제는 허용하지 않습니다.
- 액션은 DisplayFrame 기준 absolute 오버레이이며 도판과 형제 레이어로 배치합니다. 도판은 액션 유무와 관계없이 같은 영역·정렬·스케일을 사용하고, 액션을 피하기 위한 상단 여백이나 콘텐츠별 예외를 두지 않습니다. 도판 자체의 여백은 유지합니다. 액션 영역은 Display 상단·좌우 24px 안쪽입니다. Center는 Display 중심에 고정하고 Start·End는 양끝에 배치합니다. 작은 카드에서도 축소·줄바꿈·재배치하지 않고 겹침을 허용합니다. 겹친 부분은 DOM 순서상 뒤쪽 액션이 위에 오르며 키보드 포커스를 받은 액션은 앞으로 올라옵니다.
- 기존 Button·Badge·ToggleGroup을 재사용합니다. Figma 카드 토글은 선택 배경에 background, 기본 바탕에 border를 사용합니다. `/guideline/mockup#card-actions`에서 중앙 토글·상태/동작 액션·240px 동시 배치를 확인합니다. CMS와 기존 위젯 액션 연결은 변경하지 않습니다.

- 카드 토글의 선택 배경은 단일 Backplate가 활성 항목의 위치·폭으로 이동합니다. 기존 ControllerSegmented의 spring 전환을 따르며 모션 감소 설정에서는 즉시 전환합니다.

- 아이콘 컴포넌트 size: Checkmark 20, Close 24, 링크 이동 20, 다운로드 18, 새로고침 17. 공통 Button의 기본 아이콘 크기는 auto로 해제해 각 SVG의 width·height 속성을 따릅니다.

### Carousel 정규화 (2026-09-15)

- `structure/carousel.tsx`의 `GuidelineCarouselContainer`는 label·cards·displayHeight를 받습니다. 각 항목은 공통 GuidelineCardData(id·ratio·display·caption)를 가지며 기존 GuidelineCard로 렌더합니다. Display·Caption·Action은 기존 컴포넌트를 조합합니다.
- 목표 높이는 240·320·480·720px(기본 320)이며 각 Card의 비율을 허용합니다. 공통 높이는 `min(목표 높이, 가용 너비 / 그룹 최대 비율)`입니다. 화면이 좁아지면 모든 Display를 함께 줄여 가장 넓은 카드도 전체가 보이게 합니다. 카드 너비는 공통 높이×개별 비율입니다.
- 가로 간격은 현재 Card 정규값인 12px, 카드 목록과 하단 컨트롤 간격은 24px입니다. 캡션은 카드와 함께 이동하고 컨트롤은 가장 긴 카드 아래에 놓입니다.
- 한 번에 한 카드의 시작점으로 이동합니다. 카운터는 현재 카드 순번 / 전체 카드 수입니다. 마지막 카드까지 독립된 이동점을 유지하므로 마지막 카드 오른쪽에는 빈 공간이 생길 수 있습니다. 루프는 기본 ON, 자동 재생은 기본 OFF이며, 루프가 꺼져 있으면 양끝 버튼을 비활성화합니다. 드래그·터치와 키보드로 접근 가능한 이전·다음 버튼을 제공합니다.
- 빈 목록은 0 / 0과 비활성 버튼, 한 장은 1 / 1과 비활성 버튼입니다. `/guideline/mockup#carousel-playground`에서 높이·카드 수·혼합/동일 비율을 바꿔 확인합니다. 이름 선택형 캐러셀도 지원하며 CMS에서는 카드별 선택 이름을 필수로 받습니다.

#### 캐러셀 재생 옵션 (2026-09-15)

- `loop` 기본값은 `true`, `autoplay` 기본값은 `false`, 재생 간격은 3000ms(3초)로 고정합니다(2026-09-21 CMS 계약 반영). 공식 `embla-carousel-autoplay` 플러그인을 사용합니다.
- 무한 반복은 Embla가 카드 수·폭에 따라 지원 가능한 경우에만 적용합니다. 화살표는 실제 이동 가능 여부를 따릅니다.
- 반복 OFF의 자동 재생은 마지막 카드에서 정지합니다. 마우스 진입·드래그·포커스·화살표 조작도 재생을 정지합니다. 재생 시작/정지 버튼을 제공합니다.
- 자동 재생 중 카운터의 live announcement는 끄고, 모션 감소 설정에서는 자동 재생을 비활성화합니다.
- 플레이그라운드에서 반복·자동 재생 ON/OFF를 비교할 수 있으며 간격 선택은 제공하지 않습니다.

### Sticky 비교 목업 (2026-09-15)

- `GuidelineStickyContainer`는 `cards`, `mode: individual | switch`(기본 switch), `top`(기본 32px)을 받습니다. CMS와 플레이그라운드에서 두 모드를 선택할 수 있습니다(2026-09-21 CMS 계약 반영).
- 카드 하나가 공통 캡션과 도판을 소유합니다. 일반형은 각 카드의 설명을 자기 카드 범위 안에서 고정하고, 전환형은 컨테이너 전체에서 설명 영역을 공유합니다.
- 전환형은 도판 상단이 `top` 기준선을 통과할 때 해당 카드로 교체하며 역스크롤도 반영합니다. 시각 복제 영역은 보조기술에서 숨기고 원본 설명은 각 카드의 읽기 순서에 유지합니다.
- 가용 폭 788px 이상에서 설명 기준 폭 370px + 간격 48px + 도판 최소 370px을 사용합니다. 미만에서는 고정을 해제하고 캡션 전체 → 도판으로 배치합니다. 370px보다 좁으면 가용 폭을 사용합니다.
- 화면보다 긴 고정 설명은 영역 안에서 스크롤할 수 있습니다. 카드 사이 세로 간격은 24px입니다. 스크롤 전환에는 추가 애니메이션을 넣지 않습니다.


### 공통 캡션 (2026-09-15)

- `GuidelineCardCaption`은 Grid·Carousel·Sticky가 공유합니다. `basic`(제목 또는 제목+설명), `list`(제목·설명과 항목 목록), `specification`(제목·설명과 명세 그룹) 세 형태입니다. Notice 필드와 렌더링은 폐기합니다.
- 명세는 그룹명과 항목명·값 목록을 가지며, 그룹을 여러 개 넣을 수 있습니다. 목록 항목의 소제목과 명세 그룹명은 선택입니다. 제목·설명·본문을 하나의 figcaption에 유지합니다.
- 공통 패딩은 상하 12px·좌우 24px, 내부 묶음 간격 12px, 최대 폭 480px입니다. 제목·설명은 16/24px, 목록·명세는 14/20px로 정규화합니다. 제목·항목명은 600, 설명·값은 500입니다. 컨테이너별 내부 스타일 분기는 없습니다.
- Sticky는 모바일에서 캡션 전체를 도판 위에 배치합니다. 명세만 도판 아래로 분리하던 안은 폐기하며, 긴 캡션의 읽기 흐름은 플레이그라운드에서 검토합니다.


### 공통 카드 입력 (2026-09-15)

- Grid의 선택 `minDisplayWidth`는 카드 축소 하한입니다. 지정 시 최대 columns 안에서 가용 폭을 나누고, 하한을 지키지 못할 때 열을 줄입니다. displayWidth는 카드 최대·목표 너비로 유지합니다. 생략하면 기존 고정 너비 배치를 유지합니다. Incorrect Usages는 목표 720px·최소 320px·최대 2열입니다.

- Grid·Carousel·Sticky는 모두 `cards: readonly GuidelineCardData[]`를 받습니다. 각 카드는 고유 `id`, 도판 판형 `ratio`, 도판 노드 `display`, 선택 캡션 `caption`을 가집니다.
- 로고 배경 비교처럼 내부 셀 비율을 보존하는 도판은 어댑터가 계산한 `displayAspectRatio`를 사용합니다. 세 컨테이너가 같은 계산값을 따르며 CMS에서 임의 수치를 입력하는 필드는 제공하지 않습니다.
- Grid의 children 입력과 컨테이너 ratio는 카드 목록으로 대체합니다. 같은 판형을 사용하려면 각 카드에 같은 ratio를 지정합니다. Carousel·Sticky 전용 카드 타입은 사용하지 않습니다.
- 컨테이너는 배치·크기·동작만 결정합니다. Grid는 목표 너비·최대 열 수, Carousel은 목표 높이·반복·재생, Sticky는 고정 모드·위치를 소유합니다.
- Display의 fit·scale·액션 조합은 기존 도판 컴포넌트가 소유합니다. 이 입력은 렌더링용이며 CMS 저장 스키마가 아닙니다. CMS 연결 시 도판 데이터를 노드로 변환하는 경계는 별도로 연결합니다.
- `/guideline/mockup#caption-playground`는 같은 카드 배열을 세 컨테이너에 그대로 전달합니다. 캡션 내부 스펙과 도판 내용은 유지하고 배치만 비교합니다.

### 동적 도판 첫 이식 (2026-09-15)

- `GuidelineDisplayFrame`은 이미지·위젯이 공유하는 판형·배경·잘림 영역입니다. 이미지 fit·scale은 기존 `GuidelineCardDisplay`가 소유합니다.
- `GuidelineClearspaceDisplay`는 기존 clearspace-overlay의 두 레이어 정합 방식을 사용하며, CMS 관계 대신 logoSrc·gridSrc·alt를 받습니다. 두 파일의 캔버스 비율이 같아야 합니다. 중앙 토글은 Off / On이며 Off로 시작하고 카드마다 상태를 소유합니다.
- `/guideline/mockup#dynamic-playground`에서 같은 카드 배열을 Grid·Carousel·Sticky로 비교합니다. `scripts/assets/ci`의 국문 가로형 정본 `ko-horizontal-default-logoSpace.svg`·`ko-horizontal-default-clearSpace.svg`를 public 경로에 복사해 사용합니다. 두 파일은 동일 viewBox(937.59 × 390.19)를 가지며 원본을 수정하지 않습니다. CMS·DB 변경은 없습니다.


### 공통 Off/On 토글 (2026-09-15)

- `useGuidelineOnOff(label)`은 카드별 상태를 Off로 초기화하고 `{ enabled, toggle }`을 반환합니다. 고정 라벨 Off / On과 문자열·boolean 변환은 공통 훅이 소유합니다.
- 위젯은 enabled로 도판 상태를 결정하고, toggle을 `GuidelineCardActions`의 center에 전달합니다. 기존 중앙 배치·Backplate를 재사용합니다. 보호공간 도판과 Card Actions 플레이그라운드가 같은 훅을 사용합니다.

### 서체 굵기 표본 이식 (2026-09-15)

- `GuidelineTypeWeightDisplay`는 language·weight를 명시적으로 받고 기본값은 ko·medium입니다. 기존 brand-typeface의 서체 스택·굵기·언어별 문구·행간을 재사용하며 CMS 타입과 컨트롤러를 참조하지 않습니다.
- 공통 도판 프레임 안에서 기존 DisplayFit으로 최소 460px 표본(제목 36px·본문 20px, 긴 영문은 줄의 실제 너비만큼 확장)을 함께 축소합니다. 원본 줄바꿈을 유지하며 표본을 확대하지 않습니다. 합성 굵기 안내는 유지합니다.
- 굵기명·설명은 공통 카드 캡션으로 분리합니다. `/guideline/mockup#type-weight-playground`에서 언어와 판형을 바꾸며 동일한 Light·Medium·Bold 배열을 Grid·Carousel·Sticky에서 확인합니다. 고정 표본형이므로 Off/On 토글은 없습니다.

- `GuidelineTypeWeightAdjustableDisplay`는 Medium으로 시작해 실제 제공되는 Light·Medium·Bold 세 굵기를 카드 액션 중앙 토글로 선택합니다. 고정 표본 렌더러를 재사용하고 actions 영역은 DisplayFit 밖에 두어 축소하지 않습니다. 상태는 카드별로 독립적이며 플레이그라운드의 네 번째 카드로 세 컨테이너에 표시합니다.


### 서체 명세 캡션 조합 (2026-09-15)

- Figma `4zXBMnMCPay346ohMBrMFA`의 Typography `160:3387`에서 Caption `160:9789`와 Sticky Items `167:9879`를 조회했습니다. 원본 Caption의 Specification → Korean / English → Kerning·Scale·Leading·Baseline 순서를 재사용합니다.
- 고정 굵기 카드에는 제목·설명과 현재 언어의 본문 명세, 조절 카드에는 Specification 제목과 국문·영문 두 명세 그룹을 조합합니다. 원본의 미완성 설명 `t`는 쓰지 않고 의미를 설명하는 문구로 대체합니다. 공통 캡션의 패딩·글자 크기·세로 묶음 구조는 유지합니다.
- Leading은 기존 LEADING 상수의 본문 범위이며, Scale 100%는 글자 비율입니다. 카드의 도판 축소율이나 토글 현재값을 뜻하지 않습니다. 규정 명세는 토글로 굵기를 바꿔도 유지합니다.


### 가이드 토글 카드 이식 (2026-09-15)

- `guide-displays.tsx`의 LayoutOverlay·LayoutGrid·CiLockup은 공통 카드 프레임과 중앙 Off/On을 사용합니다. 초기값은 Off, 상태는 카드별로 독립적입니다. 기존 도판 렌더러와 계산식을 재사용하는 어댑터 단계이며 deprecated 렌더러 의존은 남아 있습니다.
- 새 어댑터의 명시적 입력은 구형 컨트롤러 값에 영향을 받지 않습니다. 구형 호출은 선택 인자를 생략하면 기존 컨트롤러·hover 동작을 유지합니다. CI는 On에서 치수를 지속 표시하고, 내부 다운로드는 숨깁니다. 투명한 CI 도판은 접근성 트리에서도 숨깁니다.
- 보호공간은 `GuidelineClearspaceDisplay`의 일반 Off/On 카드로 통합합니다. 중복된 신규 ClearspaceViewer 어댑터·배율 슬라이더·최소 크기 판정 샘플은 제거했습니다. 기존 deprecated CMS 위젯은 유지하며, 신규 카드 API에서는 제공하지 않습니다.
- `/guideline/mockup#guide-playground`는 세 카드를 Grid·Carousel·Sticky에 동일하게 전달합니다. 보호공간은 기존 `#dynamic-playground`에서 확인합니다. 레이아웃은 기존 샘플 이미지, CI 색상은 기존 읽기 전용 조회를 사용합니다. CI 임시 서체는 캡션에 명시합니다. CMS 스키마 변경·DB 쓰기는 없습니다.

- CI 카드의 경계·배경은 `GuidelineDisplayFrame`만 소유합니다. 구형 렌더러는 새 카드에서 `framed=false`로 내부 보더·배경을 생략합니다. 치수 라벨의 선 가림 배경은 프레임의 `--guideline-display-background`를 참조합니다. 구형 독립 렌더러는 기존 표면을 유지합니다.

- 새 Layout Grid의 On 가이드는 CI와 같은 HD HERITAGE GREEN 색상 조회를 사용합니다. 9개 셀의 경계는 1px 선, 마진·거터 면은 그룹 opacity 0.05입니다. 구형 도판의 면 표현은 유지합니다.

### 가이드 안내선 정규화 (2026-09-15)

- 신규·이식 가이드의 안내선은 녹색 1px을 공통 기준으로 합니다. `features/guideline/cards/displays/guide-style.ts`가 선 두께와 색상 조회를 소유하며 Layout Grid·Layout Grid Overlay·CI Lockup이 공유합니다. 새 가이드마다 별도 accent·두께 옵션을 만들지 않습니다.
- 색상은 브랜드 데이터의 HD HERITAGE GREEN을 사용합니다. SVG로 그리는 안내선은 `vectorEffect="non-scaling-stroke"`를 적용해 판형 축소에도 표시 두께를 유지합니다. 면이 필요한 레이아웃 가이드는 5% 농도를 사용합니다. 프레임의 배경·경계와 안내선은 별개입니다.
- 파일로 불러오는 기존 보호공간 SVG와 DisplayFit으로 축소되는 기존 CI 도판은 원본 선까지 화면상 1px로 보장하지 않습니다. 신규 도판을 작성할 때 안내선은 축소되는 콘텐츠 바깥이나 비확대 스트로크로 그립니다. 기존 정본 에셋은 이 규칙 때문에 임의 수정하지 않습니다.

### 카드 액션 어휘 확장 (2026-09-15)

- START는 상태 배지, CENTER는 모드·옵션 전환, END는 실행 액션입니다. `GuidelineEndAction`은 button·link·copy·color를 받습니다. END의 `kind: group`은 label·actions를 가지며 각 액션의 id로 식별합니다. 그룹 안에는 배지·토글·중첩 그룹을 넣지 않습니다.
- 다중 선택은 기존 `GuidelineCardToggle`을 재사용합니다. `useGuidelineCopy()`는 실제 클립보드 요청 결과에 따라 idle·pending·copied·failed 상태를 제공하고, 중복 실행을 막습니다. 완료는 2초 뒤 idle로 돌아가며 END 버튼은 아이콘으로 복귀합니다. 재실행·언마운트 시 이전 복귀 타이머를 정리합니다. 실패 안내는 다음 실행 전까지 유지합니다. END의 copy는 같은 훅을 사용하고 성공 시 같은 36px 높이 버튼이 Copied 텍스트 pill로 바뀝니다. 개별 항목 복사도 같은 훅을 사용하되 항목 자체가 조작 지점을 소유합니다. 하단 정보 패널은 두지 않고, 마우스 이동 시 커서 옆 Copy to clipboard 안내를 표시합니다. 커서 안내는 background 60%·블러 8px·모서리 8px·좌우 12px/상하 7px·Pretendard SemiBold 16px/24px를 사용합니다. 성공 시 Copied를 표시하고 공통 복사 상태에 따라 2초 뒤 Copy to clipboard로 복귀합니다. 실패는 오류 문구로 안내하며, 화면 리더에는 status로 복사 결과를 전달합니다.
- color 액션은 label·value·presets·onValueChange를 받으며 value와 preset 값은 #RRGGBB 형식입니다. 프리셋 버튼은 선택 불투명도 1 / 비선택 0.3과 aria-pressed로 선택을 표시하고, 직접 입력은 회색 원형 아이콘 위 기본 color input을 사용합니다. 색상 적용 대상과 초기값·초기화는 소비처가 소유합니다. 공통 프레임의 배경 변수로 적용하며 내부 렌더러가 배경을 중복 생성하지 않습니다.
- `/guideline/mockup#action-vocabulary`에서 다중 토글·브랜드명 복사·개별/전체 색상값 복사·색상 프리셋/직접 입력/초기화를 확인합니다. 색상은 기존 DB 읽기 결과를 사용하며 임의 브랜드 팔레트를 만들지 않습니다. Figma 변경·CMS 스키마 변경·DB 쓰기는 없습니다.

- CENTER의 `GuidelineCardBreadcrumb`는 shadcn Breadcrumb 조합을 사용합니다. items의 마지막 항목이 현재 단계 텍스트이고, 앞 항목은 onNavigate(id)로 돌아가는 버튼입니다. 경로와 단계별 디스플레이 상태는 소비처가 소유합니다. 높이 36px이며 좁으면 가로 스크롤합니다. CI 플레이그라운드는 상위 단계 이동과 END 초기화를 연결합니다.

### 색상 디스플레이 이식 (2026-09-15)

- `structure/color-displays.tsx`의 로고 배경색 카드와 팔레트 카드는 새 카드 입력으로 조합합니다. 기존 CMS 렌더 맵의 deprecated 경로는 아직 유지합니다.
- 로고 카드는 black·white URL과 색상 목록을 받고 기존 대비 계산으로 자동 전환합니다. opacity(기본 1)는 0~1로 제한하고 underlay(기본 흰색)와 합성한 색으로 판을 그리며 대비를 판단합니다. 입력 색상은 6자리 HEX 계약입니다. 불투명도 조작 UI는 추가하지 않습니다.
- 팔레트는 그룹·색상 순서를 유지합니다. 색상은 위에서 아래로 쌓고 그룹은 좌우로 배치합니다. uniform은 최다 색 수에 행을 맞추고 그룹 너비를 균일하게, ranked는 각 열을 채우며 앞 그룹부터 N:…:1 너비로 표시합니다. 항목별 HEX 복사와 END 전체 복사를 사용합니다. 색상명·HEX·RGB·CMYK·PMS는 공통 명세 캡션으로 연결하고 내부 패널을 만들지 않습니다.
- `/guideline/mockup#color-playground`는 기존 brand-color-groups를 읽기만 합니다. DB 쓰기·스키마 변경은 없습니다.

- 색상 플레이그라운드는 Primary·Supportive·Monotone 단일군과 Brand(Primary + Supportive) 네 조합만 제공합니다. 기존 Primary Color·Secondary Color·Mono Color를 읽어 대응하며, 초록/파랑/검정 계열·Brightness Variation 및 전체 그룹의 중복 배열 예시는 제외합니다. 각 조합은 로고 배경색·스와치 카드로 비교합니다. DB 그룹 삭제나 이름 변경은 하지 않습니다.

- 단독 스와치는 한 카드에 한 색을 채우고 RGB·HEX·CMYK·PANTONE을 공통 명세 캡션의 개별 행으로 표시합니다. Primary·Supportive·Monotone별로 예시를 제공하며 Brand는 같은 색의 중복 단독 카드를 만들지 않습니다. 색면 클릭과 커서 안내는 팔레트와 같은 GuidelineColorSwatch를 재사용합니다. RAL은 현재 데이터 필드가 없어 임의 값을 넣지 않습니다.

### 팔레트 분류 계약

- `features/guideline/domain/contract/palette.ts`가 기본군(primary·supportive·monotone), 표시 조합(primary·supportive·monotone·brand), 색상 그룹 입력을 소유합니다. Brand는 Primary→Supportive 순서의 파생 조합이며 별도 저장군이 아닙니다.
- `resolvePalette`로 조합하고 필요한 군이 없거나 비어 있으면 null을 반환합니다. 알 수 없는 조합은 거부하며 임의의 대체군·부분 Brand를 만들지 않습니다.
- `repositories/palette.payload.repository.ts`는 `brand-color-groups.family`의 primary·supportive·monotone 키를 우선하며, 키가 없는 기존 Primary Color·Secondary Color·Mono Color는 호환 매핑으로 읽습니다. UI는 기존 DB 이름을 해석하지 않습니다.
- 새 CMS는 안정적인 family 키와 공통 팔레트 렌더러에 연결됩니다(2026-09-21). 키는 중복 등록할 수 없으며 게시된 그룹·색상만 조회합니다. 기존 데이터의 전체 이관과 deprecated 렌더 맵 제거는 후속입니다. 디스플레이는 분류를 판단하지 않고 이미 조합된 그룹을 표현합니다.


### 조건부 디스플레이 검토

- `/guideline/mockup#display-review`는 TypeSpecimen 편집, 보류 중인 CiLockupHero 자회사/해외지사 순환, LogoOnBackground 배경별 규정을 비교합니다. StemClearSpace 검토 예제와 신규 선택은 제거했습니다. 기존 저장 콘텐츠는 전체 이관까지 유지합니다.
- LogoOnBackground는 드래그·방향키 이동 없이 모든 색상과 해당 로고를 세로 행으로 동시에 표시합니다. Primary·Supportive·Monotone·Brand 네 조합을 `resolvePalette`로 구성하고 기본형·단색형을 나란히 비교합니다.
- `PaletteColor.logoUsage`는 기본형·화이트 워드마크 허용 여부와 단색형 색상을 소유합니다. 기존 CMS 값은 팔레트 저장소에서 변환하며 미등록은 null입니다. 대비 계산으로 규정을 추론하지 않습니다. 사용 금지·규정 미등록·로고 파일 미등록은 구분합니다. DB 쓰기나 스키마 변경은 없습니다.

- 레거시 Supportive의 표시 순서는 Figma `167:11710`에 맞춰 Light Green → Light Blue → Deep Green → Deep Blue입니다. family 키가 있는 새 그룹은 CMS에 등록한 순서를 따릅니다. Brand 조합·스와치·배경 비교가 같은 순서를 사용합니다. White·Black은 Monotone 소속을 유지합니다.

- LogoOnBackground의 로고는 각 색상 행의 중앙에 배치합니다. 왼쪽 색상명은 absolute 레이어로 흐름에서 제외하며 로고 위치에 영향을 주지 않습니다. 사용 금지 행은 로고와 금지 라벨 없이 색상만 표시합니다.

- LogoOnBackground는 팔레트당 한 카드로 통합합니다. 같은 배경 행에 기본형·WHITE 워드마크·단색형 세 열을 고정하고 각 허용 여부를 독립 판정합니다. 열 사이 1px 반투명 흰색 보더를 두고 로고는 셀 중앙에 배치합니다. 시각적 컬러 라벨은 제거하며 사용 금지는 빈 셀과 보조기술용 설명으로 전달합니다. 기존 mode 입력은 제거했습니다.

- 로고 배경 비교는 320px·1:1, 480px·4:3, 480px·3:4, 720px·3:4 네 크기에서 네 팔레트를 표시합니다. 캡션의 셀 높이는 목표 너비 기준 계산값이며 좁은 화면의 실제 높이는 함께 줄어듭니다.

- 로고 배경 비교는 현대 사명이 없는 심볼+HD 가로형을 사용합니다. `scripts/assets/ci/hd-horizontal-{default,white,mono}.svg` 원본을 `public/brand/hd/`에서 제공하며 기본형·WHITE 워드마크·단색형 열에 각각 연결합니다.

- LogoOnBackground는 각 셀을 16:9로 고정합니다. 3열이므로 행 높이는 전체 너비 × 3/16이며, 전체 도판 비율은 48:(9×색상 수)로 계산해 일반 카드 ratio보다 우선합니다. 캡션은 도판 밖에 유지합니다. 비교 예제는 320·480·720px 세 너비이며 기존 전체 도판 판형 비교는 대체합니다.

- LogoOnBackground의 내부 심볼+HD는 셀 중앙의 가로·세로 50% 영역 안에서 원본 비율을 유지합니다. 기존 128px 너비·40px 높이 상한을 셀 기준 50%로 대체하며 기본형·WHITE형·단색형에 동일하게 적용합니다.

### 팔레트 공통 진입점

- `GuidelinePaletteDisplay`는 공통 `groups: readonly PaletteGroup[]`와 필수 `variant`를 받습니다. `swatches`는 선택 layout(uniform·ranked)을, `logo-backgrounds`는 필수 logos(default·white·mono)를 받으며 서로의 옵션은 허용하지 않습니다.
- 기존 스와치·로고 배경 렌더러를 재사용합니다. 색상 순서는 입력을 따르며 스와치의 복사 동작, 로고 셀 16:9·중앙 50%·3열 규정 표현은 유지합니다. 단독 스와치는 별도 최소 요소로 유지합니다. 플레이그라운드는 이 공통 진입점을 사용합니다. CMS 저장 스키마 변경은 없습니다.

### 목표 페이지 적용

- `/guideline/reference/infographics`는 Overview·Charts 12개·Incorrect Usages 6개를 신규 구조로 표시합니다. Incorrect Usages의 헤딩은 유지하고 본문·카드 캡션은 승인된 한국어 문구를 사용합니다. 금지 상태는 START 배지, 설명은 도판 밖 공통 캡션, 판형은 4:3입니다. 섹션 강조는 기존 className 입력과 destructive 토큰으로 구성하며 별도 디스플레이 타입은 추가하지 않습니다. Related Resources의 Infographic Builder는 END 링크 액션으로 예약 경로 `/studio/graph`에 연결합니다. 대상 화면은 다른 팀이 구현하며 이 페이지에서 경로를 생성하지 않습니다. CMS 쓰기는 없습니다.

- `/guideline/reference/illustrations`는 Figma `176:13272`의 Overview·Charts(11개)·Usecase(3개)·Related Resources 순서를 재현합니다. 모든 섹션은 독립 main으로 상하 패딩을 유지하며 Grid·Carousel과 공통 카드/캡션을 조합합니다. Usecase는 표준 3:4 판형, 그리드는 1:1, Overview는 16:9입니다. 원본의 임시 문구와 녹색 Overview 도판을 유지합니다. Related Resources에는 원본과 저장소 모두 연결 주소가 없어 실행 액션을 생성하지 않습니다. 에셋은 `public/guideline/reference/illustrations`에서 제공하며 CMS 쓰기는 없습니다.

- `/guideline/reference`의 Corporate Identity는 신규 DisplayHeading·Section·Grid·Sticky·CardDisplay·Caption·DisplayFooter를 조합합니다. 준비된 기존 콘텐츠·에셋을 사용하며 CMS 쓰기는 하지 않습니다. Brand Signature는 Grid, Safe Area는 하위 섹션과 Sticky로 표현합니다.
- Corporate Identity는 공통 문서 배경을 사용하고 도판 없는 개발용 안내·중복 캡션은 표시하지 않습니다. 대표 로고의 END 액션으로 기본형 SVG를 다운로드하며, 기존 섹션 ZIP은 유지합니다. 최소 크기 표본과 보류 중인 CI Lockup은 변경하지 않습니다.
- HD 심볼+워드마크의 정본 보호공간 SVG 두 레이어를 Off/On으로 표시하고 섹션별 등록 에셋만 다운로드합니다. 원본 도판이 없는 두 항목은 캡션만 유지합니다. 플레이그라운드는 `/guideline/mockup`으로 연결합니다. CMS 저장 모델 이관은 후속입니다.

- `/guideline/reference/physical-publications`는 Figma `176:15107`의 Brochure·Banner·Poster·Related Resources를 공통 카드로 구성합니다. 대표 도판 5개는 16:9 Grid, 표지·내지·가로/세로 배너·포스터 24개는 5개 Carousel로 표시합니다. 표지는 3:4, 나머지 세부 예시는 1:1이며 contain 80%를 적용합니다. 하위 헤딩은 상위 섹션 안에 배치하고 원본의 임시 문구는 한국어 설명으로 정리합니다. 에셋은 제공된 `guideline_assets/web/applications`의 원본을 public으로 복사합니다. Brochure Create Studio는 목적지 미정으로 실행 링크를 만들지 않습니다. CMS 쓰기는 없습니다.

- `/guideline/reference/digital-publications`는 Figma `176:16472`의 Media Wall·Presentation·Related Resources를 공통 카드로 구성합니다. 대표 도판 3개와 미디어월·표지·본문 캐러셀 3개(각 3장)는 16:9·contain 80%를 적용합니다. 중복된 Display Type Examples는 Cover Type Examples와 Body Type Examples로 구분하고 원본의 임시 설명은 한국어로 정리합니다. 제공된 media-wall·presentation 에셋을 사용하며 Related Resources는 원본의 Brochure Create Studio를 유지하되 미지정 링크를 만들지 않습니다. CMS 쓰기는 없습니다.

### 이름으로 선택하는 캐러셀

- `GuidelineCarouselContainer`의 `navigation`은 기본 `counter`이며 `labels`를 선택하면 카드별 `selectionLabel`이 필수입니다. 이름 선택 모드는 한 화면에 카드 한 장을 배치하고 도판 아래에 이름 선택 컨트롤을 표시합니다. 기존 카드 입력과 Grid·Carousel·Sticky 세 컨테이너 구분은 유지합니다.
- 선택 상태는 Embla의 현재 카드가 소유합니다. 이름 클릭은 해당 카드로 이동하고 자동 재생을 멈추며, 드래그·재초기화 시 선택 컨트롤도 갱신됩니다. 좁은 화면에서는 선택지 영역만 가로 스크롤합니다.
- `GuidelineSelection`은 기존 카드 토글에서 추출한 단일 선택 컨트롤입니다. 카드 CENTER와 캐러셀 탐색이 같은 Backplate 표현을 사용하며 배치와 상태는 각각 소비처가 소유합니다.
- `/guideline/reference/extra-applications`는 Figma `176:17047`의 Vehicle Wrapping·Shopping Bag을 구성합니다. 차량은 Box Truck→Flatbed Truck→Bus→Van 순서로 실제 차종 에셋을 연결하고 쇼핑백 대표 예시 2개는 16:9 Grid를 사용합니다. CMS 저장 스키마·DB 쓰기는 없습니다.

- `/guideline/reference/typography`는 Figma `160:3387`의 Bold Approach·HD Typeface·Weight·Micro Typography·Hierarchy를 공통 카드로 구성합니다. 굵기 비교는 Grid, 국문/영문 전환은 이름 선택 Carousel과 기존 굵기 토글, 위계는 3개 언어 표본과 명세 캡션을 가진 switch Sticky를 사용하며 스크롤에 따라 고정된 명세가 교체됩니다. 서체 수치와 본문은 `brand-typeface.ts` 계약을 재사용합니다. 원본의 Bold 600 및 반복된 영문 행간 표기는 실제 제공 굵기 700과 기존 Artboard 언어별 행간에 맞춥니다. TypeSpecimen 편집·동적 베이스라인 오버레이는 후속이며 CMS 쓰기는 없습니다.

- Weight 디스플레이는 기존 단일 `language`와 함께 비어 있지 않은 `languages` 배열을 지원합니다. 배열이 있으면 순서대로 표본을 쌓고 하나의 DisplayFit으로 함께 축소하며 카드의 굵기를 공유합니다. Typography Weight는 국문·영문을 합친 2:3 카드와 기본 캡션(Bold 700 / Medium 500 / Light 300)을 사용합니다. 소비처의 `className`으로 프레임 배경·상속 글자색을 지정합니다.

### 카드 도판 색상 계약

카드가 `backgroundColor`·`foregroundColor`를 선택적으로 소유합니다. Grid·Carousel·Sticky는 동일한 카드 입력을 전달하며 색상을 결정하지 않습니다. 이 계약은 Weight 전용 옵션이 아닙니다.

| 입력 | 책임 | 생략 시 |
| --- | --- | --- |
| `backgroundColor` | DisplayFrame의 도판 바탕색 | 기존 도판 기본 배경 유지 |
| `foregroundColor` | 도판 콘텐츠의 기본 전경색 | 기존 콘텐츠 기본 전경 유지 |

- `foregroundColor`는 글자색에 한정하지 않습니다. 텍스트는 `color`를 상속하고, 전경색을 따르는 단색 아이콘·인라인 SVG·로고·도형은 `currentColor`로 선과 면을 그립니다. 해당 색상은 콘텐츠 레이어에만 적용하며 프레임 전체에 무조건 상속시키지 않습니다.
- 사진·다색 이미지·고유 색상 규정이 있는 콘텐츠는 원본 색상을 유지합니다. 외부 SVG를 포함한 이미지 파일은 `color`를 자동 상속하지 않으며 필터나 강제 착색으로 대체하지 않습니다. 단색 로고도 전경색 지원 렌더러와 브랜드 사용 규정이 허용하는 경우에만 적용합니다.
- 카드 액션·상태 배지·가이드라인 오버레이·캡션은 전경색 적용 범위에서 제외합니다. 각자의 UI·상태색·1px 녹색 가이드 규칙을 유지합니다.
- CMS는 기존 팔레트와 같은 `brand-colors` 관계를 저장하고, 렌더링 전 게시된 색상의 HEX로 해석합니다. 참조를 읽을 수 없거나 HEX가 유효하지 않으면 기본색을 유지합니다. 별도 팔레트 분류는 만들지 않습니다.
- 전경색을 생략했다고 배경색으로부터 자동 반전하거나 로고 변형을 추론하지 않습니다. 로고 배경 대비 선택·사용 허용 여부는 해당 디스플레이의 기존 계약을 따릅니다.
- 공통 카드가 색상 변수를 소유하고 세 컨테이너가 같은 입력을 전달합니다. `GuidelineDisplayFrame`은 배경색, `GuidelineDisplayContent`는 상속 가능한 전경색을 적용합니다. 서체 굵기 디스플레이가 콘텐츠 레이어를 사용합니다. 기존 레퍼런스 페이지의 개별 스타일 이관은 별도 작업입니다.

- Typography의 HD Typeface는 제공 폴더의 기준 PDF 33쪽 국문·영문 표본, Micro Typography는 35쪽 혼용 조판 도판, Incorrect Usages는 40쪽 여섯 사례와 실제 규정 문구를 사용합니다. PDF 도판은 투명 PNG로 추출하며 원본 가이드선은 이미지의 일부입니다. 별도 글줄·자간·커닝 설명 도판은 제공되지 않아 생성하지 않습니다. Usecases는 제공된 X Banner·Poster·Presentation 에셋으로 구성합니다. 추출·복사 출처는 `public/guideline/reference/typography/README.md`에 기록합니다.

- Typography의 Incorrect Usages도 Infographics와 동일한 외부 여백·`rounded-3xl bg-destructive/15` 패널·중앙 헤딩을 사용합니다. 그리드는 목표 720px·최소 320px·최대 2열이며 공통 Section·Grid 조합을 유지합니다.

- `/guideline/reference/layouts`는 제공 에셋의 Overview·Type A/B/C를 공통 Grid·Carousel로 구성합니다. 전체 및 타입별 Overview는 한 장짜리 일반 카드(1열 Grid)이며 캡션은 도판 아래에 배치합니다. 적용 예시 16개(A 4·B 9·C 3)는 기존 `GuidelineClearspaceDisplay`와 카드별 Off/On을 재사용합니다. `cms-assets.json`의 관계를 따라 이미지와 제작 규칙 SVG를 연결하며, 사용자 승인에 따라 정합 여부와 무관하게 동일 contain 영역에 원본 SVG 전체를 겹칩니다. 신규 1px 가이드 생성이 아니라 제공된 문자가 포함된 도판 중첩이며 원본 에셋을 수정하지 않습니다. CMS 쓰기는 없습니다.

- Layouts 적용 예시는 Type A가 최대 4열 Grid(목표 320px·최소 240px), Type B가 최대 2열 Grid(목표 720px·최소 320px)이며 Type C만 Carousel을 유지합니다. 카드별 Off/On 오버레이는 동일합니다.

- Layouts의 On 오버레이는 선택 `dimBackground`를 사용해 이미지 → 80% background 테마색 디머 → SVG 순서로 표시합니다. 라이트에서는 흰색, 다크에서는 기존 background의 검정 계열이며 Off에서는 디머도 제거합니다. 액션은 디머 밖에 유지하고 다른 소비처의 기본값은 false입니다.

- `/guideline/reference/key-visuals`는 제공 PDF 59쪽의 Visual Concept & Motif는 한 장짜리 일반 카드로, Type A/B 모티프는 HD Direction, Type C/D 모티프는 HD Dimension의 Types 아래 각각 2열 3:4 카드로, 제공 적용 예시 21개를 타입별 Carousel로 표시합니다. Incorrect Usages 18개는 기존 적색 패널·중앙 헤딩·최대 2열 Grid·START 금지 배지를 재사용합니다. 문구는 PDF 63·66·69·73쪽을 따르되 Type B 03/04 파일의 실제 내용에 맞춰 순서를 연결합니다. 권장 예시가 함께 있는 도판은 캡션에 명시합니다. 제작 수치·구조 규칙 전체와 CMS 연결은 구현 범위에 포함하지 않습니다.

- `/guideline/reference/iconography`는 제공 SVG의 디자인 콘셉트·Line/Solid 제작 규칙·각 10개 아이콘을 공통 Grid로 구성합니다. 48×48px·Padding 12px·Line 1px·Solid 5–6px 명세는 제공 PDF 79–80쪽을 따릅니다. `/guideline/reference/color`는 기존 `findPaletteCatalog`를 읽기 전용으로 사용하고 Primary·Supportive·Monotone 단독 스와치, Brand 스택, 네 팔레트의 로고 배경 비교를 조합합니다. 미등록 데이터는 안내로 표시하며 색상·허용 규정을 추론하거나 DB에 쓰지 않습니다.

- Iconography의 도판 카드 23개는 END 다운로드 액션으로 표시 중인 원본 SVG를 받습니다. 섹션 전체 다운로드는 Line/Solid의 하위 Icons에만 제공하며 각각 아이콘 10개를 ZIP으로 묶습니다. Overview와 메인 섹션에는 전체 다운로드를 표시하지 않으며 하위 섹션을 재귀 수집하지 않습니다.

- 섹션 전체 다운로드는 테두리 없는 muted 버튼·Medium(500)으로 표시하며 기본 배경은 카드 디스플레이와 같은 `muted`입니다. 기본 문구는 수량 없이 `전체 다운로드`입니다. 준비 중·실패 재시도·접근성 라벨은 유지합니다.
- 전체 다운로드의 기본·눌림 전경색은 카드 액션과 같은 `foreground`, 호버·포커스는 `action-hover-foreground`를 사용합니다. 호버·포커스 배경은 카드 액션 배경과 같은 `border`이며 포커스 링·비활성 표시는 기존 Button 규칙을 따릅니다.
