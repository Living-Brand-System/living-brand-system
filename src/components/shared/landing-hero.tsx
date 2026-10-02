import Image from 'next/image'
import type { ReactNode } from 'react'
import { PageHero } from '@/components/shared/page-hero'
import { cn } from '@/lib/utils'

// 셰이더는 가로형 Fluted Glass다(Figma 571:8889의 「Fluted Glass 그래픽 미리보기」). 모듈 상수로 둔다 — PageHero 참조.
const LANDING_HERO_VALUES = { shape: 'linear' } as const
// ponytail: 정지 폴백은 디자인 컷(`/images/hero_fluted_glass.png`)이 들어오면 그 경로로 바꾼다. 지금은 가이드라인 컷을 쓴다.
const LANDING_HERO_FALLBACK = '/images/hero_guideline.png'

/**
 * 메인·가이드라인·스튜디오 첫 화면의 히어로(Figma 571:8889) — Fluted Glass 셰이더를 바탕으로 녹이고 가운데에 락업·제목을 둔다.
 * 모션 감소 설정이면 셰이더 대신 정지 이미지가 남는다(`PageHero`).
 * `screen`은 한 화면, `banner`는 512px 띠다.
 */
export function LandingHero({
	size,
	fade,
	children,
}: {
	size: 'screen' | 'banner'
	fade: 'up' | 'down'
	children: ReactNode
}) {
	return (
		<PageHero
			runtimeId="fluted-glass"
			values={LANDING_HERO_VALUES}
			fallbackSrc={LANDING_HERO_FALLBACK}
			fade={fade}
			className={cn('w-full shrink-0 rounded-none', size === 'screen' ? 'h-dvh' : 'h-128')}
		>
			{children}
		</PageHero>
	)
}

/** `HD │ 제목` 락업 — CI(32px)와 짝을 이루므로 UI 타이포그래피 단계를 따르지 않는다(docs/09 §6의 lockup 예외). */
export function LandingLockup({ title }: { title: string }) {
	return (
		<div className="flex items-center gap-6 text-foreground">
			<Image
				alt="HD"
				height={32}
				src="/logos/logo_blk.svg"
				width={77}
				className="dark:invert"
			/>
			<div aria-hidden className="h-8 w-px bg-foreground/40" />
			<h1 className="font-medium text-[34px] leading-8">{title}</h1>
		</div>
	)
}
