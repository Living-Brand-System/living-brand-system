/**
 * 가이드라인 B.11 INFOGRAPHIC이 쓰는 색. 🔴 임의 색이 아니다 — hex 정본은 `brand-colors`
 * 컬렉션(`scripts/seed-hd-brand-colors.ts`)이 갖고, 여기 있는 것은 그 정본을 인포그래픽
 * 팔레트 순서로 늘어놓은 것뿐이다. 새 색을 여기서 발명하지 말 것.
 */
export const HD_INFOGRAPHIC_COLORS = {
	lightGreen: '#DCF5D2',
	ecoGreen: '#73D75A',
	heritageGreen: '#00AF41',
	prosperityGreen: '#007332',
	deepGreen: '#00280A',
	lightBlue: '#DCF0F5',
	discoveryBlue: '#003087',
	deepBlue: '#000A32',
	white: '#FFFFFF',
} as const

/**
 * 팔레트는 **순서 있는 색 목록**이다. 차트는 계열 수만큼 앞에서부터 뽑아 쓴다.
 * 정본 도판이 차트마다 다른 조합을 보여 주지만, 조합을 차트에 박지 않고 팔레트 축으로 뺀 것은
 * 「같은 데이터를 다른 조합으로 볼 수 있어야 한다」가 창작자가 실제로 다루는 축이기 때문이다.
 */
export const HD_INFOGRAPHIC_PALETTES = {
	green: {
		label: '그린',
		colors: [
			HD_INFOGRAPHIC_COLORS.lightGreen,
			HD_INFOGRAPHIC_COLORS.ecoGreen,
			HD_INFOGRAPHIC_COLORS.heritageGreen,
			HD_INFOGRAPHIC_COLORS.prosperityGreen,
			HD_INFOGRAPHIC_COLORS.deepGreen,
		],
	},
	greenNavy: {
		label: '그린 · 네이비',
		colors: [
			HD_INFOGRAPHIC_COLORS.lightGreen,
			HD_INFOGRAPHIC_COLORS.ecoGreen,
			HD_INFOGRAPHIC_COLORS.heritageGreen,
			HD_INFOGRAPHIC_COLORS.prosperityGreen,
			HD_INFOGRAPHIC_COLORS.deepBlue,
		],
	},
	navy: {
		label: '네이비',
		colors: [
			HD_INFOGRAPHIC_COLORS.lightBlue,
			HD_INFOGRAPHIC_COLORS.discoveryBlue,
			HD_INFOGRAPHIC_COLORS.deepBlue,
		],
	},
} as const

export type InfographicPaletteId = keyof typeof HD_INFOGRAPHIC_PALETTES

/** 팔레트가 계열 수보다 짧으면 순환한다 — 색을 새로 만들지 않기 위해서다. */
export function pickSeriesColors(palette: InfographicPaletteId, count: number): string[] {
	const { colors } = HD_INFOGRAPHIC_PALETTES[palette]
	return Array.from({ length: count }, (_, index) => colors[index % colors.length])
}

/**
 * 획에 쓸 색. 🔴 면과 다르다 — 가장 연한 색은 넓은 면으로는 읽히지만 1~2px 선으로는 흰 판에서
 * 사라진다(오남용 ①). 그래서 짙은 쪽부터 뽑고 가장 연한 한 색은 선에 쓰지 않는다.
 */
export function pickStrokeColors(palette: InfographicPaletteId, count: number): string[] {
	const usable = [...HD_INFOGRAPHIC_PALETTES[palette].colors].reverse().slice(0, -1)
	return Array.from({ length: count }, (_, index) => usable[index % usable.length])
}

/**
 * 면 위에 얹는 글자 색. 오남용 ①「시인성이 확보되지 않는 컬러를 사용하지 않습니다」를
 * 검사기가 아니라 **선택의 부재**로 지킨다 — 글자 색을 고를 수 있게 두지 않고 대비로 정한다.
 * WCAG 상대 휘도 기준이며, 경계값 0.45는 팔레트 5색이 모두 올바른 쪽으로 갈리는 자리다.
 */
export function readableTextColor(background: string): string {
	return relativeLuminance(background) > 0.45
		? HD_INFOGRAPHIC_COLORS.deepGreen
		: HD_INFOGRAPHIC_COLORS.white
}

function relativeLuminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((offset) => {
		const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
