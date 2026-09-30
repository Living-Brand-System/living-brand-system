import { defineDisplay } from '@/features/guideline/cards/displays/definition'

/** 정적 디스플레이 — 업로드 이미지가 카드 판을 배경으로 덮는다(cover). dbName 짧게(sdp). */
export const staticDisplay = defineDisplay({
	id: 'staticDisplay',
	type: 'static',
	category: 'media',
	sizing: 'responsive',
	dbName: 'sdp',
	name: '정적 디스플레이(이미지)',
	description: '업로드 이미지가 판을 배경으로 덮는다. 판 비율에 맞춰 잘린다.',
	fields: [
		{
			name: 'image',
			type: 'upload',
			relationTo: 'application-images',
			required: true,
			admin: {
				description: '카드 판을 배경으로 채우는 이미지입니다. 판 비율에 맞춰 잘립니다.',
			},
		},
	],
})

export default staticDisplay
