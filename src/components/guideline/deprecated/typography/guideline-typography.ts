import type { ComponentProps } from 'react'
import type { Typography } from '@/components/ui/typography'

/** 가이드라인 산문의 역할별 스타일. 도판 속 표본·치수·컨트롤은 이 스케일을 소비하지 않는다. */
export const GUIDELINE_TYPOGRAPHY = {
	topicTitle: { size: '6xl', weight: 'semibold', className: 'leading-none tracking-tight' },
	blockTitle: { size: '5xl', weight: 'semibold', className: 'leading-tight tracking-tight' },
	description: { size: 'xl', weight: 'normal', className: 'leading-[1.55] tracking-tight' },
	caption: { size: 'xl', weight: 'medium', className: 'leading-[1.55] tracking-tight' },
	overlayCaption: { size: 'base', weight: 'medium', className: 'leading-[1.55] tracking-tight' },
	specLabel: { size: 'sm', weight: 'medium', className: 'leading-[1.55] tracking-tight' },
	specValue: { size: 'sm', weight: 'normal', className: 'leading-[1.55] tracking-tight' },
} as const satisfies Record<
	string,
	Pick<ComponentProps<typeof Typography>, 'size' | 'weight' | 'className'>
>
