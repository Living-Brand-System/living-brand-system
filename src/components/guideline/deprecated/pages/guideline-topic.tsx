import { GuidelineHelperSlot } from '@/components/guideline/deprecated/controllers/helper'
import { GuidelineFooter } from '@/components/guideline/deprecated/guideline-footer'
import { GuidelineSections } from '@/components/guideline/deprecated/guideline-sections'
import { GuidelineTitleDisplay } from '@/components/guideline/deprecated/guideline-title-display'
import { RefreshRouteOnSave } from '@/components/guideline/deprecated/refresh-route-on-save'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
} from '@/components/guideline/structure/components'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import { GuidelineHelperProvider } from '@/features/guideline/providers/guideline-helper-provider'
import { CmsGuidelineSections } from '@/features/guideline/sections/render'
import type { GetGuidelineTopicOutput } from '@/features/guideline/services/get-guideline-topic.service'

/** 페이지는 대표 영역·섹션·푸터를 조합하고, 프리뷰와 조작 환경을 연결한다. */
export function GuidelineTopic({
	topic,
	previewDocumentId,
}: {
	topic: GetGuidelineTopicOutput
	previewDocumentId?: number
}) {
	const isPreview = previewDocumentId !== undefined
	return (
		<GuidelineHelperProvider>
			<article
				className={`relative flex w-full flex-col ${topic.contentModel === 'sections' ? GUIDELINE_DOCUMENT_SURFACE : ''}`}
			>
				{isPreview && <RefreshRouteOnSave />}
				{topic.contentModel === 'sections' ? (
					<>
						<GuidelineDisplayHeading title={topic.title} />
						<CmsGuidelineSections
							sections={topic.sections ?? []}
							paletteCatalog={topic.paletteCatalog}
						/>
						<GuidelineDisplayFooter
							logo={{
								src: '/brand/hd/ko-horizontal-default-blk@2x.png',
								alt: 'HD현대',
								width: 1246,
								height: 328,
							}}
						/>
					</>
				) : (
					<>
						<GuidelineTitleDisplay title={topic.title} image={topic.headerImage} />
						<GuidelineSections blocks={topic.blocks} betterEditor={isPreview} />
						<GuidelineFooter />
					</>
				)}
				<GuidelineHelperSlot />
			</article>
		</GuidelineHelperProvider>
	)
}
