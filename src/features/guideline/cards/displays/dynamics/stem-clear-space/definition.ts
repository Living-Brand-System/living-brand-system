import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 여백 규정 위젯 — Block children에 등록되는 인터랙티브 leaf. 인스턴스 입력 없이 자족 렌더(fields=[]).
// dbName 짧게(scs)로 중첩 테이블명 63자 방어.
export const stemClearSpace = defineDisplay({
	id: 'stemClearSpaceWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'scs',
	name: '여백 규정',
	description: '심볼 stem 기준 여백 규정 도판.',
	fields: [],
})

export default stemClearSpace
