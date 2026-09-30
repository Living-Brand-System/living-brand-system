import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { GuidelineDescription } from '@/components/guideline/deprecated/typography/guideline-description'
import { GUIDELINE_TYPOGRAPHY } from '@/components/guideline/deprecated/typography/guideline-typography'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { BaseBlock } from '@/payload-types'

export type CardCaptionData = NonNullable<NonNullable<BaseBlock['cards']>[number]['caption']>

const captionVariants = cva('flex w-full flex-col wrap-anywhere', {
	variants: {
		placement: {
			below: 'max-w-120 px-4 py-8',
			// Figma 136:231. 어두운 토큰 스코프로 이미지 위 텍스트와 표의 대비를 함께 유지한다.
			overlay:
				'dark absolute inset-x-0 bottom-0 max-h-full overflow-y-auto overscroll-contain rounded-3xl bg-linear-to-b from-background/0 via-background/95 via-[48px] to-background bg-local px-6 pt-12 pb-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
		},
	},
	defaultVariants: { placement: 'below' },
})

/**
 * 캡션 = 제목 + 설명 + 파생 명세. 모두 선택이며 전부 비면 figcaption을 그리지 않는다.
 * 배치만 바꾸고 제목·설명·스펙 표는 공유한다. 긴 오버레이 캡션은 판 안에서 스크롤한다.
 */
export function CardCaption({
	caption,
	children,
	layout = 'stack',
	fallbackTitle,
	title: titleOverride,
}: {
	caption?: CardCaptionData | null
	children?: ReactNode
	layout?: 'stack' | 'split'
	fallbackTitle?: string
	title?: ReactNode
}) {
	const title = titleOverride ?? (caption?.title?.trim() || fallbackTitle)
	const description = caption?.description
	if (!title && !description && !children) return null
	const placement = caption?.placement ?? 'below'
	const overlay = placement === 'overlay'
	const split = layout === 'split' && !overlay
	const textRole = overlay ? 'overlayCaption' : 'caption'

	return (
		// Figma 131:272 — 판 폭 안에서 최대 480px. 긴 캡션도 카드의 비율을 밀어내지 않는다.
		<figcaption
			data-slot="card-caption"
			data-placement={placement}
			data-layout={split ? 'split' : 'stack'}
			className={cn(captionVariants({ placement }), split && 'max-w-none px-6 py-4.5')}
			tabIndex={overlay ? 0 : undefined}
		>
			<div
				className={cn(
					overlay && 'max-w-108',
					split && 'grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-1.5',
				)}
			>
				<div className="min-w-0">
					{title ? (
						<Typography as="p" {...GUIDELINE_TYPOGRAPHY[textRole]}>
							{title}
						</Typography>
					) : null}
					<GuidelineDescription
						description={description}
						variant={textRole}
						className="pr-0 text-muted-foreground text-wrap"
					/>
				</div>
				{children ? (
					<div className={cn('min-w-0', !split && (title || description) && 'mt-4')}>
						{children}
					</div>
				) : null}
			</div>
		</figcaption>
	)
}
