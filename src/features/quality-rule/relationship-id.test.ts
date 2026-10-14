import { describe, expect, it } from 'vitest'
import { relationshipId } from './relationship-id'

describe('relationshipId', () => {
	it('id든 펼친 문서든 같은 id를 읽고, 없거나 NaN이면 null이다', () => {
		expect(relationshipId(3)).toBe(3)
		expect(relationshipId({ id: 3, title: '챕터' })).toBe(3)
		expect(relationshipId(null)).toBeNull()
		expect(relationshipId(undefined)).toBeNull()
		expect(relationshipId(Number.NaN)).toBeNull()
		expect(relationshipId({ id: '3' })).toBeNull()
	})
})
