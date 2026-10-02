'use client'

import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Typography } from '@/components/ui/typography'
import { sampleAverageColor } from './average-color'
import {
	clampFrame,
	initialFrame,
	type SquareFrame,
	type SquareFrameMode,
	scaleRange,
	zoomFrame,
} from './square-frame'

/** 저장하는 정사각 썸네일의 한 변(px). */
const OUTPUT_SIZE = 1024
/** 방향키 한 번에 옮기는 거리(틀 한 변 = 1). */
const KEY_STEP = 0.02
const KEY_DELTAS: Record<string, [number, number]> = {
	ArrowLeft: [-KEY_STEP, 0],
	ArrowRight: [KEY_STEP, 0],
	ArrowUp: [0, -KEY_STEP],
	ArrowDown: [0, KEY_STEP],
}

const COPY: Record<SquareFrameMode, { description: string; scale: string }> = {
	crop: {
		description: '그림을 끌어 위치를 정하고, 확대해서 정사각 안을 채울 범위를 고르세요.',
		scale: '확대',
	},
	inset: {
		description: '판 전체가 정사각 안에 들어갑니다. 끌어서 위치를, 슬라이더로 크기를 정하세요.',
		scale: '크기',
	},
}

/**
 * 캡처한 판 그림을 정사각 썸네일로 맞추는 대화상자 — 프로필 사진 크로퍼처럼 틀은 고정하고 그림을 옮긴다.
 * `inset`(Template)의 여백은 판의 평균색으로 칠한다 — 홈 카드가 바탕을 칠하던 그 색이다.
 */
export function PreviewFrameDialog({
	src,
	mode,
	saving,
	error,
	onSave,
	onCancel,
}: {
	/** 캡처한 판 그림의 URL. */
	src: string
	mode: SquareFrameMode
	saving: boolean
	error: string | null
	onSave: (file: Blob) => void
	onCancel: () => void
}) {
	const imageRef = useRef<HTMLImageElement>(null)
	const drag = useRef<{ x: number; y: number; frame: SquareFrame } | null>(null)
	const [size, setSize] = useState<{ width: number; height: number } | null>(null)
	const [frame, setFrame] = useState<SquareFrame | null>(null)
	const [tint, setTint] = useState<string | null>(null)
	const copy = COPY[mode]
	const range = size ? scaleRange(mode, size) : null

	const handleLoad = (image: HTMLImageElement) => {
		const next = { width: image.naturalWidth, height: image.naturalHeight }
		setSize(next)
		setFrame(initialFrame(mode, next))
		setTint(sampleAverageColor(image))
	}

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!frame) return
		event.currentTarget.setPointerCapture(event.pointerId)
		drag.current = { x: event.clientX, y: event.clientY, frame }
	}
	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const start = drag.current
		if (!start || !size) return
		const side = event.currentTarget.getBoundingClientRect().width
		setFrame(
			clampFrame(mode, size, {
				...start.frame,
				x: start.frame.x + (event.clientX - start.x) / side,
				y: start.frame.y + (event.clientY - start.y) / side,
			}),
		)
	}
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const delta = KEY_DELTAS[event.key]
		if (!delta || !frame || !size) return
		event.preventDefault()
		setFrame(clampFrame(mode, size, { ...frame, x: frame.x + delta[0], y: frame.y + delta[1] }))
	}

	const handleSave = () => {
		const image = imageRef.current
		if (!image || !frame || !size) return
		const canvas = document.createElement('canvas')
		canvas.width = OUTPUT_SIZE
		canvas.height = OUTPUT_SIZE
		const context = canvas.getContext('2d')
		if (!context) return
		if (mode === 'inset' && tint) {
			context.fillStyle = tint
			context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
		}
		context.drawImage(
			image,
			frame.x * OUTPUT_SIZE,
			frame.y * OUTPUT_SIZE,
			size.width * frame.scale * OUTPUT_SIZE,
			size.height * frame.scale * OUTPUT_SIZE,
		)
		canvas.toBlob((blob) => blob && onSave(blob), 'image/png')
	}

	return (
		<Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>썸네일 맞추기</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>
				<div
					role="application"
					aria-label="썸네일 위치 — 방향키로 옮깁니다"
					// biome-ignore lint/a11y/noNoninteractiveTabindex: 끌기와 같은 이동을 방향키로도 하도록 포커스를 받는다
					tabIndex={0}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={() => {
						drag.current = null
					}}
					onPointerCancel={() => {
						drag.current = null
					}}
					onKeyDown={handleKeyDown}
					className="relative aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
					style={mode === 'inset' && tint ? { backgroundColor: tint } : undefined}
				>
					{/* biome-ignore lint/performance/noImgElement: 방금 캡처한 object URL이라 next/image 최적화 대상이 아니다 */}
					<img
						ref={(image) => {
							// object URL은 hydration 전에 로드가 끝날 수 있다 — ref에서 한 번 더 본다.
							if (image?.complete && image.naturalWidth > 0 && !size)
								handleLoad(image)
							imageRef.current = image
						}}
						src={src}
						alt=""
						draggable={false}
						onLoad={(event) => handleLoad(event.currentTarget)}
						className={frame && size ? 'absolute max-w-none select-none' : 'invisible'}
						style={
							frame && size
								? {
										left: `${frame.x * 100}%`,
										top: `${frame.y * 100}%`,
										width: `${size.width * frame.scale * 100}%`,
										height: `${size.height * frame.scale * 100}%`,
									}
								: undefined
						}
					/>
				</div>
				{frame && size && range && (
					<Slider
						aria-label={copy.scale}
						min={range[0]}
						max={range[1]}
						step={(range[1] - range[0]) / 100}
						value={[frame.scale]}
						onValueChange={([scale]) => setFrame(zoomFrame(mode, size, frame, scale))}
					/>
				)}
				{error && (
					<Typography role="alert" size="xs" tone="destructive">
						{error}
					</Typography>
				)}
				<DialogFooter>
					<Button variant="outline" disabled={saving} onClick={onCancel}>
						취소
					</Button>
					<Button disabled={saving || !frame} onClick={handleSave}>
						{saving ? '저장 중…' : '저장'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
