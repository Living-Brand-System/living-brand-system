import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 배경색 위 로고 위젯 — 배경색 띠를 세로로 쌓고 그 위에 로고를 얹어, 드래그로 배경을 바꿔 가며
// 어떤 로고를 쓸 수 있는지 보게 한다. PDF는 배경마다 로고를 한 번씩 그려 보여줄 뿐이지만
// 여기서는 로고 하나를 옮기면서 규정이 바뀌는 걸 직접 겪게 한다.
//
// 🔴 어느 배경에 어떤 로고가 허용되는지는 brand-colors가 소유한다(allowsFullColorLogo·
//    allowsWhiteWordmark·monoLogoFill). 위젯이 대비 공식으로 유도하지 않는다 — 규정이라
//    계산과 어긋나는 칸이 있다(#DCF5D2는 기본형 가능, 비슷한 밝기의 #73D75A는 불가).
//
// dbName 짧게(lob), slug도 짧게(logoOnBgWidget) — 조회 SQL 별칭 63자 한계 때문이다
// (alias-length.test.ts가 지킨다).
export const logoOnBackground = defineDisplay({
	id: 'logoOnBgWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'lob',
	name: '배경색 위 로고',
	description: '컬러 그룹의 배경마다 로고를 얹어 본다. 카드가 준 영역 안에 배치한다.',
	fields: [
		{
			name: 'group',
			type: 'relationship',
			relationTo: 'brand-color-groups',
			admin: {
				description:
					'배경으로 쌓을 컬러 그룹입니다. 그룹이 가진 순서대로 위에서부터 쌓습니다.',
			},
		},
		{
			// 파일명 규약 `{lang}-{orientation}-{default|white|mono}.svg`에서 나머지 변형을 찾는다.
			// 세 파일을 각각 고르게 하지 않는 이유: 셋이 한 세트라 따로 고르면 어긋난 조합이 만들어진다.
			name: 'logo',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: {
				description:
					'기준 로고입니다. 같은 언어·방향의 기본형/WHITE/단색형을 파일명 규약으로 함께 찾습니다.',
			},
		},
		{
			name: 'column',
			type: 'select',
			defaultValue: 'fullColor',
			enumName: 'enum_lob_column',
			options: [
				{ label: '기본형 / WHITE 워드마크', value: 'fullColor' },
				{ label: '단색분리형', value: 'mono' },
			],
			admin: {
				description:
					'이 위젯이 보여줄 로고 계열입니다. 기본형 계열은 배경에 따라 파일이 바뀌고, 단색형은 색만 바뀝니다.',
			},
		},
	],
})

export default logoOnBackground
