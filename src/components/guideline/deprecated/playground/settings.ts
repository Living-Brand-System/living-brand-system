export const PLAYGROUND_OPTIONS = {
	width: [
		{ value: '365', label: '모바일 · 365px' },
		{ value: '768', label: '태블릿 · 768px' },
		{ value: '1440', label: '데스크톱 · 1440px' },
	],
	layout: [
		{ value: 'grid', label: 'Grid' },
		{ value: 'carousel', label: 'Carousel' },
	],
	columns: ['1', '2', '3', '4'].map((value) => ({ value, label: `${value}열` })),
	count: ['1', '2', '3', '4', '5'].map((value) => ({ value, label: `${value}개` })),
	ratio: [
		{ value: '1:1', label: 'Square · 1:1' },
		{ value: '16:9', label: 'Landscape · 16:9' },
		{ value: '9:16', label: 'Portrait · 9:16' },
	],
} as const

export type PlaygroundSettings = { [K in keyof typeof PLAYGROUND_OPTIONS]: string }
export const PLAYGROUND_DEFAULTS: PlaygroundSettings = {
	width: '1440',
	layout: 'grid',
	columns: '2',
	count: '3',
	ratio: '1:1',
}

/** URL은 허용된 미리보기 설정만 받는다. 카드 수·iframe 크기를 임의로 늘릴 수 없다. */
export function readPlaygroundSettings(
	params: Record<string, string | string[] | undefined>,
): PlaygroundSettings {
	return Object.fromEntries(
		Object.entries(PLAYGROUND_OPTIONS).map(([key, options]) => {
			const value = params[key]
			return [
				key,
				options.some((option) => option.value === value)
					? value
					: PLAYGROUND_DEFAULTS[key as keyof PlaygroundSettings],
			]
		}),
	) as PlaygroundSettings
}
