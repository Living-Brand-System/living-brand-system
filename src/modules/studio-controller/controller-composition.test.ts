import { describe, expect, it } from 'vitest'
import {
	arrangeStudioPanel,
	type ControllerCluster,
	controllerStructureSignature,
	evaluateControllerCondition,
	type StudioPanelPolicy,
} from './controller-composition'
import {
	type ControllerGroupDefinition,
	createControllerValues,
	parseStudioControllerConfig,
} from './controller-definition'

// 템플릿 배경을 본뜬 매니페스트 — 방식(source)·색(palette)·디밍(overlay)과 조건.
const groups: readonly ControllerGroupDefinition[] = [
	{
		id: 'mode',
		title: 'Background',
		role: 'source',
		controls: [
			{
				id: 'type',
				kind: 'select',
				label: 'Mode',
				defaultValue: 'color',
				options: [
					{ value: 'color', label: 'Color' },
					{ value: 'image', label: 'Image' },
				],
			},
			{
				id: 'imageMode',
				kind: 'select',
				label: 'Image Mode',
				defaultValue: 'preset',
				options: [
					{ value: 'preset', label: 'Preset' },
					{ value: 'generate', label: 'Generate' },
				],
				visibleWhen: { control: 'type', equals: 'image' },
			},
		],
	},
	{
		id: 'color',
		title: 'Background',
		role: 'palette',
		visibleWhen: { control: 'type', equals: 'color' },
		controls: [{ id: 'color', kind: 'color', label: 'Color', defaultValue: null }],
	},
	{
		id: 'dimming',
		title: 'Dimming',
		role: 'overlay',
		controls: [
			{ id: 'dimmer', kind: 'toggle', label: 'Use', defaultValue: false },
			{
				id: 'strength',
				kind: 'range',
				label: 'Strength',
				defaultValue: 0.2,
				min: 0,
				max: 1,
				step: 0.01,
				visibleWhen: { control: 'dimmer', equals: true },
			},
		],
	},
	{ id: 'admin-only', title: 'Hidden', controls: [] },
]
const policy: StudioPanelPolicy = { settings: ['source'], fixed: ['overlay'], basic: ['palette'] }
const values = createControllerValues(groups)

describe('evaluateControllerCondition', () => {
	it('equals·in·not·all·any를 값으로 평가한다', () => {
		const v = { type: 'image', dimmer: true }
		expect(evaluateControllerCondition({ control: 'type', equals: 'image' }, v)).toBe(true)
		expect(evaluateControllerCondition({ control: 'type', in: ['color', 'graphic'] }, v)).toBe(
			false,
		)
		expect(evaluateControllerCondition({ control: 'type', not: 'color' }, v)).toBe(true)
		expect(
			evaluateControllerCondition(
				{
					all: [
						{ control: 'type', equals: 'image' },
						{ control: 'dimmer', equals: true },
					],
				},
				v,
			),
		).toBe(true)
		expect(
			evaluateControllerCondition(
				{
					any: [
						{ control: 'type', equals: 'color' },
						{ control: 'dimmer', equals: false },
					],
				},
				v,
			),
		).toBe(false)
	})
})

describe('arrangeStudioPanel', () => {
	it('역할 정책대로 슬롯을 채우고 숨은 그룹·컨트롤과 역할 없는 그룹은 세우지 않는다', () => {
		const slots = arrangeStudioPanel({ groups }, policy, values)
		const ids = (slot: keyof typeof slots) =>
			slots[slot].map((entry) =>
				entry.type === 'group'
					? `${entry.group.id}:${entry.group.controls.map((c) => c.id).join(',')}`
					: entry.cluster.id,
			)
		// 기본값: type=color → Image Mode 숨김, 색 그룹 보임, Use=false → Strength 숨김.
		expect(ids('settings')).toEqual(['mode:type'])
		expect(ids('basic')).toEqual(['color:color'])
		expect(ids('fixed')).toEqual(['dimming:dimmer'])
		expect(ids('adjustment')).toEqual([])

		const image = arrangeStudioPanel({ groups }, policy, {
			...values,
			type: 'image',
			dimmer: true,
		})
		expect(
			image.settings.flatMap((e) => (e.type === 'group' ? e.group.controls : [])),
		).toHaveLength(2)
		expect(image.basic).toEqual([])
		expect(
			image.fixed
				.flatMap((e) => (e.type === 'group' ? e.group.controls : []))
				.map((c) => c.id),
		).toEqual(['dimmer', 'strength'])
	})

	it('묶음이 가리킨 컨트롤은 그룹 행에서 빠지고 묶음으로 선다', () => {
		const clusters: ControllerCluster[] = [
			{
				id: 'dimming-pair',
				title: 'Dimming',
				role: 'overlay',
				widget: 'compound',
				members: { gate: 'dimmer', value: 'strength' },
			},
		]
		const slots = arrangeStudioPanel({ groups, clusters }, policy, values)
		const definition = (id: string) =>
			groups.flatMap((group) => group.controls).find((control) => control.id === id)
		// 멤버 이름 → 지금 계약의 정의를 싣는다 — 위젯이 선택지·제약을 다시 찾지 않는다.
		expect(slots.fixed).toEqual([
			{
				type: 'cluster',
				cluster: clusters[0],
				controls: { gate: definition('dimmer'), value: definition('strength') },
			},
		])
	})

	it('그룹 소속 묶음은 그 그룹 안에 서고, 그룹이 숨으면 자기 역할대로 선다', () => {
		const clusters: ControllerCluster[] = [
			{
				id: 'dimming-pair',
				title: 'Dimming',
				role: 'overlay',
				widget: 'compound',
				members: { gate: 'dimmer' },
				group: 'color',
			},
		]
		const color = arrangeStudioPanel({ groups, clusters }, policy, {
			...values,
			type: 'color',
		})
		// 묶음이 디머를 가져가고 Strength는 숨어 Dimming 그룹엔 남는 행이 없다.
		expect(color.fixed).toEqual([])
		expect(color.basic).toEqual([
			expect.objectContaining({
				group: expect.objectContaining({ id: 'color' }),
				clusters: [expect.objectContaining({ cluster: clusters[0] })],
			}),
		])
		// 서명에도 실린다 — 그룹 안 묶음이 생기고 빠지면 그 슬롯이 다시 그려진다.
		expect(controllerStructureSignature(color.basic)).toBe(
			'color(color)[dimming-pair<compound>]',
		)

		const image = arrangeStudioPanel({ groups, clusters }, policy, { ...values, type: 'image' })
		expect(image.basic).toEqual([])
		expect(image.fixed).toEqual([
			expect.objectContaining({ type: 'cluster', cluster: clusters[0] }),
		])
	})

	it('묶음을 품은 그룹은 자기 행이 모두 묶음으로 가도 제목째 선다', () => {
		const clusters: ControllerCluster[] = [
			{
				id: 'use',
				title: 'Use',
				role: 'overlay',
				widget: 'compound',
				members: { gate: 'dimmer' },
				group: 'dimming',
			},
		]
		const slots = arrangeStudioPanel({ groups, clusters }, policy, values)
		expect(slots.fixed).toEqual([
			expect.objectContaining({
				group: expect.objectContaining({ id: 'dimming', controls: [] }),
				clusters: [expect.objectContaining({ cluster: clusters[0] })],
			}),
		])
	})

	it('숨겨도 값은 그대로다 — 배치는 값을 건드리지 않는다', () => {
		const current = { ...values, strength: 0.56 }
		arrangeStudioPanel({ groups }, policy, current)
		expect(current.strength).toBe(0.56)
	})
})

describe('controllerStructureSignature', () => {
	it('서 있는 것이 같으면 값이 달라도 같고, 보이는 컨트롤이 바뀌면 달라진다', () => {
		const sign = (v: typeof values) =>
			controllerStructureSignature(arrangeStudioPanel({ groups }, policy, v).fixed)
		// 배경 방식만 바꿔도 Dimming 슬롯은 그대로다.
		expect(sign({ ...values, type: 'image' })).toBe(sign(values))
		expect(sign({ ...values, dimmer: true })).not.toBe(sign(values))
	})
})

describe('parseStudioControllerConfig 컴포지션 검증', () => {
	const config = (controller: Record<string, unknown>) => ({
		studio: 'graphic',
		id: 'demo',
		version: 1,
		name: 'Demo',
		type: 'p5',
		artifacts: { vector: {} },
		controller: { groups, ...controller },
	})

	it('역할·조건·묶음을 받아들인다', () => {
		expect(() =>
			parseStudioControllerConfig(
				config({
					clusters: [
						{
							id: 'dim',
							title: 'Dimming',
							role: 'overlay',
							widget: 'compound',
							members: { gate: 'dimmer', value: 'strength' },
							visibleWhen: { control: 'type', not: 'none' },
						},
					],
				}),
			),
		).not.toThrow()
	})

	it.each([
		[
			'미지 id를 가리키는 조건',
			{
				groups: [{ ...groups[2], visibleWhen: { control: 'missing', equals: true } }],
			},
			/알 수 없는 컨트롤/,
		],
		[
			'자기 자신을 조건으로',
			{
				groups: [
					{
						...groups[2],
						controls: [
							{
								id: 'dimmer',
								kind: 'toggle',
								label: 'Use',
								defaultValue: false,
								visibleWhen: { control: 'dimmer', equals: true },
							},
						],
					},
				],
			},
			/자기 자신/,
		],
		['모르는 역할', { groups: [{ ...groups[0], role: 'layout' }] }, /지원하지 않는 역할/],
		[
			'두 묶음이 같은 컨트롤을',
			{
				clusters: [
					{
						id: 'a',
						title: 'A',
						role: 'overlay',
						widget: 'compound',
						members: { gate: 'dimmer' },
					},
					{
						id: 'b',
						title: 'B',
						role: 'overlay',
						widget: 'compound',
						members: { gate: 'dimmer' },
					},
				],
			},
			/다른 묶음이 이미/,
		],
		[
			'모르는 위젯',
			{
				clusters: [
					{
						id: 'a',
						title: 'A',
						role: 'overlay',
						widget: 'slider-pair',
						members: { gate: 'dimmer' },
					},
				],
			},
			/지원하지 않는 위젯/,
		],
		[
			'모르는 그룹 소속',
			{
				clusters: [
					{
						id: 'a',
						title: 'A',
						role: 'overlay',
						widget: 'compound',
						members: { gate: 'dimmer' },
						group: 'nowhere',
					},
				],
			},
			/알 수 없는 그룹/,
		],
	])('%s는 거부한다', (_name, controller, message) => {
		expect(() => parseStudioControllerConfig(config(controller))).toThrow(message)
	})
})
