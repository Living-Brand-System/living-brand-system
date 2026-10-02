import { describe, expect, it } from 'vitest'
import { graphicRuntimeManifests } from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'
import { arrangeStudioPanel } from '@/modules/studio-controller/controller-composition'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import { GRAPHIC_PANEL_POLICY } from './graphic-editing-controls'

describe('그래픽 패널 컴포지션', () => {
	// 이행 기간의 안전망 — 역할·묶음으로 옮겨도 창작자 화면에 서는 컨트롤 집합은 옛 left/right 그대로다.
	it.each(
		graphicRuntimeManifests.map((manifest) => [manifest.id, manifest] as const),
	)('%s: left/right의 컨트롤이 정확히 한 번씩 선다', (_id, manifest) => {
		const { groups, clusters, roles, left = [], right = [] } = manifest.controller
		// 조건부 묶음(Fluted Glass의 Style)까지 보려고 조건을 끈 채 센다.
		const slots = arrangeStudioPanel(
			{
				groups,
				clusters: clusters?.map((cluster) => ({ ...cluster, visibleWhen: undefined })),
				roles,
			},
			GRAPHIC_PANEL_POLICY,
			createControllerValues(groups),
		)
		const placed = Object.values(slots).flatMap((entries) =>
			entries.flatMap((entry) =>
				entry.type === 'group'
					? entry.group.controls.map((control) => control.id)
					: Object.values(entry.controls).map((control) => control.id),
			),
		)
		expect([...placed].sort()).toEqual([...left, ...right].sort())
	})

	it('Basic은 색 → 형태 → 놓임 → 재료 순이다', () => {
		const order = (id: string) => {
			const manifest = graphicRuntimeManifests.find((item) => item.id === id)
			if (!manifest) throw new Error(id)
			const { groups, clusters, roles } = manifest.controller
			return arrangeStudioPanel(
				{ groups, clusters, roles },
				GRAPHIC_PANEL_POLICY,
				createControllerValues(groups),
			).basic.map((entry) => (entry.type === 'group' ? entry.group.id : entry.cluster.id))
		}
		expect(order('fluted-glass')).toEqual(['color', 'type', 'position'])
		expect(order('key-visual-pattern')).toEqual(['color', 'position', 'direction'])
		expect(order('key-visual-formation')).toEqual(['color', 'position', 'plane'])
	})
})
