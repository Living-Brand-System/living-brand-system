import { Fragment, type ReactNode } from 'react'
import { typographyVariants } from '@/components/ui/typography-variants'
import { cn } from '@/lib/utils'
import { GUIDELINE_TYPOGRAPHY } from './guideline-typography'

/** CMS의 2열 표와 규정에서 파생한 명세가 같은 캡션 스타일을 사용한다. */
export function GuidelineSpecTable({
	rows,
}: {
	rows: readonly (readonly [ReactNode, ReactNode])[]
}) {
	return (
		<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
			{rows.map(([label, value], index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: CMS 표 행에는 id가 없고 순서가 정체성이다.
				<Fragment key={index}>
					<dt className={typographyVariants(GUIDELINE_TYPOGRAPHY.specLabel)}>{label}</dt>
					<dd
						className={cn(
							typographyVariants(GUIDELINE_TYPOGRAPHY.specValue),
							'min-w-0 text-muted-foreground',
						)}
					>
						{value}
					</dd>
				</Fragment>
			))}
		</dl>
	)
}
