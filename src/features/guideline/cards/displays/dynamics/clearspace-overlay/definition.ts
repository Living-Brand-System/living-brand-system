import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// [임시] 클리어스페이스 오버레이 위젯 — 같은 canvas(viewBox)로 파싱된 두 레이어(로고=logoSpace, 그리드=clearSpace)를
// 정확히 겹쳐서 클리어스페이스 다이어그램을 만든다. 나중에 HTML 기반(H·비율 계산 렌더)으로 대체 예정.
// 🔑 두 SVG는 px scale이 맞춰져 있어(동일 viewBox) 같은 크기로 겹치면 정합. 크기는 카드가 결정한다.
// dbName 짧게(cso)로 중첩 테이블명 63자 방어.
export const clearspaceOverlay = defineDisplay({
	id: 'clearspaceOverlayWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'cso',
	name: '클리어스페이스 오버레이',
	description: '로고 위에 여백 격자를 겹쳐 보인다.',
	fields: [
		{
			name: 'logoLayer',
			type: 'upload',
			relationTo: 'brand-logos',
			required: true,
			admin: { description: '로고 레이어(logoSpace). 그리드와 같은 canvas로 파싱된 SVG.' },
		},
		{
			name: 'gridLayer',
			type: 'upload',
			relationTo: 'brand-logos',
			required: true,
			admin: { description: '그리드 레이어(clearSpace). 로고와 같은 canvas.' },
		},
		{
			name: 'scalePercent',
			type: 'number',
			defaultValue: 100,
			min: 1,
			// 이전 저장값 호환용. 렌더에서는 사용하지 않는다.
			admin: { hidden: true },
		},
	],
})

export default clearspaceOverlay
