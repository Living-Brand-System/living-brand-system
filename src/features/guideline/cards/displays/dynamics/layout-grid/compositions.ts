import type { StaticImageData } from 'next/image'
import ciHdHorizontalMono from './images/ci-hd-horizontal-mono.svg'
import ciKoHorizontal from './images/ci-ko-horizontal.svg'
import sampleA1 from './images/sample-a1.webp'
import sampleA2 from './images/sample-a2.webp'
import sampleA3 from './images/sample-a3.webp'
import sampleB1 from './images/sample-b1.webp'
import sampleC1 from './images/sample-c1.webp'
import sampleC2 from './images/sample-c2.webp'
import type { LayoutGridSample } from './samples'

// 조합 데이터 — 여기만 고치면 된다. 레이아웃 시스템(그리드·마진·거터·가이드)은 템플릿(component.tsx)이
// 소유하고, 이 파일은 "무엇을 어느 선에 놓는가"만 기술한다. JSX가 없는 순수 데이터라
// 나중에 JSON·CMS로 옮겨도 템플릿은 그대로다.
//
// 에셋은 키로 참조한다(PHOTOS·CI_ART) — 조합 자체를 문자열만으로 표현할 수 있게 하려는 것.

export const PHOTOS = {
	a1: sampleA1,
	a2: sampleA2,
	a3: sampleA3,
	b1: sampleB1,
	c1: sampleC1,
	c2: sampleC2,
} satisfies Record<string, StaticImageData>

export const CI_ART = {
	koHorizontal: ciKoHorizontal,
	hdHorizontalMono: ciHdHorizontalMono,
} satisfies Record<string, StaticImageData>

/** 셀에 놓이는 개체. 크기 단위는 cqw/cqmax(대지 기준)라 판형 크기와 무관하게 같은 그림이 나온다. */
export type Element =
	| { kind: 'photo'; asset: keyof typeof PHOTOS }
	/** CI 락업. mono는 색을 입혀 쓰는 단색 아트워크(파일에 fill이 없다). */
	| { kind: 'ci'; art: keyof typeof CI_ART; height: string; mono?: boolean }
	/** 본문. 문자열의 개행을 그대로 지킨다. */
	| { kind: 'caption'; text: string }
	/** 큰 타이틀(고정 크기). */
	| { kind: 'title'; text: string }
	/** 놓인 영역의 폭을 정확히 채우는 타이틀(크기가 폭에서 파생된다). */
	| { kind: 'fillTitle'; text: string }

/** 콘텐츠 셀 인덱스(1~3). `[시작, 끝]`이면 그 두 선 사이를 걸친다. */
export type Span = number | [number, number]
export type Side = 'top' | 'right' | 'bottom' | 'left'

/**
 * 개체 하나의 배치.
 * bleed에 준 변은 셀 경계 대신 **문서(대지) 끝** 선에 붙는다.
 * 🔴 bleed한 변만 여백이 0이다. 표 내부 구분선에 닿는 변은 문서까지 뻗는 이미지라도 거터를 받는다.
 * behind = 이미지 레이어(z-index 0). 텍스트·CI는 항상 그 위에 온다.
 * alignX·alignY = 셀 안에서의 정렬. 기본은 좌상단.
 * background = 셀 배경색(이미지 대신 색으로 채울 때). element 없이 배경만 둘 수도 있다.
 */
export type Placement = {
	col: Span
	row: Span
	bleed?: Side[]
	behind?: boolean
	alignX?: 'center' | 'end'
	alignY?: 'center' | 'end'
}

export type Item = Placement & { background?: string; element?: Element }
export type Composition = { background: string; color: string; items: Item[] }

/** 콘텐츠 셀 인덱스 1~3. 9셀을 순회할 때 쓴다. */
const TRACKS_INDEX = [1, 2, 3]

/** 그리드 설명용 라벨 위치 — 1행 전체와 1열 전체에 트랙 배수를 적는다(빈 칸은 배경만). */
const GRID_LABELS: { col: number; row: number; text: string }[] = [
	{ col: 1, row: 1, text: '1A' },
	{ col: 2, row: 1, text: '2A' },
	{ col: 3, row: 1, text: '3A' },
	{ col: 1, row: 2, text: '2A' },
	{ col: 1, row: 3, text: '3A' },
]

export const COMPOSITIONS: Record<LayoutGridSample, Composition> = {
	a: {
		background: '#ffffff',
		color: '#1a1a1a',
		items: [
			{ col: 1, row: 1, element: { kind: 'ci', art: 'koHorizontal', height: '3cqmax' } },
			// 녹색 그라디언트 — 3열 × 1행 셀을 채운다.
			{ col: 3, row: 1, behind: true, element: { kind: 'photo', asset: 'a1' } },
			// 캡션은 1열 폭을 채우고 그 안에서 줄바꿈된다.
			{ col: 1, row: 2, element: { kind: 'caption', text: 'FUTURE CLOSER TO HUMANITY' } },
			// 선박 선수 — 2열 왼변부터 3열 오른변까지.
			{ col: [2, 3], row: 2, behind: true, element: { kind: 'photo', asset: 'a2' } },
			// 탱커 — 표 안이다(문서 풀블리드 아님). 3행의 1~3열을 채운다.
			{ col: [1, 3], row: 3, behind: true, element: { kind: 'photo', asset: 'a3' } },
		],
	},
	b: {
		background: '#12202e',
		color: '#ffffff',
		items: [
			// 풍력 터빈 — 네 변 모두 문서 끝(판형 전체 배경).
			{
				col: 1,
				row: 1,
				bleed: ['top', 'right', 'bottom', 'left'],
				behind: true,
				element: { kind: 'photo', asset: 'b1' },
			},
			// 어두운 배경이라 단색 락업을 흰색으로 렌더한다.
			{
				col: 1,
				row: 1,
				element: { kind: 'ci', art: 'hdHorizontalMono', height: '3cqmax', mono: true },
			},
			{
				col: 2,
				row: 2,
				element: {
					kind: 'caption',
					text: 'WE BRING THE FUTURE CLOSER TO HUMANITY BY STEERING INNOVATION AND DEFYING OUR LIMITS',
				},
			},
		],
	},
	c: {
		background: '#ffffff',
		color: '#1a1a1a',
		items: [
			// 항만 밴드 — 아래는 1/6 구분선, 나머지 세 변은 문서 끝.
			{
				col: 1,
				row: 1,
				bleed: ['top', 'left', 'right'],
				behind: true,
				element: { kind: 'photo', asset: 'c1' },
			},
			{ col: 1, row: 2, element: { kind: 'title', text: '2026' } },
			// 1/2열 구분선(선 3)부터 3열 오른변(선 5)까지 폭을 채운다.
			{ col: [2, 3], row: 2, element: { kind: 'fillTitle', text: 'FUTURE BUILDER' } },
			// 본문 — 2열 아래쪽. 타이틀과 같은 행이지만 세로 정렬이 달라 겹치지 않는다.
			{
				col: 2,
				row: 2,
				alignY: 'end',
				element: {
					kind: 'caption',
					text: 'WE BRING THE FUTURE CLOSER TO\nHUMANITY BY STEERING INNOVATION\nAND DEFYING OUR LIMITS',
				},
			},
			// CI — 우하단.
			{
				col: 3,
				row: 2,
				alignX: 'end',
				alignY: 'end',
				element: { kind: 'ci', art: 'koHorizontal', height: '2.5cqmax' },
			},
			// 잠수함 — 위는 1/2 구분선, 나머지 세 변은 문서 끝.
			{
				col: 1,
				row: 3,
				bleed: ['left', 'right', 'bottom'],
				behind: true,
				element: { kind: 'photo', asset: 'c2' },
			},
		],
	},
	// 그리드 자체를 설명하는 조합 — 9셀을 옅은 회색으로 채우고 트랙 배수를 적는다.
	'grid-labels': {
		background: '#ffffff',
		color: '#007332',
		items: [
			// 모든 셀에 배경색. element 없이 배경만 두는 항목이다.
			...TRACKS_INDEX.flatMap((row) =>
				TRACKS_INDEX.map((col) => ({ col, row, behind: true, background: '#f2f2f2' })),
			),
			// 라벨 — 셀 가운데.
			...GRID_LABELS.map(({ col, row, text }) => ({
				col,
				row,
				alignX: 'center' as const,
				alignY: 'center' as const,
				element: { kind: 'title' as const, text },
			})),
		],
	},
}
