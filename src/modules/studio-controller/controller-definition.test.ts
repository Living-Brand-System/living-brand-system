import { describe, expect, it } from 'vitest'
import {
	acceptsControllerDraftValue,
	acceptsControllerExecutionValue,
	acceptsControllerExecutionValues,
	applyControllerRestrictions,
	type ControllerGroupDefinition,
	controllerRemountKey,
	createControllerValues,
	followsChangedDefault,
	isControllerPadValue,
	parseStudioControllerConfig,
	projectPayloadControllerRestrictions,
	resolveControllerPresentation,
	splitControllerGroups,
	toStudioPreviewImage,
	visibleControllerGroups,
} from './controller-definition'

describe('splitControllerGroups', () => {
	const groups: readonly ControllerGroupDefinition[] = [
		{
			id: 'palette',
			title: 'Ray Palette',
			controls: [
				{ id: 'rayColor1', label: '광선 색상 1', kind: 'color', defaultValue: '#ffffff' },
				{ id: 'rayColor2', label: '광선 색상 2', kind: 'color', defaultValue: '#000000' },
			],
		},
		{
			id: 'position',
			title: 'Position',
			controls: [
				{
					id: 'sourceOffsetX',
					label: '광원 X 오프셋',
					kind: 'range',
					defaultValue: 0,
					min: -1,
					max: 1,
					step: 0.01,
				},
			],
		},
	]

	it('왼쪽에 남긴 컨트롤과 나머지를 그룹 구조 그대로 가른다', () => {
		const split = splitControllerGroups(groups, ['sourceOffsetX'])

		expect(split.left.map((group) => group.id)).toEqual(['position'])
		expect(split.right.map((group) => group.id)).toEqual(['palette'])
		expect(split.right[0]?.controls.map((control) => control.id)).toEqual([
			'rayColor1',
			'rayColor2',
		])
	})

	it('🔴 선언이 없으면 전부 왼쪽이다 — 안 정한 런타임의 화면이 비면 안 된다', () => {
		const split = splitControllerGroups(groups, undefined)

		expect(split.left).toEqual(groups)
		expect(split.right).toEqual([])
	})

	it('빈 배열은 전부 오른쪽이다 — 빈 선언과 미선언을 같게 취급하지 않는다', () => {
		const split = splitControllerGroups(groups, [])

		expect(split.left).toEqual([])
		expect(split.right.map((group) => group.id)).toEqual(['palette', 'position'])
	})

	it('🔴 보이는 축만 남긴다 — 좌·우 어디에도 없는 축은 admin 전용이다', () => {
		// 좌·우를 한 자리에 이어 그리는 화면(Template 배경)이 쓰는 갈래다.
		const visible = visibleControllerGroups(groups, ['rayColor1'], ['sourceOffsetX'])

		expect(visible.map((group) => [group.id, group.controls.map((c) => c.id)])).toEqual([
			['palette', ['rayColor1']],
			['position', ['sourceOffsetX']],
		])
	})

	it('🔴 한 그룹이 좌·우로 갈려도 제목이 두 번 그려지지 않는다', () => {
		// splitControllerGroups의 두 벌을 이어 붙이면 같은 제목이 두 번 나온다 — 그래서 별 갈래다.
		const visible = visibleControllerGroups(groups, ['rayColor1'], ['rayColor2'])

		expect(visible.map((group) => group.title)).toEqual(['Ray Palette'])
		expect(visible[0]?.controls.map((c) => c.id)).toEqual(['rayColor1', 'rayColor2'])
	})

	it('선언이 반쪽이면 전부 보인다 — 안 정한 런타임의 화면이 비면 안 된다', () => {
		expect(visibleControllerGroups(groups, undefined, ['sourceOffsetX'])).toEqual(groups)
		expect(visibleControllerGroups(groups, ['rayColor1'], undefined)).toEqual(groups)
	})

	it('🔴 색 조합 그룹의 색 칸에 허용 색을 걸면 admin 저장에서 거부한다', () => {
		// 걸면 그 칸이 띠에서 빠져 팔레트 칩이 채울 짝을 잃는다 — 칩은 눌리는데 색이 안 바뀐다.
		const paletteGroups: readonly ControllerGroupDefinition[] = [
			{
				id: 'palette',
				title: 'Ray Palette',
				controls: [
					{
						id: 'palette',
						kind: 'select',
						label: '팔레트',
						defaultValue: 'green',
						options: [
							{ value: 'green', label: '그린', colors: ['#000000', '#ffffff'] },
						],
					},
					{
						id: 'rayColor1',
						label: '광선 색상 1',
						kind: 'color',
						defaultValue: '#ffffff',
					},
					{
						id: 'rayColor2',
						label: '광선 색상 2',
						kind: 'color',
						defaultValue: '#000000',
					},
				],
			},
		]

		expect(() =>
			applyControllerRestrictions(paletteGroups, {
				controls: [{ controlId: 'rayColor1', colorValues: ['#ffffff', '#000000'] }],
			}),
		).toThrow(/허용 색을 지정할 수 없습니다: rayColor1/)

		// 색이 아닌 축의 제한은 그대로 통과한다 — 팔레트를 못 쓰게 만드는 것만 막는다.
		expect(() =>
			applyControllerRestrictions(paletteGroups, {
				controls: [{ controlId: 'palette', defaultValue: 'green' }],
			}),
		).not.toThrow()
	})

	it('🔴 재마운트 지문은 remountOn 축만 담는다 — 두 화면이 같은 값을 봐야 한다', () => {
		const values = { shape: 'vertical', rayIntensity: 0.9 }

		expect(controllerRemountKey(['shape'], values)).toBe('shape=vertical')
		// 선언이 없으면 지문이 비어 재마운트가 걸리지 않는다.
		expect(controllerRemountKey(undefined, values)).toBe('')
		// 지문 밖의 축이 바뀌어도 문자열이 같아야 한다(살아 있는 런타임에 흘려 넣는 값이다).
		expect(controllerRemountKey(['shape'], { ...values, rayIntensity: 0.1 })).toBe(
			'shape=vertical',
		)
	})

	it('한 그룹이 양쪽으로 갈려도 각자 자기 제목을 지킨다', () => {
		const split = splitControllerGroups(groups, ['rayColor1', 'sourceOffsetX'])

		expect(split.left.map((group) => [group.title, group.controls.length])).toEqual([
			['Ray Palette', 1],
			['Position', 1],
		])
		expect(split.right.map((group) => [group.title, group.controls.length])).toEqual([
			['Ray Palette', 1],
		])
	})
	it('🔴 어느 쪽에도 없는 컨트롤은 어느 쪽에도 그려지지 않는다 — admin 전용 층', () => {
		const split = splitControllerGroups(groups, ['rayColor1'], ['sourceOffsetX'])

		expect(split.left.flatMap((group) => group.controls.map((c) => c.id))).toEqual([
			'rayColor1',
		])
		expect(split.right.flatMap((group) => group.controls.map((c) => c.id))).toEqual([
			'sourceOffsetX',
		])
		// rayColor2는 두 목록에 없다 — 선언은 남지만 창작자 화면에는 서지 않는다.
	})

	it('오른쪽 빈 배열과 미선언은 다르다 — 하나는 아무것도, 하나는 나머지 전부', () => {
		expect(splitControllerGroups(groups, ['rayColor1'], []).right).toEqual([])
		expect(
			splitControllerGroups(groups, ['rayColor1'], undefined).right.flatMap((group) =>
				group.controls.map((c) => c.id),
			),
		).toEqual(['rayColor2', 'sourceOffsetX'])
	})
})

describe('createControllerValues', () => {
	it('가변 그룹의 기본값을 control id 기준 세션 값으로 만든다', () => {
		const groups = [
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					{ id: 'enabled', kind: 'toggle', label: 'Enabled', defaultValue: false },
					{
						id: 'origin',
						kind: 'pad',
						label: 'Origin',
						defaultValue: { x: 0, y: 0 },
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		expect(createControllerValues(groups)).toEqual({
			enabled: false,
			origin: { x: 0, y: 0 },
		})
	})

	it('중복 control id가 앞 값을 조용히 덮어쓰지 못하게 한다', () => {
		const groups = [
			{
				id: 'one',
				title: 'One',
				controls: [{ id: 'same', kind: 'toggle', label: 'A', defaultValue: false }],
			},
			{
				id: 'two',
				title: 'Two',
				controls: [{ id: 'same', kind: 'toggle', label: 'B', defaultValue: true }],
			},
		] satisfies readonly ControllerGroupDefinition[]

		expect(() => createControllerValues(groups)).toThrow('same')
	})
})

describe('Controller draft와 execution 값 검증', () => {
	it('availability와 kind별 선택지·범위를 강제하되 text 길이는 세션에 보존한다', () => {
		expect(
			acceptsControllerDraftValue(
				{
					id: 'prompt',
					kind: 'text',
					label: 'Prompt',
					defaultValue: '',
					maxLength: 3,
				},
				'too long',
			),
		).toBe(true)
		expect(
			acceptsControllerDraftValue(
				{
					id: 'locked',
					kind: 'toggle',
					label: 'Locked',
					defaultValue: false,
					availability: 'readonly',
				},
				true,
			),
		).toBe(false)
		expect(
			acceptsControllerDraftValue(
				{
					id: 'ratio',
					kind: 'select',
					label: 'Ratio',
					defaultValue: '1:1',
					options: [{ value: '1:1', label: 'Square' }],
				},
				'16:9',
			),
		).toBe(false)
		expect(
			acceptsControllerDraftValue(
				{
					id: 'scale',
					kind: 'range',
					label: 'Scale',
					defaultValue: 1,
					min: 0,
					max: 2,
					step: 0.1,
				},
				3,
			),
		).toBe(false)
		expect(
			acceptsControllerDraftValue(
				{
					id: 'origin',
					kind: 'pad',
					label: 'Origin',
					defaultValue: { x: 0, y: 0 },
				},
				{ x: 2, y: 0 },
			),
		).toBe(false)
	})

	it('runtime binding을 정적 availability보다 느슨하게 만들지 않는다', () => {
		const control = {
			id: 'enabled',
			kind: 'toggle' as const,
			label: 'Enabled',
			defaultValue: false,
		}

		expect(acceptsControllerDraftValue(control, true, { availability: 'readonly' })).toBe(false)
		expect(
			acceptsControllerDraftValue({ ...control, availability: 'disabled' }, true, {
				availability: 'enabled',
			}),
		).toBe(false)
	})

	it('실행 경계는 초과 text를 거부하고 잠긴 control의 기본값만 허용한다', () => {
		const prompt = {
			id: 'prompt',
			kind: 'text' as const,
			label: 'Prompt',
			defaultValue: 'fixed',
			maxLength: 5,
			availability: 'readonly' as const,
		}

		expect(acceptsControllerExecutionValue(prompt, 'fixed')).toBe(true)
		expect(acceptsControllerExecutionValue(prompt, 'other')).toBe(false)
		expect(
			acceptsControllerExecutionValue({ ...prompt, availability: 'enabled' }, 'longer'),
		).toBe(false)
	})

	it('전체 실행값은 누락·초과 text·잠긴 값 변경을 거부한다', () => {
		const groups = [
			{
				id: 'text',
				title: 'Text',
				controls: [
					{
						id: 'title',
						kind: 'text' as const,
						label: 'Title',
						defaultValue: 'fixed',
						maxLength: 5,
						availability: 'readonly' as const,
					},
				],
			},
		]
		expect(acceptsControllerExecutionValues(groups, { title: 'fixed' })).toBe(true)
		expect(acceptsControllerExecutionValues(groups, {})).toBe(false)
		expect(acceptsControllerExecutionValues(groups, { title: 'other' })).toBe(false)
	})
})

describe('parseStudioControllerConfig', () => {
	it('공통 envelope와 모든 v1 control kind를 검증해 같은 계약을 반환한다', () => {
		const config = {
			studio: 'graphic',
			id: 'demo',
			version: 1,
			name: 'Demo',
			type: 'p5',
			artifacts: { vector: {} },
			controllerPresentation: {
				groups: [{ groupId: 'controls', collapsible: true, defaultOpen: false }],
			},
			controller: {
				groups: [
					{
						id: 'controls',
						title: 'Controls',
						controls: [
							{
								id: 'prompt',
								kind: 'text',
								label: 'Prompt',
								defaultValue: null,
								maxLength: 500,
							},
							{ id: 'enabled', kind: 'toggle', label: 'Enabled', defaultValue: true },
							{
								id: 'ratio',
								kind: 'select',
								label: 'Ratio',
								defaultValue: '1:1',
								options: [{ value: '1:1', label: 'Square' }],
							},
							{
								id: 'color',
								kind: 'color',
								label: 'Color',
								defaultValue: '#ffffff',
							},
							{
								id: 'scale',
								kind: 'range',
								label: 'Scale',
								defaultValue: 1,
								min: 0,
								max: 2,
								step: 0.1,
							},
							{
								id: 'origin',
								kind: 'pad',
								label: 'Origin',
								defaultValue: { x: 0, y: 0 },
								aspectRatio: 16 / 9,
							},
						],
					},
				],
			},
		}

		expect(parseStudioControllerConfig(config)).toBe(config)
	})

	it('select variant는 list·segmented만 받는다', () => {
		const select = {
			id: 'ratio',
			kind: 'select' as const,
			label: 'Ratio',
			defaultValue: '1:1',
			options: [
				{ value: '1:1', label: 'Square' },
				{ value: '16:9', label: 'Wide' },
			],
		}
		expect(
			parseStudioControllerConfig(configWith({ ...select, variant: 'segmented' })),
		).toEqual(configWith({ ...select, variant: 'segmented' }))
		expect(() =>
			parseStudioControllerConfig(configWith({ ...select, variant: 'dropdown' })),
		).toThrow('variant')
	})

	// 선택지가 곧 색 조합일 때만 색 칩으로 그려진다 — 반쪽으로 그려질 여지를 계약이 먼저 막는다.
	it('select 선택지의 색 조합은 전 선택지가 함께 갖거나 함께 없어야 한다', () => {
		const colorway = {
			id: 'colorway',
			kind: 'select' as const,
			label: 'Colorway',
			variant: 'list' as const,
			defaultValue: 'darkGreenGreen',
			options: [
				{
					value: 'darkGreenGreen',
					label: '다크그린 · 그린',
					colors: ['#00280a', '#007332'],
				},
				{ value: 'navyBlue', label: '네이비 · 블루', colors: ['#000a32', '#003087'] },
			],
		}
		expect(parseStudioControllerConfig(configWith(colorway))).toEqual(configWith(colorway))
		expect(() =>
			parseStudioControllerConfig(
				configWith({
					...colorway,
					options: [colorway.options[0], { value: 'navyBlue', label: '네이비 · 블루' }],
				}),
			),
		).toThrow('colors는 모든 선택지에')
		expect(() =>
			parseStudioControllerConfig(
				configWith({
					...colorway,
					options: [
						{
							value: 'darkGreenGreen',
							label: '다크그린 · 그린',
							colors: ['#00280a', 'green'],
						},
					],
				}),
			),
		).toThrow('#rrggbb')
		expect(() =>
			parseStudioControllerConfig(
				configWith({
					...colorway,
					options: [{ value: 'darkGreenGreen', label: '다크그린 · 그린', colors: [] }],
				}),
			),
		).toThrow('하나 이상의 색')
	})

	it('공통 Runtime Artifact parser가 unknown kind를 거부한다', () => {
		expect(() =>
			parseStudioControllerConfig({
				...configWith({
					id: 'enabled',
					kind: 'toggle',
					label: 'Enabled',
					defaultValue: true,
				}),
				artifacts: { document: {} },
			}),
		).toThrow('Artifact 종류')
	})

	it('group과 전체 control id 중복을 거부한다', () => {
		expect(() =>
			parseStudioControllerConfig({
				...configWith({ id: 'same', kind: 'toggle', label: 'A', defaultValue: false }),
				controller: {
					groups: [
						{
							id: 'same',
							title: 'A',
							controls: [],
						},
						{
							id: 'same',
							title: 'B',
							controls: [],
						},
					],
				},
			}),
		).toThrow('중복')

		expect(() =>
			parseStudioControllerConfig({
				...configWith({ id: 'same', kind: 'toggle', label: 'A', defaultValue: false }),
				controller: {
					groups: [
						{
							id: 'one',
							title: 'One',
							controls: [
								{ id: 'same', kind: 'toggle', label: 'A', defaultValue: false },
							],
						},
						{
							id: 'two',
							title: 'Two',
							controls: [
								{ id: 'same', kind: 'toggle', label: 'B', defaultValue: true },
							],
						},
					],
				},
			}),
		).toThrow('same')
	})

	it.each([
		[
			'text max length',
			{
				id: 'prompt',
				kind: 'text',
				label: 'Prompt',
				defaultValue: 'too long',
				maxLength: 3,
			},
		],
		[
			'select default',
			{
				id: 'ratio',
				kind: 'select',
				label: 'Ratio',
				defaultValue: '16:9',
				options: [{ value: '1:1', label: 'Square' }],
			},
		],
		[
			'range bounds',
			{
				id: 'scale',
				kind: 'range',
				label: 'Scale',
				defaultValue: 1,
				min: 1,
				max: 1,
				step: 0.1,
			},
		],
		[
			'range finite',
			{
				id: 'scale',
				kind: 'range',
				label: 'Scale',
				defaultValue: Number.POSITIVE_INFINITY,
				min: 0,
				max: 2,
				step: 0.1,
			},
		],
		[
			'pad bounds',
			{
				id: 'origin',
				kind: 'pad',
				label: 'Origin',
				defaultValue: { x: 2, y: 0 },
			},
		],
		[
			'pad aspect ratio',
			{
				id: 'origin',
				kind: 'pad',
				label: 'Origin',
				defaultValue: { x: 0, y: 0 },
				aspectRatio: 0,
			},
		],
		['kind default', { id: 'enabled', kind: 'toggle', label: 'Enabled', defaultValue: 'yes' }],
	])('%s 위반을 거부한다', (_name, control) => {
		expect(() => parseStudioControllerConfig(configWith(control))).toThrow()
	})

	it('Controller 계약의 비직렬화 값을 거부한다', () => {
		expect(() =>
			parseStudioControllerConfig(
				configWith({
					id: 'enabled',
					kind: 'toggle',
					label: 'Enabled',
					defaultValue: false,
					formatter: () => 'No',
				}),
			),
		).toThrow('직렬화')
	})

	it.each([
		['문자열', 'future'],
		['boolean', true],
	])('직렬화 가능한 %s unknown control field도 거부한다', (_name, extra) => {
		expect(() =>
			parseStudioControllerConfig(
				configWith({
					id: 'enabled',
					kind: 'toggle',
					label: 'Enabled',
					defaultValue: false,
					extra,
				}),
			),
		).toThrow('지원하지 않는 필드')
	})
})

describe('isControllerPadValue', () => {
	it('유한한 -1~1 좌표만 허용한다', () => {
		expect(isControllerPadValue({ x: -1, y: 1 })).toBe(true)
		expect(isControllerPadValue({ x: Number.NaN, y: 0 })).toBe(false)
		expect(isControllerPadValue({ x: 1.1, y: 0 })).toBe(false)
	})
})

describe('Payload Controller projection과 Override 적용', () => {
	it('kind·표현 필드 없는 Override만 Base Definition보다 좁게 적용한다', () => {
		const base = [
			{
				id: 'setting',
				title: 'Setting',
				controls: [
					{
						id: 'ratio',
						kind: 'select' as const,
						label: 'Ratio',
						defaultValue: '1:1',
						options: [
							{ value: '1:1', label: 'Square' },
							{ value: '16:9', label: 'Wide' },
						],
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const restrictions = projectPayloadControllerRestrictions({
			controls: [
				{
					controlId: 'ratio',
					availability: 'readonly',
					defaultValue: '1:1',
					optionValues: ['1:1'],
				},
			],
		})
		const result = applyControllerRestrictions(base, restrictions)
		expect(result[0]).toMatchObject({ title: 'Setting' })
		expect(result[0]?.controls[0]).toMatchObject({
			kind: 'select',
			label: 'Ratio',
			availability: 'readonly',
			options: [{ value: '1:1', label: 'Square' }],
		})
		expect(() =>
			projectPayloadControllerRestrictions({
				controls: [{ controlId: 'ratio', kind: 'select' }],
			}),
		).toThrow('지원하지 않는 필드')
		expect(() =>
			projectPayloadControllerRestrictions({
				groups: [{ key: 'settings', controls: [] }],
			}),
		).toThrow('지원하지 않는 필드')
	})

	it('색 control은 자유 색상을 팔레트로 좁히고 목록 밖 색을 실행에서 막는다', () => {
		const base = [
			{
				id: 'profile-settings',
				title: 'Profile Settings',
				controls: [
					{
						id: 'lineColor',
						kind: 'color' as const,
						label: 'Line Color',
						defaultValue: null,
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const narrowed = applyControllerRestrictions(
			base,
			projectPayloadControllerRestrictions({
				controls: [{ controlId: 'lineColor', colorValues: ['#FF0000', '#00ff00'] }],
			}),
		)
		const control = narrowed[0]?.controls[0]
		if (control?.kind !== 'color') throw new Error('color control이 필요합니다.')
		// hex 대소문자는 같은 색이다 — 목록은 소문자로 정규화된다.
		expect(control.values).toEqual(['#ff0000', '#00ff00'])
		expect(acceptsControllerExecutionValue(control, '#ff0000')).toBe(true)
		expect(acceptsControllerExecutionValue(control, '#0000ff')).toBe(false)
	})

	it('색 조합 선택지를 좁혀도 남은 선택지의 색은 살아남는다', () => {
		const base = [
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					{
						id: 'colorway',
						kind: 'select' as const,
						label: '컬러',
						variant: 'list' as const,
						defaultValue: 'darkGreenGreen',
						options: [
							{
								value: 'darkGreenGreen',
								label: '다크그린 · 그린',
								colors: ['#00280a', '#007332'],
							},
							{
								value: 'navyBlue',
								label: '네이비 · 블루',
								colors: ['#000a32', '#003087'],
							},
						],
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const narrowed = applyControllerRestrictions(
			base,
			projectPayloadControllerRestrictions({
				controls: [
					{ controlId: 'colorway', defaultValue: 'navyBlue', optionValues: ['navyBlue'] },
				],
			}),
		)
		const control = narrowed[0]?.controls[0]
		if (control?.kind !== 'select') throw new Error('select control이 필요합니다.')

		expect(control.options).toEqual([
			{ value: 'navyBlue', label: '네이비 · 블루', colors: ['#000a32', '#003087'] },
		])
	})

	it('팔레트를 이미 가진 색 control을 넓히려 하면 거부한다', () => {
		const base = [
			{
				id: 'profile-settings',
				title: 'Profile Settings',
				controls: [
					{
						id: 'lineColor',
						kind: 'color' as const,
						label: 'Line Color',
						defaultValue: '#ff0000',
						values: ['#ff0000'],
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		expect(() =>
			applyControllerRestrictions(
				base,
				projectPayloadControllerRestrictions({
					controls: [{ controlId: 'lineColor', colorValues: ['#ff0000', '#0000ff'] }],
				}),
			),
		).toThrow('colorValues가 기본 계약을 확장합니다')
	})

	it('색을 갖지 않는 kind에 colorValues를 주면 거부한다', () => {
		// colorValues는 color control의 팔레트를 좁히는 축이다. select가 options에 colors를 갖게 된
		// 뒤로는 컬러웨이를 좁히려는 사람이 optionValues 대신 이것을 집을 수 있어, 조용히 무시되면
		// Admin은 좁혔다고 믿는데 발행된 계약은 그대로다.
		const base = [
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					{
						id: 'colorway',
						kind: 'select' as const,
						label: '컬러',
						defaultValue: 'navyBlue',
						options: [
							{
								value: 'navyBlue',
								label: '네이비 · 블루',
								colors: ['#000a32', '#003087'],
							},
						],
					},
					{
						id: 'variableWeight',
						kind: 'toggle' as const,
						label: '가변 두께',
						defaultValue: true,
					},
					{
						id: 'origin',
						kind: 'pad' as const,
						label: '기준점',
						defaultValue: { x: 0, y: 0 },
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		for (const controlId of ['colorway', 'variableWeight', 'origin']) {
			expect(() =>
				applyControllerRestrictions(
					base,
					projectPayloadControllerRestrictions({
						controls: [{ controlId, colorValues: ['#000a32'] }],
					}),
				),
			).toThrow('지원하지 않는 restriction입니다')
		}
	})
})

describe('Controller group presentation', () => {
	const groups = [
		{ id: 'first', title: 'First', controls: [] },
		{ id: 'second', title: 'Second', controls: [] },
	] satisfies readonly ControllerGroupDefinition[]

	it('Admin sparse 값을 Runtime 순서의 완전한 Creator 정책으로 해석한다', () => {
		expect(
			resolveControllerPresentation(groups, {
				groups: [{ groupId: 'second', defaultOpen: false }],
			}),
		).toEqual({
			groups: [
				{ groupId: 'first', collapsible: true, defaultOpen: true },
				{ groupId: 'second', collapsible: true, defaultOpen: false },
			],
		})
	})

	it('알 수 없는 그룹과 닫힌 static 그룹을 거부한다', () => {
		expect(() =>
			resolveControllerPresentation(groups, {
				groups: [{ groupId: 'missing', defaultOpen: false }],
			}),
		).toThrow('찾을 수 없습니다')
		expect(() =>
			resolveControllerPresentation(groups, {
				groups: [{ groupId: 'first', collapsible: false, defaultOpen: false }],
			}),
		).toThrow('닫힌 상태')
	})
})

describe('previewImage', () => {
	const control = { id: 'flag', kind: 'toggle', label: '플래그', defaultValue: false }

	it('url·alt만 받고 다른 키나 빈 url은 거부한다', () => {
		expect(() =>
			parseStudioControllerConfig({
				...configWith(control),
				previewImage: { url: '/media/preview.png', alt: '방사형 광선' },
			}),
		).not.toThrow()
		// alt는 빈 문자열도 유효하다 — 장식 이미지의 대체 텍스트다.
		expect(() =>
			parseStudioControllerConfig({
				...configWith(control),
				previewImage: { url: '/media/preview.png', alt: '' },
			}),
		).not.toThrow()
		expect(() =>
			parseStudioControllerConfig({
				...configWith(control),
				previewImage: { url: '', alt: '빈 주소' },
			}),
		).toThrow('previewImage.url')
		expect(() =>
			parseStudioControllerConfig({
				...configWith(control),
				previewImage: { url: '/media/preview.png', alt: '설명', width: 320 },
			}),
		).toThrow('previewImage')
	})
})

describe('toStudioPreviewImage', () => {
	it('thumbnail이 있으면 그것을 쓰고 없으면 원본 url로 떨어진다', () => {
		expect(
			toStudioPreviewImage({
				url: '/media/full.png',
				alt: '방사형 광선',
				sizes: { thumbnail: { url: '/media/full-320x240.png' } },
			}),
		).toEqual({ url: '/media/full-320x240.png', alt: '방사형 광선' })
		expect(toStudioPreviewImage({ url: '/media/full.png', alt: '광선' })).toEqual({
			url: '/media/full.png',
			alt: '광선',
		})
	})

	// depth 0에서는 id만 오고, 파일이 없는 문서는 url이 없다 — 어느 쪽도 미리보기가 아니다.
	it('populate되지 않은 값·파일 없는 문서·null은 undefined다', () => {
		for (const value of [undefined, null, 7, {}, { alt: '설명만' }]) {
			expect(toStudioPreviewImage(value)).toBeUndefined()
		}
	})

	it('alt가 없으면 빈 문자열로 채운다', () => {
		expect(toStudioPreviewImage({ url: '/media/full.png' })).toEqual({
			url: '/media/full.png',
			alt: '',
		})
	})
})

function configWith(control: unknown) {
	return {
		studio: 'graphic',
		id: 'demo',
		version: 1,
		name: 'Demo',
		artifacts: { vector: {} },
		controller: {
			groups: [{ id: 'controls', title: 'Controls', controls: [control] }],
		},
	}
}

describe('기본값이 바뀌면 값이 따라가는가', () => {
	const 파이 = '아시아\t34\n유럽\t33'
	const 히트맵 = '구분\t1월\t2월\n설계\t18\t22'

	it('손대지 않은 값은 새 기본값을 따라간다 — 표현을 바꾸면 그 표현의 데이터가 온다', () => {
		expect(followsChangedDefault(파이, 파이, 히트맵)).toBe(true)
	})

	it('🔴 손댄 값은 따라가지 않는다 — 덮으면 적은 것이 되돌릴 방법 없이 사라진다', () => {
		expect(followsChangedDefault('내가 적은 표\t1', 파이, 히트맵)).toBe(false)
	})

	it('기본값이 그대로면 아무것도 하지 않는다 — 매번 새 값을 만들면 무한 루프가 된다', () => {
		expect(followsChangedDefault(파이, 파이, 파이)).toBe(false)
		expect(followsChangedDefault('내가 적은 표', 파이, 파이)).toBe(false)
	})

	it('직전 기본값을 모르면(첫 렌더) 따라가지 않는다', () => {
		expect(followsChangedDefault(파이, undefined, 히트맵)).toBe(false)
	})
})
