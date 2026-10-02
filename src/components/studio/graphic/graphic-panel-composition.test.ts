import { describe, expect, it } from 'vitest'
import { graphicRuntimeManifests } from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'
import { arrangeStudioPanel } from '@/modules/studio-controller/controller-composition'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import { GRAPHIC_PANEL_POLICY } from './graphic-editing-controls'

describe('그래픽 패널 컴포지션', () => {
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
