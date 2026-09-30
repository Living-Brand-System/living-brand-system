import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 로고 크게 보기 위젯 — 픽된 로고 SVG를 크게 그대로 보여준다(클리어스페이스/오버레이 없음). 디자인 컨셉용.
// 🔑 로고를 공유 풀에서 fishing하지 않고 logo 필드로 pin한다 → 풀에 뭘 넣든 이 페이지는 안 변형됨.
// 위젯은 image·text 동급 leaf(rule 모름). dbName 짧게(ldp)로 중첩 테이블명 63자 방어.
export const logoDisplay = defineDisplay({
	id: 'logoDisplayWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'ldp',
	name: '로고 크게 보기',
	description: '로고 파일 하나를 판 가운데에 크게 놓는다.',
	fields: [
		{
			name: 'logo',
			type: 'upload',
			relationTo: 'brand-logos',
			required: true,
			admin: { description: '표시할 이미지입니다.' },
		},
		// 이전 저장값 호환용. 렌더는 무시하며 크기는 카드가 결정한다.
		{
			name: 'width',
			type: 'number',
			min: 1,
			admin: { hidden: true },
		},
		{
			name: 'height',
			type: 'number',
			min: 1,
			admin: { hidden: true },
		},
		{
			name: 'padding',
			type: 'number',
			min: 0,
			admin: { description: '이미지 주변 여백(px).' },
		},
	],
})

export default logoDisplay
