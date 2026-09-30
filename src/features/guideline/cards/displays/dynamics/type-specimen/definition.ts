import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 타입 스페시멘 위젯 — Block children에 등록되는 인터랙티브 leaf. 인스턴스 입력 없이 자족 렌더(fields=[]).
// dbName 짧게(tsp)로 중첩 테이블명 63자 방어.
export const typeSpecimen = defineDisplay({
	id: 'typeSpecimenWidget',
	type: 'dynamic',
	category: 'typography',
	sizing: 'responsive',
	dbName: 'tsp',
	name: '타입 스페시멘',
	description: '크기·굵기를 바꿔 보는 서체 표본 판.',
	fields: [],
})

export default typeSpecimen
