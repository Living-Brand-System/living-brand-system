import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { HEIGHT } from '../ci-lockup/manifest'

// CI 조합형 히어로 — 락업 하나를 크게 놓고 **이름만 끊임없이 갈아 끼우는** 판.
//
// 🔑 락업을 다시 그리지 않는다. `ci-lockup`의 뷰에 축을 전부 고정해 넘기고 이름 하나만 시간에
//    따라 바꾼다 — 그러면 조판·색·간격 규정이 한 곳(`ci-lockup/rules.ts`)에만 남는다.
// 🔴 컨트롤을 열지 않는다(`manifest.ts` 없음). 히어로는 읽는 면이고, 고를 것이 있으면 그것은
//    설명 판이다. 그래서 `controllers/registry.ts`에도 등록하지 않는다.
//
// dbName 짧게(cih)로 중첩 테이블명 63자 방어. slug 18자 → `alias-length.test.ts`가 지킨다.

/** 계열사명이 도는 자리. 자회사는 국문, 해외지사는 영문이다(정본 도판이 그렇다). */
export const HERO_SOURCES = [
	{ value: 'subsidiary', label: '자회사명' },
	{ value: 'branch', label: '해외지사 지역명' },
] as const

export const ciLockupHero = defineDisplay({
	id: 'ciLockupHeroWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'contain',
	downloads: ['svg'],
	dbName: 'cih',
	name: 'CI 조합형 히어로',
	description: '자회사명·해외지사명이 도는 CI 조합형. 판 높이가 심볼 크기를 정한다.',
	fields: [
		{
			name: 'source',
			type: 'select',
			defaultValue: HERO_SOURCES[0].value,
			options: HERO_SOURCES.map((source) => ({ ...source })),
			admin: { description: '무엇이 도는가. 자회사명은 국문, 해외지사 지역명은 영문입니다.' },
		},
		{
			// 🔑 범위는 `ci-lockup`의 매니페스트에서 온다 — 판 크기의 정본이 두 곳으로 갈리지 않게 한다.
			name: 'h',
			type: 'number',
			defaultValue: 160,
			min: HEIGHT.min,
			max: HEIGHT.max,
			admin: {
				description: `심볼 높이(px). 락업의 모든 치수가 이 값의 배수입니다(${HEIGHT.min}~${HEIGHT.max}).`,
			},
		},
	],
})

export default ciLockupHero
