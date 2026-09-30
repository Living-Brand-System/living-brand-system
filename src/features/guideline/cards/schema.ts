import type { Field } from 'payload'
import { CARD_RATIO_OPTIONS } from './displays/ratio'
import { DISPLAYS, displayBlocks } from './displays/registry'

/** 카드 하나의 판정 표식. 생략하거나 none이면 표시하지 않는다. */
export const CARD_MARKS = [
	{ label: '없음', value: 'none' },
	{ label: 'Do (권장)', value: 'do' },
	{ label: 'OK (허용)', value: 'ok' },
	{ label: "Don't (금지)", value: 'dont' },
] as const

/**
 * 카드 = 디스플레이 + 캡션(제목·설명). 콘텐츠의 최소 단위이고 블록의 하위 개체다(2026-09-07 모델).
 *
 * 🔴 비율은 규격 타입에서 고른다(`displays/ratio.ts`). 디스플레이는 정적(이미지) 또는 다이나믹(위젯)
 *    중 **하나**다. 캡션은 선택이고 제목·설명도 각각 단독으로 쓸 수 있다 — 빈 자리는 렌더하지 않는다.
 * 🔴 카드는 자체 폭을 갖지 않는다. 격자는 열 수로 너비를 배분하고 캐러셀은 줄 높이로 너비를 계산한다.
 *    카드는 비율을 소유한다. Mark와 캡션은 카드별 선택 속성이다.
 */
export function cardFields(): Field[] {
	return [
		{
			name: 'ratio',
			type: 'select',
			required: true,
			defaultValue: '16:9',
			enumName: 'enum_card_ratio',
			options: [...CARD_RATIO_OPTIONS],
			admin: {
				description:
					'카드 비율입니다. Type Language·Type Hierarchy는 5:7, Layout Grid Overlay는 3:2 규격이 우선 적용됩니다. 격자는 열 수로 너비를, 캐러셀은 줄 높이로 높이를 정합니다.',
			},
		},
		{
			name: 'mark',
			type: 'select',
			label: '판정 표식',
			defaultValue: 'none',
			enumName: 'enum_card_mark',
			options: [...CARD_MARKS],
			admin: {
				description: '이 카드에만 붙는 표식입니다. 없음을 선택하면 표시하지 않습니다.',
			},
		},
		{
			name: 'display',
			type: 'blocks',
			label: '디스플레이',
			maxRows: 1,
			blocks: displayBlocks,
			// 기존 문서 저장은 허용하되 빈 카드의 선택기에서는 폐기 위젯을 제외한다.
			filterOptions: ({ siblingData }) => {
				const rows = (siblingData as { display?: { blockType?: string }[] })?.display
				const existing = Array.isArray(rows) ? rows.map((row) => row?.blockType) : []
				return displayBlocks
					.filter(
						(block) =>
							DISPLAYS.some((display) => display.id === block.slug) ||
							existing.includes(block.slug),
					)
					.map((block) => block.slug)
			},
			admin: { description: '판에 무엇을 그릴지입니다. 이미지 하나 또는 위젯 하나.' },
		},
		{
			name: 'caption',
			type: 'group',
			label: '캡션',
			fields: [
				{
					name: 'placement',
					type: 'select',
					label: '캡션 배치',
					defaultValue: 'below',
					enumName: 'enum_card_caption_placement',
					options: [
						{ label: '카드 아래', value: 'below' },
						{ label: '이미지 위 하단', value: 'overlay' },
					],
				},
				{ name: 'title', type: 'text', localized: true },
				{
					name: 'description',
					type: 'richText',
					localized: true,
					admin: {
						description: '텍스트 또는 표. 2열 표는 라벨·값 스펙 리스트로 그립니다.',
					},
				},
			],
		},
	]
}

/** 블록이 품는 카드 목록. */
export function cardsField(): Field {
	return {
		name: 'cards',
		type: 'array',
		label: '카드',
		fields: cardFields(),
		admin: { description: '이 블록이 품는 카드입니다. 배치는 블록의 레이아웃이 정합니다.' },
	}
}
