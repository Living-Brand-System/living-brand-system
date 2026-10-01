'use client'

import { GuidelineControllerPill } from '@/components/guideline/controllers/pill'
import { TYPE_SPECIMEN_MANIFEST } from '@/features/guideline/cards/displays/dynamics/type-specimen/manifest'
import { TypeSpecimenWidget } from '@/features/guideline/cards/displays/dynamics/type-specimen/view'
import { GuidelineControllerScope } from '@/features/guideline/providers/guideline-controller-provider'
import { GuidelineDisplayFrame } from './grid'

export function TypeSpecimenReview() {
	return (
		<GuidelineControllerScope manifest={TYPE_SPECIMEN_MANIFEST}>
			<div className="flex min-w-0 flex-col gap-4">
				<GuidelineDisplayFrame>
					<TypeSpecimenWidget />
				</GuidelineDisplayFrame>
				<fieldset
					aria-label="기존 서체 표본 편집"
					className="flex flex-wrap items-center gap-4"
				>
					<GuidelineControllerPill />
				</fieldset>
			</div>
		</GuidelineControllerScope>
	)
}
