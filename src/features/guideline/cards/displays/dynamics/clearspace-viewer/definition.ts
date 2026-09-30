import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 클리어스페이스 뷰어 — 가로형/세로형을 한 줄에 병행 표시(토글 아님, 동시). 공유 % 슬라이더로 둘을 같이 스케일하되
// 크기 판정(최소 높이 미달=금지)은 파일마다 입력한 minHeightPx로 패널별로 따로 한다.
// 🔑 슬라이더가 두 패널을 함께 제어(공유 상태) → block+위젯2개로는 상태공유 불가라 한 인터랙티브 위젯으로 묶는다.
// 각 패널 = logoSpace(로고) + clearSpace(그리드) 레이어(동일 canvas라 겹치면 정합). hover 시 그리드 숨김.
// dbName 짧게(cvw)로 중첩 테이블명 63자 방어.
export const clearspaceViewer = defineDisplay({
	id: 'clearspaceViewerWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'cvw',
	name: '클리어스페이스 뷰어',
	description: '가로·세로 로고의 여백 격자 뷰어. 컨트롤러 연결은 카드에서 끊겼다.',
	fields: [
		// 가로형 패널
		{
			name: 'horizontalLogo',
			type: 'upload',
			relationTo: 'brand-logos',
			required: true,
			admin: { description: '가로형 로고 레이어(logoSpace).' },
		},
		{
			name: 'horizontalGrid',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: { description: '가로형 그리드 레이어(clearSpace). 같은 canvas.' },
		},
		{
			name: 'horizontalMinHeightPx',
			type: 'number',
			min: 1,
			admin: { description: '가로형 최소 높이(px). 렌더 높이가 이 값 미만이면 금지(빨강).' },
		},
		// 세로형 패널(옵션)
		{
			name: 'verticalLogo',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: { description: '세로형 로고 레이어(logoSpace). 없으면 세로 패널 생략.' },
		},
		{
			name: 'verticalGrid',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: { description: '세로형 그리드 레이어(clearSpace).' },
		},
		{
			name: 'verticalMinHeightPx',
			type: 'number',
			min: 1,
			admin: { description: '세로형 최소 높이(px). 미만이면 금지(빨강).' },
		},
	],
})

export default clearspaceViewer
