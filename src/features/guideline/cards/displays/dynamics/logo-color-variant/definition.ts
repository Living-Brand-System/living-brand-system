import { defineDisplay } from '@/features/guideline/cards/displays/definition'

// 폐기된 위젯. 기존 문서·버전을 읽기 위한 DB 스키마만 유지한다.
export const logoColorVariant = defineDisplay({
	id: 'logoColorVariantWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'responsive',
	dbName: 'lcv',
	name: '로고 색상 변형 (폐기)',
	description: '기본형에서 파생한 WHITE·단색 변형을 나란히 본다.',
	fields: [
		{
			name: 'logo',
			type: 'upload',
			relationTo: 'brand-logos',
			required: true,
			admin: { description: '기본형(풀컬러) 로고입니다. WHITE·단색은 여기서 파생됩니다.' },
		},
	],
})

export default logoColorVariant
