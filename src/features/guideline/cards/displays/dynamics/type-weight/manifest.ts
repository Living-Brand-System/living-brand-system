import type {
	CardController,
	GuidelineControllerManifest,
} from '@/features/guideline/domain/contract/controller'
import type { TypeWeightWidget } from '@/payload-types'
import { WEIGHTS } from '../brand-typeface'

/** 파일에 존재하는 세 굵기만 선택한다. 중간 굵기를 합성하지 않는다. */
export const WEIGHT = {
	id: 'weight',
	kind: 'select',
	label: '서체 굵기',
	defaultValue: 'medium',
	variant: 'segmented',
	options: WEIGHTS.map(({ key, label, value }) => ({ value: key, label: `${label} ${value}` })),
} as const
export const TYPE_WEIGHT_MANIFEST = {
	id: 'type-weight',
	groups: [{ id: 'weight', title: '굵기', controls: [WEIGHT] }],
} satisfies GuidelineControllerManifest

export function typeWeightController(display: TypeWeightWidget): CardController | null {
	if (display.layout === 'specimen') return null
	return {
		manifest: TYPE_WEIGHT_MANIFEST,
		restrictions: {
			controls: [
				{
					controlId: WEIGHT.id,
					defaultValue: display.initialWeight ?? WEIGHT.defaultValue,
				},
			],
		},
	}
}
