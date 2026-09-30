import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'

/**
 * Fluted Glass의 네 모양. 「가로·세로」와 「스윕·방사」는 프로파일 넷으로 갈라져 있었는데,
 * 창작자가 고르는 축은 프로파일이 아니라 **모양 하나**여야 해서 한 런타임으로 합쳤다(2026-09-03).
 *
 * 🔑 모양이 바꾸는 것은 셰이더 프로그램이다 — uniform 하나가 아니다. 그래서 이 컨트롤은
 *    `controller.remountOn`에 들어가고, 만질 때마다 캔버스가 다시 뜬다.
 */
export const FLUTED_GLASS_SHAPES = ['linear', 'vertical', 'sweep', 'radial'] as const

export type FlutedGlassShape = (typeof FLUTED_GLASS_SHAPES)[number]

const FLUTED_GLASS_SHAPE_LABELS: Record<FlutedGlassShape, string> = {
	linear: '가로',
	vertical: '세로',
	sweep: '스윕',
	radial: '방사',
}

/**
 * 셰이더 원문과 uniform 배선을 공유하는 묶음.
 *
 * 세로는 가로 셰이더에 회전된 입력을 흘려 넣을 뿐이고(합치기 전에도 그랬다), 스윕·방사는 원문이
 * 서로 다르지만 uniform 이름이 같아 배선을 공유한다 — 스윕에만 있는 `uSweepSpeed`는 방사 프로그램에
 * 없으므로 location이 null이 되고 WebGL이 조용히 무시한다.
 */
export const FLUTED_GLASS_SHAPE_FAMILIES = {
	linear: 'linear',
	vertical: 'linear',
	sweep: 'sweep',
	radial: 'radial',
} as const satisfies Record<FlutedGlassShape, 'linear' | 'sweep' | 'radial'>

/**
 * 광원 pad의 ±1이 판의 몇 배까지 닿는가.
 *
 * pad는 -1~1로 고정이고 셰이더는 ±1을 판 가장자리로 읽는다 — 그래서 판 밖으로 광원을 내보내려면
 * admin 전용 오프셋 축을 써야 했다(스윕이 `sourceOffsetX: -0.35`로 그랬다). uniform 배선에서 이
 * 배수를 곱해 pad 한 칸이 판 세 칸을 덮는다. 저장·표시는 pad 값이고 판 좌표는 `plate()`가 나른다.
 */
export const FLUTED_GLASS_SOURCE_SPAN = 3

/** 판 좌표(±1 = 판 가장자리)를 광원 pad 값으로 바꾼다. */
const plate = (x: number, y: number) => ({
	x: x / FLUTED_GLASS_SOURCE_SPAN,
	y: y / FLUTED_GLASS_SOURCE_SPAN,
})

/**
 * 색 조합의 칸 — **순서가 계약이다.** 팔레트 선택지의 `colors`가 이 순서로 칸을 채운다.
 *
 * 배경과 블룸도 여기 있다 — 광선 5색만 묶으면 조합을 바꿔도 이 둘이 초록으로 남는다.
 */
const FLUTED_GLASS_PALETTE_CONTROLS = [
	['rayColor1', '광선 색상 1'],
	['rayColor2', '광선 색상 2'],
	['rayColor3', '광선 색상 3'],
	['rayColor4', '광선 색상 4'],
	['rayColor5', '광선 색상 5'],
	['rayBackgroundColor', '배경 색상'],
	['bloomColor', '블룸 색상'],
] as const

type FlutedGlassPaletteKey = (typeof FLUTED_GLASS_PALETTE_CONTROLS)[number][0]

/**
 * 색 조합 — 창작자가 왼쪽에서 다루는 큰 축 하나. 고르면 색 칸 일곱이 함께 채워진다.
 *
 * 🔑 **첫 팔레트가 정본이고, 새 팔레트는 그것의 색조를 통째로 돌린 것이다.**
 *    채도와 명도 계단(3 → 13 → 26 → 52 → 94)은 한 칸도 건드리지 않고 **일곱 칸의 색조를 같은 각도로**
 *    돌린다. 그래서 조합 안의 조화가 구조적으로 보존되고, 새 팔레트를 만드는 일이 각도 하나를
 *    고르는 일이 된다.
 * 🔴 **칸 몇 개만 바꾸지 말 것.** 색조가 칸마다 다른 각도로 움직이면 한 팔레트 안에 두 계열이
 *    섞여 「초록에 하늘이 낀」 것처럼 읽힌다(2026-09-04에 그렇게 만들었다가 걷어냈다).
 *    회전이 균일한지는 `fluted-glass.test.ts`가 지킨다.
 * 🔴 계단을 다시 만들지 말 것. 명도가 흐트러지면 광선이 띠가 아니라 색 얼룩으로 읽힌다.
 */
export const FLUTED_GLASS_PALETTES = {
	green: {
		label: '그린',
		colors: {
			rayColor1: '#000e06',
			rayColor2: '#004218',
			rayColor3: '#008533',
			rayColor4: '#1af087',
			rayColor5: '#e0fff0',
			rayBackgroundColor: '#000302',
			bloomColor: '#3dff8a',
		},
	},
	/**
	 * 첫 팔레트의 색조를 **+76° 통째로** 돌린 것. 그 각도를 고른 이유는 하나다 — 중간 톤
	 * `rayColor3`이 HD DISCOVERY BLUE(`#003087`)에 앉는다. 브랜드 남색이 팔레트의 중심이 된다.
	 * 🔑 `rayColor3`만 정본 hex로 스냅했다(회전값 `#002f85`은 채널당 2 차이라 눈으로는 같지만,
	 *    브랜드 색은 계산값이 아니라 등재된 값이어야 한다).
	 */
	navy: {
		label: '네이비',
		colors: {
			rayColor1: '#00040e',
			rayColor2: '#001842',
			rayColor3: '#003087',
			rayColor4: '#1a4af0',
			rayColor5: '#e0e7ff',
			rayBackgroundColor: '#000003',
			bloomColor: '#3d7eff',
		},
	},
} as const satisfies Record<
	string,
	{ label: string; colors: Record<FlutedGlassPaletteKey, string> }
>

/** 모양이 정하는 감춘 값 묶음 — 합치기 전 네 프로파일의 기본값을 그대로 옮겨 왔다. */
const FLUTED_GLASS_LINEAR_INPUT = {
	source: plate(-0.62, 0.04),
	sourceOffsetX: 0,
	sourceOffsetY: 0,
	zoom: 1,
	tilt: 0,
	vignette: 1,
	bloomColor: '#2ad97a',
	rayColor1: '#001a0b',
	rayColor2: '#06381b',
	rayColor3: '#0f6b32',
	rayColor4: '#8ee34a',
	rayColor5: '#e6fff4',
	rayBackgroundColor: '#000d06',
	rayBloom: 1,
	rayIntensity: 0.9,
	rayDensity: 0.22,
	raySpotty: 0.86,
	rayMidSize: 0.75,
	rayMidIntensity: 0.32,
	speed: 1.2,
	frameOffsetMs: 0,
	rayScale: 1,
	rayRotation: 0,
	axisFalloff: 1.7,
	flowSpeed: 0.06,
	paletteShift: 1.2,
	paletteDrift: -0.2,
	pulseIntensity: 0.3,
	pulseSpeed: 0.28,
	pulseDensity: 0.9,
	pulseWidth: 0.22,
	glassSize: 0.92,
	ribCurve: 1.7,
	glassAngle: 0,
	glassOriginOffset: { x: 0, y: 0 },
	glassOffset: 0,
	glassSpeed: -0.02,
	glassDrift: { x: 0, y: 0.03 },
	glassDriftSpeedX: 0.19,
	glassDriftSpeedY: 0.27,
	glassDistortion: 0.62,
	glassEdgeSoftness: 0.55,
	glassBlur: 0.42,
	glassScattering: 0.3,
	glassHighlights: 0.72,
	glassShadows: 0.74,
	distortionShape: 'lens',
} as const

const FLUTED_GLASS_VERTICAL_INPUT = {
	source: plate(0, -0.62),
	sourceOffsetX: 0,
	sourceOffsetY: 0,
	zoom: 1,
	tilt: 0,
	vignette: 1,
	bloomColor: '#2ad97a',
	rayColor1: '#001a0b',
	rayColor2: '#06381b',
	rayColor3: '#0f6b32',
	rayColor4: '#8ee34a',
	rayColor5: '#e6fff4',
	rayBackgroundColor: '#000d06',
	rayBloom: 1,
	rayIntensity: 0.9,
	rayDensity: 0.22,
	raySpotty: 0.86,
	rayMidSize: 0.75,
	rayMidIntensity: 0.32,
	speed: 1.2,
	frameOffsetMs: 0,
	rayScale: 1,
	rayRotation: -90,
	axisFalloff: 1.7,
	flowSpeed: 0.06,
	paletteShift: 1.2,
	paletteDrift: 0.75,
	pulseIntensity: 0.3,
	pulseSpeed: 0.28,
	pulseDensity: 0.9,
	pulseWidth: 0.22,
	glassSize: 0.92,
	ribCurve: 1.7,
	glassAngle: 90,
	glassOriginOffset: { x: 0, y: 0 },
	glassOffset: 0,
	glassSpeed: -0.02,
	glassDrift: { x: 0.03, y: 0 },
	glassDriftSpeedX: 0.19,
	glassDriftSpeedY: 0.27,
	glassDistortion: 0.62,
	glassEdgeSoftness: 0.55,
	glassBlur: 0.42,
	glassScattering: 0.3,
	glassHighlights: 0.72,
	glassShadows: 0.74,
	distortionShape: 'lens',
} as const

const FLUTED_GLASS_SWEEP_INPUT = {
	// 🔑 스윕의 소실점은 판 **밖**에 있다 — 그것이 방사와 가르는 축이다. 광선 밭이 판 밖의 한
	//    점을 축으로 돌아 등대처럼 판을 스쳐 지나간다.
	source: plate(-1.35, 0),
	sourceOffsetX: 0,
	sourceOffsetY: 0,
	zoom: 1,
	tilt: 0,
	vignette: 1,
	// 색 조합은 모양이 아니라 팔레트가 소유한다 — 스윕·방사가 첫 팔레트를 그대로 쓴다.
	...FLUTED_GLASS_PALETTES.green.colors,
	rayBloom: 0.2,
	rayIntensity: 0.95,
	rayDensity: 1,
	raySpotty: 0.35,
	rayMidSize: 0.4,
	rayMidIntensity: 0.7,
	speed: 0.72,
	frameOffsetMs: 0,
	rayScale: 1,
	rayRotation: -6,
	sweepSpeed: 0.12,
	radialFalloff: 0.9,
	radialFlowSpeed: 0.1,
	pulseIntensity: 0.6,
	pulseSpeed: 0.2,
	pulseDensity: 0.85,
	pulseWidth: 0.3,
	glassSize: 0.82,
	glassAngle: 8,
	glassOriginOffset: { x: -0.035, y: 0.055 },
	glassOffset: 0,
	glassSpeed: -0.035,
	glassDrift: { x: 0.02, y: 0.042 },
	glassDriftSpeedX: 0.19,
	glassDriftSpeedY: 0.27,
	glassDistortion: 0.68,
	glassEdgeSoftness: 0.62,
	glassBlur: 0.4,
	glassScattering: 0.24,
	glassHighlights: 0.62,
	glassShadows: 0.48,
	glassSourceFadeStart: 0,
	glassSourceFadeEnd: 0.4,
	distortionShape: 'lens',
} as const

const FLUTED_GLASS_RADIAL_INPUT = {
	// 🔑 방사의 소실점은 판 **정중앙**이다 — 스윕(판 밖)과 가르는 축이 소실점의 자리다.
	source: plate(0, 0),
	sourceOffsetX: 0,
	sourceOffsetY: 0,
	zoom: 1,
	tilt: 0,
	vignette: 1,
	// 색 조합은 모양이 아니라 팔레트가 소유한다 — 스윕·방사가 첫 팔레트를 그대로 쓴다.
	...FLUTED_GLASS_PALETTES.green.colors,
	rayBloom: 0.2,
	rayIntensity: 0.95,
	rayDensity: 1,
	raySpotty: 0.35,
	rayMidSize: 0.4,
	rayMidIntensity: 0.7,
	speed: 0.72,
	frameOffsetMs: 0,
	rayScale: 1,
	sweepSpeed: 0,
	rayRotation: -6,
	radialFalloff: 0.9,
	radialFlowSpeed: 0.1,
	pulseIntensity: 0.6,
	pulseSpeed: 0.2,
	pulseDensity: 0.85,
	pulseWidth: 0.3,
	glassSize: 0.82,
	glassAngle: 8,
	glassOriginOffset: { x: -0.035, y: 0.055 },
	glassOffset: 0,
	glassSpeed: -0.035,
	glassDrift: { x: 0.02, y: 0.042 },
	glassDriftSpeedX: 0.19,
	glassDriftSpeedY: 0.27,
	glassDistortion: 0.68,
	glassEdgeSoftness: 0.62,
	glassBlur: 0.4,
	glassScattering: 0.24,
	glassHighlights: 0.62,
	glassShadows: 0.48,
	glassSourceFadeStart: 0,
	glassSourceFadeEnd: 0.4,
	distortionShape: 'lens',
} as const

export const FLUTED_GLASS_SHAPE_INPUTS = {
	linear: FLUTED_GLASS_LINEAR_INPUT,
	vertical: FLUTED_GLASS_VERTICAL_INPUT,
	sweep: FLUTED_GLASS_SWEEP_INPUT,
	radial: FLUTED_GLASS_RADIAL_INPUT,
} as const

/**
 * 「스타일」 — 감춘 파라미터 ~14개를 정하는 값. 가로·세로에만 있다(스윕·방사는 프리셋이 없었다).
 *
 * 🔴 `axisStart`·`axisEnd`는 합치기 전 가로의 `upperAxis`·`lowerAxis`와 세로의 `leftAxis`·`rightAxis`다.
 *    값은 그대로고 이름만 모양과 무관하게 바꿨다 — 둘은 같은 프리셋에 광원 좌표만 다른 것이라,
 *    가로에서는 위·아래로 세로에서는 좌·우로 읽힌다.
 */
export const FLUTED_GLASS_STYLE_IDS = [
	'basic',
	'focused',
	'diffused',
	'axisStart',
	'axisEnd',
] as const

export type FlutedGlassStyleId = (typeof FLUTED_GLASS_STYLE_IDS)[number]

const FLUTED_GLASS_LINEAR_STYLES = {
	basic: {},
	focused: {
		source: plate(-0.62, 0),
		axisFalloff: 2.6,
		rayDensity: 0.45,
		rayMidIntensity: 0.22,
		glassEdgeSoftness: 0.2,
		glassBlur: 0.12,
		glassScattering: 0.1,
		glassHighlights: 0.9,
		glassShadows: 0.82,
		glassDistortion: 0.7,
		pulseIntensity: 0.1,
		pulseWidth: 0.14,
		flowSpeed: 0.04,
		glassDrift: { x: 0, y: 0.01 },
	},
	diffused: {
		source: plate(-0.62, 0.1),
		axisFalloff: 0.7,
		rayDensity: 0.08,
		rayMidIntensity: 0.55,
		glassEdgeSoftness: 0.9,
		glassBlur: 0.85,
		glassScattering: 0.7,
		glassHighlights: 0.3,
		glassShadows: 0.4,
		glassDistortion: 0.35,
		paletteShift: 0.5,
		pulseIntensity: 0.45,
		pulseWidth: 0.45,
		pulseSpeed: 0.16,
		flowSpeed: 0.12,
	},
	// 광원 축을 크게 올려 밝은 대역을 위로 몰고 아래를 비운다. uSource.y = -source.y라 음수가 위다.
	axisStart: {
		source: plate(-0.62, -0.7),
		axisFalloff: 1.1,
		rayDensity: 0.3,
		rayMidIntensity: 0.4,
		glassEdgeSoftness: 0.45,
		glassBlur: 0.35,
		glassScattering: 0.3,
		glassHighlights: 0.8,
		glassShadows: 0.7,
		glassDistortion: 0.6,
		paletteShift: 1.6,
		pulseIntensity: 0.3,
		flowSpeed: 0.08,
	},
	axisEnd: {
		source: plate(-0.62, 0.7),
		axisFalloff: 1.1,
		rayDensity: 0.3,
		rayMidIntensity: 0.4,
		glassEdgeSoftness: 0.45,
		glassBlur: 0.35,
		glassScattering: 0.3,
		glassHighlights: 0.8,
		glassShadows: 0.7,
		glassDistortion: 0.6,
		paletteShift: 1.6,
		pulseIntensity: 0.3,
		flowSpeed: 0.08,
	},
} as const

const FLUTED_GLASS_VERTICAL_STYLES = {
	basic: {},
	focused: {
		source: plate(0, -0.62),
		axisFalloff: 2.6,
		rayDensity: 0.45,
		rayMidIntensity: 0.22,
		glassEdgeSoftness: 0.2,
		glassBlur: 0.12,
		glassScattering: 0.1,
		glassHighlights: 0.9,
		glassShadows: 0.82,
		glassDistortion: 0.7,
		pulseIntensity: 0.1,
		pulseWidth: 0.14,
		flowSpeed: 0.04,
		glassDrift: { x: 0.01, y: 0 },
	},
	diffused: {
		source: plate(0.1, -0.62),
		axisFalloff: 0.7,
		rayDensity: 0.08,
		rayMidIntensity: 0.55,
		glassEdgeSoftness: 0.9,
		glassBlur: 0.85,
		glassScattering: 0.7,
		glassHighlights: 0.3,
		glassShadows: 0.4,
		glassDistortion: 0.35,
		paletteShift: 0.5,
		pulseIntensity: 0.45,
		pulseWidth: 0.45,
		pulseSpeed: 0.16,
		flowSpeed: 0.12,
	},
	axisStart: {
		source: plate(-0.7, -0.62),
		axisFalloff: 1.1,
		rayDensity: 0.3,
		rayMidIntensity: 0.4,
		glassEdgeSoftness: 0.45,
		glassBlur: 0.35,
		glassScattering: 0.3,
		glassHighlights: 0.8,
		glassShadows: 0.7,
		glassDistortion: 0.6,
		paletteShift: 1.6,
		pulseIntensity: 0.3,
		flowSpeed: 0.08,
	},
	axisEnd: {
		source: plate(0.7, -0.62),
		axisFalloff: 1.1,
		rayDensity: 0.3,
		rayMidIntensity: 0.4,
		glassEdgeSoftness: 0.45,
		glassBlur: 0.35,
		glassScattering: 0.3,
		glassHighlights: 0.8,
		glassShadows: 0.7,
		glassDistortion: 0.6,
		paletteShift: 1.6,
		pulseIntensity: 0.3,
		flowSpeed: 0.08,
	},
} as const

/** 스타일이 있는 모양만 담는다 — 스윕·방사는 여기 없고, 스타일을 골라도 값이 바뀌지 않는다. */
export const FLUTED_GLASS_STYLES = {
	linear: FLUTED_GLASS_LINEAR_STYLES,
	vertical: FLUTED_GLASS_VERTICAL_STYLES,
} as const

const FLUTED_GLASS_STYLE_LABELS: Record<FlutedGlassStyleId, string> = {
	basic: '기본',
	focused: '집중',
	diffused: '확산',
	axisStart: '축 시작쪽',
	axisEnd: '축 끝쪽',
}

/**
 * 모양 썸네일의 선분 — 단위 정사각형(0~1) 안에 그 모양의 기하를 그대로 적는다.
 *
 * 🔑 그림을 손으로 그리지 않는다. 가로·세로는 축에 평행한 줄이고, 방사는 광원에서 뻗는 부챗살이며,
 *    스윕은 그 부챗살이 판 왼쪽 위로 치우친 광원에서 도는 것이다 — 각 모양이 셰이더에서 광선을
 *    무엇으로 색인하는지가 그대로 그림이 된다.
 */
type PreviewLine = readonly [number, number, number, number]

function parallelLines(count: number, vertical: boolean): readonly PreviewLine[] {
	return Array.from({ length: count }, (_, index) => {
		const at = (index + 1) / (count + 1)
		return (vertical ? [at, 0, at, 1] : [0, at, 1, at]) as PreviewLine
	})
}

/**
 * 광원 한 점에서 사방으로 뻗는 부챗살 중 **판 안에 보이는 구간**만 그린다.
 *
 * 🔑 광원이 판 밖에 있는 모양(스윕)이 있어서 「광원에서 경계까지」로는 안 된다 — 판을 스치지도
 *    않는 방향이 생기고, 보이지 않는 구간까지 좌표에 들어간다. 광선을 판과 교차시켜 들어오는
 *    점과 나가는 점을 구하면 광원이 안이든 밖이든 같은 계산으로 처리된다.
 */
function fanLines(
	count: number,
	source: { x: number; y: number },
	startAngle: number,
): readonly PreviewLine[] {
	const snap = (value: number) => Math.min(1, Math.max(0, Math.round(value * 1e4) / 1e4))
	return Array.from({ length: count }, (_, index) => {
		const angle = startAngle + (index / count) * Math.PI * 2
		const chord = clipRayToUnitBox(source, { x: Math.cos(angle), y: Math.sin(angle) })
		if (!chord) return null
		return [
			snap(chord.from.x),
			snap(chord.from.y),
			snap(chord.to.x),
			snap(chord.to.y),
		] as PreviewLine
	}).filter((line): line is PreviewLine => line !== null)
}

/** 반직선과 단위 정사각형의 교차 구간. 스치지 않으면 null이다(그 방향은 그릴 것이 없다). */
function clipRayToUnitBox(origin: { x: number; y: number }, direction: { x: number; y: number }) {
	let enter = 0
	let exit = Number.POSITIVE_INFINITY
	for (const axis of ['x', 'y'] as const) {
		const from = origin[axis]
		const along = direction[axis]
		if (Math.abs(along) < 1e-9) {
			if (from < 0 || from > 1) return null
			continue
		}
		const first = -from / along
		const second = (1 - from) / along
		enter = Math.max(enter, Math.min(first, second))
		exit = Math.min(exit, Math.max(first, second))
	}
	if (enter > exit) return null
	return {
		from: { x: origin.x + direction.x * enter, y: origin.y + direction.y * enter },
		to: { x: origin.x + direction.x * exit, y: origin.y + direction.y * exit },
	}
}

const FLUTED_GLASS_SHAPE_PREVIEWS: Record<FlutedGlassShape, readonly PreviewLine[]> = {
	linear: parallelLines(5, false),
	vertical: parallelLines(5, true),
	// 🔑 두 부챗살을 가르는 것은 소실점의 자리다 — 스윕은 판 밖, 방사는 판 안.
	//    각 모양의 기본 광원 위치를 그대로 옮긴 것이라 그림이 화면과 어긋나지 않는다.
	sweep: fanLines(16, { x: -0.2, y: 0.5 }, 0),
	radial: fanLines(12, { x: 0.5, y: 0.5 }, 0),
}

/**
 * 노출 컨트롤의 기본값.
 *
 * 🔴 프로파일이 하나가 되면서 **기본 색 조합도 하나**가 된다. 합치기 전에는 두 벌이었다
 *    (가로·세로 `#001a0b…` / 스윕·방사 `#000e06…`) — 더 진한 스윕·방사 쪽을 남겼다.
 *    「색 조합」은 모양과 독립인 축이므로 모양을 바꿔도 이 값은 따라오지 않는다.
 */
const CONTROL_DEFAULTS = {
	...FLUTED_GLASS_SWEEP_INPUT,
	// 가로 계열에만 있는 두 축은 그쪽 기본값을 쓴다.
	paletteDrift: FLUTED_GLASS_LINEAR_INPUT.paletteDrift,
	ribCurve: FLUTED_GLASS_LINEAR_INPUT.ribCurve,
} as const

type RangeControl = Extract<ControllerControlDefinition, { kind: 'range' }>

function rangeControl(
	id: string,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
	step = 0.01,
	display: RangeControl['display'] = { precision: 2 },
): RangeControl {
	return { id, kind: 'range', label, defaultValue, min, max, step, display }
}

function colorControl(id: string, label: string, defaultValue: string) {
	return { id, kind: 'color' as const, label, defaultValue }
}

const flutedGlassRuntimeManifest = defineGraphicRuntime({
	studio: 'graphic',
	id: 'fluted-glass',
	version: 1,
	name: 'Fluted Glass',
	type: 'shader',
	artifacts: {
		raster: {},
		video: {
			fps: [24, 30, 60],
			maxWidth: 1920,
			maxHeight: 1080,
			maxDurationSeconds: 10,
		},
	},
	controller: {
		/**
		 * 왼쪽 패널에 세울 축 — 색 조합과 형태. 창작자가 실제로 다루는 것은 이 둘뿐이다.
		 *
		 * 오른쪽으로 가는 것: 속도·광원 위치와 광선·유리·스윕의 수치들. 사라지는 것은 없다.
		 * 🔑 `speed`가 마스터 시계이지만(셰이더의 `iTime * uGodraySpeed`) 그래도 오른쪽이다 —
		 *    영향이 크다는 것과 창작자가 그것을 만지리라는 것은 다른 얘기다.
		 * 🔴 「스타일」은 가로·세로에만 값이 있다. 스윕·방사에서 고르면 아무것도 바뀌지 않는다 —
		 *    두 모양에는 원래 프리셋이 없었고, 새로 만드는 것은 새 look을 정하는 일이라 하지 않았다.
		 */
		left: [
			'shape',
			'preset',
			'palette',
			'rayColor1',
			'rayColor2',
			'rayColor3',
			'rayColor4',
			'rayColor5',
			'rayBackgroundColor',
			'bloomColor',
		],
		/**
		 * 오른쪽 패널의 축.
		 *
		 * 🔑 **기준은 픽셀차가 아니라 「무엇이 달라지는지 읽히는가」다.** 그리고 읽히려면 축마다
		 *    **일어나는 일의 종류가 달라야** 한다 — 같은 종류가 둘이면 둘 다 안 읽힌다.
		 *    `rayBloom`(0.114)을 세웠다가 걷은 이유가 그것이다: 매끈한 안개를 곱할 뿐이라
		 *    「광선 강도」와 종류가 같아 슬라이더를 만지는 사람에게는 둘 다 그냥 밝기였다.
		 *
		 * | 축 | 종류 | 픽셀차 |
		 * | --- | --- | --- |
		 * | `rayIntensity` | 빛의 세기 | 0.235 |
		 * | `raySpotty` | 광선의 짜임 — 끊긴 다발이냐 이어진 줄기냐 | 0.083 |
		 * | `rayMidSize` | 광원 자리의 빛무리 크기 | 0.079 |
		 * | `rayScale` | 광선의 두께 | 0.229 |
		 * | `speed` | 시간 — 마스터 시계라 나머지 속도가 여기 딸린다 | 0.142 |
		 * | `glassSize` | 유리의 결 — 줄이 굵어지고 가늘어진다 | 0.076 |
		 * | `glassSpeed` | 무엇이 움직이나 — 0이면 유리가 멈추고 광선만 움직인다 | 0.108 |
		 * | `zoom`·`tilt` | 틀 — 판을 얼마나 크게, 얼마나 기울여 보여주나 | 새 축 |
		 * | `source` | 기준점 — 소실점을 판 밖까지 옮긴다 | 0.153 |
		 *
		 * 🔴 **세웠다가 사용자가 「체감 불가」로 내린 축** (2026-09-04). 다시 올리지 말 것 —
		 *    픽셀차가 있다는 것과 창작자가 알아본다는 것은 다른 얘기라는 근거가 여기 쌓인다.
		 *
		 * | 내린 축 | 픽셀차 | 사용자 판단 |
		 * | --- | --- | --- |
		 * | `rayBloom` | 0.114 | 「밝기랑 차이가 없어보이네」 — 「광선 강도」와 종류가 같다 |
		 * | `frameOffsetMs` | 0.153 | 체감 불가. 정지 컷의 위상일 뿐이다 |
		 * | `pulseIntensity`·`pulseWidth` | 0.093·0.043 | 「빔은 결국 컬러 팔레트로 대체 가능」 |
		 * | `glassDistortion` | 0.057 | 체감 불가 |
		 * | `glassHighlights` | 0.052 | 체감 불가 |
		 * | `vignette` | 새 축 | 체감 불가. 판을 고르게 채우려면 manager가 0으로 내린다 |
		 *
		 * 픽셀차는 각 축을 최소·최대로 렌더해 잰 평균 절대 픽셀차다(`.scratch/axis-survey/`).
		 * 「새 축」 셋은 재서 고른 것이 아니라 **없던 축**이다 — 판을 담는 틀을 창작자가 정할 수
		 * 없었다. `source`는 사거리를 `FLUTED_GLASS_SOURCE_SPAN`만큼 넓혀 판 밖까지 닿는다.
		 *
		 * 🔴 `rayRotation`은 0.217로 여기 든 것 대부분보다 큰데도 뺐다. 세로형을 세로로 만드는 값이
		 *    바로 그것이라(`rayRotation: -90`) 창작자가 만지면 왼쪽의 「모양」 축과 충돌한다.
		 *    모양의 정체를 이루는 값은 모양이 소유한다. 구도를 기울이는 것은 `tilt`가 갖는다 —
		 *    그쪽은 광원까지 함께 돌려 모양의 정체를 건드리지 않는다.
		 * 🔴 `rayDensity`(광선 밀도)는 뺐다 — 0.068이면서 무엇이 달라지는지 화면에서 읽히지 않았다.
		 * 🔴 여기에도 왼쪽에도 없는 축은 창작자 화면에서 내려가고 Payload admin의 「기본값 재정의」로
		 *    manager가 조정한다. 지운 것이 아니다 — 코드에 박으면 배포 없이 못 고친다.
		 */
		right: [
			'rayIntensity',
			'raySpotty',
			'rayMidSize',
			'rayScale',
			'speed',
			'glassSize',
			'glassSpeed',
			'zoom',
			'tilt',
			'source',
		],
		// 모양은 셰이더 프로그램을 갈아끼운다 — 살아 있는 런타임에 흘려 넣을 수 없다.
		remountOn: ['shape'],
		groups: [
			{
				id: 'shape',
				title: 'Shape',
				controls: [
					{
						id: 'shape',
						kind: 'select' as const,
						label: '모양',
						defaultValue: 'sweep' satisfies FlutedGlassShape,
						options: FLUTED_GLASS_SHAPES.map((id) => ({
							value: id,
							label: FLUTED_GLASS_SHAPE_LABELS[id],
							preview: FLUTED_GLASS_SHAPE_PREVIEWS[id],
						})),
					},
				],
			},
			{
				id: 'preset',
				title: 'Style',
				controls: [
					{
						id: 'preset',
						kind: 'select' as const,
						label: '스타일',
						defaultValue: 'basic' satisfies FlutedGlassStyleId,
						options: FLUTED_GLASS_STYLE_IDS.map((id) => ({
							value: id,
							label: FLUTED_GLASS_STYLE_LABELS[id],
						})),
					},
				],
			},
			{
				id: 'ray-palette',
				title: 'Ray Palette',
				controls: [
					// 조합을 고르는 축과 그 조합을 이룬 색 칸이 한 그룹에 있다 — 고르면 칸이 채워진다.
					{
						id: 'palette',
						kind: 'select' as const,
						label: '팔레트',
						defaultValue: 'green',
						options: Object.entries(FLUTED_GLASS_PALETTES).map(([value, palette]) => ({
							value,
							label: palette.label,
							colors: FLUTED_GLASS_PALETTE_CONTROLS.map(([id]) => palette.colors[id]),
						})),
					},
					...FLUTED_GLASS_PALETTE_CONTROLS.map(([id, label]) =>
						colorControl(id, label, CONTROL_DEFAULTS[id]),
					),
				],
			},
			{
				id: 'rays',
				title: 'Rays',
				controls: [
					// 팔레트 「위상 속도」는 색이 아니라 속도다 — 색 그룹에 두면 그룹이 좌우로 갈린다.
					// 가로 계열만 읽는다(스윕·방사 셰이더에는 uPaletteDrift가 없다).
					rangeControl(
						'paletteDrift',
						'팔레트 위상 속도',
						CONTROL_DEFAULTS.paletteDrift,
						-1,
						1,
					),
					rangeControl('rayBloom', '블룸 강도', CONTROL_DEFAULTS.rayBloom, 0, 1),
					rangeControl('rayIntensity', '광선 강도', CONTROL_DEFAULTS.rayIntensity, 0, 1),
					rangeControl('rayDensity', '광선 밀도', CONTROL_DEFAULTS.rayDensity, 0, 1),
					rangeControl('raySpotty', '광선 연속성', CONTROL_DEFAULTS.raySpotty, 0, 1),
					rangeControl('rayMidSize', '빛무리 크기', CONTROL_DEFAULTS.rayMidSize, 0, 1),
					rangeControl(
						'rayMidIntensity',
						'빛무리 세기',
						CONTROL_DEFAULTS.rayMidIntensity,
						0,
						1,
					),
					rangeControl('speed', '속도', CONTROL_DEFAULTS.speed, 0, 2),
					rangeControl('rayScale', '광선 스케일', CONTROL_DEFAULTS.rayScale, 0.1, 2),
					rangeControl(
						'rayRotation',
						'광선 회전',
						CONTROL_DEFAULTS.rayRotation,
						-180,
						180,
						1,
						{ precision: 0, unit: '°' },
					),
					rangeControl(
						'frameOffsetMs',
						'시작 시점',
						CONTROL_DEFAULTS.frameOffsetMs,
						0,
						1000,
						1,
						{ precision: 0, unit: 'ms' },
					),
				],
			},
			{
				id: 'sweep',
				title: 'Sweep',
				controls: [
					// 음수는 역방향 회전이다 — 광선 필드 전체가 광원을 축으로 돈다. 방사는 0(안 돈다).
					rangeControl('sweepSpeed', '스윕 속도', CONTROL_DEFAULTS.sweepSpeed, -1, 1),
					rangeControl('radialFalloff', '감쇠', CONTROL_DEFAULTS.radialFalloff, 0, 3),
					rangeControl(
						'radialFlowSpeed',
						'흐름 속도',
						CONTROL_DEFAULTS.radialFlowSpeed,
						0,
						1,
					),
				],
			},
			{
				// 빔 넷은 「스윕」 그룹에 있었다. 스윕에만 있는 축이 아니라(방사는 퍼지는 고리다)
				// 자기 자리를 준 것이고, 지금은 넷 다 admin 전용이다.
				id: 'beam',
				title: 'Beam',
				controls: [
					rangeControl(
						'pulseIntensity',
						'빔 세기',
						CONTROL_DEFAULTS.pulseIntensity,
						0,
						2,
					),
					rangeControl('pulseWidth', '빔 폭', CONTROL_DEFAULTS.pulseWidth, 0.01, 0.5),
					rangeControl('pulseSpeed', '빔 위상 속도', CONTROL_DEFAULTS.pulseSpeed, 0, 2),
					rangeControl('pulseDensity', '빔 밀도', CONTROL_DEFAULTS.pulseDensity, 0.1, 4),
				],
			},
			{
				id: 'glass',
				title: 'Glass',
				controls: [
					// 「플루트」는 전문용어다 — 창작자에게는 줄이 굵어지고 가늘어지는 것으로 보인다.
					rangeControl('glassSize', '줄 굵기', CONTROL_DEFAULTS.glassSize, 0, 1),
					// 가로 계열만 읽는다(스윕·방사 셰이더에는 uRibCurve가 없다).
					rangeControl('ribCurve', '플루트 폭 커브', CONTROL_DEFAULTS.ribCurve, 0.2, 3),
					rangeControl('glassDistortion', '굴절', CONTROL_DEFAULTS.glassDistortion, 0, 1),
					{
						id: 'distortionShape',
						kind: 'select' as const,
						label: '왜곡 형태',
						defaultValue: CONTROL_DEFAULTS.distortionShape,
						options: [
							{ value: 'cascade', label: 'Cascade' },
							{ value: 'flat', label: 'Flat' },
							{ value: 'contour', label: 'Contour' },
							{ value: 'lens', label: 'Lens' },
						],
					},
					rangeControl(
						'glassAngle',
						'플루트 각도',
						CONTROL_DEFAULTS.glassAngle,
						-180,
						180,
						1,
						{ precision: 0, unit: '°' },
					),
					rangeControl(
						'glassEdgeSoftness',
						'경계 부드러움',
						CONTROL_DEFAULTS.glassEdgeSoftness,
						0,
						1,
					),
					rangeControl('glassBlur', '블러', CONTROL_DEFAULTS.glassBlur, 0, 1),
					rangeControl('glassScattering', '산란', CONTROL_DEFAULTS.glassScattering, 0, 1),
					rangeControl(
						'glassHighlights',
						'유리 반짝임',
						CONTROL_DEFAULTS.glassHighlights,
						0,
						1,
					),
					// 결이 스스로 도는 속도 — 0이면 유리가 멈추고 광선만 움직인다.
					rangeControl('glassSpeed', '결 흐름', CONTROL_DEFAULTS.glassSpeed, -1, 1),
					rangeControl('glassShadows', '그림자', CONTROL_DEFAULTS.glassShadows, 0, 1),
					// 스윕·방사 계열만 읽는다.
					rangeControl(
						'glassSourceFadeStart',
						'광원 페이드 시작',
						CONTROL_DEFAULTS.glassSourceFadeStart,
						0,
						0.34,
					),
					rangeControl(
						'glassSourceFadeEnd',
						'광원 페이드 끝',
						CONTROL_DEFAULTS.glassSourceFadeEnd,
						0.34,
						1,
					),
				],
			},
			{
				id: 'glass-motion',
				title: 'Glass Motion',
				controls: [
					{
						id: 'glassOriginOffset',
						kind: 'pad' as const,
						label: '유리 원점 오프셋',
						defaultValue: CONTROL_DEFAULTS.glassOriginOffset,
					},
					rangeControl(
						'glassOffset',
						'플루트 오프셋',
						CONTROL_DEFAULTS.glassOffset,
						-2,
						2,
					),
					{
						id: 'glassDrift',
						kind: 'pad' as const,
						label: '드리프트 범위',
						defaultValue: CONTROL_DEFAULTS.glassDrift,
					},
					rangeControl(
						'glassDriftSpeedX',
						'드리프트 X 속도',
						CONTROL_DEFAULTS.glassDriftSpeedX,
						0,
						2,
					),
					rangeControl(
						'glassDriftSpeedY',
						'드리프트 Y 속도',
						CONTROL_DEFAULTS.glassDriftSpeedY,
						0,
						2,
					),
				],
			},
			{
				// 판을 어떻게 보여주는가 — 그림의 내용이 아니라 그것을 담는 틀의 축이다.
				id: 'frame',
				title: 'Frame',
				controls: [
					rangeControl('zoom', '확대', CONTROL_DEFAULTS.zoom, 0.5, 3),
					rangeControl('tilt', '기울기', CONTROL_DEFAULTS.tilt, -45, 45, 1, {
						unit: '°',
						precision: 0,
					}),
					// 「비네트」는 전문용어다 — 화면에서 일어나는 일을 그대로 적는다.
					rangeControl('vignette', '모서리 어둡기', CONTROL_DEFAULTS.vignette, 0, 1),
				],
			},
			{
				id: 'position',
				title: 'Position',
				controls: [
					{
						id: 'source',
						kind: 'pad' as const,
						// 🔑 라벨은 「기준점」이다 — 다른 두 런타임의 같은 판이 이미 그 말을 쓴다.
						//    런타임을 옮겨 다니는 사람에게 같은 것은 같은 말이어야 한다.
						//    주석에서 「광원」이라 부르는 것은 그 점의 물리적 정체고, 창작자가 고르는
						//    축의 이름은 세 런타임이 공유한다.
						label: '기준점',
						defaultValue: CONTROL_DEFAULTS.source,
					},
					rangeControl(
						'sourceOffsetX',
						'광원 X 오프셋',
						CONTROL_DEFAULTS.sourceOffsetX,
						-2,
						2,
					),
					rangeControl(
						'sourceOffsetY',
						'광원 Y 오프셋',
						CONTROL_DEFAULTS.sourceOffsetY,
						-2,
						2,
					),
				],
			},
		],
	},
} as const)

export default flutedGlassRuntimeManifest
