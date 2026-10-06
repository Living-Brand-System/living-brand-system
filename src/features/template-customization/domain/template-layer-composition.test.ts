import { describe, expect, it } from 'vitest'
import {
	arrangeStudioPanel,
	type StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import {
	deriveTemplateSymbolComposition,
	deriveTemplateTextComposition,
} from './template-layer-composition'
import { deriveTemplateStudioConfig, type PublishedHtmlTemplate } from './template-studio-config'

const editable = {
	creator: {
		access: 'editable' as const,
		visibility: { defaultVisible: true, allowToggle: true },
	},
}
const template = {
	kind: 'html',
	id: 1,
	name: '레이어',
	html: '<div data-node-id="root" data-figma-type="FRAME"><p data-node-id="t1">제목</p><p data-node-id="t2">연도</p><img data-node-id="v1" data-figma-type="VECTOR" data-name="Logo" src="/logo.svg"></div>',
	nodeConfigs: {
		t1: { ...editable, input: { label: '제목' } },
		t2: { ...editable, input: { label: '연도' } },
		v1: { ...editable, vectorColor: '#112233' },
	},
	width: 100,
	height: 100,
	templateVersion: '2026-10-02T00:00:00.000Z',
} satisfies PublishedHtmlTemplate

// 패널 정책은 화면이 갖는다 — 여기서는 docs/10 §3.7의 텍스트·심볼 정책 그대로 본다.
const policy = { fixed: ['palette'], basic: ['content'] } as const
const shape = (entries: readonly StudioPanelEntry[]) =>
	entries.map((entry) =>
		entry.type === 'group'
			? {
					group: entry.group.id,
					rows: entry.group.controls.length,
					clusters: entry.clusters?.map(({ cluster }) => cluster.widget) ?? [],
				}
			: { cluster: entry.cluster.widget },
	)

describe('템플릿 텍스트·심볼 컴포지션', () => {
	const config = deriveTemplateStudioConfig(template, [], [])

	it('텍스트는 색을 위 고정 카드에, 슬롯 입력을 Text 그룹 안에 세운다(Figma 529:19461)', () => {
		const text = deriveTemplateTextComposition(config)
		if (!text) throw new Error('텍스트 컴포지션이 없습니다.')
		const slots = arrangeStudioPanel(text, policy, {})
		// 텍스트 슬롯이 있으면 일괄 텍스트 색 하나가 선다.
		expect(shape(slots.fixed)).toEqual([{ cluster: 'swatches' }])
		// 행은 전부 슬롯 묶음이 그린다 — 그룹은 제목·섹션으로만 선다.
		expect(shape(slots.basic)).toEqual([
			expect.objectContaining({ rows: 0, clusters: ['text-field', 'text-field'] }),
		])
	})

	it('심볼은 슬롯마다의 브랜드 색을 위 고정 카드에 세우고 Basic은 비운다(Figma 529:25611)', () => {
		const symbol = deriveTemplateSymbolComposition(config)
		if (!symbol) throw new Error('심볼 컴포지션이 없습니다.')
		const slots = arrangeStudioPanel(symbol, policy, {})
		expect(shape(slots.fixed)).toEqual([{ cluster: 'swatches' }])
		expect(slots.basic).toEqual([])
	})
})
