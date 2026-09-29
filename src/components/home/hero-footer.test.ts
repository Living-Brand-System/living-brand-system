import { describe, expect, it } from 'vitest'
import { routes } from '@/lib/routes'
import { FOOTER_LINK_GROUPS } from './hero-footer'

describe('HeroFooter', () => {
	// 🔴 GNB에는 있고 푸터에는 없는 스튜디오가 생기면 그 화면은 주소를 아는 사람만 간다.
	it('Studio 그룹이 스튜디오 라우트를 하나도 빠뜨리지 않는다', () => {
		const linked = new Set(
			FOOTER_LINK_GROUPS.flatMap((group) => group.links.map((link) => link.href)),
		)

		expect([...Object.values(routes.studio)].filter((href) => !linked.has(href))).toEqual([])
	})
})
