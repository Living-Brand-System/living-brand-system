import type { Block } from 'payload'
import {
	anchorField,
	type BlockLayout,
	baseContentFields,
	presetFields,
	type RowHeight,
} from './fields'

/**
 * 블록 레지스트리 — 블록 종류는 **여기 항목 하나**로 정의된다(2026-09-07). 폴더도 3파일도 없다.
 *
 * base를 뺀 나머지는 슈거다: 스키마 모양·투영·렌더가 base와 같고, 다른 것은 명칭(admin 라벨이자 고정 제목),
 * 설명, 그리고 사전 정의 값(`presets`)뿐이다. section은 슈거가 아니라 base + 앵커다 — 2026-09-07에 leaf
 * `children`을 카드로 이관해 이 꼴이 됐다(마이그레이션 add_guideline_card_blocks).
 *
 * 🔴 이 모듈은 payload.config가 Node에서 읽는다 — React·이미지 import를 넣지 말 것. 렌더는
 *    `registry.render.tsx`가 같은 id로 갈라 그린다.
 * 🔴 `description`은 Payload 블록 선택기에 슬롯이 없어 화면에 나오지 않는다. 사람이 읽는 정의서다.
 * 🔴 `dbName`은 중첩 테이블명 63자 방어용 짧은 별칭이다. 한 번 정하면 바꾸지 않는다(테이블 이름).
 */
export interface BlockPresets {
	layout?: BlockLayout
	rowHeight?: RowHeight
}

export interface BlockEntry {
	id: string
	dbName: string
	name: string
	description: string
	/** 있으면 슈거 — 이 값들과 제목(`name`)이 고정되고 admin에서 숨겨진다. */
	presets?: BlockPresets
	/** URL 앵커를 남기고 좌측 TOC에 오른다. section만. */
	anchor?: boolean
}

export const BLOCKS = [
	{
		id: 'section',
		dbName: 'sec',
		name: '섹션',
		description: '앵커를 남기고 좌측 목차에 동기화되는 블록. 토픽 본문의 기본 단위.',
		anchor: true,
	},
	{
		id: 'base',
		dbName: 'bse',
		name: '블록',
		description: '카드 목록과 레이아웃과 격자 열 수·캐러셀 높이를 직접 정하는 기본 블록.',
	},
	{
		id: 'overview',
		dbName: 'ovw',
		name: '한 눈에 보기',
		description: '토픽의 핵심 비주얼을 캐러셀로 훑는 사전 정의 블록. Figma 131:151.',
		presets: { layout: 'carousel', rowHeight: 'medium' },
	},
	{
		id: 'examples',
		dbName: 'exm',
		name: '예제',
		description:
			'적용 예시를 캐러셀로 늘어놓는 사전 정의 블록. 카드 폭은 비율에서 나온다. Figma 132:465.',
		presets: { layout: 'carousel', rowHeight: 'medium' },
	},
] as const satisfies readonly BlockEntry[]

export type BlockId = (typeof BLOCKS)[number]['id']
export type CardBlockId = Exclude<BlockId, 'section'>

export function blockEntry(id: BlockId): (typeof BLOCKS)[number] {
	const entry = BLOCKS.find((candidate) => candidate.id === id)
	if (!entry) throw new Error(`등록되지 않은 블록: ${id}`)
	return entry
}

/** 슈거의 고정 제목. presets가 없는 블록은 데이터의 제목을 쓴다. */
export function fixedTitle(entry: BlockEntry): string | undefined {
	return entry.presets ? entry.name : undefined
}

const pascal = (id: string) => id.charAt(0).toUpperCase() + id.slice(1)

/** 항목 하나를 Payload Block으로 만든다. 스키마는 하나(`baseContentFields`)이고 presets만 덧씌운다. */
export function blockSchema(entry: BlockEntry): Block {
	const presets = entry.presets
		? Object.fromEntries([
				['title', { defaultValue: entry.name }],
				...Object.entries(entry.presets).map(([name, value]) => [
					name,
					{ defaultValue: value },
				]),
			])
		: {}

	return {
		slug: entry.id,
		dbName: entry.dbName,
		interfaceName: `${pascal(entry.id)}Block`,
		labels: { singular: entry.name, plural: entry.name },
		fields: [
			...(entry.anchor ? [anchorField()] : []),
			...presetFields(baseContentFields(), presets),
		],
	}
}

/** 문서 `blocks` 필드가 받는 Payload Block 목록. 배열 순서가 admin 선택기 순서다. */
export const guidelineBlocks: Block[] = BLOCKS.map(blockSchema)
