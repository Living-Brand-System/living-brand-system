'use client'

import { type ReactNode, useLayoutEffect, useRef } from 'react'

/** contain 위젯의 콘텐츠만 맞춘다. 배경·카드·캡션·액션은 배율에 포함하지 않는다. */
export function DisplayFit({ children }: { children: ReactNode }) {
	const frameRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		const frame = frameRef.current
		const content = contentRef.current
		if (!frame || !content) return
		const updateScale = () => {
			if (!content.offsetWidth || !content.offsetHeight) return
			const scale = Math.min(
				1,
				frame.clientWidth / content.offsetWidth,
				frame.clientHeight / content.offsetHeight,
			)
			content.style.setProperty('--display-scale', String(scale))
			content.style.transform = `scale(${scale})`
		}
		updateScale()
		const observer = new ResizeObserver(updateScale)
		observer.observe(frame)
		observer.observe(content)
		return () => observer.disconnect()
	}, [])
	return (
		<div
			ref={frameRef}
			data-slot="display-fit"
			className="absolute inset-4 flex items-center justify-center"
		>
			{/* transform 적용 전부터 자식의 offsetParent를 고정한다. */}
			<div
				ref={contentRef}
				data-display-fit-content
				className="relative w-max shrink-0 origin-center"
			>
				{children}
			</div>
		</div>
	)
}
