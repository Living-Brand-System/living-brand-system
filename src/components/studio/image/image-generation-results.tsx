'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { fitPreviewSize, type PreviewSize } from '@/components/studio/shared/fit-preview-size'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import type { ImageResultImage } from '@/features/image-generation/contexts/image-studio-context'
import type { ImageAspectRatio } from '@/features/image-generation/domain/image-size'
import {
	type ImageColorAdjustment,
	imageColorizeStyle,
} from '@/features/image-generation/runtime/image-colorize'
import { cn } from '@/lib/utils'

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5']

/** 그리드 `gap-4`의 px 값 — 남는 높이를 행으로 나눌 때 빼야 해서 숫자로도 필요하다. */
const GRID_GAP = 16

type ImageGenerationResultsProps = {
	aspectRatio: ImageAspectRatio
	/** 색 조정 값 — 있으면 결과 전부에 얹는다(한 장만 물들이지 않는다). null이면 원본만 보인다. */
	color: ImageColorAdjustment | null
	/** 그리드가 그리는 순서 그대로 — 참조가 있으면 referenceIndex 자리가 참조다. */
	items: readonly ImageResultImage[]
	loading: boolean
	onSelect: (index: number) => void
	referenceIndex: number | null
	requested: number
	selected: number | null
}

export function ImageGenerationResults({
	aspectRatio,
	color,
	items,
	loading,
	onSelect,
	referenceIndex,
	requested,
	selected,
}: ImageGenerationResultsProps) {
	return (
		<div
			data-slot="image-generation-results"
			className="flex h-full min-h-0 flex-col gap-4"
			aria-live="polite"
			aria-busy={loading}
		>
			{loading && <ImageGenerationSkeleton aspectRatio={aspectRatio} count={requested} />}

			{!loading && items.length > 0 && (
				<>
					{/* 선택은 컨트롤러의 카메라 섹션과 저장 CTA를 여는 입력이다 — 그래서 안내가 남는다. */}
					{selected === null && (
						<Typography as="p" size="sm" tone="muted">
							이미지를 클릭해 선택하면 시점 조정과 저장을 할 수 있어요
						</Typography>
					)}

					<FittedResultGrid aspectRatio={aspectRatio} count={items.length}>
						{items.map((item, index) => {
							const isReference = index === referenceIndex
							const label = isReference
								? '참조 원본'
								: `생성 결과 ${index - (referenceIndex === null ? -1 : 0)}`

							return (
								<div key={item.src} className="flex flex-col gap-1">
									<button
										type="button"
										onClick={() => onSelect(index)}
										aria-pressed={selected === index}
										className={cn(
											'overflow-hidden rounded-md border-2 transition-colors',
											selected === index
												? 'border-primary'
												: isReference
													? 'border-foreground'
													: 'border-border hover:border-ring',
										)}
									>
										<ResultImage
											aspectRatio={aspectRatio}
											color={color}
											label={label}
											src={item.src}
										/>
									</button>
								</div>
							)
						})}
					</FittedResultGrid>
				</>
			)}
		</div>
	)
}

/**
 * 남는 캔버스 높이 안에 카드 전부를 비율 그대로 밀어 넣는 결과 그리드.
 * 배치 상한이 4장이라 2열이면 항상 2×2로 떨어진다. 한 장뿐이면 열을 나누지 않아
 * 카드가 캔버스 폭을 그대로 쓴다(Figma 16:8487).
 *
 * 🔴 순수 CSS로는 안 된다 — `aspect-ratio` 상자에 확정 높이를 주면 `max-width`가 걸리는
 *    순간 비율이 깨지고, 대신 `object-contain`으로 맞추면 선택 테두리가 이미지가 아니라
 *    셀을 감싸 레터박스가 남는다. 그래서 다른 스튜디오와 같은 실측(fitPreviewSize) 경로를 쓴다.
 */
function FittedResultGrid({
	aspectRatio,
	count,
	children,
}: {
	aspectRatio: ImageAspectRatio
	count: number
	children: ReactNode
}) {
	const stageRef = useRef<HTMLDivElement>(null)
	const [cell, setCell] = useState<PreviewSize | null>(null)
	const columns = count > 1 ? 2 : 1

	useEffect(() => {
		const stage = stageRef.current
		if (!stage) return

		const rows = Math.ceil(count / columns)
		const [ratioWidth, ratioHeight] = aspectRatio.split(':').map(Number)

		const measure = (width: number, height: number) => {
			const bounds = {
				width: (width - GRID_GAP * (columns - 1)) / columns,
				height: (height - GRID_GAP * (rows - 1)) / rows,
			}
			if (bounds.width <= 0 || bounds.height <= 0) return
			setCell(fitPreviewSize(bounds, { width: ratioWidth, height: ratioHeight }))
		}

		const observer = new ResizeObserver(([entry]) => {
			if (entry) measure(entry.contentRect.width, entry.contentRect.height)
		})
		measure(stage.clientWidth, stage.clientHeight)
		observer.observe(stage)
		return () => observer.disconnect()
	}, [aspectRatio, columns, count])

	return (
		<div ref={stageRef} className="min-h-0 flex-1">
			<div
				className={cn(
					'grid grid-cols-1 gap-4',
					count > 1 && 'sm:grid-cols-2',
					// 🔴 실측값은 lg에서만 먹인다. 그 아래는 셸이 높이를 잠그지 않아 페이지가
					//    세로로 흐르므로, 고정 px를 먹이면 그리드 높이와 무대 높이가 서로를 흔든다.
					cell &&
						'lg:h-full lg:content-center lg:justify-center lg:[grid-auto-rows:var(--result-cell-height)]',
					cell &&
						(columns === 2
							? 'lg:[grid-template-columns:repeat(2,var(--result-cell-width))]'
							: 'lg:[grid-template-columns:var(--result-cell-width)]'),
				)}
				style={
					cell
						? ({
								'--result-cell-width': `${cell.width}px`,
								'--result-cell-height': `${cell.height}px`,
							} as CSSProperties)
						: undefined
				}
			>
				{children}
			</div>
		</div>
	)
}

type ResultImageProps = {
	aspectRatio: ImageAspectRatio
	color: ImageColorAdjustment | null
	label: string
	src: string
}

/**
 * 결과 카드 한 장 — 색이 있으면 원본은 마스크로만 쓰이고(박스 크기를 유지하려 남겨둔다),
 * 저장과 같은 계산(imageColorizeStyle)이 만든 색 층이 그 위에 얹힌다.
 * 원본을 지우는 데 opacity를 쓴다 — visibility:hidden은 접근성 트리에서도 빼서
 * 이 카드를 감싼 선택 버튼의 유일한 접근 이름(alt)까지 사라진다.
 */
function ResultImage({ aspectRatio, color, label, src }: ResultImageProps) {
	const colorize = color ? imageColorizeStyle(src, color) : null

	return (
		<div
			data-slot="image-result"
			className="relative overflow-hidden"
			style={{ ...colorize?.base, aspectRatio: aspectRatio.replace(':', ' / ') }}
		>
			{/* biome-ignore lint/performance/noImgElement: 미리보기, 최적화 불필요 */}
			<img src={src} alt={label} className={cn('w-full', colorize && 'opacity-0')} />
			{colorize && (
				<div
					data-slot="image-colorize-overlay"
					aria-hidden
					className="absolute inset-0"
					style={colorize.overlay}
				/>
			)}
		</div>
	)
}

function ImageGenerationSkeleton({
	aspectRatio,
	count,
}: {
	aspectRatio: ImageAspectRatio
	count: number
}) {
	return (
		<>
			{/* 스켈레톤은 눈에만 보인다 — 진행 중이라는 사실은 이 한 줄이 읽어 준다. */}
			<span className="sr-only">이미지 생성 중</span>
			{/* 결과와 같은 그리드를 쓴다 — 다르면 생성이 끝나는 순간 카드가 자리를 옮긴다. */}
			<FittedResultGrid aspectRatio={aspectRatio} count={count}>
				{SKELETON_KEYS.slice(0, count).map((key) => (
					<Skeleton key={key} style={{ aspectRatio: aspectRatio.replace(':', ' / ') }} />
				))}
			</FittedResultGrid>
		</>
	)
}
