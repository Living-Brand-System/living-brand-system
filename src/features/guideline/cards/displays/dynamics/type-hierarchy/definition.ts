import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { LANGUAGES } from '../brand-typeface'

// 문단 위계 위젯 — Head / Sub / Body 세 단이 규정대로 쌓인 문단을 직접 만져 보는 leaf.
// 원본 Artboard 46(국문)·47(영문)·48(영문 대문자)이 이 그림이다.
//
// 🔴 언어는 화면 컨트롤이 아니라 인스턴스 설정이다. 행간 규정이 언어마다 달라 값 자체는 필요하지만,
//    이 위젯의 주제는 언어 비교가 아니라 위계다 — 화면에 언어 탭을 두면 초점이 갈린다.
// 🔴 배열 필드를 두지 않는다. 중첩 블록의 조회 SQL 별칭이 63자를 넘으면 조인이 조용히 깨진다
//    (alias-length.test.ts가 지킨다).
// dbName 짧게(thr)로 중첩 테이블명 63자 방어. enum은 전역 이름 공유라 enumName 명시.
export const typeHierarchy = defineDisplay({
	id: 'typeHierarchyWidget',
	type: 'dynamic',
	category: 'typography',
	sizing: 'responsive',
	ratio: '5:7',
	dbName: 'thr',
	name: '문단 위계 구성',
	description: '제목·본문·캡션의 위계 표본. 카드가 준 영역 안에 배치한다.',
	fields: [
		{
			// 🔴 옵션은 brand-typeface.ts를 그대로 쓴다 — 언어를 두 곳에 적으면 규정 표에는 있는데
			//    고를 수 없는 언어가 생긴다. (brand-typeface.ts는 react·에셋을 import하지 않아
			//    payload.config 로딩에서 안전하다.)
			name: 'language',
			type: 'select',
			defaultValue: 'ko',
			enumName: 'enum_thr_language',
			options: LANGUAGES.map(({ key, label }) => ({ value: key, label })),
			admin: {
				description:
					'행간 규정과 예시 문구가 언어마다 다릅니다. 화면에는 컨트롤로 노출되지 않습니다.',
			},
		},
	],
})

export default typeHierarchy
