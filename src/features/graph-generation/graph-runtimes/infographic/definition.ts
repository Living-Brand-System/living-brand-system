import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import { INFOGRAPHIC_AXES, INFOGRAPHIC_AXIS_LABELS, INFOGRAPHIC_AXIS_RANGE } from './chart-axes'
import { INFOGRAPHIC_SAMPLE_DATA } from './chart-data'
import {
	EXTENDED_CHART_SUFFIX,
	INFOGRAPHIC_CHART_GROUP_LABELS,
	INFOGRAPHIC_CHART_GROUPS,
} from './chart-groups'
import { INFOGRAPHIC_CHART_PREVIEWS } from './chart-previews'
import {
	INFOGRAPHIC_CHART_TYPES,
	INFOGRAPHIC_DEFAULT_CHART_TYPE,
	INFOGRAPHIC_DEFAULT_PALETTE,
	INFOGRAPHIC_DEFAULT_SHOW_NAME_LABELS,
	INFOGRAPHIC_DEFAULT_SHOW_VALUE_LABELS,
	INFOGRAPHIC_DEFAULT_TEXT_SCALE,
	INFOGRAPHIC_TEXT_SCALE_RANGE,
} from './model'
import { HD_INFOGRAPHIC_PALETTES } from './palette'

/**
 * 가이드라인 B.11 INFOGRAPHIC의 12칸을 한 runtime이 갖는다.
 *
 * 🔑 12개 runtime으로 쪼개지 않은 이유: 데이터가 값 축이 아니라 입력이라, 표현마다 달라지는 축이
 *    사실상 없다. 쪼개면 카탈로그·enum·프로파일 행만 12배가 되고 창작자 화면은 같다.
 *
 * 🔴 오남용 6종(3D·아이콘 겹침·이미지 겹침·타 서체·저대비 색·과밀)은 검사기로 막지 않는다 —
 *    그 축을 **아예 만들지 않았다.** 규정을 값 검사가 아니라 선택지의 부재로 표현한다.
 */

export default defineGraphicRuntime({
	studio: 'graph',
	id: 'infographic',
	version: 1,
	name: 'Infographic',
	type: 'p5',
	artifacts: { vector: {}, raster: {} },
	controller: {
		// 보이는 것을 정하는 축은 전부 왼쪽, 데이터는 오른쪽이다.
		// 형태 축은 표현 바로 아래에 선다 — 무엇을 고르든 그 표현을 다듬는 자리다.
		left: ['chartType', ...INFOGRAPHIC_AXES, 'palette', 'showNameLabels', 'showValueLabels'],
		// 글자 크기는 데이터 곁에 둔다 — 무엇이 적히는가를 보면서 맞추는 축이다.
		right: ['data', 'textScale'],
		groups: [
			{
				id: 'chart',
				title: 'Chart',
				controls: [
					{
						id: 'chartType',
						kind: 'select' as const,
						label: '표현',
						defaultValue: INFOGRAPHIC_DEFAULT_CHART_TYPE,
						// 고르는 정보가 이름이 아니라 모양이라 목록이 아니라 썸네일 그리드로 선다.
						// 🔴 데이터에 맞지 않는다고 숨기지 않는다 — 같은 성격끼리 묶어 전부 세운다.
						options: [...INFOGRAPHIC_CHART_TYPES]
							// 묶음 순서는 `INFOGRAPHIC_CHART_GROUPS`가 갖는다. 같은 묶음 안에서는
							// 선언 순서를 지킨다 — 정본이 먼저, 확장이 뒤다.
							.sort(
								(left, right) =>
									INFOGRAPHIC_CHART_GROUPS.indexOf(left.group) -
									INFOGRAPHIC_CHART_GROUPS.indexOf(right.group),
							)
							.map(({ id, label, group, source }) => ({
								value: id,
								group: INFOGRAPHIC_CHART_GROUP_LABELS[group],
								// 🔴 정본 밖 표현은 이름에 표시가 붙는다 — 화면에서 「이건 규정인가」에
								//    답이 나와야 한다. 근거는 `chart-groups.ts`의 source가 갖는다.
								label:
									source === 'extended'
										? `${label}${EXTENDED_CHART_SUFFIX}`
										: label,
								preview: INFOGRAPHIC_CHART_PREVIEWS[id],
							})),
					},
					{
						id: 'palette',
						kind: 'select' as const,
						label: '팔레트',
						variant: 'list' as const,
						defaultValue: INFOGRAPHIC_DEFAULT_PALETTE,
						options: Object.entries(HD_INFOGRAPHIC_PALETTES).map(
							([value, palette]) => ({
								value,
								label: palette.label,
								colors: [...palette.colors],
							}),
						),
					},
				],
			},
			{
				id: 'data',
				title: 'Data',
				controls: [
					{
						id: 'data',
						kind: 'text' as const,
						label: '데이터',
						multiline: true,
						// 격자로도 고치고 붙여넣기로도 고친다 — 같은 값의 두 표현이다.
						grid: ['라벨', '값'],
						// 🔑 붙여넣기가 주력이다 — 붙여넣은 표가 한눈에 보일 만큼 띄운다.
						//    칸 단위 손보기는 격자가 갖는다.
						rows: 8,
						resettable: true,
						// 표현을 고르면 그 표현의 이상적인 데이터로 바뀐다(model의 getRestrictions).
						defaultValue: INFOGRAPHIC_SAMPLE_DATA[INFOGRAPHIC_DEFAULT_CHART_TYPE],
						placeholder: '라벨\t값',
					},
				],
			},
			{
				id: 'shape',
				title: 'Shape',
				controls: INFOGRAPHIC_AXES.map((axis) => ({
					id: axis,
					kind: 'range' as const,
					label: INFOGRAPHIC_AXIS_LABELS[axis],
					// 기본값·사용 여부는 표현이 정한다(model의 getRestrictions).
					defaultValue: 0.5,
					min: INFOGRAPHIC_AXIS_RANGE.min,
					max: INFOGRAPHIC_AXIS_RANGE.max,
					step: INFOGRAPHIC_AXIS_RANGE.step,
					display: { precision: 2 },
				})),
			},
			{
				id: 'labels',
				title: 'Labels',
				controls: [
					{
						id: 'showNameLabels',
						kind: 'toggle' as const,
						label: '이름 표시',
						defaultValue: INFOGRAPHIC_DEFAULT_SHOW_NAME_LABELS,
					},
					{
						id: 'showValueLabels',
						kind: 'toggle' as const,
						label: '값 표시',
						defaultValue: INFOGRAPHIC_DEFAULT_SHOW_VALUE_LABELS,
					},
				],
			},
			{
				id: 'text',
				title: 'Text',
				controls: [
					{
						id: 'textScale',
						kind: 'range' as const,
						label: '글자 크기',
						defaultValue: INFOGRAPHIC_DEFAULT_TEXT_SCALE,
						min: INFOGRAPHIC_TEXT_SCALE_RANGE.min,
						max: INFOGRAPHIC_TEXT_SCALE_RANGE.max,
						step: INFOGRAPHIC_TEXT_SCALE_RANGE.step,
						display: { unit: '×', precision: 2 },
					},
				],
			},
		],
	},
})
