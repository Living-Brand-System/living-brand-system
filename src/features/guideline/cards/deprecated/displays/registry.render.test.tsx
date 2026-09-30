import { describe, expect, it } from 'vitest'
import { LEGACY_RENDERABLE_DISPLAYS } from '../../displays/registry'
import { DISPLAY_COMPONENTS } from '../../displays/registry.render'

describe('디스플레이 렌더 맵', () => {
	it('레지스트리의 모든 id에 컴포넌트가 있다', () => {
		expect(Object.keys(DISPLAY_COMPONENTS).sort()).toEqual(
			LEGACY_RENDERABLE_DISPLAYS.map((e) => e.id).sort(),
		)
	})
})
