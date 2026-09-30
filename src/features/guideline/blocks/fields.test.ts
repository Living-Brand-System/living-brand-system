import type { Field, TextField } from 'payload'
import { describe, expect, it } from 'vitest'
import { anchorField, baseContentFields, presetFields } from './fields'
import { BLOCKS, blockEntry, blockSchema } from './registry'

function flat(fields: Field[]): Field[] {
	return fields.flatMap((field) =>
		'fields' in field && field.type === 'row' ? field.fields : [field],
	)
}
function named(fields: Field[], name: string) {
	return flat(fields).find((field) => 'name' in field && field.name === name) as Field & {
		defaultValue?: unknown
		admin?: { hidden?: boolean }
	}
}

const OverviewBlock = blockSchema(blockEntry('overview'))
const ExamplesBlock = blockSchema(blockEntry('examples'))

describe('슈거 블록', () => {
	it('모든 블록의 Mark는 카드가 소유하고 기본값은 없음이다', () => {
		for (const entry of BLOCKS) {
			const fields = blockSchema(entry).fields
			expect(named(fields, 'mark')).toBeUndefined()
			const cards = named(fields, 'cards')
			if (cards.type !== 'array') throw new Error('cards 배열이 없다')
			expect(named(cards.fields, 'mark')).toMatchObject({
				defaultValue: 'none',
				options: [
					{ label: '없음', value: 'none' },
					{ label: 'Do (권장)', value: 'do' },
					{ label: 'OK (허용)', value: 'ok' },
					{ label: "Don't (금지)", value: 'dont' },
				],
			})
		}
	})

	// 🔴 슈거는 새 필드를 만들지 않는다 — 기본 블록과 같은 필드 이름 집합이어야 한다.
	it('기본 블록과 같은 필드를 갖는다', () => {
		const base = flat(baseContentFields()).map((f) => ('name' in f ? f.name : f.type))
		for (const block of [OverviewBlock, ExamplesBlock]) {
			expect(flat(block.fields).map((f) => ('name' in f ? f.name : f.type))).toEqual(base)
		}
	})

	it('고정값은 defaultValue로 채우고 admin에서 숨긴다', () => {
		expect(named(OverviewBlock.fields, 'layout')).toMatchObject({
			defaultValue: 'carousel',
			admin: { hidden: true },
		})
		expect(named(OverviewBlock.fields, 'rowHeight').defaultValue).toBe('medium')
		expect(named(ExamplesBlock.fields, 'layout').defaultValue).toBe('carousel')
	})

	it('presetFields는 row 안의 필드도 찾는다', () => {
		const fields = presetFields(baseContentFields(), { layout: { defaultValue: 'carousel' } })
		expect(named(fields, 'layout').defaultValue).toBe('carousel')
		expect(named(fields, 'title').admin?.hidden).toBeUndefined()
	})
})

describe('section anchor', () => {
	const field = anchorField() as TextField
	const runHook = (value: unknown, title: unknown) =>
		field.hooks?.beforeValidate?.[0]?.({ siblingData: { title }, value } as never)

	it('비어 있으면 제목에서 앵커를 만든다', () => {
		expect(runHook('', 'Grid System Overview')).toBe('grid-system-overview')
	})

	// 🔴 한글 제목이 통째로 사라지면 앵커가 빈 문자열이 되어 `id=""`가 렌더된다.
	it('한글 제목도 앵커로 남긴다', () => {
		expect(runHook(undefined, '키 레이아웃')).toBe('키-레이아웃')
	})

	// 🔴 URL 정체성이므로 이미 정한 앵커는 제목이 바뀌어도 유지된다.
	it('값이 있으면 덮지 않는다', () => {
		expect(runHook('key-layout', 'Grid System Overview')).toBe('key-layout')
	})
})

it('그리드 열 수와 캐러셀 높이는 배치에 맞는 설정만 노출한다', () => {
	const fields = baseContentFields()
	const columns = named(fields, 'columns')
	const height = named(fields, 'rowHeight')
	expect(columns).toMatchObject({
		defaultValue: '2',
		options: [1, 2, 3, 4].map((n) => ({ label: `${n}열`, value: String(n) })),
	})
	for (const layout of ['grid', 'carousel']) {
		expect(columns.admin?.condition?.({}, { layout }, {} as never)).toBe(layout === 'grid')
		expect(height.admin?.condition?.({}, { layout }, {} as never)).toBe(layout === 'carousel')
	}
})
