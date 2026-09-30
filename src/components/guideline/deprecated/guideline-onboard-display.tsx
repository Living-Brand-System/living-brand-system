import Image from 'next/image'
import { PageHero } from '@/components/shared/page-hero'

const GUIDELINE_HERO_VALUES = { shape: 'linear' } as const

export function GuidelineOnboardDisplay({ title }: { title: string }) {
	return (
		<PageHero
			className="dark h-120 w-full"
			fallbackSrc="/images/hero_guideline.png"
			runtimeId="fluted-glass"
			values={GUIDELINE_HERO_VALUES}
		>
			<div className="flex items-center gap-6 text-foreground">
				<Image alt="HD" height={32} src="/logos/logo_wht.svg" width={77} />
				<div aria-hidden className="h-8 w-px bg-foreground/40" />
				{/* CI(32px)와 짝을 이루는 히어로 락업이라 UI 타이포그래피 단계를 따르지 않는다(docs/09 §6의 lockup 예외). */}
				<h1 className="font-medium text-[34px] leading-8">{title}</h1>
			</div>
		</PageHero>
	)
}
