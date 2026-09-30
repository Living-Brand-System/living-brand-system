import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { PRESET_OPTIONS } from './presets'

/**
 * 프리셋 패널 디스플레이 — 이미지가 아니라 **코드로 그리는** 위반 예시 판. 컬러 위반(패널 색·띠·로고 변형)과
 * 타이포 위반(자간·서체·크기·형태·기울기) 프리셋을 select 하나로 고른다. 옛 Do/Don't 위젯의 예시 하나가
 * 이 디스플레이를 가진 카드 하나가 됐다(2026-09-08). Do/OK/Don't 표식은 카드(`mark`)가 갖는다.
 * dbName 짧게(ppd).
 */
export const presetPanel = defineDisplay({
	id: 'presetPanelDisplay',
	type: 'dynamic',
	category: 'media',
	sizing: 'responsive',
	dbName: 'ppd',
	name: '프리셋 패널(위반 예시)',
	description:
		'코드로 그리는 컬러·타이포 위반 예시 판. 옛 Do/Don’t 위젯의 예시 하나가 이 카드 하나다.',
	fields: [
		{
			name: 'preset',
			type: 'select',
			required: true,
			enumName: 'enum_ppd_preset',
			options: [...PRESET_OPTIONS],
			admin: {
				description:
					'코드로 그리는 위반 예시입니다. 색·그라디언트·투명도 중첩처럼 이미지로 만들면 원본 값이 사라지는 예시에 씁니다.',
			},
		},
		{
			name: 'logo',
			type: 'upload',
			relationTo: 'brand-logos',
			admin: {
				condition: (_data, siblingData) =>
					typeof siblingData?.preset !== 'string' ||
					![
						'tight-tracking',
						'loose-tracking',
						'wrong-typeface',
						'mixed-size',
						'distorted',
						'slanted',
					].includes(siblingData.preset),
				description:
					'컬러 패널에 올릴 기준 로고입니다. 같은 언어·방향의 기본형/WHITE/단색형을 파일명 규약으로 함께 찾습니다.',
			},
		},
	],
})

export default presetPanel
