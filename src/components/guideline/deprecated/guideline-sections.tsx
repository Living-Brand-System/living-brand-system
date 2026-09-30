import { renderBlock } from '@/features/guideline/blocks/registry.render'
import type { GuidelineDocument } from '@/payload-types'

export function GuidelineSections({
	blocks,
	betterEditor = false,
}: {
	blocks: GuidelineDocument['blocks']
	betterEditor?: boolean
}) {
	if (!blocks?.length) return null
	return (
		// 랜드마크는 토픽 화면(`pages/guideline-topic.tsx`)의 <article> 하나가 갖는다 — 여기는 스택일 뿐이다.
		<div data-slot="guideline-sections" className="flex flex-col gap-72">
			{blocks?.map((block) => (
				<div key={block.id} data-better-editor-id={betterEditor ? block.id : undefined}>
					{renderBlock(block)}
				</div>
			))}
		</div>
	)
}
