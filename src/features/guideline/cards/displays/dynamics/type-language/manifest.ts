import type {
	CardController,
	GuidelineControllerManifest,
} from '@/features/guideline/domain/contract/controller'
import type { TypeLanguageWidget } from '@/payload-types'
import { LANGUAGES } from '../brand-typeface'

export const LANGUAGE = {
	id: 'typeLanguage',
	kind: 'select',
	label: '본문 언어',
	defaultValue: 'ko',
	options: LANGUAGES.map(({ key, label }) => ({ value: key, label })),
} as const
export const TYPE_LANGUAGE_MANIFEST = {
	id: 'type-language',
	groups: [{ id: 'language', title: '언어', controls: [LANGUAGE] }],
} satisfies GuidelineControllerManifest

export function typeLanguageController(display: TypeLanguageWidget): CardController | null {
	if (display.layout === 'compare') return null
	return {
		manifest: TYPE_LANGUAGE_MANIFEST,
		restrictions: {
			controls: [{ controlId: LANGUAGE.id, defaultValue: display.initialLanguage ?? 'ko' }],
		},
	}
}
