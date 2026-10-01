'use client'

import Link from 'next/link'
import { type CSSProperties, useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { isLightColor } from '@/lib/color'
import { cn } from '@/lib/utils'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioHomeItem = {
	key: string | number
	name: string
	/** 이름 아래 한 줄 — 편집 화면 좌상단 카드의 부제와 같은 값을 준다. */
	subtitle?: string
	href: string
	previewImage?: StudioPreviewImage
}

/** RGBA 픽셀의 평균색 — 투명한 픽셀은 알파만큼만 센다. 전부 투명하면 null. */
export function averagePixelColor(data: Uint8ClampedArray): string | null {
	let r = 0
	let g = 0
	let b = 0
	let weight = 0
	for (let index = 0; index < data.length; index += 4) {
		const alpha = data[index + 3] / 255
		r += data[index] * alpha
		g += data[index + 1] * alpha
		b += data[index + 2] * alpha
		weight += alpha
	}
	if (weight === 0) return null
	const hex = (sum: number) =>
		Math.round(sum / weight)
			.toString(16)
			.padStart(2, '0')
	return `#${hex(r)}${hex(g)}${hex(b)}`
}

const SAMPLE_SIZE = 24

function sampleAverageColor(image: HTMLImageElement): string | null {
	const canvas = document.createElement('canvas')
	canvas.width = SAMPLE_SIZE
	canvas.height = SAMPLE_SIZE
	const context = canvas.getContext('2d', { willReadFrequently: true })
	if (!context) return null
	context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
	try {
		return averagePixelColor(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
	} catch {
		// 다른 출처의 이미지는 캔버스가 오염돼 읽을 수 없다 — 기본 표면으로 남는다.
		return null
	}
}

/**
 * 홈 카드 — Figma `hd_lbs_interface`의 SelectCard Large(node 448:9790)를 옮긴 임시 구현이다.
 * 정사각 판 안에 미리보기를 자르지 않고 담고, 바탕은 미리보기의 평균색으로 칠한다(Figma의 짙은 초록이
 * 초록 포스터 뒤에 깔린 것처럼). 평균색의 밝기로 light/dark 토큰 스코프를 골라 글자가 따라온다(docs/09 §5).
 * ponytail: 디자인 UI가 코드로 나오면 그것으로 갈아끼운다.
 */
export function StudioHomeCard({ item }: { item: StudioHomeItem }) {
	const [tint, setTint] = useState<string | null>(null)

	return (
		<Link
			href={item.href}
			className={cn(
				'group relative isolate block aspect-square overflow-hidden rounded-xl bg-muted text-foreground shadow-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
				tint && (isLightColor(tint) ? 'light' : 'dark'),
			)}
			style={
				tint ? ({ backgroundColor: tint, '--card-tint': tint } as CSSProperties) : undefined
			}
		>
			{item.previewImage && (
				// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
				<img
					src={item.previewImage.url}
					alt={item.previewImage.alt}
					// 서버가 그린 이미지는 hydration 전에 로드가 끝나 onLoad를 놓칠 수 있다 — ref에서 한 번 더 본다.
					ref={(image) => {
						if (image?.complete && image.naturalWidth > 0)
							setTint(sampleAverageColor(image))
					}}
					onLoad={(event) => setTint(sampleAverageColor(event.currentTarget))}
					className="-z-10 absolute inset-0 size-full object-contain p-5 drop-shadow-md transition-transform group-hover:scale-[1.02]"
				/>
			)}
			{/* 위쪽을 바탕색으로 눌러 이미지가 어떻든 이름의 대비가 유지된다(docs/08). */}
			{tint && (
				<div
					aria-hidden="true"
					className="-z-10 absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-(--card-tint) to-transparent"
				/>
			)}
			<div className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-col">
				<Typography as="p" size="sm" weight="medium" className="truncate">
					{item.name}
				</Typography>
				{item.subtitle && (
					<Typography as="p" size="xs" className="truncate text-muted-foreground">
						{item.subtitle}
					</Typography>
				)}
			</div>
		</Link>
	)
}
