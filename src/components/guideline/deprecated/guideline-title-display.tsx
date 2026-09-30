import { ContentFrame } from '@/components/shared/content-frame'
import type { GuidelineDocument } from '@/payload-types'
import { GuidelineTitleImage } from './media/guideline-title-image'
import { GuidelineHeader } from './typography/guideline-header'

/** 토픽 대표 이미지와 페이지 제목의 배치를 소유한다. */
export function GuidelineTitleDisplay({
	title,
	image,
}: {
	title: string
	image?: GuidelineDocument['headerImage']
}) {
	return (
		<ContentFrame>
			<div className="relative">
				<GuidelineTitleImage image={image} />
				<div className="dark absolute inset-0 grid place-items-center text-foreground">
					<GuidelineHeader variant="topic" title={title} />
				</div>
			</div>
		</ContentFrame>
	)
}
