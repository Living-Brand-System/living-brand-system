import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 섹션 경계·앵커와 제목/콘텐츠 사이의 간격을 소유한다. */
export function GuidelineSection({
	id,
	carousel = false,
	children,
}: {
	id?: string
	carousel?: boolean
	children: ReactNode
}) {
	return (
		<section
			id={id}
			data-slot="guideline-section"
			className={cn('flex flex-col gap-12', carousel && 'overflow-x-clip')}
		>
			{children}
		</section>
	)
}
