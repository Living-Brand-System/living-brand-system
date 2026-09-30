import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 배경색 선택 위젯 — 가로 배경판 하나에 CI 두 표현(기본형/WHITE, 단색분리형)을 나란히 올리고,
// 구석의 스와치 picker로 배경색을 바꾸면 둘이 동시에 반응한다.
//
// logo-on-background(드래그)와 역할이 같고 기능이 다르다. 저쪽은 배경을 세로로 훑으며 한 표현씩 보고,
// 여기는 한 배경 위에서 두 표현을 동시에 비교한다. 그래서 컨트롤이 하나뿐이고 블록당 하나만 놓는다.
//
// 🔴 picker는 brand-colors에 등록된 색만 고르게 한다. 임의 색을 허용하면 그 색에는 규정이 없어
//    로고를 무엇으로 바꿀지 근거가 사라지고, 대비 계산으로 유도하는 건 금지돼 있다
//    (`#DCF5D2`는 기본형 가능, 비슷한 밝기의 `#73D75A`는 불가).
//
// dbName 짧게(lbp). slug 18자 → 조회 SQL 별칭 44자(alias-length.test.ts가 지킨다).
export const logoBgPicker = defineDisplay({
	id: 'logoBgPickerWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'lbp',
	name: '배경색 선택',
	description: '배경색을 바꿔 가며 로고 표현을 확인한다.',
	fields: [
		{
			name: 'group',
			type: 'relationship',
			relationTo: 'brand-color-groups',
			admin: {
				description:
					'picker에 올릴 컬러 그룹입니다. 그룹이 가진 순서대로 스와치를 늘어놓습니다.',
			},
		},
		{
			// 파일명 규약 `{lang}-{orientation}-{default|white|mono}.svg`에서 나머지 변형을 찾는다.
			// 셋이 한 세트라 따로 고르게 하면 어긋난 조합이 만들어진다.
			name: 'logo',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: {
				description:
					'기준 로고입니다. 같은 언어·방향의 기본형/WHITE/단색형을 파일명 규약으로 함께 찾습니다.',
			},
		},
	],
})

export default logoBgPicker
