import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 아이콘 그리드 위젯 — Block children에 등록되는 인터랙티브 leaf. 인스턴스 입력 없이 자족 렌더(fields=[]).
// dbName 짧게(icw)로 중첩 테이블명 63자 방어.
export const iconGrid = defineDisplay({
	id: 'iconGridWidget',
	type: 'dynamic',
	category: 'iconography',
	sizing: 'responsive',
	dbName: 'icw',
	name: '아이콘 그리드',
	description: '브랜드 아이콘 격자. 카드가 준 영역 안에 배치한다.',
	fields: [],
})

export default iconGrid
