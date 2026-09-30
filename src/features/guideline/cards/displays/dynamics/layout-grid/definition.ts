import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { GUTTER_X, MARGIN } from './manifest'
import { SAMPLE_OPTIONS } from './samples'

// 레이아웃 그리드 위젯 — Block children에 등록되는 인터랙티브 leaf.
// 조합 데이터는 코드(compositions.ts)에 있고, 인스턴스는 그중 어느 것을 렌더할지만 고른다.
// 🔴 옵션은 samples.ts를 그대로 쓴다 — 키를 두 곳에 적으면 조합만 추가하고 옵션을 빼먹는 사고가 난다.
//    (samples.ts는 에셋을 import하지 않아 Payload 설정 로딩에서 안전하다.)
// dbName 짧게(lgw)로 중첩 테이블명 63자 방어.
export const layoutGrid = defineDisplay({
	id: 'layoutGridWidget',
	type: 'dynamic',
	category: 'layout',
	sizing: 'responsive',
	dbName: 'lgw',
	name: '레이아웃 그리드',
	description: '판형 표본 위의 여백·거터 격자. 컨트롤러 연결은 카드에서 끊겼다.',
	fields: [
		{
			name: 'sample',
			type: 'select',
			defaultValue: 'a',
			enumName: 'enum_lgw_sample',
			options: SAMPLE_OPTIONS.map(({ value, label }) => ({ value, label })),
			admin: { description: '코드에 정의된 조합 중 하나입니다.' },
		},
		{
			name: 'caption',
			type: 'text',
			localized: true,
			admin: { description: '판형 아래에 표시할 선택 캡션입니다.' },
		},
		{
			name: 'guides',
			type: 'select',
			defaultValue: 'shared',
			enumName: 'enum_lgw_guides',
			options: [
				{ label: '컨트롤 패널을 따름', value: 'shared' },
				{ label: '항상 켜짐', value: 'on' },
				{ label: '항상 꺼짐', value: 'off' },
			],
			admin: {
				description:
					'그리드 표시입니다. 같은 페이지의 판형끼리 다르게 두려면 켜짐·꺼짐으로 고정합니다.',
			},
		},
		// 🔑 판형별 값. 비우면 패널을 따르고, 넣으면 이 판형만 그 값으로 고정된다.
		//    패널이 없는 페이지에서도 값을 지정할 수 있는 유일한 입구다.
		{
			name: 'marginPct',
			type: 'number',
			min: MARGIN.min,
			max: MARGIN.max,
			admin: {
				description: `마진을 이 판형만 고정합니다(${MARGIN.min}~${MARGIN.max}). 비우면 패널을 따릅니다.`,
			},
		},
		{
			name: 'gutterX',
			type: 'number',
			min: GUTTER_X.min,
			max: GUTTER_X.max,
			admin: {
				description: `수평 거터를 이 판형만 고정합니다(${GUTTER_X.min}~${GUTTER_X.max}). 비우면 패널을 따릅니다.`,
			},
		},
		{
			name: 'gutterY',
			type: 'number',
			min: GUTTER_X.min,
			max: GUTTER_X.max,
			admin: {
				description: `수직 거터를 이 판형만 고정합니다(${GUTTER_X.min}~${GUTTER_X.max}). 비우면 패널을 따릅니다.`,
			},
		},
	],
})

export default layoutGrid
