/** 이미지 비율을 사용하는 Payload 필드와 화면의 공용 계약. */
export const IMAGE_RATIO_OPTIONS = [
	{ label: '원본', value: 'original' },
	{ label: '1:1', value: '1:1' },
	{ label: '5:4', value: '5:4' },
	{ label: '4:3', value: '4:3' },
	{ label: '3:2', value: '3:2' },
	// Incorrect Usages 도판(약 1.65:1)이 3:2·16:9 어느 쪽에도 맞지 않아 더했다(2026-10-06 사용자 허가).
	{ label: '5:3', value: '5:3' },
	{ label: '16:9', value: '16:9' },
	{ label: '2:1', value: '2:1' },
	{ label: '7:3', value: '7:3' },
	{ label: '4:5', value: '4:5' },
	{ label: '3:4', value: '3:4' },
	{ label: '2:3', value: '2:3' },
	{ label: '9:16', value: '9:16' },
] as const

export type ImageRatio = (typeof IMAGE_RATIO_OPTIONS)[number]['value']

// Tailwind가 정적으로 감지해야 하므로 클래스 전체 문자열을 나열한다.
export const IMAGE_RATIO_CLASS_NAMES = {
	original: '',
	'1:1': 'aspect-square',
	'5:4': 'aspect-[5/4]',
	'4:3': 'aspect-4/3',
	'3:2': 'aspect-[3/2]',
	'5:3': 'aspect-[5/3]',
	'16:9': 'aspect-video',
	'2:1': 'aspect-[2/1]',
	'7:3': 'aspect-[7/3]',
	'4:5': 'aspect-[4/5]',
	'3:4': 'aspect-[3/4]',
	'2:3': 'aspect-[2/3]',
	'9:16': 'aspect-[9/16]',
} as const satisfies Record<ImageRatio, string>
