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
	html: '<div data-node-id="root" data-figma-type="FRAME"><p data-node-id="t1">제목</p><p data-node-id="t2">연도</p><img data-node-id="v1" data-figma-type="VECTOR" data-name="Logo" data-asset-collection="brand-logos" data-asset-id="15" src="/mono.svg"></div>',
	nodeConfigs: {
		t1: { ...editable, input: { label: '제목' } },
		t2: { ...editable, input: { label: '연도' } },
		v1: editable,
	},
	ciVariants: {
		v1: [
			{ variant: 'default', id: 14, src: '/default.svg' },
			{ variant: 'mono-black', id: 15, src: '/mono.svg' },
		],
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
		// 텍스트 슬롯이 있으면 일괄 텍스트 색 하나가 「Text Color」 그룹 안에 선다(패널 제목 규칙).
		expect(shape(slots.fixed)).toEqual([
			{ group: 'text-color', rows: 0, clusters: ['swatches'] },
		])
		expect(text.groups.find((group) => group.id === 'text-color')?.title).toBe('Text Color')
		// 행은 전부 슬롯 묶음이 그린다 — 그룹은 제목·섹션으로만 선다.
		expect(shape(slots.basic)).toEqual([
			expect.objectContaining({ rows: 0, clusters: ['text-field', 'text-field'] }),
		])
	})

	it('CI는 슬롯마다 그 로고가 가진 색 버전만 골라 위 고정 카드에 세우고 Basic은 비운다', () => {
		const symbol = deriveTemplateSymbolComposition(config)
		if (!symbol) throw new Error('CI 컴포지션이 없습니다.')
		const slots = arrangeStudioPanel(symbol, policy, {})
		expect(shape(slots.fixed)).toEqual([{ group: 'symbol-color', rows: 1, clusters: [] }])
		expect(slots.basic).toEqual([])
		expect(symbol.groups[0].controls[0]).toMatchObject({
			kind: 'select',
			defaultValue: 'mono-black',
			options: [
				{ value: 'default', label: '기본형' },
				{ value: 'mono-black', label: '단색(블랙)' },
			],
		})
	})
})
