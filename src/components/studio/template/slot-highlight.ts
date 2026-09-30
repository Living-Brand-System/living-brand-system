import type { CSSProperties } from 'react'

/**
 * 편집 중인 슬롯을 캔버스에서 집어 보여 주는 오버레이 — 기하와 표현을 함께 소유한다.
 *
 * 🔴 **왜 슬롯 자신에 그리지 않는가.** 처음에는 슬롯의 `::after`에 테두리를 그렸다. 그러면 슬롯이
 *    캔버스를 넘어가는 경우 넘친 변이 루트 프레임의 `overflow:hidden`에 잘려 테두리가 한쪽만
 *    사라진다(2026-08-24 실측: 이미지 슬롯이 오른쪽으로 15px 넘쳤다). CSS로는 「슬롯 ∩ 캔버스」를
 *    표현할 수 없어 오버레이를 **루트 프레임 밖(형제)** 에 두고 캔버스 안으로 가둔다.
 * 🔑 그 덕에 사라진 것들: 슬롯에 `position:relative`를 얹던 것, `<img>` 슬롯에는 의사요소가 없어
 *    강조가 아예 안 나오던 예외, 주입된 HTML을 겨냥하는 선택자 전부.
 */

type Rect = { left: number; top: number; width: number; height: number }

export type SlotHighlightBox = { left: number; top: number; width: number; height: number }

/**
 * 화면 좌표의 슬롯 사각형을 캔버스 좌표로 옮기고 캔버스 밖을 잘라낸다.
 * 겹치는 영역이 없으면 null — 숨겨진 슬롯(`display:none`)과 캔버스 완전 밖이 여기로 떨어진다.
 *
 * 🔑 `root`는 주입된 HTML을 담은 상자이고 그 **레이아웃 폭이 캔버스 폭과 같다**(`w-full` × 캔버스
 *    폭 컨테이너). 그래서 두 폭의 비가 곧 총배율이다 — fit 배율과 Preview Size 배율의 곱을
 *    따로 계산하지 않는다.
 * 🔑 배율은 나눗셈에서 약분되므로, Preview Size 전환(200ms) 도중에 재도 캔버스 좌표는 정확하다 —
 *    같은 순간의 두 사각형을 함께 쓰기 때문이다.
 */
export function clampSlotBox(
	slot: Rect,
	root: Rect,
	canvas: { width: number; height: number },
): SlotHighlightBox | null {
	const factor = root.width / canvas.width
	if (!Number.isFinite(factor) || factor <= 0) return null
	if (slot.width <= 0 || slot.height <= 0) return null
	const left = Math.max(0, (slot.left - root.left) / factor)
	const top = Math.max(0, (slot.top - root.top) / factor)
	const right = Math.min(canvas.width, (slot.left - root.left + slot.width) / factor)
	const bottom = Math.min(canvas.height, (slot.top - root.top + slot.height) / factor)
	if (right <= left || bottom <= top) return null
	return { left, top, width: right - left, height: bottom - top }
}

/**
 * 면의 불투명도. 반투명이라 콘텐츠가 비쳐 「무엇을 고쳤나」가 계속 보이고, 동시에 어떤 바탕에서도
 * 색이 얹혀 읽힌다 — 단색 선 하나로는 바탕색이 비슷한 자리에서 사라졌다(2026-08-24 실측).
 * ponytail: 상수 하나. 표면마다 달라져야 하면 그때 축으로 올린다.
 */
const FILL_ALPHA = '18%'

/** hover는 선택보다 **약해야** 한다 — 같은 세기면 둘 중 무엇이 고른 것인지 알 수 없다. */
const HOVER_ALPHA = '10%'

/**
 * hover 테두리의 불투명도. 면보다 진해서 경계가 읽히고, 선택의 실선보다 옅어서 둘이 섞이지 않는다.
 */
const HOVER_BORDER_ALPHA = '45%'

/**
 * 강조 색을 못 받았을 때의 폴백. 브랜드 주입을 받는 유일한 토큰이다(`docs/09` §5) —
 * 🔴 채도 0인 `--accent`·`--ring`은 강조로 읽히지 않으므로 쓰지 않는다.
 */
const FALLBACK_COLOR = 'var(--primary)'

/** hex 형태만 CSS에 넣는다 — 값은 `brand-colors`에서 오므로 선언을 깨뜨릴 수 있다. */
function cssColor(color: string | null | undefined): string {
	return color && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : FALLBACK_COLOR
}

/**
 * 오버레이 테두리의 굵기. 오버레이는 **캔버스 좌표계** 안에 놓이므로 두께도 캔버스 px로 줘야 한다.
 * 🔑 선택과 hover가 **같은 굵기**를 쓴다 — 지나가던 상자가 잡히는 순간 크기가 흔들리면 안 된다.
 *
 * 🔴 캔버스는 두 번 축소된다 — `fitPreviewSize`가 정한 `scale`과 Preview Size 컨트롤의
 *    `--preview-scale`이 곱해진다. 앞쪽만 보정하면 배율을 내린 만큼 선이 얇게 찍힌다
 *    (2026-08-24에 당시 기본값 50%에서 절반 두께로 실측했다).
 * 🔑 `--preview-scale`은 미리보기 판에 인라인으로 걸려 후손이 상속한다. 그것을 CSS에서 그대로 읽으면
 *    슬라이더를 끌 때 `calc`가 저절로 다시 풀리므로 리렌더도 재측정도 없다.
 * 🔴 그 배율의 transform은 `lg:`에서만 걸리는데 변수는 항상 있다 — 좁은 화면에서는 선이 그만큼
 *    두꺼워진다. 스튜디오는 데스크톱 편집기라 그쪽을 감수한다(브레이크포인트를 코드로 복제하지 않는다).
 */
function borderWidth(scale: number): string {
	// scale이 0이나 음수로 오는 순간(측정 전 첫 프레임) 배율이 무의미해진다 — 1로 떨어뜨린다.
	const fit = scale > 0 ? scale : 1
	const unit = `calc(1px / (${fit} * var(--preview-scale, 1)))`
	// 총배율이 2를 넘는 확대(작은 캔버스를 키워 맞춘 경우)에서도 선이 1px 아래로 내려가지 않게.
	return `max(1px, calc(2 * ${unit}))`
}

/** 고른 것의 오버레이 — 실선 테두리에, 여럿 중 하나를 가리킬 때만 면을 깐다. */
export function slotHighlightStyle(
	scale: number,
	color?: string | null,
	filled = true,
): CSSProperties {
	const width = borderWidth(scale)
	const ink = cssColor(color)
	return {
		position: 'absolute',
		boxSizing: 'border-box',
		pointerEvents: 'none',
		border: `${width} solid ${ink}`,
		/*
		 * 🔑 면은 **여럿 중 하나를 가리킬 때** 뜻이 있다. 도화지 전체를 집는 경우(Background 섹션)는
		 *    구별할 형제가 없고 전면을 덮으면 콘텐츠만 탁해지므로 테두리만 남긴다.
		 */
		...(filled
			? { backgroundColor: `color-mix(in srgb, ${ink} ${FILL_ALPHA}, transparent)` }
			: {}),
	}
}

/**
 * hover 미리보기 — **지금 누르면 무엇이 잡히는지**를 먼저 보여 준다(사용자 지시, 2026-09-29).
 *
 * 🔴 테두리도 **반투명**이다(사용자 지시, 2026-09-30). 굵기는 선택과 같게 둬서 잡히는 순간
 *    상자가 흔들리지 않고, 색만 옅어 「고른 것」의 실선과 구별된다.
 * 🔑 배경(도화지)에는 쓰지 않는다. 전면을 덮는 면은 콘텐츠만 탁하게 만들고, 판 어디에 있든 늘
 *    켜져 있어 아무것도 알려 주지 않는다.
 */
export function slotHoverStyle(scale: number, color?: string | null): CSSProperties {
	const ink = cssColor(color)
	return {
		position: 'absolute',
		boxSizing: 'border-box',
		pointerEvents: 'none',
		border: `${borderWidth(scale)} solid color-mix(in srgb, ${ink} ${HOVER_BORDER_ALPHA}, transparent)`,
		backgroundColor: `color-mix(in srgb, ${ink} ${HOVER_ALPHA}, transparent)`,
	}
}
