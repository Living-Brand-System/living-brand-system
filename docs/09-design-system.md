# 09. 디자인 시스템

이 문서는 Creator UI와 guideline 렌더링 계층의 시각 언어를 정의합니다.
토큰의 값이 아니라 토큰의 **소유 위치와 사용 규칙**을 정리하는 지도 문서이며, 실제 값의 단일 출처(SoT)는 언제나 CSS 파일입니다.

그 시각 언어가 무엇 위에 서 있는지(프런트엔드 스택)와 외부 레퍼런스를 어디까지 따르는지는 **§9**가 정의합니다.

## 1. 적용 범위

이 문서는 시각 스타일을 다루는 두 표면에만 적용합니다.

| 대상 | 위치 | 기준 |
| --- | --- | --- |
| Creator UI | `src/app/(frontend)` | 셸, 헤더, 전역 컴포넌트의 색·타이포·간격 |
| guideline 렌더링 계층 | `src/features/guideline` | 페이지·블록·카드·디스플레이가 토큰을 소비하는 방식 |

Payload Admin 기본 화면은 이 문서의 대상이 아닙니다. Payload가 제공하는 기본 스타일과 접근성을 우선하며, `docs/08-accessibility-i18n.md`의 적용 범위와 동일하게 프로젝트가 직접 추가한 Admin 확장 화면에만 이 문서를 참고합니다.

가이드라인 **콘텐츠**가 그리는 브랜드 색·폰트·로고(스와치·팔레트·로고 카드)는 스타일 규칙이 아니라 **데이터**입니다. 그 소유와 주입 경로는 `docs/05-system-architecture.md`가 정의합니다. 앱 UI 자체의 색은 데이터가 아니라 §3의 토큰입니다 — 제품이 HD 전용이 되어(2026-10-06) 런타임 브랜드 주입을 걷었습니다.

접근성·다국어 경계는 `docs/08-accessibility-i18n.md`, 소스 위치·네이밍·`use client` 경계는 `docs/06-project-structure.md`가 소유합니다. 이 문서는 두 문서를 링크만 하고 규칙을 복제하지 않습니다.

## 2. 두 속도 모델

디자인 시스템은 서로 다른 속도로 바뀌는 두 층으로 나뉩니다. 이 문서(09)는 (A)만 소유하고, (B)는 `docs/10`에 위임합니다.

| 층 | 대상 | 변경 빈도 | 소유 문서 |
| --- | --- | --- | --- |
| (A) 불변 파운데이션 | 색, 타이포, radius, 다크 모드, 셸/프레임 골격 | 값이 실제로 바뀔 때만 | 09 (이 문서) |
| (B) 컴포넌트별 UI | 매번 추가되는 블록·프리미티브 조합, variant, 저작 규칙 | 상시 (슬롭 위험 큼) | `docs/10` |

컴포넌트를 새로 추가할 때 09를 손대지 않습니다. 새 블록은 (A)가 정한 토큰과 프레임을 소비할 뿐, 파운데이션을 바꾸지 않습니다. 파운데이션을 건드려야 하는 변경이라면 그것은 컴포넌트 작업이 아니라 09 개정입니다.

## 3. 토큰 소유 지도

> **경고: 값의 단일 출처는 CSS입니다.** 아래 표는 이름과 소유 파일을 가리키는 지도이며 값의 사본이 아닙니다. 구체 값(oklch, radius, hex)이 필요하면 표에 링크된 CSS 파일을 여십시오. 이 문서에 값을 옮겨 적으면 두 곳이 갈라집니다.

| 토큰군 | 의미 | 소유 파일(SoT) |
| --- | --- | --- |
| L0 원시 팔레트 | Tailwind 기본 팔레트(neutral 50~950·white·black·상태색 계열) + HD 팔레트(`--color-hd-*`, `@theme` 등록). 컴포넌트는 직접 쓰지 않는다 | `tailwindcss/theme.css`, `src/app/color-tokens.css` |
| L1 shadcn 세트 | `:root`(라이트)·`.dark`/`[data-theme="dark"]`(다크)의 shadcn 표준 슬롯(background·primary·muted·border·chart-1~5·sidebar-* 등). 값은 L0 참조만. **앱과 어드민이 같은 파일을 import한다** | `src/app/color-tokens.css` |
| color 유틸 매핑 | L1·L2 → `@theme inline`의 `--color-*` 유틸 토큰 | `src/app/color-tokens.css` |
| inverted | 반전 표면과 그 전경의 짝 `--inverted`/`--inverted-foreground` | `src/app/color-tokens.css` |
| overlay | 모달(dialog·sheet) 뒤를 가리는 막. 테마와 무관하게 검정이고 알파는 쓰는 쪽이 붙인다(`bg-overlay/80`) | `src/app/color-tokens.css` |
| action-hover-foreground | 액션의 호버·포커스 전경색. 눌림은 기존 `foreground`를 사용 | `src/app/color-tokens.css` |
| chart-1~5 | HD 초록 다섯 단(prosperity·heritage·eco·deep·light, 다크는 4·5 교대). 번호가 계약 — 사용량 막대·일자 스트립·카메라 궤도 축·어드민 대시보드가 번호로 집는다 | `src/app/color-tokens.css` |
| 상태색 | 판정·상태 표시 전용 `--success`/`--info`/`--warning`(실패는 기존 `--destructive`, 해당 없음은 `--muted`) | `src/app/color-tokens.css` |
| highlight | 강조 배경(그라디언트)과 전경 토큰, `.bg-highlight` 클래스. 앱·어드민 공통 | `src/app/color-tokens.css` |
| radius | `--radius` 뿌리 1개에서 `--radius-sm/md/lg/xl/2xl/3xl` 6단 파생(`lg`는 뿌리값, 나머지는 calc) | `src/app/(frontend)/theme.css`, `src/app/(payload)/admin-tailwind.css` |
| studio-rail-idle-foreground | StudioRail의 Idle 아이콘 전경색 | `src/app/color-tokens.css` |
| controller-pad radius | Position 컴파운드 내부 패드의 `--radius-controller-pad` 파생 토큰 | `src/app/(frontend)/theme.css` |
| 폰트 패밀리 | `--font-body`(Pretendard), `--font-title`(**미정 — Pretendard로 폴백.** 토큰과 `.font-title`은 자리를 지키고 있으니 서체가 정해지면 값만 바꿉니다), `HD`(CI 락업 워드마크 전용 @font-face) | `src/app/(frontend)/theme.css` |
| 루트 크기 | 모든 화면에서 고정된 16px `rem` 기준 크기 | `src/app/(frontend)/styles.css`의 `html` |
| 타이포 리듬 | `.typeset` 블록의 크기·행간·흐름(shadcn/typeset) | `src/app/(frontend)/typeset.css` |
| base body / scrollbar / import 순서 | `body` 기본, `scrollbar-none` 유틸, CSS `@import` 체인 | `src/app/(frontend)/styles.css` |

`--radius`는 뿌리 토큰 하나이고 나머지 6단은 그것을 기준으로 파생합니다(`--radius-lg`는 뿌리값 그대로, 나머지는 `calc()`; `theme.css`). radius를 조정할 때는 파생값이 아니라 뿌리 하나만 바꿉니다.

Frontend의 `highlight`는 Figma 강조 스타일을 옮긴 그라디언트입니다. `bg-highlight`가 가로 밴드를 2배로 늘려 왼쪽에서 오른쪽으로 반복 이동시키고, 모션 감소 설정에서는 정지합니다. 어드민도 같은 클래스를 씁니다(2026-10-06 전까지는 Payload success 색에 매핑돼 있었습니다). Badge와 Button은 `bg-highlight`와 `text-highlight-foreground`를 함께 사용하며, 개별 컴포넌트에서 색이나 gradient stop을 다시 선언하지 않습니다.

## 4. 닫힌 토큰 규칙

색·간격·radius·폰트는 **시맨틱 토큰과 그 유틸 클래스로만** 표현합니다. `bg-primary`, `text-foreground`, `border-border`, `bg-muted`, `text-success`, `font-body`, `rounded-md`처럼 이름이 의미를 가리키는 유틸만 사용합니다. **토큰에 없으면 틀린 것**이라는 이진 규칙을 적용합니다.

판정 상태는 `success`, `info`, `warning`, `destructive`를 사용합니다. 라이트·다크 모드의 명도 차이는 각 표면의 테마 파일이 소유하며 컴포넌트에서 `dark:` 팔레트 클래스를 다시 선언하지 않습니다. 상태는 라벨·아이콘과 함께 표시해 색만으로 의미를 전달하지 않습니다.

토큰은 2단 인디렉션을 거칩니다.

```text
L0 원시 팔레트 (tailwindcss/theme.css, color-tokens.css의 --color-hd-*)
  → L1·L2 슬롯 (color-tokens.css :root / .dark·[data-theme="dark"])
    → @theme inline --color-* (color-tokens.css)
      → Tailwind 유틸 (bg-primary, text-foreground, ...)
```

`className`/`style` 리터럴에서 다음은 금지합니다.

- 생 hex 리터럴(예: `#a1b2c3`)
- 생 Tailwind 팔레트 + 숫자 — 무채색(`neutral`/`gray`/`zinc`/`slate`/`stone`)만이 아니라 **유채색 전체**(`emerald`, `sky`, `amber`, `orange` 등)를 포함합니다. 🔴 숫자가 없는 `white`·`black`도 같습니다 — 탐지 grep이 숫자만 보고 있어 `bg-white`가 실제로 통과한 적이 있습니다(2026-08-12, shadcn slider). `bg-emerald-500/15`처럼 유채 팔레트로 상태를 칠하는 것도 위반입니다.
- `.tsx` 안의 `oklch(...)` 리터럴

성공/정보/경고/실패 같은 **판정·상태 표시는 상태 토큰만** 사용합니다: `--success`/`--info`/`--warning`/`--destructive`(해당 없음은 `muted`). 사용 형태는 destructive 선례를 따릅니다 — pill은 `bg-success/15 text-success`, dot은 `bg-success`. 상태 토큰으로 표현할 수 없는 새 상태가 생기면 팔레트로 우회하지 말고 이 문서와 `color-tokens.css`에 토큰을 추가합니다.

**예외:** 색 자체를 데이터로 다루는 컴포넌트(`ColorSwatch`, `ColorPalette` 등)가 props나 CMS로 받는 hex는 스타일이 아니라 **데이터**이므로 허용합니다. 이때 hex는 코드에 고정되지 않고 주입됩니다.

탐지용 grep:

```sh
rg -n '#[0-9a-fA-F]{3,8}\b|(?:bg|text|border|ring|fill|from|to|via)-(?:(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|neutral|gray|zinc|slate|stone)-[0-9]|white|black)\b|oklch\(' src --glob '*.tsx'
```

이 명령이 색 데이터 컴포넌트 밖에서 걸리면 토큰 위반입니다.

## 5. 다크 모드와 브랜드 오버라이드

다크 모드는 `.dark` **클래스** 방식입니다. `prefers-color-scheme` 미디어 쿼리가 아니라, `@custom-variant dark (&:where(.dark, .dark *))`(`theme.css`)로 정의하고, `next-themes`의 `ThemeProvider`를 `attribute="class"` + `defaultTheme="system"` + `enableSystem`(`layout.tsx`)으로 구동합니다. 시스템 설정은 `next-themes`가 읽어 `.dark` 클래스로 변환하므로, 원시값은 라이트가 `:root, .light`, 다크가 `.dark, [data-theme="dark"]`(둘 다 `color-tokens.css`) 한 곳에서만 갈립니다. `[data-theme="dark"]`는 Payload 어드민의 다크 스위치입니다.

`:root`가 `.light`와 블록을 공유하는 것은 **부분 트리에 라이트 토큰을 다시 선언할 수 있게** 하기 위한 것입니다. 값을 복제하지 않고 선택자만 늘렸습니다.

### 색을 데이터로 주입하는 면은 **토큰 스코프도 함께 선언**합니다

§4의 색-데이터 예외로 면에 hex를 주입할 때, 배경만 넣으면 그 면의 전경·테두리·muted가 바깥 스코프에 남습니다. 라이트 모드 페이지에 어두운 브랜드 색을 깐 면은 배경만 어두워지고 안쪽 컴포넌트는 라이트 팔레트의 near-black 컨트롤을 그대로 그려 면에 묻힙니다(반대 방향도 같습니다). 전경색 한 개를 짝지어 주는 것으로는 부족합니다 — 안쪽이 쓰는 것은 색이 아니라 토큰이기 때문입니다.

그러므로 hex를 주입하는 자리에서 그 밝기로 `light`/`dark`를 골라 같은 요소에 선언합니다. 선례는 문서 히어로(`pages/guideline-topic.tsx`)의 `dark` 스코프이고, `text-foreground`를 함께 주는 이유도 거기 적혀 있습니다(색 클래스가 없는 면은 바깥에서 **계산된** 색을 상속하므로 토큰 재선언만으로는 글자 색이 따라오지 않습니다).

🔴 이 스코프 전환은 토큰만 되돌립니다. `dark:` 유틸은 `.dark *` **후손** 선택자라 다크 페이지 안의 밝은 섬에서도 여전히 걸립니다. §4가 컴포넌트에서 `dark:` 팔레트 클래스를 금지하는 이유가 여기서 한 번 더 성립합니다.

**색 토큰은 3층입니다(2026-10-06).** L0 원시 팔레트 → L1 shadcn 세트 → L2 확장. 구조와 규칙은 `color-tokens.css` 머리 주석이 소유합니다. 요점만:

- **L1·L2 값은 L0 참조만** 씁니다(`--muted: var(--color-neutral-100)`). oklch·hex 리터럴을 적지 않습니다 — 숫자를 베끼면 L0와의 관계가 안 보이고, 그 틈으로 단계 밖 값(옛 다크 배경 `#121212`)이 섞였습니다. 예외는 작품 그라디언트(`--highlight-background`)뿐입니다.
- **중립색은 Tailwind neutral 단계만** 씁니다. shadcn 다크 기본값의 흰색 알파 테두리도 neutral 단계(border 800·input 700)로 바꿨습니다.
- **L1은 shadcn 슬롯을 그대로 유지**합니다. 쓰지 않는 슬롯(`secondary`·`sidebar-primary`)도 지우지 않습니다 — shadcn 컴포넌트를 새로 받을 때 그 이름을 전제합니다. 같은 값을 가진 슬롯이 여럿인 것(`muted`=`secondary`=`accent`)도 shadcn neutral 기본 구성입니다.
- **L2 확장은 shadcn 규약**(같은 파일, `@theme inline` 등록)을 따릅니다: `inverted`·`overlay`·`action-hover-foreground`·상태색·`highlight`·`studio-rail-idle-foreground`.
- **브랜드 색은 shadcn 슬롯으로만 들어옵니다.** `primary`는 브랜드 색이 아니라 neutral-900입니다(시안의 기본 버튼이 검정). HD 색은 L0 `--color-hd-*`에 등록하고 `chart-1~5`가 받습니다. 값의 정본은 `scripts/seed-hd-brand-colors.ts`이고 `color-tokens.css`는 그 사본입니다. 🔴 Figma 변수의 hex는 seed와 대조한 뒤 옮깁니다 — 둘이 갈라진 전례가 있습니다(HD LIGHT BLUE).
- 예전에는 가이드라인 설정(`primaryColor`)이 `layout.tsx`에서 `--primary`를 덮었습니다. HD 전용이 되며 걷었습니다 — admin에서 색 하나를 바꾸면 버튼 40여 곳이 함께 바뀌는 통로였습니다. 필드는 MCP가 아직 읽으므로 남아 있습니다.

`accent`, `secondary`, `ring`은 중립 단계로 고정되어 있습니다(🔴 `--accent`는 `--muted`와 **같은 값**입니다 — hover가 `bg-muted`이므로 `accent`로 선택 상태를 칠하면 선택과 hover가 구별되지 않습니다. 채워진 상태는 `primary` 짝을 씁니다).

**어드민도 같은 토큰을 읽습니다(2026-10-06).** `admin-tailwind.css`가 `color-tokens.css`를 import해, 어드민에 올린 우리 컴포넌트(대시보드·필드·컨트롤러 킷·`components/ui`)는 앱과 같은 색입니다. Payload 자체 화면(목록·폼 크롬)은 여전히 Payload 회색(`--theme-elevation-*`)이라 둘 사이에 미세한 회색 차이가 있습니다 — 의도한 경계입니다. 예전 구조의 함정 하나: 어드민의 `@theme inline`이 Payload 변수로 **값을 직접** 컴파일했기 때문에, `.lbs-kit`에서 `--color-*`를 덮어쓴 것은 유틸에 아무 효과가 없었습니다(`@theme inline`은 변수 이름이 아니라 값을 유틸에 박는다).

## 6. 타이포그래피와 프리미티브 소재

새 `H1`/`H2` 컴포넌트를 발명하지 않습니다. 텍스트 프리미티브는 `Typography`(`as`/`family`/`size`/`tone`/`weight`)를 재사용하고, 여러 화면 표면이 공유하는 제목 조합은 `src/components/shared/content-heading.tsx`의 `ContentHeading`을 사용합니다.

`rem`의 기준 크기는 `styles.css`의 `html`이 16px로 고정합니다. 폰트 크기는 커스텀 토큰 없이 아래 Tailwind 유틸리티만 사용합니다.

| 역할 | 유틸리티 |
| --- | --- |
| Badge·비필수 메타·캡션 | `text-xs` |
| 본문·입력·일반 버튼·메뉴 | `text-sm` |
| 큰 버튼·카드 제목 | `text-base` |
| H1 설명·lead | `text-xl` |
| 섹션·로컬 페이지 제목 | `text-2xl` |
| 페이지·챕터 제목 | `text-5xl` |
| 최상위 H1 | `text-6xl` |

14px 텍스트와 함께 쓰는 아이콘은 `size-4`, 16px 텍스트와 함께 쓰는 아이콘은 `size-5`를 기본으로 합니다. 일반 컴포넌트에는 `clamp()`·`vw`·반응형 `text-*`·임의 글자 크기를 선언하지 않습니다.

가이드라인 구조(`components/guideline/structure/`)는 이 유틸리티 스케일을 쓰지 않습니다. 역할별 크기·행간·자간은 그 폴더의 CSS 모듈이 px로 소유하고(`structure.module.css`·`caption.module.css`), `Typography`는 요소(`as`)와 굵기만 정합니다 — 모듈 클래스가 `Typography`의 기본 크기를 덮습니다. 이 스케일은 가이드라인 본문과 첫 화면 블록에만 적용하고 일반 화면의 제목·컨트롤에는 적용하지 않습니다. `text-sm`처럼 제품에서 재정의한 유틸리티의 실제 크기(13px)는 Tailwind 기본값이 아닌 `theme.css`에서 확인합니다.

| 역할 | 컴포넌트 | 소유 |
| --- | --- | --- |
| 표시 제목·부제 | `GuidelineDisplayTitle` | `structure.module.css` |
| 블록 제목(main·sub)·블록 설명(16/24, 최대 폭 480px) | `GuidelineSectionHeading` | `structure.module.css` |
| 카드 캡션 — 제목·설명 16/24, 목록·명세 14/20 | `GuidelineCardCaption` | `caption.module.css`(수치의 정본은 `docs/10` 공통 캡션) |

HTML 의미와 시각 역할은 분리합니다. 표시 제목은 h1, 블록 제목은 `hierarchy`에 따라 h2/h3이고, 캡션은 figcaption, 명세는 dt/dd를 유지합니다. `Typography`와 richText는 `components/ui/typography-variants.ts`의 같은 스타일 생성기를 사용합니다. 도판 속 브랜드 서체 표본·치수 라벨·컨트롤 값은 이 산문 스케일에 포함하지 않습니다.

첫 화면(메인·가이드라인·스튜디오) 히어로의 `HD │ 제목` 락업(`LandingLockup`)은 CI 높이(32px)와 짝을 이루는 고정 크기(34px)이고, 문서·스튜디오 띠의 표시 제목(`GuidelineDisplayTitle`)과 main 블록 제목(`GuidelineSectionHeading hierarchy="main"`)은 화면 비율에 맞춘 `clamp()` 크기를 씁니다 — 이 셋이 viewport 반응형·임의 크기의 예외입니다. 템플릿 캔버스와 `TypeScale`·`TypeSpecimen`이 데이터로 받은 글자 크기도 UI 타이포그래피가 아니므로 예외입니다. 그 밖의 `TypeSpecimen` 같은 대형 표본은 viewport 계산식 대신 `text-9xl` 같은 고정 유틸리티를 사용합니다. 클래스 주입이 불가능한 `.typeset` 내부 생성 HTML은 `typeset.css`에서 같은 고정 단계만 직접 선언합니다.

현재 상태를 정직하게 기술합니다.

| 사실 | 근거 |
| --- | --- |
| `--font-body`(Pretendard)는 `body`에 배선되어 기본 폰트로 동작 | `src/app/(frontend)/theme.css`, `src/app/(frontend)/styles.css` |
| `--font-title`은 값이 정해지지 않아 Pretendard로 폴백하며, `.font-title` 클래스는 정의되어 있으나 가이드라인 제목에 미배선 | `src/app/(frontend)/theme.css` |
| 그래서 가이드라인 제목(`GuidelineDisplayTitle`·`GuidelineSectionHeading`)은 `font-title` 없이 렌더되어 기본 body 폰트로 폴백 | `structure/components.tsx` |
| `--font-heading`/`--font-mono`는 어디에도 정의되지 않아 `.typeset`의 `code`/`pre`는 브라우저 monospace로 폴백 | `src/app/(frontend)/typeset.css` (참조만, 정의 없음) |

`font-title`을 헤더에 붙이거나 `--font-mono`를 정의하는 것은 파운데이션 변경(09)이지 컴포넌트 작업이 아닙니다. 상세한 텍스트 저작 규칙은 `docs/10`이 소유합니다.

## 7. 공통 셸과 프레임 골격

가이드라인은 페이지 → 섹션 → 콘텐츠 배치 → 카드 → 표본 순서로 읽습니다. 각 컴포넌트는 같은 수준의 책임만 조합하고, 아래 단계의 CSS나 위젯 계산을 직접 다루지 않습니다.

### 신규 문서 (`contentModel=sections`)

CMS 섹션은 평면 섹션 구조를 사용합니다. Subsection은 직전 Section에 의미상 소속되며 H3로 표시하지만 DOM에는 중첩하지 않습니다. Section과 Incorrect Usages는 H2입니다. 위계나 패널 표현은 내부 간격을 바꾸지 않습니다.

| 레이어 | 소유 책임 |
| --- | --- |
| 문서 | 배경, DisplayHeading·섹션 목록·DisplayFooter 조합 |
| 섹션 목록 (`CmsGuidelineSections`) | 순서만 담당. 추가 패딩·gap 없음 |
| `GuidelineSection` | 앵커, 상하·좌우 패딩, 제목–첫 컨테이너 및 컨테이너 사이 간격 |
| `GuidelineSectionHeading` | 제목·설명·다운로드 내부 정렬과 텍스트 폭 |
| Grid / Carousel / Sticky | 카드 크기·배치·카드 간격·반응형·넘김·고정 |
| Card / DisplayFrame | 도판·캡션 조합, 비율·배경·잘림과 액션 위치 기준 |
| Content | 도판 안의 배치·스케일 |
| Actions | DisplayFrame 기준 상단·좌우 24px 오버레이. 본문 여백을 만들지 않음 |
| Caption | 내부 패딩과 텍스트 간격. 배치·고정은 컨테이너 책임 |

| Section 간격 | 768px 이상 | 767px 이하 |
| --- | --- | --- |
| 상단·하단 패딩 | 각각 120px | 각각 64px |
| 좌우 패딩 | 각각 32px | 각각 16px |
| 제목–첫 컨테이너 | 120px | 64px |
| 컨테이너–컨테이너 | 120px | 64px |

`structure/structure.module.css`가 위 간격을 소유합니다. 제목–본문과 컨테이너 사이 간격은 같은 내부 간격 계약으로 하나의 `gap`을 사용합니다. 인접 섹션은 하단·상단 패딩이 합쳐져 콘텐츠 사이에 240px / 128px이 생깁니다. 중첩 예외와 페이지별 보정 패딩은 두지 않습니다. Incorrect Usages 패널은 `GuidelineSection`의 `variant="incorrect-usages"`로 좌우 외부 마진을 각각 32px / 16px 적용합니다. 내부 패딩·간격과 상하 외부 간격은 공통 Section 계약을 유지합니다.

신규 경로는 `ContentFrame`을 사용하지 않습니다. Section이 가용 폭과 좌우 여백을 제공하고, Heading·Sticky는 최대 1415px에서 중앙 배치합니다. Grid는 목표 카드 너비×열 수+가로 간격으로 최대 폭을 계산하고 Carousel은 가용 폭을 사용합니다. 카드 간격은 Grid 좌우 12px·상하 24px, Carousel 좌우 12px, Sticky 세로 24px입니다. 컴포넌트 API는 [10의 신규 문서 구조 계약](10-component-authoring.md#가이드라인-문서-구조-api-2026-09-23)을 따릅니다.

헤딩 계층은 문서의 h1을 `GuidelineDisplayTitle`이, 섹션 제목을 `GuidelineSectionHeading`(`hierarchy` main h2 / sub h3)이 소유합니다. 가이드라인 첫 화면(Figma 458:16373)의 h1은 히어로 락업이, 챕터는 문서와 같은 `GuidelineSection`·`GuidelineSectionHeading`(h2)이, 문서는 링크 가이드라인 카드(`GuidelineGridContainer`의 `href`)가 그립니다. 스튜디오 첫 화면(`StudioHome`)도 같은 섹션 블록에 프로파일 카드를 담습니다. 랜드마크는 셸이 `main`을(`section-layout.tsx`), 문서 화면이 `article` 하나를(`pages/guideline-topic.tsx`) 갖고, 블록 프레임과 섹션 안쪽은 랜드마크를 만들지 않습니다.

### 가이드라인 계층 이름은 Figma 정본과 다릅니다

코드와 화면은 **챕터 → 문서 → 섹션**으로 부르고(일부 코드 식별자는 옛 이름 `topic`을 유지합니다 — `[topicSlug]`·`guideline-topic.tsx` 등) Figma는 다른 이름을 씁니다. 노드를 대조할 때 한 번 꺾이므로 여기에 적어 둡니다.

| 코드 | Figma 노드 | 무엇 |
| --- | --- | --- |
| 챕터 chapter | — | 문서를 묶는 분류. 별도 챕터 화면은 없습니다 |
| 문서 document(식별자 `topic`) | **Section Heading**(61:3503) | URL을 가진 문서 한 장. 히어로 + 제목 |
| 섹션 section | **Article**(61:3299·61:3376) | 문서 본문 안의 섹션. 문서가 아니라 블록이고 `#앵커`만 가집니다 |

🔴 코드 주석이 인용하는 Figma 노드 id는 그대로 둡니다 — 이름을 코드 어휘로 바꿔 적으면 Figma에서 그 노드를 찾을 수 없게 됩니다.

## 8. 크로스커팅 참조

이 문서는 아래 경계를 링크만 하고 복제하지 않습니다.

| 관심사 | 소유 문서 | 이 문서와의 관계 |
| --- | --- | --- |
| 접근성·다국어 | `docs/08-accessibility-i18n.md` | 색만으로 상태를 구분하지 않는 규칙 등은 08이 소유 |
| 소스 위치·네이밍·`use client` 경계 | `docs/06-project-structure.md` | 컴포넌트 배치와 명명은 06 기준 |
| 보안 | `docs/07-security.md` | 입력 신뢰 경계는 07이 다룸(런타임 `<style>` 브랜드 주입은 2026-10-06에 걷혔다) |
| 브랜드 자산 데이터 모델 | `docs/05-system-architecture.md` | 색·폰트·로고가 데이터로 흐르는 소유 구조는 05가 정의 |
| 위젯 시각 어휘 | `docs/11-widget-authoring.md` | 가이드라인 위젯이 쓰는 표본 면·판독·캡션 어휘는 11이 소유 |

## 9. 프런트엔드 스택과 외부 레퍼런스

### 스택

| 층 | 채택 | 비고 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) | 라우트별 렌더링 방식은 **선언**합니다(`docs/05` 「렌더링 캐시 무효화」) |
| 스타일 엔진 | Tailwind CSS v4 — **CSS-first** | `tailwind.config`가 없습니다. 토큰은 `color-tokens.css`(색)·`theme.css`(그 밖)의 `@theme inline` |
| 컴포넌트 | **shadcn/ui** (`base: radix`) | 라이브러리가 아니라 **소스 복사본**입니다. `src/components/ui`를 우리가 소유 |
| 동작·접근성 | **Radix** | shadcn 아래층. WAI-ARIA APG 패턴 구현체 |
| variant | `class-variance-authority` | 원형은 `docs/10` §3 |
| 모션 | `motion/react` | `LazyMotion` + `m` 조합만. 스튜디오·컨트롤러의 값은 `src/lib/motion.ts`(JS)·`theme.css`의 `--motion-*`(CSS)만 쓴다 — `docs/10` §3 |
| 아이콘 | **`@carbon/icons-react` 단일 소스** | `components.json`의 `iconLibrary`가 다른 값인 이유는 `docs/10` §2 |
| 본문 서체 | Pretendard (`--font-body`) | `--font-title`은 값 미정 — §6 |

### Carbon은 목적지가 아니라 **잠정 준거법**입니다

🔴 **최종 look은 Carbon과 다릅니다**(2026-08-12 팀 결정). Carbon은 "옳아서" 고른 것이 아니라, 그 시점에 **일단 고를 수 있는 가장 만만한 DS**였습니다. 최종 DS는 나중에 정해집니다.

그렇다고 Carbon을 지워도 된다는 뜻이 **아닙니다.** 준거가 없으면 컴포넌트마다 각자 즉흥으로 만들고, 그게 이 리포가 실제로 겪은 상태입니다(위젯 19개가 같은 요소를 제각각 만들어 한 페이지 안에서 표기가 갈렸음). **틀릴 수 있는 하나의 법이 법이 없는 것보다 낫습니다.**

#### 🔴 새 컴포넌트를 처음부터 만들 때의 기준

빈 마크업에 스타일을 처음 쓰는 순간이 준거법이 발동하는 자리입니다.

| | 판단 |
| --- | --- |
| AI가 추론했을 때 가장 괜찮아 보이는 것 | ❌ **금지.** 이것이 AI slop의 정의입니다 |
| Carbon에서 **같은 컴포넌트를 찾아 그것을 따른다** | ✅ 이것만 유효한 근거입니다 |

- 🔴 **Carbon을 기억으로 부르지 마십시오.** 기억에서 꺼낸 px는 눈대중과 다르지 않습니다. Context7 MCP로 조회합니다(`resolve-library-id` → `query-docs`). Context7이 없으면 리포에 보유한 공식 문서를 쓰고, 둘 다 없으면 **그 사실을 사용자에게 말하고 멈춥니다** — 추론으로 메우지 않습니다.
- Carbon에 대응 컴포넌트가 없으면 가까운 컴포넌트의 **스케일·역할**을 조합합니다. 조합으로도 답이 안 나오면 그것은 look 결정이므로 사용자에게 묻습니다.
- 가져온 값이 들어가는 자리는 아래 「겉모습이 사는 한 자리」입니다. Carbon에서 왔든 어디서 왔든 **컴포넌트에 흩뿌리지 않습니다** — 그래야 최종 DS로 갈아끼우는 비용이 일반 look 변경 비용과 같아집니다.

#### 이미 채워진 자리는 Carbon에 맞추러 가지 않습니다

**Carbon은 빈칸을 채우는 데 쓰고, 이미 채워진 칸을 다시 채우는 데 쓰지 않습니다.** 이미 일관된 자리를 Carbon에 더 가깝게 만드는 작업(parity 추격)은 최종 look에서 버려집니다.

look은 언젠가 전부 바뀝니다. 그러므로 **겉모습이 어설픈 것 자체는 결함이 아닙니다.** 결함은 **겉모습이 여러 자리에 흩어져 있는 것**입니다. 비용은 "지금 예쁜가"가 아니라 **"바꿀 때 몇 곳을 고쳐야 하나"**로 잽니다.

🔑 **스타일 작업 요청이 오면 이렇게 가릅니다.**

| 질문 | 판단 |
| --- | --- |
| 지금 답이 **없는** 자리인가(새 컴포넌트·새 요소) | **Carbon을 조회해 채웁니다** |
| 나중의 교체를 **싸게** 만드는가(반복되는 요소를 한 자리로 모음, 프리미티브로 교체, 선언 추가) | **지금 합니다** |
| 이미 일관된 값에 대한 취향인가(이 회색이 맞나, 이 여백이 맞나) | **미룹니다.** 지금 정해도 버려집니다 |

#### 🔴 look 변경은 AI의 판단 범위가 아닙니다

겉모습을 바꾸는 것, Carbon을 다른 DS로 갈아끼우는 것, 최종 look을 정하는 것은 **사용자가 세션에서 명시합니다.** 에이전트가 자의적으로 판단하지 않습니다.

- "더 나은 DS를 찾았다", "이 값이 더 보기 좋다"는 변경 근거가 되지 않습니다. 제안은 할 수 있고, 실행은 지시를 받고 합니다.
- 화면이 구려 보인다는 관찰만으로 값을 손대지 않습니다. 그 관찰을 사용자에게 전하고, 어느 자리를 고치면 되는지(아래 표)를 함께 알려 주는 것까지가 에이전트의 몫입니다.

#### 겉모습이 사는 한 자리

반복되는 시각 요소는 각각 **한 파일**에만 있습니다. 최종 look 작업이 왔을 때 고칠 자리가 여기입니다.

| 요소 | 자리 |
| --- | --- |
| 슬라이더 | `components/ui/slider.tsx` |
| 선택 컨트롤(토글·세그먼트) | `components/ui/toggle.tsx` (`toggle-group`이 공유) |
| on/off 스위치 | `components/ui/switch.tsx` |
| 패널 카드·알약 칩(어드민 대시보드) | `components/shared/panel-card.tsx` — Payload 어드민의 root가 13px이라 rem 유틸리티가 프런트(16px)와 다르게 그려지므로 수치를 px로 고정한 예외 |
| 페이지 히어로 배너(shader 배경 + 락업) | `components/shared/page-hero.tsx` |
| 표본 면(테마 면·브랜드 면) | `features/guideline/cards/displays/dynamics/surface.ts` |
| 수치·캡션 줄 | `features/guideline/cards/displays/dynamics/readout.ts` |
| hairline 격자 | `features/guideline/cards/displays/dynamics/hairline.ts` |
| 색 원시값 | `app/color-tokens.css` |
| 간격·radius·타입 원시값 | `app/(frontend)/theme.css` |

🔴 이 목록이 늘어나는 것은 정상이고, **같은 요소가 두 자리에 생기는 것은 결함입니다.** `features/guideline/cards/displays/dynamics/visual-vocabulary.test.ts`가 `features/guideline` 전체(블록·카드·컴포넌트·위젯)를 훑어 색에 대해서만 이것을 지킵니다 — 다른 축은 아직 사람이 봅니다.

#### 값은 어디서 읽나 — `@carbon/layout` (devDependency)

Carbon 수치의 출처는 이 패키지입니다. **런타임 코드가 import하지 않습니다** — 스펙을 기계가 읽을 수 있는 형태로 저장소에 두는 것이 목적이고, 그래서 `devDependency`입니다.

🔴 **간격·컨트롤 높이만 들어와 있습니다.** 타입 스케일(`@carbon/type`)은 아직 채택하지 않아 넣지 않았습니다 — `--font-title`·`--font-heading`이 미정이라 옮길 값이 없고, 쓰지 않는 의존성은 "안 쓰인다"는 이유로 지워집니다. 타입 스케일이 필요해지면 `pnpm add -D @carbon/type`으로 되살리고 **아래 표처럼 검증 테스트를 함께** 두십시오. 🔴 **"쓰이지 않는 의존성"으로 보고 지우지 마십시오.** 지우면 값의 출처가 사라지고 다음 사람은 기억으로 px를 부르게 됩니다(그게 이 문서가 막으려는 것입니다). `app/(frontend)/carbon-scale.test.ts`가 이 패키지를 읽어 아래 표를 검증하므로, 지우면 테스트가 깨집니다.

읽는 방법(추측하지 말고 실행하십시오):

```bash
node --input-type=module -e "import * as l from '@carbon/layout'; console.log(l.spacing, l.sizes)"
```

🔑 **Carbon의 간격 13단계는 Tailwind 기본 단계와 정확히 일치합니다.** 그래서 스케일 채택에 **새 토큰이 필요하지 않습니다** — 값을 더하는 일이 아니라 **쓸 단계를 좁히는 일**입니다.

| Carbon | px | Tailwind | | Carbon | px | Tailwind |
| --- | --- | --- | --- | --- | --- | --- |
| `spacing01` | 2 | `0.5` | | `spacing08` | 40 | `10` |
| `spacing02` | 4 | `1` | | `spacing09` | 48 | `12` |
| `spacing03` | 8 | `2` | | `spacing10` | 64 | `16` |
| `spacing04` | 12 | `3` | | `spacing11` | 80 | `20` |
| `spacing05` | 16 | `4` | | `spacing12` | 96 | `24` |
| `spacing06` | 24 | `6` | | `spacing13` | 160 | `40` |
| `spacing07` | 32 | `8` | | | | |

컨트롤 높이(`sizes`)도 같은 방식입니다. XSmall 24(`h-6`) · Small 32(`h-8`) · Medium 40(`h-10`) · Large 48(`h-12`) · XLarge 64(`h-16`) · 2XLarge 80(`h-20`).

🔴 **아직 스케일을 벗어난 자리**(고칠 때 이 표를 쓰십시오): `toggleVariants`의 `size: 'sm'`이 `h-7`(28px), `'lg'`가 `h-9`(36px)입니다. 둘 다 위젯이 쓰지 않아 미뤘습니다 — `sm`은 studio·admin이 쓰고 `lg`는 사용처가 0곳입니다.

### 채택 범위

Carbon에서 가져오는 범위를 좁게 고정합니다.

- 🔴 **`@carbon/react`(컴포넌트 라이브러리)는 도입하지 않습니다.** 스택이 shadcn + Radix + Tailwind라 컴포넌트 체계가 두 벌이 되고, 같은 버튼에 스타일이 겹칩니다. 아이콘만 이미 Carbon입니다.
- 가져오는 것은 **스케일과 역할**입니다 — 간격 단계, 타입 단계, 상태색 역할, 모션 커브. 들어오는 자리는 `theme.css`의 토큰 하나뿐이고, 컴포넌트에 직접 값을 쓰지 않습니다.
- 🔴 **토큰은 덧붙이기만 합니다.** 기존 값을 교체하면 guideline·studio·admin이 한꺼번에 흔들립니다. 새 단계가 필요하면 추가하고, 교체는 그 자체로 별도 결정입니다.

### shadcn 컴포넌트를 가져올 때의 판단 기준

1. **스타일이 더 낫다** → 컴포넌트가 아니라 **토큰(이 문서)을 고칩니다.** 값은 전역에서만 평가할 수 있습니다. 다만 값 **자체**를 바꾸는 것은 look 결정이므로 위 「look 변경은 AI의 판단 범위가 아닙니다」를 따릅니다 — 자리를 모으는 것과 값을 정하는 것은 다른 일입니다.
2. **기존 구현이 낫다** → 그래도 가져옵니다. 소스를 우리가 소유하므로 더 낫게 만들 자리는 **가져온 파일 안**입니다. 안 가져오는 유일한 근거는 **"의미가 다르다"**이고, 그때는 왜 다른지 코드에 적습니다. "우리 게 낫다·자유롭다·빠르다"는 근거가 되지 않습니다.
3. 🔴 **가져온 컴포넌트의 기본 스킨은 shadcn의 취향이지 우리 DS가 아닙니다.** 추가한 같은 변경에서 토큰만 쓰는지 확인하고, 안 맞는 부분은 컴포넌트에서 고치지 말고 이 문서와 `theme.css`로 승격합니다.

### 그리드 열 수

그리드는 저작값 두 개로 정합니다. 「최대 열 수」(`columns`, 1~5, 기본 3)와 「Size」(`size`, 카드 목표 폭 xs 240·sm 320·md 480·lg 720·xl 1440px, 기본 md)이고, Size마다 카드가 줄어들 수 있는 최소 폭이 함께 정해집니다. 필드는 `features/guideline/sections/schema.ts`, 폭 값은 `sections/render.tsx`의 `GRID_SIZES`·`GRID_MIN_SIZES`가 소유합니다.

열 수는 구간표 없이 CSS가 계산합니다(`structure/grid.module.css`). 칸 폭은 (가용 폭 − 간격) ÷ 최대 열 수이되 최소 폭 아래로 내려가지 않으므로, 좁아지면 칸이 줄어드는 대신 열이 하나씩 빠집니다. 화면 폭 기준선(767px 같은)은 두지 않습니다. 카드는 목표 폭을 넘지 않고, 그리드 최대 폭은 목표 폭 × 열 수 + 간격이며 가운데 놓입니다(md·3열이면 1464px).

간격은 가로 12px·세로 24px입니다(§7). 마지막 행도 같은 칸 폭을 유지하며 첫 열부터 채웁니다. 디스플레이 높이는 카드 비율로 계산하고, 하단 캡션은 내용에 따라 늘어납니다. 높이 선택(`height`)은 캐러셀 전용입니다.

CI Lockup의 contain 표시는 `DisplayFit`이 내부 콘텐츠에만 적용합니다. 공용 카드·배경·컨트롤·캡션을 통째로 축소하지 않습니다. 다운로드 버튼 위치와 상태는 `CardActions`가 소유합니다([위젯 공통 계약](11-widget-authoring.md#8-디스플레이-공통-인터페이스)).
