import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { LANGUAGES } from '../brand-typeface'

// 언어별 조판 비교 위젯 — 같은 한 덩어리 본문을 국문 / 영문 / 영문(All Caps)로 갈아 끼우며,
// 언어가 바뀌면 글자 밀도(회색도)가 달라지고 그래서 행간 규정이 달라진다는 것을 보여 준다.
//
// 🔴 위계(Head/Sub/Body)를 다루지 않는다 — 그건 다른 위젯 몫이고, 여기 요점은 원본 Artboard 44의
//    "국·영문 간 균일한 회색도를 유지하도록 정해진 세팅 값을 준수한다" 하나다. 그래서 본문 단
//    하나만 쓴다.
//
// 🔴 표본·행간 규정은 brand-typeface.ts가 소유한다. 이 위젯은 무엇을 보여줄지(언어·배치)만 저장한다.
//    labels·options도 거기서 가져와 admin과 화면이 같은 이름을 쓰게 한다.
//
// dbName 짧게(tlg). 배열 필드가 없고 slug 18자라 조회 SQL 별칭이 63자 아래로 남는다
// (alias-length.test.ts가 지킨다).
export const typeLanguage = defineDisplay({
	id: 'typeLanguageWidget',
	type: 'dynamic',
	category: 'typography',
	sizing: 'responsive',
	ratio: '5:7',
	dbName: 'tlg',
	name: '언어별 조판 비교',
	description: '국문·영문 조판을 나란히 비교한다.',
	fields: [
		{
			name: 'initialLanguage',
			type: 'select',
			defaultValue: 'ko',
			// enum 이름은 전역이라 위젯 접두사(tlg)를 붙여 다른 위젯의 언어 enum과 충돌하지 않게 한다.
			enumName: 'enum_tlg_language',
			options: LANGUAGES.map((language) => ({ label: language.label, value: language.key })),
			admin: {
				// 비교는 언어별 초기값을 가진 카드로 나누므로 이 필드를 사용하지 않는다.
				condition: (_, siblingData) => siblingData?.layout !== 'compare',
				description: '처음 보여줄 언어입니다. 독자가 화면에서 바꿀 수 있습니다.',
			},
		},
		{
			name: 'layout',
			type: 'select',
			defaultValue: 'single',
			enumName: 'enum_tlg_layout',
			options: [
				{ label: '한 언어씩 전환', value: 'single' },
				{ label: '언어별 카드로 비교', value: 'compare' },
			],
			admin: {
				description:
					'비교를 고르면 언어별 카드로 나누고, 각 카드에 해당 언어의 명세를 표시합니다.',
			},
		},
	],
})

export default typeLanguage
