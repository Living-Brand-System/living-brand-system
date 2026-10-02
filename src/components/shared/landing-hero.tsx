'use client'

import Image from 'next/image'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { PageHero } from '@/components/shared/page-hero'
import { cn } from '@/lib/utils'

// 셰이더는 가로형 Fluted Glass다(Figma 571:8889의 「Fluted Glass 그래픽 미리보기」). 모듈 상수로 둔다 — PageHero 참조.
const LANDING_HERO_VALUES = { shape: 'linear' } as const
// ponytail: 정지 폴백은 디자인 컷(`/images/hero_fluted_glass.png`)이 들어오면 그 경로로 바꾼다. 지금은 가이드라인 컷을 쓴다.
const LANDING_HERO_FALLBACK = '/images/hero_guideline.png'

/**
 * 메인·가이드라인·스튜디오 첫 화면의 히어로(Figma 571:8889) — Fluted Glass 셰이더를 바탕으로 녹이고 가운데에 락업·제목을 둔다.
 * `screen`은 한 화면, `banner`는 512px 띠다. 모션 감소 설정이면 셰이더 대신 정지 이미지가 남는다(`PageHero`).
 *
 * 🔑 그래픽은 **화면 고정 배경층**이다 — 본문 열 안에 두면 스크롤 영역에 갇혀 헤더·가이드라인 목차 열 뒤로 깔리지 못한다
 *    (위·아래·왼쪽이 잘렸다). 히어로 자리는 투명하게 비우고, 그 아래 블록은 불투명한 바탕(`LandingSurface`)으로 덮는다.
 * 🔑 배경층은 스크롤을 따라 히어로 자리와 함께 올라간다 — 고정된 채로 두면 본문 열만 흰 블록에 덮이고, 스크롤되지 않는
 *    목차 열 뒤에는 그래픽이 그대로 남아 두 영역 경계가 잘려 보였다. 함께 올라가면 그래픽 아래 끝(바탕으로 녹은 부분)이
 *    두 열에서 같은 높이라 경계가 없다.
 * 🔑 히어로 자리가 화면 밖으로 다 나가면 배경층을 감추고 셰이더도 내린다 — 보이지 않는 배경이 GPU를 쓰지 않는다.
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
	const placeRef = useRef<HTMLDivElement>(null)
	const backdropRef = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(true)
	useEffect(() => {
		const place = placeRef.current
		const backdrop = backdropRef.current
		if (!place || !backdrop) return
		// 히어로를 스크롤시키는 가장 가까운 조상(섹션 스크롤 영역) — 없으면 문서다.
		let scroller: HTMLElement | Window = window
		for (let node = place.parentElement; node; node = node.parentElement) {
			const { overflowY } = getComputedStyle(node)
			if (overflowY === 'auto' || overflowY === 'scroll') {
				scroller = node
				break
			}
		}
		let frame = 0
		const sync = () => {
			frame = 0
			// 히어로 자리가 위로 밀려난 만큼만 따라간다(되튕김으로 아래로 내려온 값은 무시).
			const top = Math.min(0, place.getBoundingClientRect().top)
			backdrop.style.transform = `translate3d(0, ${top}px, 0)`
		}
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(sync)
		}
		sync()
		scroller.addEventListener('scroll', schedule, { passive: true })
		window.addEventListener('resize', schedule)
		return () => {
			scroller.removeEventListener('scroll', schedule)
			window.removeEventListener('resize', schedule)
			cancelAnimationFrame(frame)
		}
	}, [])
	useEffect(() => {
		const place = placeRef.current
		if (!place) return
		// 루트를 비워 두면 화면 기준이고, 조상 스크롤 영역의 잘림까지 반영된다.
		const observer = new IntersectionObserver(([entry]) =>
			setVisible(entry?.isIntersecting ?? true),
		)
		observer.observe(place)
		return () => observer.disconnect()
	}, [])
	const height = size === 'screen' ? 'h-dvh' : 'h-128'
	return (
		<>
			<div
				ref={backdropRef}
				aria-hidden
				data-slot="landing-hero-backdrop"
				className={cn(
					'pointer-events-none fixed inset-x-0 top-0 -z-10 transition-opacity duration-(--motion-feedback) ease-out',
					height,
					!visible && 'opacity-0',
				)}
			>
				<PageHero
					runtimeId="fluted-glass"
					values={LANDING_HERO_VALUES}
					fallbackSrc={LANDING_HERO_FALLBACK}
					fade={fade}
					active={visible}
					className="size-full rounded-none"
				/>
			</div>
			{/* 섹션 레이아웃이 헤더 몫으로 비운 위 여백만큼 끌어올려 배경층과 같은 자리·높이에 선다(없으면 0). */}
			<div
				ref={placeRef}
				data-slot="landing-hero"
				className={cn(
					'relative flex w-full shrink-0 items-center justify-center -mt-[var(--section-header-inset,0px)]',
					height,
				)}
			>
				{children}
			</div>
		</>
	)
}

/** 히어로 다음의 블록·푸터를 담는 불투명한 바탕 — 스크롤하면 고정된 그래픽 위로 올라와 덮는다. */
export function LandingSurface({ children }: { children: ReactNode }) {
	return <div className="relative flex w-full flex-col bg-background">{children}</div>
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
