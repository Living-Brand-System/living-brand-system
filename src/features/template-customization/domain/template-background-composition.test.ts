import { describe, expect, it } from 'vitest'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import {
	deriveTemplateBackgroundComposition,
	TEMPLATE_BACKGROUND_IMAGE_MODE_ID,
} from './template-background-composition'
import { deriveTemplateStudioConfig, type PublishedHtmlTemplate } from './template-studio-config'

const template = (backgroundPolicy?: PublishedHtmlTemplate['backgroundPolicy']) =>
	({
		kind: 'html',
		id: 1,
		name: '배경',
		html: '<div data-node-id="root"><p data-node-id="t">제목</p></div>',
		nodeConfigs: { t: { input: { label: '제목' } } },
		width: 100,
		height: 100,
		templateVersion: '2026-10-02T00:00:00.000Z',
		backgroundPolicy,
	}) satisfies PublishedHtmlTemplate

const policy: StudioPanelPolicy = { settings: ['source'], fixed: ['overlay'], basic: ['palette'] }
const visibleIds = (
	composition: NonNullable<ReturnType<typeof deriveTemplateBackgroundComposition>>,
	values: Record<string, unknown>,
) => {
	const slots = arrangeStudioPanel(composition, policy, {
		...createControllerValues(composition.groups),
		...(values as Record<string, string | boolean | number | null>),
	})
	return Object.fromEntries(
		Object.entries(slots).map(([slot, entries]) => [
			slot,
			entries.flatMap((entry) =>
				entry.type === 'group'
					? [
							...entry.group.controls.map((c) => c.id),
							...(entry.clusters ?? []).flatMap((c) =>
								Object.values(c.cluster.members),
							),
						]
					: Object.values(entry.cluster.members),
			),
		]),
	)
}

describe('deriveTemplateBackgroundComposition', () => {
	it('방식(source)·색(palette)·디밍(overlay)을 역할과 조건으로 선언한다', () => {
		const config = deriveTemplateStudioConfig(template(), [], [])
		const composition = deriveTemplateBackgroundComposition(config)
		if (!composition) throw new Error('배경 컴포지션이 없습니다.')
		expect(composition.groups.map((group) => [group.id, group.role])).toEqual([
			['background-source', 'source'],
			['background-color', 'palette'],
			['background-dimming', 'overlay'],
		])
		// 단색: 색이 서고 Image Mode·Strength는 숨는다.
		expect(visibleIds(composition, { 'background.type': 'color' })).toMatchObject({
			settings: ['background.type'],
			basic: ['background.color'],
			fixed: ['background.dimmer'],
		})
	})

	it('이미지 방식이면 Image Mode가 서고, Use가 켜지면 Strength가 선다', () => {
		const config = deriveTemplateStudioConfig(template({ types: ['color', 'image'] }), [], [])
		const composition = deriveTemplateBackgroundComposition(config)
		if (!composition) throw new Error('배경 컴포지션이 없습니다.')
		expect(
			visibleIds(composition, { 'background.type': 'image', 'background.dimmer': true }),
		).toMatchObject({
			settings: ['background.type', TEMPLATE_BACKGROUND_IMAGE_MODE_ID],
			basic: [],
			fixed: ['background.dimmer', 'background.dimmerOpacity'],
		})
	})

	it('정책이 디머를 끄면 Dimming 그룹이 없고, 이미지 방식이 없으면 Image Mode도 없다', () => {
		const config = deriveTemplateStudioConfig(
			template({ types: ['color'], dimmer: false }),
			[],
			[],
		)
		const composition = deriveTemplateBackgroundComposition(config)
		expect(composition?.groups.map((group) => group.id)).toEqual([
			'background-source',
			'background-color',
		])
		expect(composition?.groups[0].controls.map((control) => control.id)).toEqual([
			'background.type',
		])
	})
})
