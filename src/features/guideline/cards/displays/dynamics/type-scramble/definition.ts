import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 폐기된 위젯. 기존 문서·버전을 읽기 위한 DB 스키마만 유지한다.
export const typeScramble = defineDisplay({
	id: 'typeScrambleWidget',
	type: 'dynamic',
	category: 'typography',
	sizing: 'responsive',
	dbName: 'tsw',
	name: '서체 스크램블 (폐기)',
	description: '글자가 흩어졌다 모이는 서체 표본.',
	fields: [
		{
			name: 'text',
			type: 'textarea',
			admin: {
				description:
					'표시할 문구입니다. 줄바꿈을 그대로 살려 한 덩어리로 보여줍니다. 비우면 기본 표본을 씁니다.',
			},
		},
		{
			name: 'fontSize',
			type: 'number',
			defaultValue: 48,
			min: 8,
			max: 200,
			admin: { description: '글자 크기(px)입니다. 줄 수와 판 높이에 맞춰 정합니다.' },
		},
		{
			name: 'panelHeight',
			type: 'number',
			defaultValue: 480,
			min: 80,
			max: 1200,
			// 이전 저장값 호환용. 렌더에서는 사용하지 않는다.
			admin: { hidden: true },
		},
		{
			// 🔴 색은 brand-colors가 소유한다. 위젯이 hex를 박지 않는다 — 브랜드 색이 바뀌면
			//    컬렉션만 고치면 되고, 다른 브랜드로 복제해도 코드가 그대로 산다.
			name: 'color',
			type: 'relationship',
			relationTo: 'brand-colors',
			admin: { description: '글자 색입니다. 비우면 기본 전경색을 씁니다.' },
		},
		{
			// 배경도 brand-colors가 소유한다. 비우면 배경 없이 글자만.
			name: 'background',
			type: 'relationship',
			relationTo: 'brand-colors',
			admin: { description: '판 배경색입니다. 비우면 배경 없이 글자만 보입니다.' },
		},
		{
			name: 'weight',
			type: 'select',
			defaultValue: 'bold',
			enumName: 'enum_tsw_weight',
			options: [
				{ label: 'Light', value: 'light' },
				{ label: 'Medium', value: 'medium' },
				{ label: 'Bold', value: 'bold' },
			],
			admin: {
				description:
					'표시 굵기입니다. 배포된 서체 파일에 없는 굵기를 고르면 브라우저 합성이라는 안내가 함께 나옵니다.',
			},
		},
	],
})

export default typeScramble
