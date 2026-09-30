import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 레이아웃 그리드 오버레이 위젯 — Block children에 등록되는 인터랙티브 leaf. 인스턴스 입력 없이 자족 렌더(fields=[]).
// dbName 짧게(lgo)로 중첩 테이블명 63자 방어.
export const layoutGridOverlay = defineDisplay({
	id: 'layoutGridOverlayWidget',
	type: 'dynamic',
	category: 'layout',
	sizing: 'responsive',
	ratio: '3:2',
	inset: '10%',
	dbName: 'lgo',
	name: '레이아웃 그리드 오버레이',
	description: '리플릿 표본 위에 여백·열 격자를 겹친다.',
	fields: [],
})

export default layoutGridOverlay
