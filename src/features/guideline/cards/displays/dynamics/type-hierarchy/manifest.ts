import type {
	CardController,
	GuidelineControllerManifest,
} from '@/features/guideline/domain/contract/controller'
import type { TypeHierarchyWidget } from '@/payload-types'
import { LANGUAGES, SAMPLE_PARAGRAPH, TIERS } from '../brand-typeface'

export const TYPE_HIERARCHY_MANIFEST = {
	id: 'type-hierarchy',
	groups: [
		{
			id: 'texts',
			title: '표본 문구',
			controls: TIERS.map(({ key, label }) => ({
				id: key,
				kind: 'text' as const,
				label: `${label} 문구`,
				multiline: true,
				defaultValue: SAMPLE_PARAGRAPH.ko[key],
			})),
		},
	],
} satisfies GuidelineControllerManifest

export function typeHierarchyController(display: TypeHierarchyWidget): CardController | null {
	const language = LANGUAGES.find((l) => l.key === display.language)?.key ?? 'ko'
	return {
		manifest: TYPE_HIERARCHY_MANIFEST,
		restrictions: {
			controls: TIERS.map((tier) => ({
				controlId: tier.key,
				defaultValue: SAMPLE_PARAGRAPH[language][tier.key],
			})),
		},
	}
}
