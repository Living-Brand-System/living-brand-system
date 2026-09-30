import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { GuidelineDocuments } from '@/collections/GuidelineDocuments'
import { guidelineRulesField } from './fields'
import { BLOCKS, blockEntry, blockSchema, fixedTitle, guidelineBlocks } from './registry'

const fieldNames = (fields: Field[]) =>
	fields.flatMap((field) =>
		'name' in field && typeof field.name === 'string' ? [field.name] : [],
	)

describe('블록 레지스트리', () => {
	it('id·dbName이 유일하고 Payload slug와 같다', () => {
		const ids = BLOCKS.map((entry) => entry.id)
		expect(new Set(ids).size).toBe(ids.length)
		expect(new Set(BLOCKS.map((entry) => entry.dbName)).size).toBe(ids.length)
		expect(guidelineBlocks.map((block) => block.slug)).toEqual(ids)
	})

	// 🔴 문서 blocks 필드는 레지스트리 배열 그대로다 — 다른 곳에서 블록을 끼워 넣지 않는다.
	it('문서 blocks 필드가 레지스트리를 그대로 받는다', () => {
		const blocks = GuidelineDocuments.fields.find((f) => 'name' in f && f.name === 'blocks')
		if (blocks?.type !== 'blocks') throw new Error('blocks 필드가 없다')
		expect(blocks.blocks).toBe(guidelineBlocks)
	})

	it('슈거는 고정 제목을 갖고 base·section은 갖지 않는다', () => {
		expect(fixedTitle(blockEntry('overview'))).toBe('한 눈에 보기')
		expect(fixedTitle(blockEntry('examples'))).toBe('예제')
		expect(fixedTitle(blockEntry('base'))).toBeUndefined()
		expect(fixedTitle(blockEntry('section'))).toBeUndefined()
	})

	it('카드 블록의 interfaceName은 <Pascal id>Block이다', () => {
		expect(blockSchema(blockEntry('overview')).interfaceName).toBe('OverviewBlock')
	})

	it('문서와 모든 블록이 같은 rules 관계 계약을 두고 Rule 정의 필드는 소유하지 않는다', () => {
		const rules = guidelineRulesField()
		expect(rules.type).toBe('relationship')
		if (rules.type !== 'relationship') return
		expect(rules.relationTo).toBe('rules')
		expect(rules.hasMany).toBe(true)

		expect(fieldNames(GuidelineDocuments.fields)).toContain('rules')
		expect(fieldNames(GuidelineDocuments.fields)).not.toContain('checks')
		for (const block of guidelineBlocks) {
			expect(fieldNames(block.fields)).toContain('rules')
			expect(fieldNames(block.fields)).not.toContain('checks')
		}
	})
})
