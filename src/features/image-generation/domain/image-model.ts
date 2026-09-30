export const IMAGE_MODEL_PRESETS = [
	'openai-gpt-image-2',
	'google-nano-banana-2-lite',
	'google-nano-banana-2',
] as const

export type ImageModelPreset = (typeof IMAGE_MODEL_PRESETS)[number]

export const IMAGE_MODEL_PRESET_OPTIONS = [
	{ label: 'OpenAI GPT Image 2', value: IMAGE_MODEL_PRESETS[0] },
	{
		label: 'Google Nano Banana 2 Lite',
		value: IMAGE_MODEL_PRESETS[1],
	},
	{ label: 'Google Nano Banana 2', value: IMAGE_MODEL_PRESETS[2] },
] as const

export const DEFAULT_IMAGE_MODEL_PRESET: ImageModelPreset = 'openai-gpt-image-2'
export const GOOGLE_NANO_BANANA_2_LITE_MODEL = 'gemini-3.1-flash-lite-image'
export const OPENAI_GPT_IMAGE_2_MODEL = 'gpt-image-2'
export const GOOGLE_NANO_BANANA_2_MODEL = 'gemini-3.1-flash-image'
