import { describe, expect, it } from 'vitest'
import { applyControllerRestrictions } from '@/modules/studio-controller/controller-definition'
import {
	CI_LOCKUP_CONTROLS,
	CI_LOCKUP_MANIFEST,
} from '../cards/displays/dynamics/ci-lockup/manifest'
import { LAYOUT_GRID_MANIFEST } from '../cards/displays/dynamics/layout-grid/manifest'
import { controllerEntryFor } from './registry'

const entry = controllerEntryFor('layoutGridControlsWidget')

function effective(fields: Record<string, unknown>) {
	if (!entry) throw new Error('layoutGridControlsWidget 엔트리가 없습니다')
	const groups = applyControllerRestrictions(entry.manifest.groups, entry.toRestrictions(fields))
	return new Map(
		groups.flatMap((group) => group.controls.map((control) => [control.id, control] as const)),
	)
}

describe('controllerEntryFor', () => {
	it('레지스트리에 없는 자식은 컨트롤러를 열지 않는다', () => {
		expect(controllerEntryFor('layoutGridWidget')).toBeUndefined()
		expect(controllerEntryFor('typeWeightWidget')).toBeUndefined()
	})
})

describe('admin 값 → restriction', () => {
	it('조절 불허는 readonly가 되고, 허용은 손대지 않는다', () => {
		const controls = effective({ marginAdjustable: false, gutterXAdjustable: true })

		expect(controls.get('marginPct')?.availability).toBe('readonly')
		expect(controls.get('gutterX')?.availability).toBeUndefined()
	})

	it('🔴 미설정(undefined)은 허용이다 — false와 갈라야 한다', () => {
		// Payload checkbox는 저장 전 undefined로 온다. `?? true`가 아니면 전부 잠긴다.
		const controls = effective({})

		expect(controls.get('marginPct')?.availability).toBeUndefined()
		expect(controls.get('guidesOn')?.availability).toBeUndefined()
	})

	it('admin 값이 매니페스트 기본값을 덮고, 없으면 그대로 둔다', () => {
		const controls = effective({ marginPct: 5.5, guidesOn: false })

		expect(controls.get('marginPct')?.defaultValue).toBe(5.5)
		expect(controls.get('guidesOn')?.defaultValue).toBe(false)
		// 안 건드린 컨트롤은 매니페스트 값 그대로.
		expect(controls.get('gutterX')?.defaultValue).toBe(75)
	})

	it('정본 범위 밖 값은 계약이 막는다 — admin이 규정을 넓힐 수 없다', () => {
		// 마진 정본은 3~6%다. 그 밖을 심으면 applyControllerRestrictions가 던진다.
		expect(() => effective({ marginPct: 99 })).toThrow()
	})
})

describe('매니페스트', () => {
	it('그룹 경계가 알약의 구분선이다 — 마진 ┃ 거터 둘 ┃ 표시', () => {
		expect(LAYOUT_GRID_MANIFEST.groups.map((group) => group.controls.length)).toEqual([1, 2, 1])
	})
})

/* ── CI 락업: 축마다 초기값 + 노출 여부 ─────────────────────────── */

const ciEntry = controllerEntryFor('ciLockupWidget')

function ciEffective(fields: Record<string, unknown>) {
	if (!ciEntry) throw new Error('ciLockupWidget 엔트리가 없습니다')
	const groups = applyControllerRestrictions(
		ciEntry.manifest.groups,
		ciEntry.toRestrictions(fields),
	)
	return new Map(
		groups.flatMap((group) => group.controls.map((control) => [control.id, control] as const)),
	)
}

describe('CI 락업 admin 값 → restriction', () => {
	it('숫자 초기값(H)이 살아남는다', () => {
		// 🔴 회귀 방어: `defaultValue` 가드에서 number를 빼면 이 값이 조용히 버려진다.
		expect(ciEffective({ h: 80 }).get('h')?.defaultValue).toBe(80)
	})

	it('hiddenControls에 담은 축만 readonly가 된다', () => {
		const controls = ciEffective({ heightControl: true, hiddenControls: ['form', 'language'] })

		expect(controls.get('form')?.availability).toBe('readonly')
		expect(controls.get('language')?.availability).toBe('readonly')
		expect(controls.get('h')?.availability).toBeUndefined()
		expect(controls.get('clearSpace')?.availability).toBeUndefined()
	})

	// 🔴 H는 독자가 고를 값이 아니라 저작자가 판끼리의 비율을 맞추는 값이다(사용자 지정 2026-08-20).
	//    admin이 아무것도 안 고른 상태가 「알약에 H 없음」이어야 한다.
	it('H는 admin이 열지 않는 한 알약에 나오지 않는다', () => {
		expect(ciEffective({}).get('h')?.availability).toBe('readonly')
		expect(ciEffective({ heightControl: true }).get('h')?.availability).toBeUndefined()
	})

	// 🔴 치수는 hover가 소유한다 — 알약 토글로 두면 아무도 누르지 않고 자리만 먹는다.
	//    클리어스페이스는 반대로 알약에 남아야 한다(모드가 셋이라 hover로 못 접는다).
	it('치수는 알약에 나오지 않고 클리어스페이스는 남는다', () => {
		const controls = ciEffective({ measured: true })
		expect(controls.get('measured')?.availability).toBe('readonly')
		expect(controls.get('clearSpace')?.availability).toBeUndefined()
	})

	it('H를 열어도 hiddenControls가 이기면 readonly로 남는다', () => {
		const controls = ciEffective({ heightControl: true, hiddenControls: ['h'] })
		expect(controls.get('h')?.availability).toBe('readonly')
	})

	it('🔴 options에 없는 select 값은 버린다 — 렌더 중 throw로 페이지가 죽지 않게', () => {
		// 계열사 목록이 바뀌면 저장된 값이 고아가 된다. 그때 던지는 대신 기본값으로 그려야 한다.
		expect(() => ciEffective({ subsidiary: '없어진회사' })).not.toThrow()
		expect(ciEffective({ subsidiary: '없어진회사' }).get('subsidiary')?.defaultValue).toBe(
			ciEntry?.manifest.groups
				.flatMap((group) => group.controls)
				.find((control) => control.id === 'subsidiary')?.defaultValue,
		)
	})

	it('정상 select 값은 초기값을 덮는다', () => {
		expect(ciEffective({ colorType: 'mono' }).get('colorType')?.defaultValue).toBe('mono')
	})
})

describe('CI 락업 축 목록', () => {
	it('🔴 축 목록과 매니페스트 그룹이 어긋나지 않는다', () => {
		// 어긋나면 `applyControllerRestrictions`가 「control을 찾을 수 없습니다」로 던져
		// 저작된 모든 페이지가 렌더 중 죽는다. 목록을 손으로 두는 대가가 이 테스트다.
		const inGroups = CI_LOCKUP_MANIFEST.groups.flatMap((group) =>
			group.controls.map((control) => control.id),
		)
		const inList = CI_LOCKUP_CONTROLS.map((control) => control.id)

		expect([...inList].sort()).toEqual([...inGroups].sort())
		expect(new Set(inList).size, '중복된 축 id').toBe(inList.length)
	})

	it('저작된 실제 형태로 제한을 적용해도 던지지 않는다', () => {
		// 로컬 DB의 색상 변형 블록 첫 자식과 같은 모양이다.
		expect(() =>
			ciEffective({
				h: 80,
				subsidiaryOn: true,
				branchOn: true,
				subsidiary: '현대중공업',
				branch: 'EUROPE R&D CENTER',
				form: 'horizontalA',
				language: 'en',
				colorType: 'fullColor',
				mono: 'BLACK',
				clearSpace: 'off',
				measured: false,
				hiddenControls: [
					'subsidiaryOn',
					'branchOn',
					'form',
					'language',
					'colorType',
					'mono',
				],
			}),
		).not.toThrow()
	})
})

describe('CI 락업 계층별 선택지 좁히기', () => {
	it('본사에는 가로형A·B가 뜨지 않는다', () => {
		const form = ciEffective({}).get('form')
		expect(form?.kind).toBe('select')
		if (form?.kind !== 'select') throw new Error('form이 select가 아니다')
		expect(form.options.map((option) => option.value)).toEqual(['horizontal', 'vertical'])
	})

	it('자회사에는 HD형이 뜨지 않고 꼴이 A·B·세로가 된다', () => {
		const controls = ciEffective({ subsidiaryOn: true, form: 'horizontalA' })
		const form = controls.get('form')
		const language = controls.get('language')
		if (form?.kind !== 'select' || language?.kind !== 'select')
			throw new Error('select가 아니다')

		expect(form.options.map((option) => option.value)).toEqual([
			'horizontalA',
			'horizontalB',
			'vertical',
		])
		expect(language.options.map((option) => option.value)).toEqual(['ko', 'en'])
	})

	it('해외지사는 영문 전용이다', () => {
		const language = ciEffective({ subsidiaryOn: true, branchOn: true, language: 'en' }).get(
			'language',
		)
		if (language?.kind !== 'select') throw new Error('select가 아니다')

		expect(language.options.map((option) => option.value)).toEqual(['en'])
	})

	it('🔴 좁힌 목록에 없는 초기값은 버린다 — 좁히기와 초기값이 함께 던지지 않게', () => {
		// 본사 페이지에 자회사 꼴이 저장돼 있으면(계층을 내린 경우) 그 값을 초기값으로 쓸 수 없다.
		expect(() => ciEffective({ form: 'horizontalA' })).not.toThrow()
		expect(ciEffective({ form: 'horizontalA' }).get('form')?.defaultValue).toBe('horizontal')
	})
})

it('CI 카드가 기존 초기값과 숨김 제한을 가진 컨트롤러에 연결된다', async () => {
	const { cardControllerFor } = await import('./registry')
	const display = {
		blockType: 'ciLockupWidget' as const,
		language: 'en' as const,
		hiddenControls: ['language' as const],
	}
	const controller = cardControllerFor(display)
	expect(controller?.manifest).toBe(ciEntry?.manifest)
	expect(controller?.restrictions).toEqual(ciEntry?.toRestrictions(display))
	expect(cardControllerFor({ blockType: 'ciLockupHeroWidget' })).toBeNull()
})
