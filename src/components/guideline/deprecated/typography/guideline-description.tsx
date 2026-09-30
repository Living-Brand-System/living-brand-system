import { RichText } from '@payloadcms/richtext-lexical/react'
import { typographyVariants } from '@/components/ui/typography-variants'
import { cn } from '@/lib/utils'
import type { SectionBlock } from '@/payload-types'
import { GUIDELINE_TYPOGRAPHY } from './guideline-typography'
import { guidelineRichTextConverters } from './spec-table-converters'

// 설명은 섹션·카드 블록·카드 캡션이 갖는다 — 토픽 문서의 설명은 2026-08-26에 제거했다.
// 표는 스펙 리스트로 그린다(spec-table-converters.tsx). 세 자리가 같은 컨버터를 타야 표기가 갈리지 않는다.
export function GuidelineDescription({
	description,
	variant = 'description',
	className,
}: {
	description: SectionBlock['description']
	variant?: 'description' | 'caption' | 'overlayCaption'
	className?: string
}) {
	// 비어 있으면 아무것도 렌더하지 않는다 — 설명은 optional이라 경고 표시도 하지 않는다.
	if (!description) return null

	return (
		<div className="text-balance">
			<RichText
				className={cn(
					typographyVariants(GUIDELINE_TYPOGRAPHY[variant]),
					'space-y-2 pr-8',
					className,
				)}
				converters={guidelineRichTextConverters}
				data={description}
			/>
		</div>
	)
}
