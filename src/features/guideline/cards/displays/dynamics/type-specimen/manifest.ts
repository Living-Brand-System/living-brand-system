import type { GuidelineControllerManifest } from '@/features/guideline/domain/contract/controller'

export const TIER_PRESETS = {
	word: { label: 'Word', size: 96, fallback: 'Aa' },
	sentence: {
		label: 'Sentence',
		size: 40,
		fallback: 'The quick brown fox jumps over the lazy dog.',
	},
	paragraph: {
		label: 'Paragraph',
		size: 18,
		fallback:
			'Typography gives language a durable visual form. Set a paragraph to judge rhythm, spacing, and tone at reading size.',
	},
} as const

export const TIER = {
	id: 'tier',
	kind: 'select',
	label: 'Size',
	defaultValue: 'word',
	variant: 'segmented',
	options: Object.entries(TIER_PRESETS).map(([value, preset]) => ({
		value,
		label: preset.label,
	})),
} as const
export const ALIGN = {
	id: 'align',
	kind: 'select',
	label: 'Align',
	defaultValue: 'center',
	variant: 'segmented',
	options: [
		{ value: 'left', label: 'Left' },
		{ value: 'center', label: 'Center' },
		{ value: 'right', label: 'Right' },
	],
} as const
export const LEADING = {
	id: 'leading',
	kind: 'range',
	label: 'Leading',
	defaultValue: 1.2,
	min: 0.9,
	max: 2,
	step: 0.05,
} as const

export const TYPE_SPECIMEN_MANIFEST = {
	id: 'type-specimen',
	groups: [
		{ id: 'style', title: '표본 스타일', controls: [TIER, ALIGN, LEADING] },
		{
			id: 'texts',
			title: '표본 문구',
			controls: Object.entries(TIER_PRESETS).map(([key, preset]) => ({
				id: key,
				kind: 'text' as const,
				label: `${preset.label} 문구`,
				multiline: true,
				defaultValue: preset.fallback,
			})),
		},
	],
} satisfies GuidelineControllerManifest
