import { RefreshRouteOnSave } from '@/components/guideline/refresh-route-on-save'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
} from '@/components/guideline/structure/components'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import { CmsGuidelineSections } from '@/features/guideline/sections/render'
import type { GetGuidelineTopicOutput } from '@/features/guideline/services/get-guideline-topic.service'

/** 신규 섹션 본문과 프리뷰 갱신을 조합한다. */
export function GuidelineTopic({
	topic,
	previewDocumentId,
}: {
	topic: GetGuidelineTopicOutput
	previewDocumentId?: number
}) {
	return (
		<article className={`relative flex w-full flex-col ${GUIDELINE_DOCUMENT_SURFACE}`}>
			{previewDocumentId !== undefined && <RefreshRouteOnSave />}
			<GuidelineDisplayHeading title={topic.title} />
			<CmsGuidelineSections
				sections={topic.sections ?? []}
				paletteCatalog={topic.paletteCatalog}
			/>
			<GuidelineDisplayFooter />
		</article>
	)
}
