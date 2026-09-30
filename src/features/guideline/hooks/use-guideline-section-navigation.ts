'use client'

import { type MouseEvent, useEffect, useState } from 'react'

/** 중첩 스크롤 컨테이너를 직접 움직인다(브라우저 기본 #앵커는 부모 프레임을 스크롤함). */
export function scrollToGuidelineSection(event: MouseEvent, slug: string) {
	const el = document.getElementById(slug)
	const root = el?.closest<HTMLElement>('[data-slot="section-scroll-container"]')
	if (!el || !root) return
	event.preventDefault()
	root.scrollTo({
		top:
			root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 96,
		behavior: 'smooth',
	})
	history.replaceState(null, '', `#${slug}`)
}

/** 토픽 스크롤 기준선을 넘어선 마지막 섹션 앵커를 반환한다. */
export function useActiveSectionAnchor(slugs: string[]): string | null {
	const [active, setActive] = useState<string | null>(null)
	const key = slugs.join('|')

	useEffect(() => {
		const list = key ? key.split('|') : []
		if (list.length === 0) {
			setActive(null)
			return
		}
		const root = document.querySelector<HTMLElement>('[data-slot="section-scroll-container"]')
		if (!root) return

		let raf = 0
		const compute = () => {
			raf = 0
			const line = root.getBoundingClientRect().top + 120
			let current: string | null = null
			for (const slug of list) {
				const el = document.getElementById(slug)
				if (!el) continue
				if (el.getBoundingClientRect().top <= line) current = slug
				else break
			}
			setActive(current)
		}
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(compute)
		}

		compute()
		root.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll, { passive: true })
		return () => {
			root.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
			if (raf) cancelAnimationFrame(raf)
		}
	}, [key])

	return active
}
