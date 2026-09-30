import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { LANGUAGES, WEIGHTS } from '../brand-typeface'

// 서체 굵기 컨트롤 — 문구 하나를 두고 굵기만 갈아 끼워 3종을 몸으로 비교하게 한다.
//
// 🔴 언어 전환은 넣지 않는다. 언어는 저작 시점에 고르는 값이고, 언어를 바꿔가며 보는 것(행간 규정 비교)은
//    다른 위젯의 몫이다. 여기서 런타임에 바뀌는 값은 굵기 하나뿐이어야 비교가 성립한다.
//
// 🔴 옵션 라벨을 여기서 새로 쓰지 않고 brand-typeface에서 가져온다 — 서체가 교체되면 상수 한 곳만 바뀐다.
//    (brand-typeface는 순수 상수 모듈이라 payload.config가 Node에서 로드해도 안전하다.)
//
// dbName 짧게(twt), enum은 전역 이름 공유라 enumName 명시 — 조회 SQL 별칭 63자 한계 방어.
export const typeWeight = defineDisplay({
	id: 'typeWeightWidget',
	type: 'dynamic',
	category: 'typography',
	sizing: 'responsive',
	dbName: 'twt',
	name: '서체 굵기',
	description: '슬라이더로 굵기를 바꿔 보는 서체 표본.',
	fields: [
		{
			name: 'layout',
			type: 'select',
			defaultValue: 'slider',
			enumName: 'enum_twt_layout',
			options: [
				{ label: '슬라이더로 전환', value: 'slider' },
				{ label: '표본 한 칸(고정)', value: 'specimen' },
			],
			admin: {
				description:
					'표본은 컨트롤 없이 고른 굵기 하나만 큰 문구 + 작은 본문으로 보여 줍니다. 원본(Artboard 43)처럼 3종을 늘어놓으려면 이 위젯을 굵기·언어별로 여섯 개 넣고 폭을 삼분으로 둡니다.',
			},
		},
		{
			name: 'language',
			type: 'select',
			defaultValue: 'ko',
			enumName: 'enum_twt_language',
			options: LANGUAGES.map(({ key, label }) => ({ label, value: key })),
			admin: {
				description:
					'표본 문구의 언어입니다. 문구와 행간은 그 언어의 규정을 따라 고정되고, 화면에서는 굵기만 바뀝니다.',
			},
		},
		{
			name: 'initialWeight',
			type: 'select',
			defaultValue: 'medium',
			enumName: 'enum_twt_weight',
			options: WEIGHTS.map(({ key, label, value }) => ({
				label: `${label} (${value})`,
				value: key,
			})),
			admin: {
				description:
					'처음 보여줄 굵기입니다. 보는 사람이 컨트롤로 3단 사이를 옮겨 다닐 수 있습니다.',
			},
		},
	],
})

export default typeWeight
