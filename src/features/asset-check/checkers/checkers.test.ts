/**
 * Checker 스냅샷 테스트 — registry 바인딩을 경유해 checkKey별 pass/fail 판정을 고정한다.
 * palette-match(deltaE) 교체 같은 색 수학 변경 시 판정이 뒤집히지 않는지 잡는 회귀 안전망.
 * 픽스처 팔레트는 빨강·파랑·회색 계열을 고루 담은 임의 팔레트다. 명함 별색만 HD 값을 쓴다.
 */
import { describe, expect, it } from 'vitest'
import { hexToRgb, type Rgb, type Swatch } from './palette-match'
import { getChecker } from './registry'
import type { PixelGrid } from './types'

const PALETTE: Swatch[] = [
	{ name: 'Red 3', hex: '#EA5343', family: 'red' },
	{ name: 'Red 1', hex: '#FFF0EB', family: 'red' },
	{ name: 'Red 2', hex: '#FFB4AA', family: 'red' },
	{ name: 'Red 4', hex: '#871400', family: 'red' },
	{ name: 'Red 5', hex: '#460500', family: 'red' },
	{ name: 'Blue 3', hex: '#3C87CD', family: 'blue' },
	{ name: 'Blue 5', hex: '#001941', family: 'blue' },
	{ name: 'Gray 1', hex: '#FAFAFA', family: 'gray' },
	{ name: 'Gray 5', hex: '#151515', family: 'gray' },
	{ name: 'White', hex: '#FFFFFF', family: 'extreme' },
	{ name: 'Black', hex: '#000000', family: 'extreme' },
]

// 명함 별색(spot-color)이 허용하는 HD 색. 팔레트 판정 픽스처와 섞지 않는다.
const STATIONERY_PALETTE: Swatch[] = [
	...PALETTE,
	{ name: 'HD HERITAGE GREEN', hex: '#00AF41', family: 'green' },
]

const CHECKER_KEYS: Record<string, string> = {
	'color.palette': 'palette-compliance',
	'color.combination': 'color-combination',
	'color.mode': 'spot-color',
	'application.print.spec': 'spot-color',
	'imagery.background.tone': 'background-tone',
	'logo.space.clear': 'clear-space',
	'logo.size.minimum': 'relative-size',
	'application.stationery.format': 'canvas-format',
	'application.sns.format': 'canvas-format',
	'application.web': 'canvas-format',
	'application.advertisement.format': 'canvas-format',
	'layout.visual.template': 'canvas-format',
	'layout.sns.template': 'canvas-format',
	'layout.advertisement.template': 'canvas-format',
}

const CHECKER_OPTIONS: Record<string, unknown> = {
	'application.stationery.format': {
		formats: [
			{ label: '명함 90×50mm', width: 90, height: 50 },
			{ label: '리플렛 A4 210×297mm', width: 210, height: 297 },
			{ label: '제품 정보 카드 A5 148×210mm', width: 148, height: 210 },
		],
		tolerance: 0.05,
		ignoreOrientation: true,
	},
	'application.sns.format': {
		formats: [
			{ label: 'Feed', width: 1080, height: 1440 },
			{ label: 'Reels', width: 1080, height: 1920 },
		],
	},
	'application.web': {
		formats: [
			{ label: '16:9', width: 16, height: 9 },
			{ label: '3:1', width: 3, height: 1 },
		],
	},
	'application.advertisement.format': {
		formats: [
			{ label: '1:2', width: 1, height: 2 },
			{ label: 'Offline Vertical', width: 1440, height: 2100 },
			{ label: 'Offline Horizontal', width: 8600, height: 2100 },
		],
	},
	'layout.visual.template': {
		formats: [
			{ label: 'A4', width: 210, height: 297 },
			{ label: '3:5', width: 1080, height: 1440 },
		],
	},
	'layout.sns.template': {
		formats: [
			{ label: 'Feed', width: 1080, height: 1440 },
			{ label: 'Reels', width: 1080, height: 1920 },
		],
	},
	'layout.advertisement.template': {
		formats: [
			{ label: 'Offline Vertical', width: 1440, height: 2100 },
			{ label: 'Offline Horizontal', width: 8600, height: 2100 },
		],
	},
}

/** registry에서 checker를 꺼낸다 — 미등록이면 테스트가 즉시 실패한다. */
function checkerFor(checkKey: string) {
	const checkerKey = CHECKER_KEYS[checkKey]
	const checker = checkerKey ? getChecker(checkerKey, CHECKER_OPTIONS[checkKey]) : null
	if (checker?.executor !== 'algorithm') {
		throw new Error(`checker not registered: ${checkKey}`)
	}
	return checker.run
}

describe('checker options', () => {
	it('canvas-format은 유효한 options가 없으면 실행하지 않는다', () => {
		expect(getChecker('canvas-format')).toBeNull()
		expect(getChecker('canvas-format', { formats: [] })).toBeNull()
	})
})

/** hex → 픽셀 n개 (dominantColors가 점유율을 보므로 개수 비율 = share) */
function px(hex: string, n: number): Rgb[] {
	return Array.from({ length: n }, () => hexToRgb(hex))
}

/** 단색 배경 위 단색 사각형 grid (alpha 전부 불투명) */
function makeGrid(
	width: number,
	height: number,
	bgHex: string,
	rect?: { x: number; y: number; w: number; h: number; hex: string },
): PixelGrid {
	const bg = hexToRgb(bgHex)
	const fg = rect ? hexToRgb(rect.hex) : bg
	const pixels: Rgb[] = new Array(width * height)
	const alpha = new Uint8Array(width * height).fill(255)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const inRect =
				rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
			pixels[y * width + x] = inRect ? fg : bg
		}
	}
	return { width, height, pixels, alpha }
}

/** 규격 판정은 width/height만 보므로 픽셀 없는 경량 grid를 쓴다. */
function sizeGrid(width: number, height: number): PixelGrid {
	return { width, height, pixels: [], alpha: new Uint8Array(0) }
}

describe('color.palette (palette-compliance)', () => {
	const check = checkerFor('color.palette')

	it('팔레트 색만 쓰면 pass', () => {
		const result = check({
			pixels: [...px('#EA5343', 60), ...px('#FFFFFF', 40)],
			palette: PALETTE,
		})
		expect(result.status).toBe('pass')
		expect(result.fulfillment).toBe(100)
	})

	it('규정 외 색이 지배적이면 fail', () => {
		const result = check({
			pixels: [...px('#EA5343', 70), ...px('#00FF00', 30)],
			palette: PALETTE,
		})
		expect(result.status).toBe('fail')
	})

	it('팔레트 색에 가까운 변형(약간 다른 red)은 스냅되어 pass', () => {
		// EA5343에서 소폭 이탈 — deltaE 허용 오차 안이어야 한다.
		const result = check({
			pixels: px('#E85140', 100),
			palette: PALETTE,
		})
		expect(result.status).toBe('pass')
	})
})

describe('color.combination (color-combination)', () => {
	const check = checkerFor('color.combination')

	it('단일 red 계열 + 극단색은 모노/톤온톤으로 pass', () => {
		const result = check({
			pixels: [...px('#EA5343', 50), ...px('#FFB4AA', 30), ...px('#FFFFFF', 20)],
			palette: PALETTE,
		})
		expect(result.status).toBe('pass')
	})

	it('다계열이라도 명도 대비가 충분하면 톤인톤 근사로 pass', () => {
		const result = check({
			pixels: [...px('#EA5343', 60), ...px('#001941', 40)],
			palette: PALETTE,
		})
		expect(result.status).toBe('pass')
	})

	it('다계열 + 명도 대비 부족이면 fail', () => {
		const result = check({
			pixels: [...px('#EA5343', 60), ...px('#3C87CD', 40)],
			palette: PALETTE,
		})
		expect(result.status).toBe('fail')
	})

	it('팔레트 외 색이 있으면 조합 평가 불가로 fail', () => {
		const result = check({
			pixels: [...px('#EA5343', 60), ...px('#00FF00', 40)],
			palette: PALETTE,
		})
		expect(result.status).toBe('fail')
		expect(result.detail).toContain('조합 평가 불가')
	})
})

describe('application.print.spec (spot-color)', () => {
	const check = checkerFor('application.print.spec')

	it('HERITAGE GREEN + White만 쓰면 pass', () => {
		const result = check({
			pixels: [...px('#00AF41', 50), ...px('#FFFFFF', 50)],
			palette: STATIONERY_PALETTE,
		})
		expect(result.status).toBe('pass')
		expect(result.fulfillment).toBe(100)
	})

	it('팔레트 안이라도 HERITAGE GREEN+White 외 색(Gray 5)이 섞이면 fail', () => {
		const result = check({
			pixels: [...px('#00AF41', 40), ...px('#FFFFFF', 30), ...px('#151515', 30)],
			palette: STATIONERY_PALETTE,
		})
		expect(result.status).toBe('fail')
	})
})

describe('color.mode (spot-color 픽셀 프록시 공유)', () => {
	it('checkKey만 다르고 판정은 application.print.spec과 동일', () => {
		expect(checkerFor('color.mode')).toBe(checkerFor('application.print.spec'))
		const result = checkerFor('color.mode')({
			pixels: [...px('#00AF41', 50), ...px('#FFFFFF', 50)],
			palette: STATIONERY_PALETTE,
		})
		expect(result.status).toBe('pass')
	})
})

describe('imagery.background.tone (background-tone)', () => {
	const check = checkerFor('imagery.background.tone')

	it('밝은 무채색 배경은 pass', () => {
		const result = check({ pixels: px('#FAFAFA', 100), palette: PALETTE })
		expect(result.status).toBe('pass')
	})

	it('어둡고 채도 높은 배경은 fail', () => {
		const result = check({ pixels: px('#EA5343', 100), palette: PALETTE })
		expect(result.status).toBe('fail')
	})
})

describe('application.stationery.format (canvas-format, 방향 무시)', () => {
	const check = checkerFor('application.stationery.format')

	it('명함 비율(90:50)이면 pass (방향 무관)', () => {
		const result = check({ pixels: [], palette: PALETTE, grid: sizeGrid(900, 500) })
		expect(result.status).toBe('pass')
	})

	it('A4/A5 비율이면 pass (방향 무관)', () => {
		expect(check({ pixels: [], palette: PALETTE, grid: sizeGrid(210, 297) }).status).toBe(
			'pass',
		)
		expect(check({ pixels: [], palette: PALETTE, grid: sizeGrid(210, 148) }).status).toBe(
			'pass',
		)
	})

	it('정사각형이면 fail', () => {
		const result = check({ pixels: [], palette: PALETTE, grid: sizeGrid(500, 500) })
		expect(result.status).toBe('fail')
		expect(result.facts?.allowedFormats).toContain('명함 90×50mm')
	})
})

describe('logo.size.minimum (relative-size)', () => {
	const check = checkerFor('logo.size.minimum')

	it('로고가 프레임 대비 충분히 크면 pass', () => {
		const grid = makeGrid(100, 100, '#FFFFFF', { x: 40, y: 40, w: 20, h: 20, hex: '#EA5343' })
		expect(check({ pixels: [], palette: PALETTE, grid }).status).toBe('pass')
	})

	it('로고가 너무 작으면 fail', () => {
		const grid = makeGrid(100, 100, '#FFFFFF', { x: 48, y: 48, w: 4, h: 4, hex: '#EA5343' })
		expect(check({ pixels: [], palette: PALETTE, grid }).status).toBe('fail')
	})
})

describe('logo.space.clear (clear-space)', () => {
	const check = checkerFor('logo.space.clear')

	it('여백이 모듈(stem×3) 이상이면 pass', () => {
		// stem=10 → 모듈 30px, 여백 40px
		const grid = makeGrid(90, 90, '#FFFFFF', { x: 40, y: 40, w: 10, h: 10, hex: '#EA5343' })
		expect(check({ pixels: [], palette: PALETTE, grid }).status).toBe('pass')
	})

	it('여백이 모듈보다 좁으면 fail', () => {
		// stem=30 → 모듈 90px, 여백 30px
		const grid = makeGrid(90, 90, '#FFFFFF', { x: 30, y: 30, w: 30, h: 30, hex: '#EA5343' })
		expect(check({ pixels: [], palette: PALETTE, grid }).status).toBe('fail')
	})
})

describe('canvas-format 규격 룰들', () => {
	it('application.sns.format: Feed 1080×1440 pass, 정사각 fail, 가로 방향 fail', () => {
		const check = checkerFor('application.sns.format')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1440) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1920) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1080) }).status).toBe('fail')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1440, 1080) }).status).toBe('fail')
	})

	it('application.web: 16:9와 3:1 pass, 세로형 fail', () => {
		const check = checkerFor('application.web')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1920, 1080) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1920, 640) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1440) }).status).toBe('fail')
	})

	it('application.advertisement.format: 온라인 비율과 오프라인 mm 비율 pass', () => {
		const check = checkerFor('application.advertisement.format')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1000, 2000) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1440, 2100) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(8600, 2100) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(2100, 1000) }).status).toBe('fail')
	})

	it('layout.visual.template: A4와 3:5(1080×1440)를 구분해 판정', () => {
		const check = checkerFor('layout.visual.template')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(2100, 2970) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1440) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1300) }).status).toBe('fail')
	})

	it('grid가 없으면 fail', () => {
		expect(checkerFor('application.sns.format')({ pixels: [], palette: [] }).status).toBe(
			'fail',
		)
	})

	it('layout.sns.template: Feed/Reels 캔버스 pass', () => {
		const check = checkerFor('layout.sns.template')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1440) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1080, 1920) }).status).toBe('pass')
	})

	it('layout.advertisement.template: 오프라인 mm 비율 pass, 그 외 fail', () => {
		const check = checkerFor('layout.advertisement.template')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1440, 2100) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(8600, 2100) }).status).toBe('pass')
		expect(check({ pixels: [], palette: [], grid: sizeGrid(1000, 1000) }).status).toBe('fail')
	})
})
